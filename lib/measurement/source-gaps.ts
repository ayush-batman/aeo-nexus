/** Split a legacy "source, action" value without breaking commas in parentheses. */
export function splitSourceGap(value: string): [string, string] {
  let depth = 0;
  for (let index = 0; index < value.length; index += 1) {
    if (value[index] === '(') depth += 1;
    if (value[index] === ')') depth = Math.max(0, depth - 1);
    if (value[index] === ',' && depth === 0) {
      return [value.slice(0, index).trim(), value.slice(index + 1).trim()];
    }
  }
  return [value.trim(), 'Research an authentic contribution.'];
}

