import { isSetupLike, isSetup, Setup } from '@/models/setup'
import { isTournament, Tournament } from '@/models/tournament'
import { getTypeChecker, isArray } from '@/utils'
import { hasId, WithID } from '@/models/validations'
import isNumber from 'lodash/isNumber'
import isString from 'lodash/isString'


export const request = async (
  method: 'GET' | 'POST' | 'PUT' | 'PATCH',
  path: string,
  token?: string,
  body?: object
): Promise<unknown> => {
  const headers: Record<string, string> = {}
  if (token) {
    headers.Authentication = token
  }
  if (body) {
    headers['Content-Type'] = 'application/json'
  }
  const url = `${process.env.VUE_APP_TENKEI_NO_LIST_API_URL}${path}`
  const response = await fetch(url, {
    method,
    headers,
    mode: 'cors',
    body: body !== undefined ? JSON.stringify(body) : undefined
  })
  const received = await response.json()
  if (!response.ok) {
    throw Error(`Response not ok: ${response.status} ${received.message}`)
  }
  return received
}

export const loadTournament = async (
  id: number
): Promise<WithID<Tournament | Setup>> => {
  const received = await request('GET', `/tournaments/${id}`)
  if (!hasId(received) || received.id !== id) {
    throw Error('Received data does not have id or id is incorrect')
  }
  if (!isSetupLike(received)) {
    throw Error('Received data is invalid - Not SetupLike')
  }
  if (!isTournament(received) && !isSetup(received)) {
    throw Error('Received data is invalid - Not Tournament and Not Setup')
  }
  return received;
}

const refereesChecker = getTypeChecker({
  id: isNumber,
  username: isString,
});

export const loadReferees = async () => {
  const names = await request("GET", "/refereeNames");
  if (!isArray(names, refereesChecker)) {
    throw Error('Received data is invalid - Not Referees[]');
  }
  return new Map(names.map(({ id, username }) => [id, username]));
}