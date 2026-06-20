// Brute decompress every FlateDecode stream in the PDF and grep for text literals.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const file = process.argv[2] || path.join(process.env.TEMP || '.', 'dms-pdfs', 'r100k.pdf');
const buf = fs.readFileSync(file);
const text = buf.toString('binary');
const streamRe = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
let m;
let i = 0;
while ((m = streamRe.exec(text))) {
  i += 1;
  const raw = Buffer.from(m[1], 'binary');
  let body;
  try { body = zlib.inflateSync(raw).toString('latin1'); }
  catch { body = raw.toString('latin1'); }
  // Pull literal strings rendered via Tj operators (single- or array-form TJ).
  const lits = [...body.matchAll(/\(((?:\\.|[^()\\])*)\)\s*Tj/g)].map((x) => x[1]);
  if (lits.length) {
    console.log(`Stream ${i}: ${lits.length} string(s)`);
    lits.forEach((s) => console.log('  ' + JSON.stringify(s.replace(/\\(.)/g, '$1'))));
  }
}
