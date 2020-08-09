import { isArray, has } from '@/utils';
import isBoolean from 'lodash/isBoolean';
import isNumber from 'lodash/isNumber';
import isObject from 'lodash/isObject';
import isString from 'lodash/isString';

export type SingleEliminationSettings = {
  mode: 'se';
  hasThirdPlace: boolean;
}
export const isSingleEliminationSettings = (
  s: unknown
): s is SingleEliminationSettings => {
  return isObject(s) &&
    has(s, 'mode') && s.mode === 'se' &&
    has(s, 'hasThirdPlace') && isBoolean(s.hasThirdPlace);
}

export type DoubleEliminationSettings = {
  mode: 'de';
  hasExtraMatch: boolean;
}
export const isDoubleEliminationSettings = (
  s: unknown
): s is DoubleEliminationSettings => {
  return isObject(s) &&
    has(s, 'mode') && s.mode === 'de' &&
    has(s, 'hasExtraMatch') && isBoolean(s.hasExtraMatch);
}

export type Settings = SingleEliminationSettings | DoubleEliminationSettings;
export const isSettings = (s: unknown): s is Settings =>
  isSingleEliminationSettings(s) || isDoubleEliminationSettings(s);

export type Information = {
  organizer: number;
  referees: number[];
  tournamentDate: number;
  name: string;
  description: string;
}
export const isInformation = (info: unknown): info is Information => {
  if (!isObject(info)) {
    return false;
  }

  if (!has(info, 'referees') || !isArray(info.referees, isNumber)) {
    return false;
  }
  type Tuple = [keyof Information, 'string' | 'number'];
  const fields: Tuple[] = [
    ['name', 'string'],
    ['description', 'string'],
    ['organizer', 'number'],
    ['organizer', 'number'],
  ];
  return fields.every(<T extends Tuple>([k, t]: T) => {
    return has(info, k) && typeof info[k] === t;
  });
}

export class Setup {
  status: 'setup' | 'started' = 'setup'
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
export const isSetup = (t: unknown): t is Setup => {
  if (!isObject(t)) {
    console.log('not object')
    return false;
  }
  console.log('object: ', t)

  const checks = [
    ['status', (s: unknown) => s === 'setup' || s === 'started'],
    ['information', isInformation],
    ['settings', isSettings],
    ['players', (players: unknown) => isArray(players, isString)]
  ] as const;

  return checks.every(([k, f]) => {
    if(has(t, k) && f(t[k])) {
      return true;
    }
    console.log('not satisfied: ' + k)
    return false;
  });
}