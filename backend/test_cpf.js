const { setupDB } = require('./db');

async function test() {
    const db = await setupDB();
    const rows = await db.all('SELECT cpf, nome_guerra FROM EFETIVO LIMIT 10');
    console.log('DB CPFs:', JSON.stringify(rows));
    
    const search = '00657269522';
    const found = await db.get('SELECT id_militar FROM EFETIVO WHERE cpf = $1', [search]);
    console.log(`Searching for "${search}"... Found:`, found ? 'YES' : 'NO');
    
    process.exit(0);
}

test();
