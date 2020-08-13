import { Match, Tournament, winMatch } from ".";
import { nCopies, iota, FromDefinition, getTypeChecker } from '@/utils';
import { getDesc, getHelpers, MatchDesc, Label } from './desc';
import { getOrigins, isRounds } from './tournament';
import {
  Information,
  isDoubleEliminationSettings
} from '@/models/setup';

const deSpecificDefinition = {
  settings: isDoubleEliminationSettings,
  winnersRounds: isRounds,
  losersRounds: isRounds
}
type DESpecific = FromDefinition<typeof deSpecificDefinition>;
const checkDESpecific = getTypeChecker(deSpecificDefinition);
export type DoubleElimination = Tournament & DESpecific;
export const isDoubleElimination = (t: Tournament): t is DoubleElimination => {
  return checkDESpecific(t);
}
export const createDoubleElimination = (
  information: Information,
  players: string[],
  hasExtraMatch: boolean
): DoubleElimination => {
  if (players.length < 2) {
    throw Error('too less players');
  }
  if (players.length > 64) {
    throw Error('too many players');
  }

  const de: DoubleElimination = {
    status: 'started',
    settings: { mode: 'de', hasExtraMatch },
    information: {
      ...information,
      referees: information.referees.slice()
    },
    players: players.slice(),
    matches: nCopies(127, () => new Match(null)),
    winnersRounds: nCopies(7, () => []),
    losersRounds: nCopies(10, () => []),
    origins: {}
  }

  const setMatchRelationships = (
    desc: MatchDesc,
    descLabel: Label,
    targetRound: number[]
  ) => {
    if (descLabel !== Label.Losers && descLabel !== Label.Winners) {
      throw Error('invalid argument');
    }

    const matches = de.matches;
    const players = desc.players.map(p => {
      const { comp, next } = getHelpers(p);
      return {
        i: p.first,
        setNext(nextIndex: number) {
          if (!comp(this.i)) {
            throw Error('out of range');
          }
          const index = this.i - 1;
          const field = descLabel === Label.Winners || descLabel === p.from
            ? 'winnerNext'
            : 'loserNext';
          matches[index][field] = nextIndex;
          this.i = next(this.i);
        }
      };
    });
    if (players.length > 2) {
      throw Error('unexpected');
    }

    const { comp, next } = getHelpers(desc);
    for (let i = desc.first; comp(i); i = next(i)) {
      const index = i - 1;
      targetRound.push(index);
      players[0].setNext(index);
      players[1 % players.length].setNext(index);
    }
  }

  const { winners, losers } = getDesc();

  for (const desc of winners[1]) {
    const { comp, next } = getHelpers(desc);
    for (let i = desc.first; comp(i); i = next(i)) {
      const index = i - 1;
      const playerIndex = (d: number) => desc.players[d].first - 1;
      de.matches[index].p1 = playerIndex(0);
      de.matches[index].p2 = playerIndex(1);
      de.winnersRounds[0].push(index);
    }
  }

  for (let i = 2; i < winners.length; ++i) {
    for (const desc of winners[i]) {
      const roundIndex = i - 1;
      setMatchRelationships(
        desc,
        Label.Winners,
        de.winnersRounds[roundIndex]
      );
    }
  }

  for (let i = 1; i < losers.length; ++i) {
    for (const desc of losers[i]) {
      const roundIndex = i - 1;
      setMatchRelationships(
        desc,
        Label.Losers,
        de.losersRounds[roundIndex]
      );
    }
  }

  const losersOrigins = getOrigins(de, iota(de.matches.length));
  type Proceeder = (id: number, winner: 'p1' | 'p2') => void;
  const losersProceeder: Proceeder = (id, winner) => {
    const match = de.matches[id];
    if (match.winnerNext === null) {
      throw Error('unexpected');
    }
    if (match[winner] !== null) {
      return winMatch(de, id, winner);
    }

    const pseudoPlayer = winner === 'p1' ? match.p2 : match.p1;
    const otherSource = losersOrigins[id]?.find(m => {
      const match = de.matches[m];
      return [match.p1, match.p2].every(p => p !== pseudoPlayer);
    })
    if (otherSource === undefined) {
      throw Error('unpexpected other source null');
    }
    // loser in otherSource auto wins against pseudo player
    // so it goes to match.winnerNext automatically
    de.matches[otherSource].loserNext = match.winnerNext;
  };

  // Shrink tournament
  const isPseudoPlayer =
    (x: number | null) => x !== null && x >= de.players.length;
  const autoPlay = (rounds: number[][], proceeder: Proceeder) => {
    for (const round of rounds) {
      for (const m of round) {
        const match = de.matches[m];
        if (isPseudoPlayer(match.p1)) {
          proceeder(m, 'p2');
        }
        else if (isPseudoPlayer(match.p2)) {
          proceeder(m, 'p1');
        }
      }
    }
  };
  const roundsFilterer = (rounds: number[][]) => {
    return rounds.map(round => round.filter(m => {
      const match = de.matches[m];
      return [match.p1, match.p2].every(p => !isPseudoPlayer(p));
    })).filter(round => round.length > 0)
  };
  // let real players automatically defeat pseudo players
  autoPlay(de.winnersRounds, (id, winner) => winMatch(de, id, winner));
  autoPlay(de.losersRounds, losersProceeder);
  // remove matches contaning pseudo players
  de.winnersRounds = roundsFilterer(de.winnersRounds);
  de.losersRounds = roundsFilterer(de.losersRounds);
  de.origins = getOrigins(
    de,
    de.winnersRounds.flat().concat(de.losersRounds.flat())
  );
  return de;
}