import { has as lodashHas } from 'lodash-es';

export const nCopies = <T>(n: number, generator: () => T) => {
  return [...Array(n)].map(generator);
}

export const iota = (n: number) => {
  return nCopies<number>(n, () => 0).map((_, i) => i);
}

export const has = <K extends PropertyKey>(
  object: object,
  path: K
): object is Record<K, unknown>  => {
  return lodashHas(object, path);
}

export const isArray = <T>(
  array: unknown,
  elementChecker: (e: unknown) => e is T
): array is T[] => {
  return Array.isArray(array) && array.every(elementChecker);
}

