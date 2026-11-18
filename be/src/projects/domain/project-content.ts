/**
 * Whether two JSON values are the same design data: object key order does not matter and a key holding `undefined`
 * counts as absent (both are lost when the value is written as JSON). One pass over the data, stops at the first
 * difference, no serialisation: the editor sends the whole canvas on every save.
 */
export function sameJson(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    const other = b as unknown[];
    return a.length === other.length && a.every((item, index) => sameJson(item, other[index]));
  }
  const left = definedKeys(a as Record<string, unknown>);
  const right = definedKeys(b as Record<string, unknown>);
  if (left.length !== right.length) return false;
  const objectA = a as Record<string, unknown>;
  const objectB = b as Record<string, unknown>;
  return left.every((key) => objectB[key] !== undefined && sameJson(objectA[key], objectB[key]));
}

const definedKeys = (value: Record<string, unknown>) => Object.keys(value).filter((key) => value[key] !== undefined);
