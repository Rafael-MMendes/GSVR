const XLSX = require('xlsx');
const path = require('path');

const wb = XLSX.readFile(path.join(__dirname, 'efetivo.xlsx'));
const sheetName = wb.SheetNames[0];
const ws = wb.Sheets[sheetName];

// Linha 1 = cabeçalhos com rawHeaders
const rawHeaders = XLSX.utils.sheet_to_json(ws, { header: 1 })[0];
console.log('\n=== COLUNAS BRUTAS (header row) ===');
rawHeaders.forEach((col, i) => {
  const normalizada = String(col).toUpperCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]/g, "");
  console.log(`[${i}] "${col}" → normalizada: "${normalizada}"`);
});

// Linha 2 = primeira linha de dados
const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
if (rows[1]) {
  console.log('\n=== PRIMEIRA LINHA DE DADOS ===');
  rows[1].forEach((val, i) => {
    console.log(`  col[${i}] = "${val}"`);
  });
}

// Também mostrar como objeto
const data = XLSX.utils.sheet_to_json(ws);
if (data[0]) {
  console.log('\n=== PRIMEIRA LINHA COMO OBJETO (chaves exatas) ===');
  console.log(JSON.stringify(data[0], null, 2));
}
