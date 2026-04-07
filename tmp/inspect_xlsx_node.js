const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join('l:', 'Outros computadores', 'Meu computador (1)', 'TCO PM', 'Gestão de Força Tarefa-dev', 'utilitarios-dev', 'efetivo.xlsx');

try {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  console.log('Columns (Row 0):', data[0]);
  console.log('Sample Data (Row 1):', data[1]);
  console.log('Sample Data (Row 2):', data[2]);
} catch (err) {
  console.error('Error reading file:', err.message);
}
