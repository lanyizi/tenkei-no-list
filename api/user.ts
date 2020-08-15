import { scrypt, } from 'crypto'
import { Referee, isPreReferee } from "@/models/referee";
import { WithID } from '@/models/validations';
import { BadRequestError, NotAuthorizedError } from './api';

export const hash = (password: string) => {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password, 'jcwtjcwt', 64, (err, key) => {
      if (err != null) {
        reject(err)
        return
      }
      resolve(key)
    })
  })
}

export const editReferee = async (
  user: number,
  referee: WithID<Referee> | undefined,
  body: unknown
): Promise<Referee & { id?: number }> => {
  if (!isPreReferee(body)) {
    throw new BadRequestError('Not a referee')
  }
  if (referee?.id !== (body as { id?: unknown }).id) {
    throw new BadRequestError('Body has no id or id is invalid')
  }
  if (user !== 0) {
    throw new NotAuthorizedError(`User ${user} cannot edit referee`)
  }
  const result: Referee & { id?: number } = {
    username: body.username,
    hash: (await hash(body.password)).toString('base64')
  }
  if (referee !== undefined) {
    result.id = referee.id
  }
  return result;
}