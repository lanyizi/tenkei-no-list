import { Match, Tournament, winMatch } from ".";
import { nCopies, iota } from '@/utils';
import { getDesc, getHelpers, MatchDesc, Label } from './desc';
import { getOrigins } from './tournament';
import { Information } from '@/models/setup';

export class DoubleElimination implements Tournament {
  information: Information;
  players: string[];
  matches: Match[];
  winnersRounds: number[][];
  losersRounds: number[][];
  origins: Map<number, number[]>;

  constructor(information: Information, players: string[]) {
    if (players.length < 2) {
      throw Error('too less players');
    }
    if (players.length > 64) {
      throw Error('too many players');
    }
    this.information = { 
      ...information, 
      referees: information.referees.slice() 
    };
    this.players = players.slice();
    this.matches = nCopies(127, () => new Match(null));
    this.winnersRounds = nCopies(7, () => []);
    this.losersRounds = nCopies(10, () => []);

    const setMatchRelationships = (
      desc: MatchDesc,
      descLabel: Label,
      targetRound: number[]
    ) => {
      if (descLabel !== Label.Losers && descLabel !== Label.Winners) {
        throw Error('invalid argument');
      }

      const matches = this.matches;
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
        this.matches[index].p1 = playerIndex(0);
        this.matches[index].p2 = playerIndex(1);
        this.winnersRounds[0].push(index);
      }
    }

    for (let i = 2; i < winners.length; ++i) {
      for (const desc of winners[i]) {
        const roundIndex = i - 1;
        setMatchRelationships(
          desc,
          Label.Winners,
          this.winnersRounds[roundIndex]
        );
      }
    }

    for (let i = 1; i < losers.length; ++i) {
      for (const desc of losers[i]) {
        const roundIndex = i - 1;
        setMatchRelationships(
          desc,
          Label.Losers,
          this.losersRounds[roundIndex]
        );
      }
    }

    const losersOrigins = getOrigins(this, iota(this.matches.length));
    type Proceeder = (id: number, winner: 'p1' | 'p2') => void;
    const losersProceeder: Proceeder = (id, winner) => {
      const match = this.matches[id];
      if (match.winnerNext === null) {
        throw Error('unexpected');
      }
      if (match[winner] !== null) {
        return winMatch(this, id, winner);
      }

      const pseudoPlayer = winner === 'p1' ? match.p2 : match.p1;
      const otherSource = losersOrigins.get(id)?.find(m => {
        const match = this.matches[m];
        return [match.p1, match.p2].every(p => p !== pseudoPlayer);
      })
      if (otherSource === undefined) {
        throw Error('unpexpected other source null');
      }
      const next = this.matches[match.winnerNext];
      // loser in otherSource auto wins against pseudo player
      // so it goes to match.winnerNext automatically
      this.matches[otherSource].loserNext = match.winnerNext;
    };

    // Shrink tournament
    const isPseudoPlayer =
      (x: number | null) => x !== null && x >= this.players.length;
    const autoPlay = (rounds: number[][], proceeder: Proceeder) => {
      for (const round of rounds) {
        for (const m of round) {
          const match = this.matches[m];
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
        const match = this.matches[m];
        return [match.p1, match.p2].every(p => !isPseudoPlayer(p));
      })).filter(round => round.length > 0)
    };
    // let real players automatically defeat pseudo players
    autoPlay(this.winnersRounds, (id, winner) => winMatch(this, id, winner));
    autoPlay(this.losersRounds, losersProceeder);
    // remove matches contaning pseudo players
    this.winnersRounds = roundsFilterer(this.winnersRounds);
    this.losersRounds = roundsFilterer(this.losersRounds);
    this.origins = getOrigins(
      this, 
      this.winnersRounds.flat().concat(this.losersRounds.flat())
    );
  }
}