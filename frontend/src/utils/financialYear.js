export function currentFinancialYear(date = new Date()) {
  const y = date.getFullYear();
  const m = date.getMonth();
  const startYear = m >= 3 ? y : y - 1;
  const endShort = String((startYear + 1) % 100).padStart(2, '0');
  return `${startYear}-${endShort}`;
}

export function financialYearOptions(count = 6, anchor = new Date()) {
  const y = anchor.getFullYear();
  const m = anchor.getMonth();
  const startYear = m >= 3 ? y : y - 1;
  const out = [];
  for (let i = -2; i < count - 2; i += 1) {
    const sy = startYear + i;
    const endShort = String((sy + 1) % 100).padStart(2, '0');
    out.push(`${sy}-${endShort}`);
  }
  return out;
}
