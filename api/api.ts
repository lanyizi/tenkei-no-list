// execute with 
// npm run apiserver

import { stat } from "fs"
import pify from "pify"
import jsonServer from "json-server"
import ReadWriteLock from "rwlock"
import {
  ValidationError,
  tournamentValidator
} from '@/models/validations'
import { CommitedEdit, isEdit } from '@/models/changes'
import { has } from '@/utils'
import { tournament, information } from './tournament'
import { Database } from './database'
import { changeHandler } from './changes'
import isObject from 'lodash/isObject'
import isNumber from 'lodash/isNumber'
import { editReferee } from './user'
import { SetupLike } from '@/models/setup'
const asyncStat = pify(stat)

const server = jsonServer.create()
const databasePath = 'db.json'


const router = jsonServer.router(databasePath)
const database = new Database((router as { db?: any }).db)
const middlewares = jsonServer.defaults()

export class NotAuthorizedError extends Error { }
export class NotFoundError extends Error { }
export class BadRequestError extends Error { }
export class NotImplementedError extends Error { }

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

    const user = await database.getUser(req)

    const originalUrl = req.originalUrl
    const body: unknown = req.body
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
        '/tournamentDescs'() {
          const descs: SetupLike[] = database.db
            .get('tournaments')
            .map(({
              id, information, status, settings, roundFormats, players
            }) => ({
              id, information, status, settings, roundFormats, players
            })).value()
          res.json(descs)
        },
        '/refereeNames'() {
          const names = database.db
            .get('referees')
            .map(({ id, username }) => ({ id, username }))
            .value()
          res.json(names)
        },
        '/~'() {
          res.json({ user })
        }
      }
      const action = actions[originalUrl]
      if (action !== undefined) {
        return action()
      }
      return next()
    }

    // check size before write, limit to 10MB
    const stat = await asyncStat(databasePath)
    if (!(stat.size < 10_000_000)) {
      throw Error('Database too large')
    }

    if (method === 'post') {
      // remove id so it will be auto generated instead
      if (isObject(body) && has(body, 'id')) {
        delete body.id
      }

      switch (originalUrl) {
        // apply changes
        case '/changes': {
          if (!isEdit(body)) {
            throw new BadRequestError('Invalid input object')
          }
          if (!has(body, 'tournament') || !isNumber(body.tournament)) {
            throw new BadRequestError('Change has no associated tournament id')
          }
          const tournament = body.tournament
          // remove tournament id after acquiring it
          delete body.tournament
          // acquire write lock
          await lock('writeLock', `${tournament}`)
          changeHandler(user, database, tournament, body)
          const commited: CommitedEdit = {
            tournament,
            referee: user,
            date: Math.floor(Date.now() / 1000),
            edit: body
          }
          req.body = commited
          return next()
        }
        // create new tournament
        case '/tournaments': {
          if (user === -1) {
            throw new NotAuthorizedError()
          }

          // validate tournament
          tournamentValidator(undefined, body)

          // let json-server handle the rest
          return next()
        }
        case '/referees': {
          req.body = await editReferee(user, undefined, body)
          return next()
        }
      }

      throw new BadRequestError(`Unknown post request ${originalUrl}`)
    }

    // check tournament
    const tournamentId = retriveId(originalUrl, 'tournaments')
    if (tournamentId !== -1) {
      const t = database.db.get('tournaments')
        .find({ id: tournamentId })
        .value()

      if (t === undefined) {
        throw new NotFoundError(`Invalid tournament id ${tournamentId}`)
      }

      // check path
      const tournamentPath = `/tournaments/${t.id}`
      if (originalUrl !== tournamentPath) {
        throw new NotAuthorizedError(`Unexpected path ${originalUrl}`)
      }

      // create write lock
      await lock('writeLock', `${t.id}`)
      // check method: currently patch is only used to update tournament
      // information
      switch (method) {
        case 'put':
          // updating whole tournament
          return tournament(user, t, body, next)
        case 'patch':
          // editing information
          return information(user, t.information, body, next)
        default:
          throw new BadRequestError(`Unsupported method ${method}`)
      }
    }

    // check referee
    const refereeId = retriveId(originalUrl, 'referees')
    if (refereeId !== -1) {
      const r = database.db.get('referees')
        .find({ id: refereeId })
        .value()
      if (r === undefined) {
        throw new NotFoundError(`Invalid referee id ${refereeId}`)
      }
      req.body = await editReferee(user, r, body)
      return next()
    }

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
        console.log('Error', e)
        res.status(500).json({ message: `${e}` })
        break
    }
  }
})
server.use(router)
server.listen(4000, () => {
  console.log('JSON Server is running')
})