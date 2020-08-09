// execute with 
// npx ts-node -r tsconfig-paths/register api/api.ts

import { stat } from "fs"
import pify from "pify"
import jsonServer from "json-server"
import has from "lodash/has"
import ReadWriteLock from "rwlock"
import {
  ValidationError,
  tournamentValidator,
  WithID
} from '@/models/validations'
import { tournament, information } from './tournament'
import { Database } from './database'
import { changeHandler } from './changes'
import { CommitedEdit, Changes } from '@/models/changes'
import isString from 'lodash/isString'
const asyncStat = pify(stat)

const server = jsonServer.create()
const path = 'db.json'


const router = jsonServer.router(path)
const database = new Database((router as { db?: any }).db)
const middlewares = jsonServer.defaults()

export class NotAuthorizedError extends Error { }
export class NotFoundError extends Error { }
export class BadRequestError extends Error { }
export class NotImplementedError extends Error { }

export type EditHandler<T> = (
  user: number,
  old: T,
  body: unknown,
  next: () => void
) => void;

export const retriveId = (url: string, type: string) => {
  const prefix = `/${type}/`
  if (!url.startsWith(prefix)) {
    return -1
  }
  const after = url.substr(prefix.length)
  const end = after.indexOf('/')
  const id = parseInt(after.substring(0, end !== -1 ? end : undefined))
  if (isNaN(id)) {
    return -1
  }
  return id
}

const rwlock = new ReadWriteLock()

server.use(middlewares)
server.use(jsonServer.bodyParser)
server.use(async (req, res, next) => {
  try {
    const lock = (
      type: keyof ReadWriteLock['async'],
      key?: string
    ): Promise<void> => {
      return new Promise((resolve, reject) => {
        const onAcquired: ReadWriteLock.AsyncCallback = (error, releaser) => {
          if (error != null) {
            return reject(error)
          }
          const releaseOnce = {
            released: false,
            release() {
              this.released || releaser()
              this.released = true
            }
          }
          res.once('finish', releaseOnce.release)
          res.once('close', releaseOnce.release)
          return resolve()
        }
        if (key === undefined) {
          rwlock.async[type](onAcquired)
        }
        else {
          rwlock.async[type](key, onAcquired)
        }
      })
    }

    console.log(`request init`)
    const user = await database.getUser(req)

    const { originalUrl, body } = req
    const method = req.method.toLowerCase()
    if (method === 'get' || method === 'head') {
      // everything except referees is readable by everyone
      if (originalUrl.startsWith('/referees')) {
        throw new NotAuthorizedError()
      }

      for (const path in ['tournaments', 'changes']) {
        if (!originalUrl.startsWith(`/${path}`)) {
          continue
        }
        const id = retriveId(originalUrl, path)
        if (id === -1) {
          throw new NotImplementedError()
        }
        // if id has been successfully retrieved,
        // acquire read lock
        await lock('readLock', `${id}`)
        // let json-server handle it
        return next()
      }

      const actions: Partial<Record<string, () => void>> = {
        '/tournamentIds'() {
          res.json(database.db.get('tournaments').map(t => t.id))
        },
        '/refereeNames'() {
          res.json(database.db.get('referees').map(r => r.username))
        },
        '/~'() {
          res.json({ user })
        }
      };
      const action = actions[originalUrl]
      if (action !== undefined) {
        return action()
      }
      return next()
      throw new BadRequestError(`Unknown read request ${originalUrl}`)
    }

    // check size before write, limit to 10MB
    const stat = await asyncStat(path)
    if (!(stat.size < 10_000_000)) {
      throw Error('Database too large')
    }

    if (method === 'post') {
      // remove id so it will be auto generated instead
      if (typeof body === 'object' && has(body, 'id')) {
        delete body.id;
      }

      const changesId = retriveId(originalUrl, 'changes')
      if (changesId !== -1) {
        // acquire write lock
        await lock('writeLock', `${changesId}`)
        changeHandler(user, database, changesId, body)
        const commited: CommitedEdit = {
          referee: user,
          date: Math.floor(Date.now() / 1000),
          edit: body
        }
        req.body = commited
        return next()
      }

      // create new tournament
      if (originalUrl === '/tournaments') {
        if (user === -1) {
          throw new NotAuthorizedError()
        }

        // validate tournament
        tournamentValidator(undefined, req.body)

        const tournaments: any = database.db.get('tournaments')
        // assign id (assuming id creation is atomic)
        const newId: number | string = tournaments.createId().value()
        if (isString(newId)) {
          throw Error('unexpected string type id')
        }
        // create write lock
        await lock('writeLock', `${newId}`)
        req.body.id = newId
        // create changes
        const changes: any = database.db.get('changes')
        const newChanges: WithID<Changes> = { id: req.body.id, changes: [] }
        changes.insert(newChanges).value()
        // let json-server handle the rest
        return next()
      }

      throw new BadRequestError(`Unknown post request ${originalUrl}`)
    }

    // check method
    if (method !== 'put') {
      throw new BadRequestError(`Unsupported method ${method}`)
    }

    // check tournament
    const tournamentId = retriveId(originalUrl, 'tournaments')
    if (tournamentId !== -1) {
      const t = database.db.get('tournaments')
        .find({ id: tournamentId })
        .value()

      if (t !== undefined) {
        const tournamentPath = `/tournaments/${t.id}`
        if (path === `${tournamentPath}/information`) {
          // editing information
          return information(user, t.information, body, next)
        }

        // editing whole tournament
        if (path !== tournamentPath) {
          throw new NotAuthorizedError()
        }

        return tournament(user, t, body, next)
      }
    }


    if (originalUrl === '/refereeNames') {
      res.json(database.db.get('referees').map(r => r.username))
      return
    }

    if (originalUrl === '/~') {
      console.log(`sending response ${JSON.stringify({ user })}`)
      res.json({ user })
      return
    }

    console.log(`sending not implemented`)
    res.status(500).json({ message: 'Not implemented' })
  }
  catch (e) {
    switch (true) {
      case e instanceof NotAuthorizedError:
        console.log('Rejected by authorization', e)
        res.status(401).json({ message: 'Not authorized' })
        break
      case e instanceof NotFoundError:
        console.log('404 Not found', e)
        res.status(404).json({ message: 'Not found' })
        break
      case e instanceof NotImplementedError:
        console.log('Rejected because not implemented', e)
        res.status(400).json({ message: `${e}` })
        break
      case e instanceof BadRequestError:
        console.log('Rejected because bad request', e)
        res.status(400).json({ message: `${e}` })
        break
      case e instanceof ValidationError:
        console.log('Rejected by validation', e)
        res.status(400).json({ message: `${e}` })
        break
      default:
        res.status(500).json({ message: `${e}` })
        console.log('Error', e)
        break
    }
  }
})
server.use(router)
server.listen(4000, () => {
  console.log('JSON Server is running')
})