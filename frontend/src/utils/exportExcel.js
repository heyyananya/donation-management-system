import ExcelJS from 'exceljs';
import { downloadBlob } from './downloadBlob.js';

// columns: [{ label: 'Column Header', value: (row) => cellValue }]
export async function exportToExcel(rows, columns, filename) {
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet('Sheet1');
  sheet.columns = columns.map((c) => ({ header: c.label, key: c.label, width: 22 }));
  rows.forEach((row) => {
    const record = {};
    columns.forEach((c) => { record[c.label] = c.value(row); });
    sheet.addRow(record);
  });
  sheet.getRow(1).font = { bold: true };
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  downloadBlob(blob, filename);
}
