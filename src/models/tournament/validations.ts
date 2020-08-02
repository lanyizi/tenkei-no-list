import { Match, Tournament } from './tournament';

enum ValidationErrorType {
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
  newMatch: Match
) => {
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