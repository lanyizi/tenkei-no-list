import { Match } from "./main";
import { iota, nCopies } from './utils';
import { getDesc, getHelpers, MatchDesc, Label } from './desc';

export class Tournament {
  players: string[];
  matches: Match[];
  winnersRounds: number[][];
  losersRounds: number[][];

  constructor(players: string[]) {
    if (players.length > 64) {
      throw 'too many players';
    }
    this.players = players.slice();
    this.matches = nCopies(64, () => new Match(null));
    this.winnersRounds = nCopies(7, () => []);
    this.losersRounds = nCopies(10, () => []);

    const setMatchRelationships = (
      desc: MatchDesc,
      descLabel: Label,
      targetRound: number[]
    ) => {
      if (descLabel !== Label.Losers && descLabel !== Label.Winners) {
        throw 'invalid argument';
      }

      const matches = this.matches;
      const players = desc.players.map(p => {
        const { comp, next } = getHelpers(p);
        return {
          i: p.first,
          setNext(nextIndex: number) {
            if (!comp(this.i)) {
              throw 'out of range';
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
        throw 'unexpected';
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
        this.matches[i].p1 = desc.players[0].first;
        this.matches[i].p2 = desc.players[1].first;
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

    // Shrink tournament
    const roundsFilterer = (rounds: number[][]) => {
      return rounds.map(round => round.filter(m => {
        const match = this.matches[m];
        const isPseudoPlayer =
          (x: number | null) => x !== null && x >= this.players.length;
        if (isPseudoPlayer(match.p1)) {
          this.winMatch(match, 'p2');
          return false;
        }
        else if (isPseudoPlayer(match.p2)) {
          this.winMatch(match, 'p1');
          return false;
        }
        return true;
      })).filter(round => round.length > 0)
    };
    this.winnersRounds = roundsFilterer(this.winnersRounds);
    this.losersRounds = roundsFilterer(this.losersRounds);
  }

  winMatch(match: Match, winner: 'p1' | 'p2') {
    const distribute = (target: Match, player: number) => {
      if (target.p1 === null) {
        target.p1 = player;
      }
      else if (target.p2 === null) {
        target.p2 = player;
      }
      else {
        throw 'more than two players joining same match';
      }
    }

    if (match.p1 === null || match.p2 === null) {
      throw 'cannot win with null players';
    }

    match.winner = match[winner];
    if (match.winner === null) {
      throw 'cannot win with null players';
    }

    const loser = winner === 'p1' ? match.p2 : match.p1;
    if (match.winnerNext !== null) {
      distribute(this.matches[match.winnerNext], match.winner);
    }
    if (match.loserNext !== null) {
      distribute(this.matches[match.loserNext], loser);
    }
  }
}