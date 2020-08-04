export type SingleEliminationSettings = {
  mode: 'se';
  hasThirdPlace: boolean;
}

export type DoubleEliminationSettings = {
  mode: 'de';
  hasExtraMatch: boolean;
}

export type Settings = SingleEliminationSettings | DoubleEliminationSettings;

export type Information = {
  organizer: number;
  referees: number[];
  tournamentDate: number;
  name: string;
  description: string;
}

export class Setup {
  status = 'setup' as const;
  information: Information;
  settings: Settings = {
    mode: 'de',
    hasExtraMatch: true
  };
  players: string[] = [];

  constructor(organizer: number) {
    this.information = {
      organizer,
      referees: [],
      tournamentDate: Math.floor(Date.now() / 1000),
      name: '',
      description: ''
    }
  }
}