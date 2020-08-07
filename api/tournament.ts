import { EditHandler, BadRequestError, NotAuthorizedError } from "./api";
import { Tournament } from '@/models/tournament';
import { 
  tournamentValidator, 
  informationValidator, 
  refereeChanged, 
  WithID 
} from '@/models/validations';
import { Information, Setup } from '@/models/setup';

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
  // validate info
  informationValidator(current, body)

  if (user === current.organizer) {
    // information is always writable by organizer
    return next()
  }
  // check referee
  if (!current.referees.includes(user)) {
    throw new NotAuthorizedError('You are not referee')
  }

  // referee cannot alter organizer or change referees
  if (refereeChanged(current, body)) {
    throw new NotAuthorizedError('You cannot alter referees')
  }
  
  return next()
}