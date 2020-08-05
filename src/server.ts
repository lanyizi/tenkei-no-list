import { stat } from "fs";
import { scrypt, timingSafeEqual } from "crypto";
import pify from "pify";
import low from "lowdb"
import FileSync from "lowdb/adapters/FileSync"
import jsonServer from "json-server"
import { Request } from "express"
import { has, ObjectChain, CollectionChain, keys, indexOf } from "lodash"
import { Tournament } from '@/models/tournament';
import { Information } from '@/models/setup';
import { Referee } from '@/models/referee';


const server = jsonServer.create()
const path = '/db.json'
const database = low(new FileSync(path))
const router = jsonServer.router(database)
const middlewares = jsonServer.defaults()

const asyncStat = pify(stat);
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

  //const referees: Referee[] = database.get('referees').value()
  const referees: Referee[] = [
    {
      username: 'test',
      hash: '2iMeqXNFBpgGtGDKKpDdpCw/4oqTV5GR3YLjaSNMZkNPHJFSYIYiqJOjHDdvujT0JfXGDRZasDqfCZrERh0s/w=='
    },
    {
      username: 'AR',
      hash: 'OxSqw8eDi/P+gQYFPJI64XbMz7sPx2B99EKIuhwsKwAj/JuA1nGihiers5s4qaSo2K3rDz6Lqq6wyyq2uNcAow=='
    }
  ]
  const index: number = referees.findIndex(x => x.username === username)
  if (index === -1) {
    return -1
  }
  const found = referees[index]
  const promise = new Promise<Buffer>((resolve, reject) => {
    scrypt(password, 'jcwtjcwt', 64, (err, key) => {
      if (err != null) {
        reject(err)
      }
      resolve(key)
    })
  })
  if(!timingSafeEqual(await promise, Buffer.from(found.hash))) {
    return -1
  }

  return index;
}

const getObject = <T>(url: string, type: string): T | undefined => {
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
  return (database.get(type) as CollectionChain<any>).find({ id }).value()
}

const checkInitialAccess = async (req: Request, user: number) => {
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
    const user = await getUser(req)
    if (!await checkInitialAccess(req, user)) {
      res.status(401).send({ message: 'Not authorized' })
      return
    }

    const t = getObject<Tournament>(req.originalUrl, 'tournaments')
    if (t !== undefined) {
      // TODO: limit power of non-organizer referees
      if (req.method !== 'get' && req.method !== 'head') {
        const info = t.information
        const referees = info.referees.concat(info.organizer)
        if (!referees.includes(user)) {
          res.status(401).send({ message: 'Not authorized' })
          return
        }

        // remove id so it will be auto generated instead
        // actually we don't even use id in our code
        if (typeof req.body === 'object' && has(req.body, 'id')) {
          delete req.body.id;
        }
      }
      return next()
    }

    if (req.originalUrl.startsWith('~check')) {
      res.send({ user })
      return
    }

    res.status(500).send({ message: 'Not implemented' })
  }
  catch (e) {
    res.status(500).send({ message: `${e}` })
  }
})
server.use(router)
server.listen(4000, () => {
  console.log('JSON Server is running')
})