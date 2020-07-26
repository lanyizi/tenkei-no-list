import Vue from 'vue'
import App from './App.vue'
import { iota } from './utils'

Vue.config.productionTip = false

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

class Round {
  constructor(matches: number[] = [], bestOf = 3) {
    this.bestOf = bestOf
    this.matches = matches
  }
  matches: number[]
  bestOf: number
}

export class Model {
  constructor(players: string[], de: boolean) {
    const nearestPowerOf2 = (n: number) => 1 << 31 - Math.clz32(n)

    this.players = players.slice()
    const powerOfTwo = nearestPowerOf2(this.players.length)
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
    this.winnersBracket = []

    const numberOfRound1Matches = this.players.length - powerOfTwo
    const round1IDs = iota(numberOfRound1Matches);
    this.matches.push(...round1IDs.map(i => {
      const next = round1IDs.length + Math.floor(i / 2)
      return new Match(next)
    }))
    this.winnersBracket.push(new Round(round1IDs))

    for (let n = powerOfTwo / 2; n >= 1; n /= 2) {
      const matchIDs = iota(n).map(i => i + this.matches.length);
      const nextRoundFirstID = this.matches.length + n;
      this.matches.push(...iota(n).map(i => {
        const next = n == 1
          ? null
          : nextRoundFirstID + Math.floor(i / 2)
        return new Match(next)
      }))
      this.winnersBracket.push(new Round(matchIDs))
    }

    // assign players in the first round
    const round1Begin = this.players.length - numberOfRound1Matches * 2
    for (let i = 0; i < numberOfRound1Matches; ++i) {
      const match = this.matches[i]
      match.p1 = round1Begin + i * 2
      match.p2 = round1Begin + i * 2 + 1
    }

    // asssign remained players in the second round
    let [m] = this.winnersBracket[1].matches.slice(-1)
    for (let p = round1Begin - 1; p >= 0; --p) {
      const match = this.matches[m]
      if (match.p2 == null) {
        match.p2 = p
      }
      else {
        if (match.p1 != null) {
          throw 'Logic error'
        }
        match.p1 = p
        --m // another match
      }
    }

    if (this.winnersBracket[0].matches.length == 0) {
      // remove empty round 1
      this.winnersBracket.splice(0, 1)
    }

    // handle double elimination
    if (de) {
      throw 'Not implemented yet'
    }
    this.losersBracket = de ? [] : null
  }

  matches: Match[]
  winnersBracket: Round[]
  losersBracket: Round[] | null
  players: string[]
}

new Vue({
  render: h => h(App),
}).$mount('#app')
