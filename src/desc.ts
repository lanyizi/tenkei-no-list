export enum Label {
  Player,
  Winners,
  Losers
}

type PlayerDesc = {
  from: Label;
  first: number;
  last: number;
}

export type MatchDesc = {
  players: PlayerDesc[]
  first: number;
  last: number;
}

type Helpers = {
  comp: (i: number) => boolean;
  next: (i: number) => number;
}

export const getHelpers = (from: PlayerDesc | MatchDesc): Helpers => {
  if (from.first > from.last) {
    return { comp: i => i >= from.last, next: i => i - 1 }
  }
  else {
    return { comp: i => i <= from.last, next: i => i + 1 }
  }
}

const players = (): [number, number][] => [
  [1, 64],
  [32, 33],
  [16, 49],
  [17, 48],
  [8, 57],
  [25, 40],
  [9, 56],
  [24, 41],
  [4, 64],
  [29, 36],
  [13, 52],
  [20, 45],
  [5, 60],
  [28, 37],
  [12, 53],
  [21, 44],
  [2, 63],
  [31, 34],
  [15, 50],
  [18, 47],
  [7, 58],
  [26, 39],
  [10, 55],
  [23, 42],
  [3, 62],
  [30, 35],
  [14, 51],
  [19, 46],
  [6, 59],
  [27, 38],
  [11, 54],
  [22, 43],
]

export const getDesc = () => {
  const winners: MatchDesc[][] = [[]];
  const losers: MatchDesc[][] = [[]];
  winners[1] = players().map((players, i): MatchDesc => ({
    players: players.map(p => ({
      from: Label.Player,
      first: p,
      last: p
    })),
    first: i + 1,
    last: i + 1
  }))
  winners[2] = [{
    players: [{ from: Label.Winners, first: 1, last: 32 }],
    first: 49,
    last: 64
  }];
  winners[3] = [{
    players: [{ from: Label.Winners, first: 49, last: 64 }],
    first: 89,
    last: 96
  }];
  winners[4] = [{
    players: [{ from: Label.Winners, first: 89, last: 96 }],
    first: 109,
    last: 112
  }];
  winners[5] = [{
    players: [{ from: Label.Winners, first: 109, last: 112 }],
    first: 119,
    last: 120
  }];
  winners[6] = [{
    players: [{ from: Label.Winners, first: 119, last: 120 }],
    first: 124,
    last: 124
  }]
  winners[7] = [{
    players: [
      { from: Label.Winners, first: 124, last: 124 },
      { from: Label.Losers, first: 125, last: 125 }
    ],
    first: 126,
    last: 126
  }]

  losers[1] = [{
    players: [{ from: Label.Winners, first: 1, last: 32 }],
    first: 33,
    last: 48
  }]
  losers[2] = [{
    players: [
      { from: Label.Losers, first: 33, last: 48 },
      { from: Label.Winners, first: 64, last: 49 }
    ],
    first: 80,
    last: 65
  }]
  losers[3] = [{
    players: [{ from: Label.Losers, first: 80, last: 65 }],
    first: 88,
    last: 81
  }]
  losers[4] = [
    {
      players: [
        { from: Label.Losers, first: 88, last: 85 },
        { from: Label.Winners, first: 92, last: 89 }
      ],
      first: 100,
      last: 97
    },
    {
      players: [
        { from: Label.Losers, first: 84, last: 81 },
        { from: Label.Winners, first: 96, last: 93 }
      ],
      first: 104,
      last: 101
    }
  ]
  losers[5] = [
    {
      players: [{ from: Label.Losers, first: 100, last: 97 }],
      first: 106,
      last: 105
    },
    {
      players: [{ from: Label.Losers, first: 104, last: 101 }],
      first: 108,
      last: 107
    }
  ]
  losers[6] = [
    {
      players: [
        { from: Label.Losers, first: 106, last: 105 },
        { from: Label.Winners, first: 111, last: 112 }
      ],
      first: 115,
      last: 116
    },
    {
      players: [
        { from: Label.Losers, first: 108, last: 107 },
        { from: Label.Winners, first: 109, last: 110 }
      ],
      first: 113,
      last: 114
    }
  ]
  losers[7] = [
    {
      players: [{ from: Label.Losers, first: 115, last: 116 }],
      first: 118,
      last: 118
    },
    {
      players: [{ from: Label.Losers, first: 113, last: 114 }],
      first: 117,
      last: 117
    }
  ]
  losers[8] = [
    {
      players: [
        { from: Label.Losers, first: 118, last: 118 },
        { from: Label.Winners, first: 119, last: 119 }
      ],
      first: 121,
      last: 121
    },
    {
      players: [
        { from: Label.Losers, first: 117, last: 117 },
        { from: Label.Winners, first: 120, last: 120 }
      ],
      first: 122,
      last: 122
    }
  ]
  losers[9] = [{
    players: [{ from: Label.Losers, first: 121, last: 122 }],
    first: 123,
    last: 123
  }]
  losers[10] = [{
    players: [
      { from: Label.Losers, first: 123, last: 123 },
      { from: Label.Winners, first: 124, last: 124 }
    ],
    first: 125,
    last: 125
  }]

  test(winners, losers);

  return { winners, losers }
}

const test = (winners: MatchDesc[][], losers: MatchDesc[][]) => {
  const players: (Label.Winners | undefined)[] = [];
  const matches: Label[] = []

  if (winners[1][0].first !== 1 || winners[1][31].last !== 32) {
    throw 'test - unexpected';
  }
  for (const desc of winners[1]) {
    if (desc.first !== desc.last) {
      throw 'test - unexpected';
    }
    if (desc.players.length !== 2) {
      throw 'test - unexpected player size';
    }
    for (const player of desc.players) {
      if (player.from !== Label.Winners) {
        throw 'test - unexpected label';
      }
      if (player.first !== player.last) {
        throw 'test - unexpected';
      }
      if (players[player.first] !== undefined) {
        throw 'test - unexpected already set player';
      }
      players[player.first] = player.from;
    }
    if (matches[desc.first] !== undefined) {
      throw 'test - unexpected match list content';
    }
    matches[desc.first] = Label.Winners;
  }

  if (players.length !== 65) {
    throw 'test - unexpected player list';
  }
  players.forEach((l, i) => {
    if (i == 0) {
      return;
    }
    if (l !== Label.Winners) {
      throw 'test - unexpected player list content';
    }
  })

  for (const descs of winners.slice(2)) {
    if (descs.length !== 1) {
      throw 'test - unexpected';
    }

    const desc = descs[0];
    const { comp, next } = getHelpers(desc);
    for (let i = desc.first; comp(i); i = next(i)) {
      if (matches[i] !== undefined) {
        throw 'test - unexpected match list content';
      }
      matches[i] = Label.Winners;
    }
  }

  for (const descs of losers.slice(1)) {
    if (descs.length !== 1 && descs.length !== 2) {
      throw 'test - unexpected';
    }

    for (const desc of descs) {
      const { comp, next } = getHelpers(desc);
      for (let i = desc.first; comp(i); i = next(i)) {
        if (matches[i] !== undefined) {
          throw 'test - unexpected match list content';
        }
        matches[i] = Label.Losers;
      }
    }
  }

  if (matches.length !== 128) {
    throw 'test - unexpected match list length';
  }
  if (matches.slice(1).some(x => x !== Label.Winners && x !== Label.Losers)) {
    throw 'test - unexpected match list content';
  }

  for (const descs of winners.slice(2)) {
    for (const player of descs[0].players) {
      const { comp, next } = getHelpers(player);
      for (let i = player.first; comp(i); i = next(i)) {
        if (matches[i] !== player.from) {
          throw 'test - unexpected player from - match list'
        }
      }
    }
  }

  for (const descs of losers.slice(1)) {
    for (const desc of descs) {
      for (const player of desc.players) {
        const { comp, next } = getHelpers(player);
        for (let i = player.first; comp(i); i = next(i)) {
          if (matches[i] !== player.from) {
            throw 'test - unexpected player from - match list'
          }
        }
      }
    }
  }
}