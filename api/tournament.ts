import { BadRequestError, NotAuthorizedError, NotImplementedError } from "./api";
import { Tournament } from '@/models/tournament';
import {
  tournamentValidator,
  informationValidator,
  refereeChanged,
  WithID
} from '@/models/validations';
import { Information, Setup } from '@/models/setup';
import { has, isArray, isArrayOfNumber } from '@/utils';
import isObject from 'lodash/isObject';


export const tournament = (
  user: number,
  current: WithID<Tournament | Setup>,
  body: unknown,
  next: () => void
): void => {
  // validate tournament
  tournamentValidator(current, body);

  // after tournament has started, only information can be edited
  if (current.status !== 'setup') {
    throw new BadRequestError('Cannot alter tournament after start')
  }
  // only organizer can update non-information fields
  // (referees can only update information, or post to /changes)
  if (user !== current.information.organizer) {
    throw new NotAuthorizedError('You are not organizer')
  }

  return next()
}

export const patchTournament = (
  user: number,
  current: WithID<Tournament | Setup>,
  body: unknown,
  next: () => void
): void => {
  if (!isObject(body)) {
    throw new BadRequestError('Body is not object')
  }
  const fields = Object.getOwnPropertyNames(body);
  const validFields = ['information', 'roundFormats'];
  if (!fields.every(f => validFields.includes(f))) {
    throw new BadRequestError('Some fields are invalid: ' + fields.join())
  }

  if (has(body, 'information')) {
    verifyInformation(user, current.information, body.information)
  }
  if (has(body, 'roundFormats')) {
    if (!isArray(body.roundFormats, isArrayOfNumber)) {
      throw new BadRequestError('roundFormats must be number[][]')
    }
  }

  return next()
}

const verifyInformation = (
  user: number,
  current: Information,
  information: unknown
) => {
  // validate info
  informationValidator(current, information)

  if (user === current.organizer) {
    // information is always writable by organizer
    return
  }
  // check referee
  if (!current.referees.includes(user)) {
    throw new NotAuthorizedError('You are not referee')
  }

  // referee cannot alter organizer or change referees
  if (refereeChanged(current, information)) {
    throw new NotAuthorizedError('You cannot alter referees')
  }
}