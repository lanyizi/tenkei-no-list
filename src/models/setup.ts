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
  name: string;
  description: string;
}

export class Setup {
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
      tournamentDate: Date.now(),
      name: '',
      description: ''
    }
  }
}