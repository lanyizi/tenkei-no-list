import { has, isArray } from '@/utils'
import isNumber from 'lodash/isNumber'
import isString from 'lodash/isString'
import isNull from 'lodash/isNull'
import isObject from 'lodash/isObject'

type ExpectedType<T extends (arg: unknown) => unknown> = 
    T extends (arg: unknown) => arg is infer R ? R : never
type Definition = Record<string, (arg: unknown) => unknown>
type FromDefinition<D extends Definition> = {
  [K in keyof D]: ExpectedType<D[K]>
}
const getTypeChecker = <D extends Definition>(d: D) => {
  const keys = Object.keys(d) as (keyof Definition)[]
  return (e: unknown): e is FromDefinition<D> => {
    return isObject(e) && keys.every(k => {
      return has(e, k) && d[k](e[k])
    })
  } 
}
const isUnknown = (x: unknown): x is unknown => true || x === x
const isNumberOrNull = (x: unknown): x is number | null => 
  isNumber(x) || isNull(x)
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
  referee: isNumber,
  date: isNumber,
  edit: isEdit
}
export type CommitedEdit = FromDefinition<typeof commitedEditDefinition>
export const isCommitededit = (x: unknown): x is CommitedEdit =>
  getTypeChecker(commitedEditDefinition)(x)

const changesDefinition = {
  changes(x: unknown): x is CommitedEdit[] {
    return isArray(x, isCommitededit)
  }
}
export type Changes = FromDefinition<typeof changesDefinition>
export const isChanges = getTypeChecker(changesDefinition)