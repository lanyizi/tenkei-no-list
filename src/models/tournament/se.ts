import { Match, Tournament, getOrigins } from "./tournament";
import { iota } from '@/utils';
import { Information } from '@/models/setup';

export class SingleElimination implements Tournament {
  status = 'started' as const;
  information: Information;
  matches: Match[];
  winnersRounds: number[][];
  thirdPlaceMatch: number | null;
  origins: Map<number, number[]>;
  players: string[];

  constructor(information: Information, players: string[], hasThirdPlace: boolean) {
    if (players.length < 2) {
      throw Error('too less players');
    }
    if (players.length < 4 && hasThirdPlace) {
      throw Error('too less players to have third place');
    }
    
    this.information = { 
      ...information, 
      referees: information.referees.slice() 
    };
    this.players = players.slice();
    const nearestPowerOf2 = (n: number) => 1 << 31 - Math.clz32(n);
    const powerOfTwo = nearestPowerOf2(this.players.length);
    /*
      round1Players / 2 + round2Players = nearestPowerOf2(total)
      round1Players + round2Players = total
      -> round2Players = total - round1Players
      -> round1Players / 2 + total - round1Players = nearestPowerOf2(total)
      -> round1Players / 2 - round1Players + total = nearestPowerOf2(total)
      -> -round1Players/2 = nearestPowerOf2(total) - total
      -> round1Players = 2 * (total - nearestPowerOf2(total))
    */

    this.matches = []
    this.winnersRounds = []

    const numberOfRound1Matches = this.players.length - powerOfTwo
    const round1IDs = iota(numberOfRound1Matches);
    this.matches.push(...round1IDs.map(i => {
      const next = round1IDs.length + Math.floor(i / 2)
      return new Match(next)
    }))
    this.winnersRounds.push(round1IDs)

    for (let n = powerOfTwo / 2; n >= 1; n /= 2) {
      const matchIDs = iota(n).map(i => i + this.matches.length);
      const nextRoundFirstID = this.matches.length + n;
      this.matches.push(...iota(n).map(i => {
        const next = n == 1
          ? null
          : nextRoundFirstID + Math.floor(i / 2)
        return new Match(next)
      }))
      this.winnersRounds.push(matchIDs)
    }

    // assign players in the first round
    const round1Begin = this.players.length - numberOfRound1Matches * 2
    for (let i = 0; i < numberOfRound1Matches; ++i) {
      const match = this.matches[i]
      match.p1 = round1Begin + i * 2
      match.p2 = round1Begin + i * 2 + 1
    }

    // asssign remained players in the second round
    let [m] = this.winnersRounds[1].slice(-1)
    for (let p = round1Begin - 1; p >= 0; --p) {
      const match = this.matches[m]
      if (match.p2 == null) {
        match.p2 = p
      }
      else {
        if (match.p1 != null) {
          throw Error('Logic error')
        }
        match.p1 = p
        --m // another match
      }
    }

    if (this.winnersRounds[0].length == 0) {
      // remove empty round 1
      this.winnersRounds.splice(0, 1)
    }

    if (!hasThirdPlace) {
      this.thirdPlaceMatch = null;
    }
    else {
      this.matches.push(new Match(null));
      this.thirdPlaceMatch = this.matches.length - 1;
      const semifinals = this.winnersRounds.slice(-2)[0];
      if (semifinals.length !== 2) {
        throw new Error('unexpected semifinals length');
      }
      for (const m of semifinals) {
        this.matches[m].loserNext = this.thirdPlaceMatch;
      }
    }

    this.origins = getOrigins(this, iota(this.matches.length));
  }
}