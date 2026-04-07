const { setupDB } = require('./db');

async function createAdmin() {
  const db = await setupDB();
  
  const matricula = '999999';
  const cpf = '00000000000';
  const nome = 'Administrador do Sistema';
  const posto = 'Coronel PM';

  try {
    // 1. Inserir no Efetivo
    await db.run(
      'INSERT INTO EFETIVO (nome_completo, nome_guerra, posto_graduacao, matricula, cpf, opm, status_ativo) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT (matricula) DO NOTHING',
      [nome, 'Administrador', posto, matricula, cpf, '9º BPM', true]
    );

    // 2. Inserir no Users como Admin
    const result = await db.run(
      'INSERT INTO users (numero_ordem, password, is_admin) VALUES (?, ?, ?) ON CONFLICT (numero_ordem) DO UPDATE SET is_admin = 1',
      [matricula, cpf, 1]
    );

    console.log(`Usuário Administrador Criado/Atualizado: ${matricula} / Senha: ${cpf}`);
  } catch (err) {
    console.error('Erro ao criar admin:', err.message);
  } finally {
    process.exit();
  }
}

createAdmin();
