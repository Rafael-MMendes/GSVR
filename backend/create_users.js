const XLSX = require('xlsx');
const { setupDB } = require('./db');
const path = require('path');

const ADMIN_CPFS = ['5626561463', '7712466416', '2715243405', '4512828419'];

async function createUsers() {
  console.log('Assigning Admin status based on Excel data...');
  const workbook = XLSX.readFile(path.join(__dirname, 'USUARIOS9BPM.xls'));
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  const db = await setupDB();

  let adminsCreated = 0;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const matricula = String(row[5] || '').trim();
    const cpf = String(row[3] || '').trim();

    if (matricula && cpf && ADMIN_CPFS.includes(cpf) && matricula !== 'undefined') {
      try {
        await db.run(
          `UPDATE users SET is_admin = 1 WHERE numero_ordem = ?`,
          [matricula]
        );
        adminsCreated++;
        console.log(`Admin set: ${matricula} (CPF: ${cpf})`);
      } catch (e) {
        console.error('Error setting admin', i, e.message);
      }
    }
  }

  console.log(`Admins successfully registered: ${adminsCreated}`);
  
  const admins = await db.all('SELECT numero_ordem FROM users WHERE is_admin = 1');
  console.log('Admin List in DB:', admins.map(a => a.numero_ordem).join(', '));
  
  process.exit(0);
}

createUsers().catch(err => {
  console.error("Critical Failure:", err);
  process.exit(1);
});
