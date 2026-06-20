import fs from 'node:fs';
import path from 'node:path';
import { PDFDocument } from 'pdf-lib';

const dir = path.join(process.env.TEMP || 'C:\\Users\\Andy\\AppData\\Local\\Temp', 'dms-pdfs');
for (const t of ['receipt', 'letter', 'thanks-letter']) {
  const file = path.join(dir, `${t}.pdf`);
  if (!fs.existsSync(file)) { console.log(`${t}: missing ${file}`); continue; }
  const doc = await PDFDocument.load(fs.readFileSync(file));
  console.log(`${t}: ${doc.getPageCount()} page(s)  title=${doc.getTitle()}`);
}
