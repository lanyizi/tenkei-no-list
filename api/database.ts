import { scrypt, timingSafeEqual } from 'crypto'
import low from 'lowdb'
import FileSync from 'lowdb/adapters/FileSync.js'
import type { Request } from 'express'
import type { CollectionChain } from 'lodash'
import type { Referee } from '@/models/referee'
import { Tournament } from '@/models/tournament'
import { Setup } from '@/models/setup'
import type { WithID } from '@/models/validations'
import { retriveId } from './api'


type DataBaseModel = {
  tournaments: WithID<Tournament | Setup>[];
  referees: WithID<Referee>[];
  changes: WithID<{ placeholder: string }>[];
}

export class Database {
  db: low.LowdbSync<DataBaseModel>

  constructor(path: string) {
    this.db = low(new FileSync(path))
    // Add lodash-id methods to db
    this.db._.mixin(require('lodash-id'))
    // Add specific mixins
    this.db._.mixin(require('json-server/mixins'))
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

  getObject<K extends keyof DataBaseModel>(
    url: string,
    type: K
  ): DataBaseModel[K][0] | undefined {
    const id = retriveId(url, type)
    if (id === -1) {
      return undefined
    }
    const _ = this.db.get(type) as CollectionChain<DataBaseModel[K][0]>

    return _.find(x => x.id === id).value() as DataBaseModel[K][0] | undefined
  }

  createChanges(body: WithID<Tournament | Setup>) {

  }
}