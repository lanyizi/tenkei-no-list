import { SingleElimination, createSingleElimination } from './se';
import { DoubleElimination, createDoubleElimination } from './de';
import { Setup } from '@/models/setup';

export type { Tournament, Match } from './tournament';
export { isTournament, winMatch, isMatch, getKeyInNext } from './tournament';
export type { SingleElimination } from './se';
export { isSingleElimination } from './se';
export type { DoubleElimination } from './de';
export { isDoubleElimination } from './de';

export const createFromSetup = (
  setup: Setup
): SingleElimination | DoubleElimination => {
  switch (setup.settings.mode) {
    case 'se':
      return createSingleElimination(
        setup.information,
        setup.players,
        setup.settings.hasThirdPlace
      );
    case 'de':
      return createDoubleElimination(
        setup.information,
        setup.players,
        setup.settings.hasExtraMatch
      );
    default:
      throw Error('Not implemented');
  }
}