const XLSX = require('xlsx');
const { setupDB } = require('./db');
const path = require('path');

async function importMilitaryData() {
  console.log('Loading Excel file...');
  const workbook = XLSX.readFile(path.join(__dirname, 'USUARIOS9BPM.xls'));
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  console.log('Total rows in file:', data.length);
  
  const db = await setupDB();

  const existingRes = await db.all('SELECT COUNT(*) as count FROM EFETIVO');
  console.log('Current records in EFETIVO:', existingRes[0].count);

  let imported = 0;
  let usersCreated = 0;
  let skipped = 0;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const matricula = String(row[5] || '').trim();
    const cpf = String(row[3] || '').trim();
    const rank = String(row[1] || '').trim();
    const nome_guerra = String(row[10] || '').trim();
    const phone = String(row[25] || '').trim();

    if (matricula && matricula !== 'undefined' && cpf && cpf.length >= 10) {
      try {
        // 1. Inserir no EFETIVO
        await db.run(
          `INSERT INTO EFETIVO (nome_completo, nome_guerra, posto_graduacao, matricula, cpf, telefone) 
           VALUES (?, ?, ?, ?, ?, ?) 
           ON CONFLICT (matricula) 
           DO UPDATE SET nome_completo = EXCLUDED.nome_completo, nome_guerra = EXCLUDED.nome_guerra, posto_graduacao = EXCLUDED.posto_graduacao, cpf = EXCLUDED.cpf, telefone = EXCLUDED.telefone`,
          [`${rank} ${nome_guerra}`, nome_guerra, rank, matricula, cpf, phone]
        );

        // 2. Garantir que tem usuário para login
        await db.run(
          `INSERT INTO users (numero_ordem, password) VALUES (?, ?) ON CONFLICT (numero_ordem) DO NOTHING`,
          [matricula, cpf]
        );
        
        imported++;
        usersCreated++;
      } catch (e) {
        console.error('Error inserting row', i, e.message);
        skipped++;
      }
    } else {
      skipped++;
    }
  }

  console.log(`Militares Importados: ${imported}, Usuários Criados: ${usersCreated}, Pulados: ${skipped}`);
  
  const total = await db.all('SELECT COUNT(*) as count FROM EFETIVO');
  console.log('Total Final no EFETIVO:', total[0].count);
  
  process.exit(0);
}

importMilitaryData().catch(err => {
  console.error("Critical Failure:", err);
  process.exit(1);
});
