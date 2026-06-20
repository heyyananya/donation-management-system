// Indian numbering: Lakh, Crore. Returns e.g. "Ten Thousand rupees only".
const ones = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen',
];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function twoDigits(n) {
  if (n < 20) return ones[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return o ? `${tens[t]} ${ones[o]}` : tens[t];
}

function threeDigits(n) {
  const h = Math.floor(n / 100);
  const r = n % 100;
  const parts = [];
  if (h) parts.push(`${ones[h]} Hundred`);
  if (r) parts.push(twoDigits(r));
  return parts.join(' ');
}

export function amountToWords(amount) {
  const rupees = Math.floor(Number(amount) || 0);
  const paise = Math.round(((Number(amount) || 0) - rupees) * 100);
  if (rupees === 0 && paise === 0) return 'Zero rupees only';

  const parts = [];
  let n = rupees;
  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  const hundreds = n;

  if (crore) parts.push(`${threeDigits(crore)} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (hundreds) parts.push(threeDigits(hundreds));

  let words = parts.join(' ').replace(/\s+/g, ' ').trim();
  words = `${words} rupees`;
  if (paise) words += ` and ${twoDigits(paise)} paise`;
  return `${words} only`;
}
