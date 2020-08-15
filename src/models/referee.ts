import isString from 'lodash/isString'
import { FromDefinition, getTypeChecker } from '@/utils'

const refereeDefinition = {
  username: isString,
  hash: isString
}
export type Referee = FromDefinition<typeof refereeDefinition>
export const isReferee = getTypeChecker(refereeDefinition)

const preRefereeDefinition = {
  username: isString,
  password: isString
}
export type PreReferee = FromDefinition<typeof preRefereeDefinition>
export const isPreReferee = getTypeChecker(preRefereeDefinition)