// Snake_case <-> camelCase row mappers. The service layer speaks camelCase
// (matching the JSON repos) so the Postgres repos translate at the boundary.

export const toCamel = (s) => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
export const toSnake = (s) => s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);

export function rowToObject(row) {
  if (!row) return null;
  const out = {};
  for (const k of Object.keys(row)) out[toCamel(k)] = row[k];
  return out;
}

// Returns INSERT parts for a row: column list, placeholder list, value array.
export function insertParts(obj, allowedCols) {
  const cols = [];
  const placeholders = [];
  const values = [];
  let i = 1;
  for (const key of Object.keys(obj)) {
    const col = toSnake(key);
    if (allowedCols && !allowedCols.includes(col)) continue;
    cols.push(`"${col}"`);
    placeholders.push(`$${i}`);
    values.push(obj[key]);
    i += 1;
  }
  return { cols, placeholders, values };
}

export function updateParts(obj, allowedCols, startIndex = 1) {
  const sets = [];
  const values = [];
  let i = startIndex;
  for (const key of Object.keys(obj)) {
    const col = toSnake(key);
    if (allowedCols && !allowedCols.includes(col)) continue;
    sets.push(`"${col}" = $${i}`);
    values.push(obj[key]);
    i += 1;
  }
  return { sets, values, nextIndex: i };
}
