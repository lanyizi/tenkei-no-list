import { isArray, FromDefinition, getTypeChecker } from '@/utils';
import isBoolean from 'lodash/isBoolean';
import isNumber from 'lodash/isNumber';
import isString from 'lodash/isString';

const isArrayOfNumber = (x: unknown): x is number[] => isArray(x, isNumber);

const singleEliminationSettingsDefinition = {
  mode: (x: unknown): x is 'se' => x === 'se',
  hasThirdPlace: isBoolean
}
export type SingleEliminationSettings =
  FromDefinition<typeof singleEliminationSettingsDefinition>;
export const isSingleEliminationSettings =
  getTypeChecker(singleEliminationSettingsDefinition);

const doubleEliminationSettingsDefinition = {
  mode: (x: unknown): x is 'de' => x === 'de',
  hasExtraMatch: isBoolean
}
export type DoubleEliminationSettings =
  FromDefinition<typeof doubleEliminationSettingsDefinition>;
export const isDoubleEliminationSettings =
  getTypeChecker(doubleEliminationSettingsDefinition);

export type Settings = SingleEliminationSettings | DoubleEliminationSettings;
export const isSettings = (s: unknown): s is Settings =>
  isSingleEliminationSettings(s) || isDoubleEliminationSettings(s);

const informationDefinition = {
  organizer: isNumber,
  referees: isArrayOfNumber,
  tournamentDate: isNumber,
  name: isString,
  description: isString
};

export type Information = FromDefinition<typeof informationDefinition>;
export const isInformation = getTypeChecker(informationDefinition);

const setupLikeDefinition = {
  status: isString,
  information: isInformation,
  settings: isSettings,
  roundFormats: (r: unknown): r is number[][] => isArray(r, isArrayOfNumber),
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
    hasThirdPlace: false,
  },
  roundFormats: [[]],
  players: []
});