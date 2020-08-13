import {
  Match,
  Tournament,
  getOrigins,
  isRounds
} from "./tournament";
import { iota, FromDefinition, getTypeChecker } from '@/utils';
import {
  Information,
  isSingleEliminationSettings
} from '@/models/setup';
import isNumber from 'lodash/isNumber';

const seSpecificDefinition = {
  settings: isSingleEliminationSettings,
  winnersRounds: isRounds,
  thirdPlaceMatch(x: unknown): x is number | null {
    return x === null || isNumber(x)
  }
}
type SESpecific = FromDefinition<typeof seSpecificDefinition>;
const checkSESpecific = getTypeChecker(seSpecificDefinition);
export type SingleElimination = Tournament & SESpecific;
export const isSingleElimination = (t: Tournament): t is SingleElimination => {
  return checkSESpecific(t);
}
export const createSingleElimination = (
  information: Information,
  players: string[],
  hasThirdPlace: boolean
): SingleElimination => {
  if (players.length < 2) {
    throw Error('too less players');
  }
  if (players.length < 4 && hasThirdPlace) {
    throw Error('too less players to have third place');
  }

  const se: SingleElimination = {
    status: 'started',
    settings: { mode: 'se', hasThirdPlace },
    information: {
      ...information,
      referees: information.referees.slice()
    },
    players: players.slice(),
    matches: [],
    winnersRounds: [],
    thirdPlaceMatch: null,
    origins: []
  }

  const nearestPowerOf2 = (n: number) => 1 << 31 - Math.clz32(n);
  const powerOfTwo = nearestPowerOf2(se.players.length);
  /*
    round1Players / 2 + round2Players = nearestPowerOf2(total)
    round1Players + round2Players = total
    -> round2Players = total - round1Players
    -> round1Players / 2 + total - round1Players = nearestPowerOf2(total)
    -> round1Players / 2 - round1Players + total = nearestPowerOf2(total)
    -> -round1Players/2 = nearestPowerOf2(total) - total
    -> round1Players = 2 * (total - nearestPowerOf2(total))
  */

  const numberOfRound1Matches = se.players.length - powerOfTwo
  const round1IDs = iota(numberOfRound1Matches);
  se.matches.push(...round1IDs.map(i => {
    const next = round1IDs.length + Math.floor(i / 2)
    return new Match(next)
  }))
  se.winnersRounds.push(round1IDs)

  for (let n = powerOfTwo / 2; n >= 1; n /= 2) {
    const matchIDs = iota(n).map(i => i + se.matches.length);
    const nextRoundFirstID = se.matches.length + n;
    se.matches.push(...iota(n).map(i => {
      const next = n == 1
        ? null
        : nextRoundFirstID + Math.floor(i / 2)
      return new Match(next)
    }))
    se.winnersRounds.push(matchIDs)
  }

  // assign players in the first round
  const round1Begin = se.players.length - numberOfRound1Matches * 2
  for (let i = 0; i < numberOfRound1Matches; ++i) {
    const match = se.matches[i]
    match.p1 = round1Begin + i * 2
    match.p2 = round1Begin + i * 2 + 1
  }

  // asssign remained players in the second round
  let [m] = se.winnersRounds[1].slice(-1)
  for (let p = round1Begin - 1; p >= 0; --p) {
    const match = se.matches[m]
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

  if (se.winnersRounds[0].length == 0) {
    // remove empty round 1
    se.winnersRounds.splice(0, 1)
  }

  if (!hasThirdPlace) {
    se.thirdPlaceMatch = null;
  }
  else {
    se.matches.push(new Match(null));
    se.thirdPlaceMatch = se.matches.length - 1;
    const semifinals = se.winnersRounds.slice(-2)[0];
    if (semifinals.length !== 2) {
      throw new Error('unexpected semifinals length');
    }
    for (const m of semifinals) {
      se.matches[m].loserNext = se.thirdPlaceMatch;
    }
  }

  se.origins = getOrigins(se, iota(se.matches.length));
  return se;
}