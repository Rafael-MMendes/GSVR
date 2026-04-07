const { setupDB } = require('./db');

async function seed() {
  console.log('--- Iniciando Seed do Banco de Dados ---');
  const db = await setupDB();

  try {
    // 1. Limpar tabelas existentes (Ordem reversa de FKs)
    console.log('Limpando tabelas...');
    await db.exec('TRUNCATE TABLE SERVICOS_EXECUTADOS, ESCALA_PLANEJAMENTO, DISPONIBILIDADE_REQUERIMENTO, REQUERIMENTOS, CICLOS, EFETIVO, OPM, users RESTART IDENTITY CASCADE');

    // 2. Popular OPM
    console.log('Populando OPM...');
    const opm = await db.run('INSERT INTO OPM (descricao, sigla, endereco) VALUES (?, ?, ?) RETURNING id_opm', 
      ['9º Batalhão de Polícia Militar', '9º BPM', 'Delmiro Gouveia, AL']);
    const idOpm = opm.lastID || 1;

    // 3. Popular EFETIVO
    console.log('Populando EFETIVO...');
    const militares = [
      { nome: 'Alan Kleber', guerra: 'ALAN', rank: 'CAP', mat: '151197', cpf: '5626561463', opm: '9º BPM', tel: '82999999999', motorista: 'Sim' },
      { nome: 'João Silva', guerra: 'SILVA', rank: 'SGT', mat: '97037', cpf: '7712466416', opm: '9º BPM', tel: '82888888888', motorista: 'Não' },
      { nome: 'Maria Souza', guerra: 'SOUZA', rank: 'CB', mat: '140787', cpf: '2715243405', opm: '9º BPM', tel: '82777777777', motorista: 'Sim' },
      { nome: 'José Oliveira', guerra: 'OLIVEIRA', rank: 'SD', mat: '142423', cpf: '4512828419', opm: '9º BPM', tel: '82666666666', motorista: 'Não' }
    ];

    const milIds = [];
    for (const m of militares) {
      const res = await db.run(
        `INSERT INTO EFETIVO (nome_completo, nome_guerra, posto_graduacao, matricula, cpf, opm, telefone) 
         VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id_militar`,
        [m.nome, m.guerra, m.rank, m.mat, m.cpf, m.opm, m.tel]
      );
      milIds.push({ id: res.lastID, mat: m.mat, cpf: m.cpf });

      // Criar usuário para login
      const isAdmin = ['5626561463', '7712466416', '2715243405', '4512828419'].includes(m.cpf) ? 1 : 0;
      await db.run('INSERT INTO users (numero_ordem, password, is_admin) VALUES (?, ?, ?)', [m.mat, m.cpf, isAdmin]);
    }

    // 4. Popular CICLOS
    console.log('Populando CICLOS...');
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const nextMonth = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}`;

    const cicloAtual = await db.run('INSERT INTO CICLOS (id_opm, referencia_mes_ano, data_inicio, data_fim, status) VALUES (?, ?, ?, ?, ?) RETURNING id_ciclo',
      [idOpm, currentMonth, `${currentMonth}-01`, `${currentMonth}-31`, 'Aberto']);
    
    await db.run('INSERT INTO CICLOS (id_opm, referencia_mes_ano, data_inicio, data_fim, status) VALUES (?, ?, ?, ?, ?) RETURNING id_ciclo',
      [idOpm, nextMonth, `${nextMonth}-01`, `${nextMonth}-31`, 'Aberto']);
    
    const idCiclo = cicloAtual.lastID;

    // Também popular a tabela legado 'months' para retrocompatibilidade
    await db.run('INSERT INTO months (month_key, month_name) VALUES (?, ?)', [currentMonth, 'Mês Atual Seed']);
    await db.run('INSERT INTO months (month_key, month_name) VALUES (?, ?)', [nextMonth, 'Próximo Mês Seed']);

    // 5. Popular REQUERIMENTOS e DISPONIBILIDADE
    console.log('Populando REQUERIMENTOS e DISPONIBILIDADE...');
    const turnos = ['07:00 ÀS 13:00', '13:00 ÀS 19:00', '19:00 ÀS 01:00', '01:00 ÀS 07:00'];
    
    for (const mId of milIds) {
      const req = await db.run('INSERT INTO REQUERIMENTOS (id_militar, id_ciclo) VALUES (?, ?) RETURNING id_requerimento', [mId.id, idCiclo]);
      const idReq = req.lastID;

      // Disponibilidade para os dias 1, 2, 3
      for (let dia = 1; dia <= 3; dia++) {
        const turno = turnos[Math.floor(Math.random() * turnos.length)];
        await db.run(
          `INSERT INTO DISPONIBILIDADE_REQUERIMENTO (id_requerimento, dia_mes, horario_turno, marcado_disponivel) 
           VALUES (?, ?, ?, TRUE)`,
          [idReq, dia, turno]
        );
      }
    }

    // 6. Popular ESCALA_PLANEJAMENTO (Uma guarnição no Dia 1)
    console.log('Populando ESCALA_PLANEJAMENTO...');
    const dia1 = `${currentMonth}-01`;
    
    // Pegar disponibilidades do dia 1
    const disponibilidades = await db.all(`
      SELECT dr.*, r.id_militar 
      FROM DISPONIBILIDADE_REQUERIMENTO dr
      JOIN REQUERIMENTOS r ON dr.id_requerimento = r.id_requerimento
      WHERE dr.dia_mes = 1 AND dr.id_requerimento IN (SELECT id_requerimento FROM REQUERIMENTOS WHERE id_ciclo = ?)
    `, [idCiclo]);

    if (disponibilidades.length >= 2) {
      // Cria uma guarnição com os 2 primeiros
      for (let i = 0; i < Math.min(3, disponibilidades.length); i++) {
        const disp = disponibilidades[i];
        await db.run(
          `INSERT INTO ESCALA_PLANEJAMENTO (id_ciclo, id_militar, id_disponibilidade, data_servico, horario_servico, local_embarque, funcao) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [idCiclo, disp.id_militar, disp.id_disponibilidade, dia1, '07:00 ÀS 13:00 (6h)', 'Guarnição Seed', i === 0 ? 'Comandante' : 'Patrulheiro']
        );
      }
    }

    console.log('--- Seed Concluído com Sucesso! ---');
    console.log('Acessos de Teste (Usuários Seed):');
    militares.forEach(m => console.log(`- Matrícula: ${m.mat} | Senha/CPF: ${m.cpf} | Admin: ${ADMIN_CPFS.includes(m.cpf) ? 'Sim' : 'Não'}`));

  } catch (error) {
    console.error('Erro ao popular banco de dados:', error);
  } finally {
    process.exit(0);
  }
}

const ADMIN_CPFS = ['5626561463', '7712466416', '2715243405', '4512828419'];

seed();
