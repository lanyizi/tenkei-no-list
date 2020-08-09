import { SingleElimination } from './se';
import { DoubleElimination } from './de';
import { Setup } from '@/models/setup';

export type { Tournament } from './tournament';
export { Match, winMatch, isMatch } from './tournament';
export { SingleElimination } from './se';
export { DoubleElimination } from './de';

export const createFromSetup = (
  setup: Setup
): SingleElimination | DoubleElimination => {
  switch(setup.settings.mode) {
    case 'se':
      return new SingleElimination(
        setup.information, 
        setup.players, 
        setup.settings.hasThirdPlace
      );
    case 'de':
      return new DoubleElimination(
        setup.information,
        setup.players,
        setup.settings.hasExtraMatch
      );
    default:
      throw Error('Not implemented');
  }
}