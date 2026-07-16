const XLSX = require('xlsx');
const path = require('path');

const filePath = 'd:/GSVR/GSVR/utilitarios-dev/Planilha_FT_RB_DESCRICAO (1).xls';

try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    console.log('--- TEST DATA ---');
    for (let i = 0; i < Math.min(data.length, 15); i++) {
        console.log(`Row ${i}:`, JSON.stringify(data[i]));
    }
} catch (e) {
    console.error('Error reading file:', e.message);
}
