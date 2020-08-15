import { isSetupLike, isSetup } from '@/models/setup'
import { isTournament } from '@/models/tournament'

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

export const loadTournament = async (id: string) => {
  const received = await request('GET', `/tournaments/${id}`)
  if (!isSetupLike(received)) {
    throw Error('Received data is invalid - Not SetupLike')
  }
  if (!isTournament(received) && !isSetup(received)) {
    throw Error('Received data is invalid - Not Tournament and Not Setup')
  }
  return received;
}