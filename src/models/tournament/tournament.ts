import { Information } from '@/models/setup'

export class Match {
  constructor(winnerNext: number | null) {
    this.winnerNext = winnerNext
  }

  winnerNext: number | null
  loserNext: number | null = null
  p1: number | null = null
  p2: number | null = null
  p1Score: number | null = null
  p2Score: number | null = null
  winner: number | null = null
}

export interface Tournament {
  information: Information;
  players: string[];
  matches: Match[];
  winnersRounds: number[][];
  origins: Map<number, number[]>;
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
    .reduce((map, m) => {
      const match = tournament.matches[m];
      const setOrAppend = (key: number | null) => {
        if (key !== null) {
          map.set(key, (map.get(key) || []).concat(m));
        }
      };
      setOrAppend(match.winnerNext);
      setOrAppend(match.loserNext);
      return map;
    }, new Map<number, number[]>());