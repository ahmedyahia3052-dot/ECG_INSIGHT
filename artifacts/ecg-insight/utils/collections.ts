export function safeArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

export function filterArray<T>(
  value: T[] | null | undefined,
  predicate: (item: T, index: number, array: T[]) => boolean,
): T[] {
  return safeArray(value).filter(predicate);
}
