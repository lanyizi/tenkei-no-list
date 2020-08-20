import { isArray, FromDefinition, getTypeChecker, isNumberOrNull } from '@/utils'
import isNumber from 'lodash/isNumber'
import isString from 'lodash/isString'

const isUnknown = (x: unknown): x is unknown => true // eslint-disable-line
const isArrayOfNumberOfNull = (x: unknown): x is (number | null)[] =>
  isArray(x, isNumberOrNull)

const genericEditDefinition = {
  type: isUnknown,
  previous: isUnknown,
  edited: isUnknown
}
export type GenericEdit = FromDefinition<typeof genericEditDefinition>
export const isGenericEdit = getTypeChecker(genericEditDefinition)

const playerNameEditDefinition = {
  ...genericEditDefinition,
  type: (v: unknown): v is 'nameEdit' => v === 'nameEdit',
  playerId: isNumber,
  previous: isString,
  edited: isString
}
export type PlayerNameEdit = FromDefinition<typeof playerNameEditDefinition>
export const isPlayerNameEdit = getTypeChecker(playerNameEditDefinition)

const scoreEditDefinition = {
  ...genericEditDefinition,
  type: (v: unknown): v is 'scoreEdit' => v === 'scoreEdit',
  matchId: isNumber,
  previous: isArrayOfNumberOfNull,
  edited: isArrayOfNumberOfNull
}
export type ScoreEdit = FromDefinition<typeof scoreEditDefinition>
export const isScoreEdit = getTypeChecker(scoreEditDefinition)

const winnerEditDefinition = {
  ...genericEditDefinition,
  type: (v: unknown): v is 'winnerEdit' => v === 'winnerEdit',
  matchId: isNumber,
  previous: isNumberOrNull,
  edited: isNumberOrNull
}
export type WinnerEdit = FromDefinition<typeof winnerEditDefinition>
export const isWinnerEdit = getTypeChecker(winnerEditDefinition)

export type MatchEdit = ScoreEdit | WinnerEdit
export const isMatchEdit = (x: unknown): x is MatchEdit =>
  isScoreEdit(x) || isWinnerEdit(x)

export type Edit = MatchEdit | PlayerNameEdit
export const isEdit = (x: unknown): x is Edit =>
  isMatchEdit(x) || isPlayerNameEdit(x)

const commitedEditDefinition = {
  tournament: isNumber,
  referee: isNumber,
  date: isNumber,
  edit: isEdit
}
export type CommitedEdit = FromDefinition<typeof commitedEditDefinition>
export const isCommitedEdit = getTypeChecker(commitedEditDefinition)