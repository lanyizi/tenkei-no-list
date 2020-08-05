import { Match, Tournament } from '@/models/tournament';
import { Information } from './setup';
import { keys } from 'lodash';

const has = <P extends PropertyKey>(
  target: object,
  property: P
): target is { [K in P]: unknown } => {
  // The `in` operator throws a `TypeError` for non-object values.
  return property in target;
}

const isArray = <T>(
  array: unknown,
  elementChecker: (e: unknown) => e is T
): array is T[] => {
  return Array.isArray(array) && array.every(elementChecker);
}

const isObject = (object: unknown): object is object => {
  return typeof object === 'object' && object !== null;
}

const isNumber = (e: unknown): e is number => typeof e === 'number';

export const isMatch = (match: unknown): match is Match => {
  const keys: (keyof Match)[] = [
    'p1',
    'p2',
    'p1Score',
    'p2Score',
    'winner',
    'winnerNext',
    'loserNext'
  ];

  if (!isObject(match)) {
    return false;
  }

  return keys.every(<K extends keyof Match>(k: K) => {
    if (has(match, k)) {
      return isNumber(match[k]) || match[k] === null
    }
    return false;
  });
}

export const isInformation = (info: unknown): info is Information => {
  if (!isObject(info)) {
    return false;
  }

  if (!has(info, 'referees') || !isArray(info.referees, isNumber)) {
    return false;
  }
  type Tuple = [keyof Information, 'string' | 'number'];
  const fields: Tuple[] = [
    ['name', 'string'],
    ['description', 'string'],
    ['organizer', 'number'],
    ['organizer', 'number'],
  ];
  return fields.every(<T extends Tuple>([k, t]: T) => {
    return has(info, k) && typeof info[k] === t;
  });
}

enum ValidationErrorType {
  InvalidFormat,
  NotImplemented,
  ModifyingUnmodifiableFields,
  SettingWinnerWhenNotReady,
  ChangingConfirmedWinner,
  ChangingConfirmedLoser,
  SettingInvalidPlayers
}

export class ValidationError extends Error {
  errorType: ValidationErrorType;
  constructor(errorType: ValidationErrorType) {
    super(ValidationErrorType[errorType]);
    this.errorType = errorType;
  }
}

export const matchValidator = (
  tournament: Tournament,
  matchId: number,
  newMatch: unknown
) => {
  if (!isMatch(newMatch)) {
    throw new ValidationError(ValidationErrorType.InvalidFormat);
  }
  const old = tournament.matches[matchId];
  const unmodifiable = ['p1', 'p2', 'loserNext', 'winnerNext'] as const;
  if (unmodifiable.some(field => old[field] !== newMatch[field])) {
    throw new ValidationError(ValidationErrorType.ModifyingUnmodifiableFields);
  }

  const players = ['p1', 'p2'] as const;
  if (players.some(f => newMatch[f] === null) && newMatch.winner !== null) {
    throw new ValidationError(ValidationErrorType.SettingWinnerWhenNotReady);
  }

  if (old.winner !== null && newMatch.winner !== old.winner) {
    const oldLoser = old.winner === old.p1 ? old.p2 : old.p1;
    if (newMatch.winnerNext !== null) {
      const next = tournament.matches[newMatch.winnerNext];
      if (players.some(f => next[f] === old.winner)) {
        throw new ValidationError(ValidationErrorType.ChangingConfirmedWinner);
      }
    }
    if (newMatch.loserNext !== null) {
      const next = tournament.matches[newMatch.loserNext];
      if (players.some(f => next[f] === oldLoser)) {
        throw new ValidationError(ValidationErrorType.ChangingConfirmedLoser);
      }
    }
  }

  const origin = tournament.origins.get(matchId)?.map(m => tournament.matches[m]);
  const loserSources = origin
    ?.filter(match => match.loserNext === matchId) || [];
  const winnerSources = origin
    ?.filter(match => match.winnerNext === matchId) || [];
  const changed = players.filter(f => {
    return old[f] !== newMatch[f] && newMatch[f] !== null;
  });
  for (const f of changed) {
    const player = newMatch[f]!;
    if (loserSources.find(match => {
      return match.winner !== null && match.winner !== player;
    })) {
      continue;
    }
    if (winnerSources.find(match => match.winner === player)) {
      continue;
    }
    throw new ValidationError(ValidationErrorType.SettingInvalidPlayers);
  }
}

export const informationValidator = (old: Information, edited: unknown) => {
  if (!isInformation(edited)) {
    throw new ValidationError(ValidationErrorType.InvalidFormat);
  }
  if (old.organizer !== edited.organizer) {
    throw new ValidationError(ValidationErrorType.NotImplemented);
  }
}

export const refereeChanged = (old: Information, edited: unknown) => {
  if (!isInformation(edited)) {
    throw new ValidationError(ValidationErrorType.InvalidFormat);
  }
  if(old.referees.length !== edited.referees.length) {
    return true;
  }
  return old.referees.some((r, i) => r !== edited.referees[i]);
}