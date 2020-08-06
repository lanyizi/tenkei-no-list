import { stat } from "fs"
import { scrypt, timingSafeEqual } from "crypto"
import pify from "pify";
import low from "lowdb"
import FileSync from "lowdb/adapters/FileSync.js"
import type { Request } from "express"
import jsonServer from "json-server"
import type { CollectionChain } from "lodash"
import _ from "lodash"
import { Referee } from '@/models/referee'
import { Tournament } from '@/models/tournament'
import { Setup } from '@/models/setup';
import { isInformation, informationValidator, refereeChanged } from '@/models/validations';
const asyncStat = pify(stat);
const { has, keys, } = _


const server = jsonServer.create()
const path = 'db.json'
type WithID<T> = T & { id: number }
type DataBaseModel = {
  tournaments: WithID<Tournament | Setup>[];
  referees: WithID<Referee>[];
  changes: WithID<{ placeholder: string }>[];
}
const database = low(new FileSync(path)) as low.LowdbSync<DataBaseModel>
const router = jsonServer.router(database)
const middlewares = jsonServer.defaults()


const getUser = async (req: Request) => {
  const content = req.get('Authentication')
  if (content === undefined) {
    return -1
  }

  const splitted = content.split(' ')
  if (splitted.length !== 2) {
    return -1
  }

  const [username, password] = splitted
    .map(x => Buffer.from(x, 'base64').toString('ascii'))

  const found = database
    .get('referees')
    .find(x => x.username === username)
    .value()
  if (found === undefined) {
    return -1
  }

  const promise = new Promise<Buffer>((resolve, reject) => {
    scrypt(password, 'jcwtjcwt', 64, (err, key) => {
      if (err != null) {
        reject(err)
        return
      }
      resolve(key)
    })
  })
  const inputBuffer = await promise
  const storedBuffer = Buffer.from(found.hash, 'base64')
  if (inputBuffer.length !== storedBuffer.length) {
    return -1
  }
  if (!timingSafeEqual(await promise, storedBuffer)) {
    return -1
  }

  return found.id
}

const getObject = <K extends keyof DataBaseModel>(url: string, type: K) => {
  const prefix = `/${type}/`
  if (!url.startsWith(prefix)) {
    return undefined
  }
  const after = url.substr(prefix.length)
  const end = after.indexOf('/')
  const id = parseInt(after.substring(0, end !== -1 ? end : undefined))
  if (isNaN(id)) {
    return undefined
  }
  const _ = database.get(type) as CollectionChain<DataBaseModel[K][0]>
  return _.find(x => x.id === id).value() as DataBaseModel[K][0] | undefined
}

const checkInitialAccess = async (req: Request, user: number) => {
  const inAny = [
    '/~',
    '/tournaments',
    '/changes',
    '/refereeNames',
    '/referees'
  ].some(s => req.originalUrl.startsWith(`${s}/`) || req.originalUrl === s)
  if (!inAny) {
    throw Error('Invalid url')
  }

  const method = req.method.toLowerCase();
  if (method !== 'get' && method !== 'head') {
    // guests cannot write
    if (user === -1) {
      return false;
    }

    // check size before write, limit to 10MB
    const stat = await asyncStat(path)
    if (!(stat.size < 10_000_000)) {
      throw Error('Database too large')
    }
  }

  switch (method) {
    case 'head':
    case 'get':
      // nobody can read referees
      return !req.originalUrl.startsWith('/referees')
    case 'post':
      if (req.originalUrl === '/referees') {
        // only jcwt can add referees
        return user === 0
      }
      return [
        '/tournaments', // every referee can create tournaments
        '/changes' // every referee can make some changes
      ].includes(req.originalUrl);
    case 'put':
    case 'patch':
      if (req.originalUrl.startsWith('/referees/')) {
        // only jcwt can modify referees
        return user === 0
      }
      // every organizer can modify its tournament before it starts
      return req.originalUrl.startsWith('/tournaments/')
    default:
      throw Error(`Unsupported method ${req.method}`)
  }
}

const isTournamentActionAuthorized = (
  user: number,
  tournament: WithID<Tournament | Setup>,
  method: string,
  path: string,
  body: unknown
) => {
  if (method === 'get' || method === 'head') {
    // tournament is readable by everyone
    return true
  }

  const currentInfo = tournament.information
  const isEditingInfo = path === `/tournaments/${tournament.id}/information`
  if (!isEditingInfo) {
    // after tournament has started, only information can be edited
    if (tournament.status !== 'setup') {
      return false
    }
    // only organizer can update non-information fields
    // (referees can only update information, or post to /changes)
    if (user !== currentInfo.organizer) {
      return false
    }
  }

  if (user === currentInfo.organizer) {
    // information is always writable by organizer
    return true
  }
  // check referee
  if (!currentInfo.referees.includes(user)) {
    return false
  }

  // referee cannot alter organizer or change referees
  return !refereeChanged(currentInfo, body)
}

server.use(middlewares)
server.use(jsonServer.bodyParser)
server.use(async (req, res, next) => {
  try {
    console.log(`request init`)
    const user = await getUser(req)
    if (!await checkInitialAccess(req, user)) {
      console.log(`sending not authorized`)
      res.status(401).json({ message: 'Not authorized' })
      return
    }

    // remove id so it will be auto generated instead
    const { method, originalUrl, body } = req
    if (typeof body === 'object' && has(body, 'id')) {
      delete body.id;
    }

    // check tournament
    const t = getObject(originalUrl, 'tournaments')
    if (t !== undefined) {
      if (isTournamentActionAuthorized(user, t, method, originalUrl, body)) {
        console.log(`sending not authorized - tournament`)
        res.status(401).json({ message: 'Not authorized' })
        return
      }

      console.log(`forwarding to tournament`)
      return next()
    }

    if (originalUrl === '/refereeNames') {
      res.json(database.get('referees').map(r => r.username))
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
    res.status(500).json({ message: `${e}` })
    console.log('Error', e)
  }
})
server.use(router)
server.listen(4000, () => {
  console.log('JSON Server is running')
})