import { Tournament, isMatch, SingleElimination, DoubleElimination } from '@/models/tournament';
import { Information, isInformation, Setup, isSetup } from '@/models/setup';
import { isTournament } from './tournament/tournament';

enum ValidationErrorType {
  InvalidFormat,
  NotImplemented,
  InvalidID,
  RevertingTournamentStatus,
  ModifyingUnmodifiableFields,
  SettingWinnerWhenNotReady,
  ChangingConfirmedWinner,
  ChangingConfirmedLoser,
  SettingInvalidPlayers
}

export type WithID<T> = T & { id: number }

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

  const origin = tournament.origins[matchId]?.map(m => tournament.matches[m]);
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

export const informationValidator = (
  old: Information | undefined,
  edited: unknown
) => {
  if (!isInformation(edited)) {
    throw new ValidationError(ValidationErrorType.InvalidFormat);
  }
  if (old !== undefined && old.organizer !== edited.organizer) {
    throw new ValidationError(ValidationErrorType.NotImplemented);
  }
}

export const refereeChanged = (old: Information, edited: unknown) => {
  if (!isInformation(edited)) {
    throw new ValidationError(ValidationErrorType.InvalidFormat);
  }
  if (old.organizer !== edited.organizer) {
    return true;
  }
  if (old.referees.length !== edited.referees.length) {
    return true;
  }
  return old.referees.some((r, i) => r !== edited.referees[i]);
}

export const tournamentValidator = (
  old: WithID<Setup | Tournament> | undefined,
  edited: unknown
) => {
  if (!isSetup(edited)) {
    throw new ValidationError(ValidationErrorType.InvalidFormat);
  }
  informationValidator(old?.information, edited.information);
  // make sure id isn't changed
  if (old?.information !== (edited as Partial<WithID<object>>).id) {
    throw new ValidationError(ValidationErrorType.InvalidID;)
  }

  if (edited.status !== 'started') {
    if (old !== undefined && old.status === 'started') {
      throw new ValidationError(ValidationErrorType.RevertingTournamentStatus);
    }
    return;
  }

  if (!isTournament(edited)) {
    throw new ValidationError(ValidationErrorType.InvalidFormat);
  }

  switch (edited.settings.mode) {
    case 'se':
      if (!SingleElimination.isSingleElimination(edited)) {
        throw new ValidationError(ValidationErrorType.InvalidFormat);
      }
      break;
    case 'de':
      if (!DoubleElimination.isDoubleElimination(edited)) {
        throw new ValidationError(ValidationErrorType.InvalidFormat);
      }
      break;
    default: throw new ValidationError(ValidationErrorType.InvalidFormat);
  }
}