import { isArray, has, FromDefinition, getTypeChecker } from '@/utils';
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

const setupLikeDefinition = {
  status: isString,
  information: isInformation,
  settings: isSettings,
  players: (x: unknown): x is string[] => isArray(x, isString)
}
export type SetupLike = FromDefinition<typeof setupLikeDefinition>;
export const isSetupLike = getTypeChecker(setupLikeDefinition);

export type Setup = SetupLike & {
  status: 'setup';
};
export const isSetup = (x: SetupLike): x is Setup => x.status === 'setup';
export const createSetup = (organizer: number): Setup => ({
  status: 'setup',
  information: {
    organizer,
    referees: [],
    tournamentDate: Math.floor(Date.now() / 1000),
    name: '',
    description: ''
  },
  settings: {
    mode: 'se',
    hasThirdPlace: false
  },
  players: []
});