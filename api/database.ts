import { scrypt, timingSafeEqual } from 'crypto'
import low from 'lowdb'
import type { Request } from 'express'
import type { Referee } from '@/models/referee'
import { Tournament } from '@/models/tournament'
import { Setup } from '@/models/setup'
import type { WithID } from '@/models/validations'
import { Changes } from '@/models/changes'


type DataBaseModel = {
  tournaments: WithID<Tournament | Setup>[];
  referees: WithID<Referee>[];
  changes: WithID<Changes>[];
}

export class Database {
  db: low.LowdbSync<DataBaseModel>

  constructor(db: low.LowdbSync<any>) {
    if(db == null) {
      throw Error('invalid database')
    }
    this.db = db
  }

  async getUser(req: Request): Promise<number> {
    const content = req.get('Authentication')
    if (content === undefined) {
      return -1
    }

    const splitted = content.split(' ')
    if (splitted.length !== 2) {
      return -1
    }

    const [username, password] = splitted
      .map(x => Buffer.from(x, 'base64').toString('utf-8'))

    const found = this.db
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
}