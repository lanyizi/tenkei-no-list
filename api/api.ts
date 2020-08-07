import { stat } from "fs"
import pify from "pify"
import type { Request } from "express"
import jsonServer from "json-server"
import { has } from "lodash-es"
import { ValidationError } from '@/models/validations'
import { tournament, information } from './tournament'
import { Database } from './database';
const asyncStat = pify(stat);

const server = jsonServer.create()
const path = 'db.json'

const database = new Database(path)
const router = jsonServer.router(database)
const middlewares = jsonServer.defaults()

export class NotAuthorizedError extends Error { }
export class NotFoundError extends Error { }
export class BadRequestError extends Error { }

export type EditHandler<T> = (
  user: number,
  old: T,
  body: unknown,
  next: () => void
) => void;

server.use(middlewares)
server.use(jsonServer.bodyParser)
server.use(async (req, res, next) => {
  try {
    console.log(`request init`)
    const user = await database.getUser(req)

    const { method, originalUrl, body } = req
    if(method === 'get' || method === 'head') {
      // everything except referees is readable by everyone
      if(originalUrl.startsWith('/referees')) {
        throw new NotAuthorizedError()
      }

      return next()
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
    }

    // check method
    if(method !== 'put') {
      throw new BadRequestError(`Unsupported method ${method}`)
    }

    // check tournament
    const t = database.getObject(originalUrl, 'tournaments')
    if (t !== undefined) {
      const tournamentPath = `/tournaments/${t.id}`
      if(path === `${tournamentPath}/information`) {
        // editing information
        return information(user, t.information, body, next)
      }

      // editing whole tournament
      if (path !== tournamentPath) {
        throw new NotAuthorizedError()
      }

      return tournament(user, t, body, next)
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
      case e instanceof ValidationError:
        console.log('Rejected by validation', e)
        res.status(400).json({ message: `${e}` })
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