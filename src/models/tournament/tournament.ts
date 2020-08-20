import { SetupLike } from '@/models/setup'
import {
  isArray,
  FromDefinition,
  getTypeChecker,
  isNumberOrNull
} from '@/utils'
import isObject from 'lodash/isObject'
import isNumber from 'lodash/isNumber'

const matchDefinition = {
  winnerNext: isNumberOrNull,
  loserNext: isNumberOrNull,
  p1: isNumberOrNull,
  p2: isNumberOrNull,
  p1Score: isNumberOrNull,
  p2Score: isNumberOrNull,
  winner: isNumberOrNull
};
export type Match = FromDefinition<typeof matchDefinition>;
export const isMatch = getTypeChecker(matchDefinition);
export const createMatch = (): Match => {
  return {
    winnerNext: null,
    loserNext: null,
    p1: null,
    p2: null,
    p1Score: null,
    p2Score: null,
    winner: null
  };
}

const tournamentSpecificDefinition = {
  status: (x: unknown): x is 'started' => x === 'started',
  matches: (x: unknown): x is Match[] => isArray(x, isMatch),
  origins(x: unknown): x is Record<number, number[]> {
    // make sure all values of origins are number array
    return isObject(x) && Object.values(x).every(x => isArray(x, isNumber));
  }
}
type TournamentSpeficic = FromDefinition<typeof tournamentSpecificDefinition>;
const checkTournamentSpecific = getTypeChecker(tournamentSpecificDefinition);
export type Tournament = SetupLike & TournamentSpeficic;
export const isTournament = (x: SetupLike): x is Tournament => {
  return checkTournamentSpecific(x);
}

export const winMatch = (
  tournament: Tournament,
  matchId: number,
  winner: 'p1' | 'p2'
) => {
  const distribute = (target: Match, player: number) => {
    if (target.p1 === null) {
      target.p1 = player;
    }
    else if (target.p2 === null) {
      target.p2 = player;
    }
    else {
      throw Error('more than two players joining same match');
    }
  }

  const match = tournament.matches[matchId];
  if (match.p1 === null || match.p2 === null) {
    throw Error('cannot win with null players');
  }

  match.winner = match[winner];
  if (match.winner === null) {
    throw Error('cannot win with null players');
  }

  const loser = winner === 'p1' ? match.p2 : match.p1;
  if (match.winnerNext !== null) {
    distribute(tournament.matches[match.winnerNext], match.winner);
  }
  if (match.loserNext !== null) {
    distribute(tournament.matches[match.loserNext], loser);
  }
}

export const getOrigins = (tournament: Tournament, matches: number[]) =>
  matches
    .reduce((record, m) => {
      const match = tournament.matches[m];
      const setOrAppend = (key: number | null) => {
        if (key !== null) {
          record[key] = (record[key] || []).concat(m);
        }
      };
      setOrAppend(match.winnerNext);
      setOrAppend(match.loserNext);
      return record;
    }, Object.create(null) as Record<number, number[]>);

export const isRounds = (r: unknown): r is number[][] => {
  return isArray(r, (e): e is number[] => isArray(e, isNumber));
}