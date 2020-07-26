export const nCopies = <T>(n: number, generator: () => T) => {
    return [...Array(n)].map(generator);
}
export const iota = (n: number) => {
    return nCopies<number>(n, () => 0).map((_, i) => i);
}