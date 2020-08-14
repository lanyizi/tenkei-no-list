import { EditHandler, BadRequestError, NotAuthorizedError, NotImplementedError } from "./api";
import { Tournament } from '@/models/tournament';
import {
  tournamentValidator,
  informationValidator,
  refereeChanged,
  WithID
} from '@/models/validations';
import { Information, Setup } from '@/models/setup';
import { has } from '@/utils';
import isEqual from 'lodash/isEqual';
import isObject from 'lodash/isObject';


export const tournament: EditHandler<WithID<Tournament | Setup>> = (
  user,
  current,
  body,
  next
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

export const information: EditHandler<Information> = (
  user,
  current,
  body,
  next
) => {
  if (!isObject(body) || !has(body, 'information')) {
    throw new BadRequestError('Body has no information to be updated')
  }
  // make sure body only contains information
  if (!isEqual(['information'], Object.getOwnPropertyNames(body))) {
    throw new NotImplementedError('Currently only info can be patched')
  }

  // validate info
  informationValidator(current, body.information)

  if (user === current.organizer) {
    // information is always writable by organizer
    return next()
  }
  // check referee
  if (!current.referees.includes(user)) {
    throw new NotAuthorizedError('You are not referee')
  }

  // referee cannot alter organizer or change referees
  if (refereeChanged(current, body.information)) {
    throw new NotAuthorizedError('You cannot alter referees')
  }

  return next()
}