type SingleEliminationSettings = {
  mode: 'se';
  hasThirdPlace: boolean;
}

type DoubleEliminationSettings = {
  mode: 'de';
  hasExtraMatch: boolean;
}

type Settings = SingleEliminationSettings | DoubleEliminationSettings;

export type Information = {
  organizer: number;
  referees: number[];
  tournamentDate: number;
  description: string;
}

export class Setup {
  info: Information;
  settings: Settings = {
    mode: 'de',
    hasExtraMatch: true
  };
  players: string[] = [];

  constructor(organizer: number) {
    this.info = {
      organizer,
      referees: [],
      tournamentDate: Date.now(),
      description: ''
    }
  }
}