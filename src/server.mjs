import { stat } from "fs";
import { scrypt, timingSafeEqual } from "crypto";
import pify from "pify";
import low from "lowdb"
import FileSync from "lowdb/adapters/FileSync.js"
import jsonServer from "json-server"
import pkg from "lodash"
const { has, ObjectChain, CollectionChain, keys, indexOf } = pkg

const server = jsonServer.create()
const path = 'db.json'
const database = low(new FileSync(path))
const router = jsonServer.router(database)
const middlewares = jsonServer.defaults()

const asyncStat = pify(stat);
const getUser = async (req) => {
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
  /** @type {Promise<Buffer>} */
  const promise = new Promise((resolve, reject) => {
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

const getObject = (url, type) => {
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
  return (database.get(type)).find({ id }).value()
}

const checkInitialAccess = async (req, user) => {
  const inAny = [
    '/~check',
    '/tournaments',
    '/logs',
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
      // every referee can create tournaments
      return req.originalUrl === '/tournaments'
    case 'put':
    case 'patch':
      if (req.originalUrl.startsWith('/referees/')) {
        // only jcwt can modify referees
        return user === 0
      }
      // every referee can modify some tournaments
      return req.originalUrl.startsWith('/tournaments/')
    default:
      throw Error(`Unsupported method ${req.method}`)
  }
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

    const t = getObject(req.originalUrl, 'tournaments')
    if (t !== undefined) {
      // TODO: limit power of non-organizer referees
      if (req.method !== 'get' && req.method !== 'head') {
        const info = t.information
        const referees = info.referees.concat(info.organizer)
        if (!referees.includes(user)) {
          console.log(`sending not authorized - tournament`)
          res.status(401).json({ message: 'Not authorized' })
          return
        }

        // remove id so it will be auto generated instead
        // actually we don't even use id in our code
        if (typeof req.body === 'object' && has(req.body, 'id')) {
          delete req.body.id;
        }
      }
      console.log(`forwarding to tournament`)
      return next()
    }

    if (req.originalUrl === '/refereeNames') {
      res.json(database.get('referees').map(r => r.username))
      return
    }

    if (req.originalUrl.startsWith('/~check')) {
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