import lodashHas from 'lodash/has';
import isObject from 'lodash/isObject';

export const nCopies = <T>(n: number, generator: () => T) => {
  return [...Array(n)].map(generator);
}

export const iota = (n: number) => {
  return nCopies<number>(n, () => 0).map((_, i) => i);
}

export const notNull = <T>(x: T | null): x is T => x != null;

export const has = <K extends PropertyKey>(
  object: object,
  path: K
): object is Record<K, unknown> => {
  return lodashHas(object, path);
}

export const isArray = <T>(
  array: unknown,
  elementChecker: (e: unknown) => e is T
): array is T[] => {
  return Array.isArray(array) && array.every(elementChecker);
}

type ExpectedType<T extends (arg: unknown) => unknown> = 
    T extends (arg: unknown) => arg is infer R ? R : never
type Definition = Record<string, (arg: unknown) => unknown>
export type FromDefinition<D extends Definition> = {
  [K in keyof D]: ExpectedType<D[K]>
}
export const getTypeChecker = <D extends Definition>(d: D) => {
  const keys = Object.keys(d) as (keyof Definition)[]
  return (e: unknown): e is FromDefinition<D> => {
    return isObject(e) && keys.every(k => {
      return has(e, k) && d[k](e[k])
    })
  } 
}