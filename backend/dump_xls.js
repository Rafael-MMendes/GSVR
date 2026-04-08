const XLSX = require('xlsx');
const path = require('path');

const filePath = 'd:/GSVR/GSVR/utilitarios-dev/Planilha_FT_RB_DESCRICAO (1).xls';

try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    console.log('--- TEST DATA (40 ROWS) ---');
    console.log('Total data length:', data.length);
    for (let i = 0; i < Math.min(data.length, 40); i++) {
        try {
            const row = data[i] || [];
            const normalized = row.map(c => normalizeKey(deepCleanText(c)));
            console.log(`Row ${i}:`, JSON.stringify(row), ' | Normalized:', JSON.stringify(normalized));
        } catch (err) {
            console.log(`Row ${i} Error:`, err.message);
        }
    }

function deepCleanText(text) {
  if (text === undefined || text === null) return "";
  let s = String(text)
    .replace(/&[a-z0-9#]+;/gi, " ") 
    .replace(/[+\-|]{2,}/g, " ")    
    .replace(/\s+/g, " ")           
    .trim();
  if (s === "+" || s === "|" || s === "-") return "";
  return s;
}

function normalizeKey(key) {
  if (key === undefined || key === null) return "";
  const clean = deepCleanText(key);
  return clean.toUpperCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]/g, "");
}
} catch (e) {
    console.error('Error reading file:', e.message);
}
