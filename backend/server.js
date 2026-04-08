process.env.FORCE_COLOR = '0';
process.env.NO_COLOR = '1';
process.env.TERM = 'dumb';

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const XLSX = require('xlsx');

let pdfParser;
try { pdfParser = require('pdf-parse'); } catch (e) { console.warn('pdf-parse nao disponivel'); }

const { setupDB } = require('./db');
const upload = multer({ storage: multer.memoryStorage() });
const app = express();
const PORT = process.env.PORT || 3001;

const monthNames = ['Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function getCurrentMonthKey() { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`; }
function getMonthName(monthKey) { const [year, month] = monthKey.split('-'); return `${monthNames[parseInt(month) - 1]} / ${year}`; }

const rankMap = { 'Asp Of': 'Aspirante PM', 'Sd': 'Soldado PM', 'Cb': 'Cabo PM', '3º Sgt': '3º Sargento PM', '2º Sgt': '2º Sargento PM', '1º Sgt': '1º Sargento PM', 'Subten': 'Subtenente PM', '2º Ten': '2º Tenente PM', '1º Ten': '1º Tenente PM', 'Cap': 'Capitão PM', 'Maj': 'Major PM', 'Ten Cel': 'Tenente Coronel PM', 'Cel': 'Coronel PM' };
function normalizeRank(rank) { return rankMap[rank] || rank || 'Soldado PM'; }

app.use(cors());
app.use(express.json());

let db;
setupDB().then(database => { db = database; app.listen(PORT, () => console.log(`Backend on http://localhost:${PORT}`)); }).catch(err => console.error("DB error:", err));

// ============================================================
// AUTH
// ============================================================
app.post('/api/login', async (req, res) => {
  const { numero_ordem, cpf } = req.body;
  try {
    const user = await db.get('SELECT * FROM users WHERE numero_ordem = $1', [numero_ordem]);
    if (!user || user.password !== cpf) return res.status(401).json({ error: "Credenciais invalidas" });
    const military = await db.get('SELECT posto_graduacao, nome_guerra, telefone FROM EFETIVO WHERE matricula = $1', [numero_ordem]);
    res.json({ success: true, is_admin: user.is_admin === 1, user: { id: user.id, numero_ordem, rank: normalizeRank(military?.posto_graduacao), nome_guerra: military?.nome_guerra || '', phone: military?.telefone || '' } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// VOLUNTEERS (Requerimentos - via legacy API)
// ============================================================
app.get('/api/volunteers', async (req, res) => {
  const month = req.query.month || getCurrentMonthKey();
  const q = `SELECT r.id_requerimento as id, e.matricula as numero_ordem, e.nome_guerra as name, e.posto_graduacao as rank, e.telefone as phone, c.referencia_mes_ano as month_key, (SELECT json_object_agg(dia_mes, turnos) FROM (SELECT dia_mes, json_agg(horario_turno) as turnos FROM DISPONIBILIDADE_REQUERIMENTO WHERE id_requerimento = r.id_requerimento GROUP BY dia_mes) d) as availability_json FROM REQUERIMENTOS r JOIN EFETIVO e ON r.id_militar = e.id_militar JOIN CICLOS c ON r.id_ciclo = c.id_ciclo WHERE c.referencia_mes_ano = $1 ORDER BY r.data_solicitacao DESC`;
  const { rows } = await db.query(q, [month]);
  res.json(rows.map(v => ({ ...v, availability: v.availability_json || {} })));
});

app.get('/api/months', async (req, res) => { res.json(await db.all('SELECT month_key, month_name FROM months ORDER BY month_key DESC')); });

app.post('/api/volunteers', async (req, res) => {
  const { numero_ordem, name, availability } = req.body;
  if (!numero_ordem || !availability) return res.status(400).json({ error: "Required fields missing" });
  const military = await db.get('SELECT id_militar FROM EFETIVO WHERE matricula = $1', [numero_ordem]);
  const cycle = await db.get('SELECT id_ciclo FROM CICLOS WHERE referencia_mes_ano = $1', [getCurrentMonthKey()]);
  if (!military || !cycle) return res.status(400).json({ error: "Militar or Ciclo not found" });
  const reqResult = await db.run('INSERT INTO REQUERIMENTOS (id_militar, id_ciclo) VALUES ($1, $2)', [military.id_militar, cycle.id_ciclo]);
  for (const [day, shifts] of Object.entries(availability)) {
    for (const shift of shifts) await db.run('INSERT INTO DISPONIBILIDADE_REQUERIMENTO (id_requerimento, dia_mes, horario_turno, marcado_disponivel) VALUES ($1, $2, $3, TRUE)', [reqResult.lastID, parseInt(day), shift]);
  }
  res.status(201).json({ id: reqResult.lastID });
});

app.delete('/api/volunteers/:id', async (req, res) => {
  await db.run('DELETE FROM REQUERIMENTOS WHERE id_requerimento = $1', [req.params.id]);
  res.json({ success: true });
});

// ============================================================
// EFETIVO
// ============================================================
app.get('/api/efetivo', async (req, res) => {
  try {
    res.json(await db.all('SELECT * FROM EFETIVO ORDER BY nome_completo ASC'));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/efetivo', async (req, res) => {
  try {
    const { nome_completo, nome_guerra, posto_graduacao, matricula, cpf, rgpm, opm, telefone, status_ativo } = req.body;
    if (!nome_completo || !posto_graduacao || !matricula || !cpf) return res.status(400).json({ error: "Campos obrigatórios ausentes." });
    const r = await db.run(
      'INSERT INTO EFETIVO (nome_completo, nome_guerra, posto_graduacao, matricula, cpf, rgpm, opm, telefone, status_ativo) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
      [nome_completo, nome_guerra || nome_completo, posto_graduacao, matricula, cpf, rgpm || null, opm || null, telefone || null, status_ativo !== false]
    );
    await db.run('INSERT INTO users (numero_ordem, password, is_admin) VALUES ($1, $2, 0) ON CONFLICT (numero_ordem) DO NOTHING', [matricula, cpf]);
    res.status(201).json({ success: true, id_militar: r.lastID });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/efetivo/:id', async (req, res) => {
  try {
    const { nome_completo, nome_guerra, posto_graduacao, matricula, cpf, rgpm, opm, telefone, status_ativo } = req.body;
    await db.run(
      'UPDATE EFETIVO SET nome_completo=$1, nome_guerra=$2, posto_graduacao=$3, matricula=$4, cpf=$5, rgpm=$6, opm=$7, telefone=$8, status_ativo=$9 WHERE id_militar=$10',
      [nome_completo, nome_guerra, posto_graduacao, matricula, cpf, rgpm || null, opm || null, telefone || null, status_ativo, req.params.id]
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/efetivo/:id', async (req, res) => {
  try {
    const hasReq = await db.get('SELECT 1 FROM REQUERIMENTOS WHERE id_militar = $1', [req.params.id]);
    if (hasReq) return res.status(400).json({ error: "Não é possível excluir: militar possui requerimentos ativos." });
    const hasEscala = await db.get('SELECT 1 FROM ESCALA_PLANEJAMENTO WHERE id_militar = $1', [req.params.id]);
    if (hasEscala) return res.status(400).json({ error: "Não é possível excluir: militar possui escalas registradas." });
    await db.run('DELETE FROM EFETIVO WHERE id_militar = $1', [req.params.id]);
    await db.run('DELETE FROM users WHERE numero_ordem = (SELECT matricula FROM EFETIVO WHERE id_militar = $1)', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Função utilitária: normaliza chave de coluna Excel → string sem acentos/espaços para comparação
function normalizeKey(key) {
  return String(key).toUpperCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]/g, "");
}

// Função utilitária: verifica se o valor é vazio/placeholder
function isEmpty(val) {
  const s = String(val ?? '').trim();
  return !s || s === '-' || s === '--' || s === 'null' || s === 'undefined';
}

// Rota de preview: retorna os cabeçalhos e primeira linha para diagnóstico sem importar
app.post('/api/efetivo/import/preview', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Nenhum arquivo enviado." });
  try {
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
    const headers = rawRows[0] || [];
    const firstRow = rawRows[1] || [];
    const preview = headers.map((h, i) => ({
      index: i,
      header: h,
      normalizado: normalizeKey(h),
      exemplo: firstRow[i] ?? ''
    }));
    res.json({ sheet: sheetName, total_rows: rawRows.length - 1, colunas: preview });
  } catch (e) {
    res.status(500).json({ error: "Falha ao ler o arquivo: " + e.message });
  }
});

app.post('/api/efetivo/import', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Nenhum arquivo enviado." });

  try {
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (data.length === 0) {
      return res.status(400).json({ error: "Arquivo vazio ou sem dados reconhecíveis." });
    }

    // Log das colunas detectadas (ajuda no debug sem travar o sistema)
    const primeiraChave = Object.keys(data[0]);
    console.log('[IMPORT] Colunas detectadas:', primeiraChave.map(k => `"${k}" → "${normalizeKey(k)}"`).join(', '));

    let stats = { imported: 0, existing: 0, skipped: 0, errors: 0 };
    let errorDetails = [];

    for (const row of data) {
      let matricula = '', nrOrdem = '', cpf = '', nome = '', nomeGuerra = '', posto = 'Militar';
      let rgpm = null, opm = null, telefone = null, statusAtivo = true;

      try {
        // Mapear cada coluna pela chave normalizada
        Object.keys(row).forEach(key => {
          const k = normalizeKey(key);
          const rawVal = row[key];
          if (isEmpty(rawVal)) return;
          const val = String(rawVal).trim();

          // Matrícula (campo principal de identificação)
          if (k === 'MATRICULA' || k.startsWith('MATRICUL'))
            matricula = val;

          // Nº Ordem (campo secundário — usado como fallback se MATRICULA estiver ausente)
          else if (k === 'NORDEM' || k === 'NRORDEM' || k === 'NUMEROORDEM')
            nrOrdem = val;

          // CPF
          else if (k === 'CPF')
            cpf = val.replace(/\D/g, '');

          // Nome completo
          else if (k === 'NOMECOMPLETO' || k === 'NOME')
            nome = val;

          // Nome de Guerra
          else if (k.includes('GUERRA'))
            nomeGuerra = val;

          // Posto/Graduação: PG, POSTO, GRAD, POSTOGRAD, POSTOGRADUACAO
          else if (k === 'PG' || k === 'POSTOGRAD' || k === 'POSTOGRADUACAO' ||
                   k.startsWith('POSTO') || k.startsWith('GRAD'))
            posto = val;

          // RGPM
          else if (k === 'RGPM' || k === 'RG' || k === 'RGPOLICIAL' || k === 'REGISTROGERAL')
            rgpm = val;

          // OPM / Lotação
          else if (k === 'OPM' || k === 'LOTACAO' || k === 'UNIDADE' || k === 'SUBUNIDADE')
            opm = val;

          // Telefone
          else if (k === 'TELEFONE' || k === 'CELULAR' || k === 'TEL' || k === 'FONE')
            telefone = val;

          // Status Ativo
          else if (k === 'STATUS' || k === 'SITUACAO' || k === 'CONDICAO') {
            const v = val.toUpperCase();
            statusAtivo = (v === 'ATIVO' || v === 'ATIVA' || v === '1' || v === 'SIM' || v === 'TRUE');
          }
        });

        // Nº Ordem como fallback de matrícula (se MATRICULA não existir na planilha)
        if (!matricula && nrOrdem) matricula = nrOrdem;

        // Fallback nome de guerra → primeiro nome do nome completo
        if (!nomeGuerra && nome) {
          nomeGuerra = nome.split(' ')[0];
        }
        // Garante que nomeGuerra não seja hífen vazio
        if (nomeGuerra === '-' || nomeGuerra === '--') {
          nomeGuerra = nome ? nome.split(' ')[0] : '';
        }

        // Validação dos campos obrigatórios
        if (!matricula || !cpf || !nome) {
          stats.skipped++;
          if (nome || matricula) {
            errorDetails.push({
              militar: nome || `Matrícula ${matricula}` || 'Linha sem dados',
              error: `Campos obrigatórios ausentes — Matrícula: "${matricula}", CPF: "${cpf}", Nome: "${nome}"`
            });
            stats.errors++;
          }
          continue;
        }

        // Verifica existência por matrícula OU cpf
        const existing = await db.get(
          'SELECT id_militar, nome_guerra, posto_graduacao FROM EFETIVO WHERE matricula = $1 OR cpf = $2',
          [matricula, cpf]
        );

        if (existing) {
          // UPSERT: atualiza campos que estão vazios/padrão com os dados corretos da planilha
          const needsUpdate =
            (!existing.nome_guerra || existing.nome_guerra === '-' || existing.nome_guerra === '' || existing.nome_guerra === existing.nome_guerra?.split(' ')[0]) ||
            (!existing.posto_graduacao || existing.posto_graduacao === 'Militar');

          if (needsUpdate) {
            await db.run(
              `UPDATE EFETIVO SET
                nome_guerra = COALESCE(NULLIF($1, ''), nome_guerra),
                posto_graduacao = CASE WHEN posto_graduacao IS NULL OR posto_graduacao = 'Militar' THEN $2 ELSE posto_graduacao END,
                rgpm = COALESCE(NULLIF($3, ''), rgpm),
                opm = COALESCE(NULLIF($4, ''), opm),
                telefone = COALESCE(NULLIF($5, ''), telefone)
              WHERE id_militar = $6`,
              [nomeGuerra, posto, rgpm, opm, telefone, existing.id_militar]
            );
            stats.imported++; // conta como atualizado
          } else {
            stats.existing++;
          }
          continue;
        }

        // Inserção completa com todos os campos da tabela EFETIVO
        await db.run(
          `INSERT INTO EFETIVO
            (nome_completo, nome_guerra, posto_graduacao, matricula, cpf, rgpm, opm, telefone, status_ativo)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [nome, nomeGuerra, posto, matricula, cpf, rgpm, opm, telefone, statusAtivo]
        );

        // Cria o usuário no sistema com senha padrão = CPF
        await db.run(
          'INSERT INTO users (numero_ordem, password, is_admin) VALUES ($1, $2, 0) ON CONFLICT (numero_ordem) DO NOTHING',
          [matricula, cpf]
        );

        stats.imported++;

      } catch (err) {
        stats.errors++;
        console.error('[IMPORT ERROR]', nome || matricula, err.message);
        errorDetails.push({ militar: nome || `Matrícula ${matricula}` || 'Indefinido', error: err.message });
      }
    }

    res.json({
      success: true,
      message: `${stats.imported} militares importados com sucesso.`,
      stats,
      errorDetails: errorDetails.slice(0, 50) // Limita a 50 erros exibidos
    });
  } catch (e) {
    console.error('[IMPORT FATAL]', e.message);
    res.status(500).json({ error: "Falha ao ler o arquivo Excel: " + e.message });
  }
});


// ============================================================
// OPM
// ============================================================
app.get('/api/opms', async (req, res) => {
  try { res.json(await db.all('SELECT * FROM OPM ORDER BY sigla ASC')); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/opms', async (req, res) => {
  try {
    const { descricao, sigla, endereco, telefone, email } = req.body;
    if (!descricao || !sigla) return res.status(400).json({ error: "Sigla e descrição são obrigatórios." });
    const r = await db.run(
      'INSERT INTO OPM (descricao, sigla, endereco, telefone, email) VALUES ($1, $2, $3, $4, $5)',
      [descricao, sigla, endereco || null, telefone || null, email || null]
    );
    res.status(201).json({ success: true, id_opm: r.lastID });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/opms/:id', async (req, res) => {
  try {
    const { descricao, sigla, endereco, telefone, email } = req.body;
    if (!descricao || !sigla) return res.status(400).json({ error: "Sigla e descrição são obrigatórios." });
    await db.run(
      'UPDATE OPM SET descricao=$1, sigla=$2, endereco=$3, telefone=$4, email=$5 WHERE id_opm=$6',
      [descricao, sigla, endereco || null, telefone || null, email || null, req.params.id]
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/opms/:id', async (req, res) => {
  try {
    const hasCiclos = await db.get('SELECT 1 FROM CICLOS WHERE id_opm = $1', [req.params.id]);
    if (hasCiclos) return res.status(400).json({ error: "Não é possível excluir: OPM possui ciclos de escala vinculados." });
    await db.run('DELETE FROM OPM WHERE id_opm = $1', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// CICLOS
// ============================================================
app.get('/api/ciclos', async (req, res) => {
  try { res.json(await db.all('SELECT * FROM vw_detalhes_ciclos ORDER BY referencia_mes_ano DESC')); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/ciclos', async (req, res) => {
  try {
    const { id_opm, referencia_mes_ano, data_inicio, data_fim, status } = req.body;
    if (!referencia_mes_ano || !data_inicio || !data_fim) return res.status(400).json({ error: "Campos obrigatórios ausentes." });
    const r = await db.run(
      'INSERT INTO CICLOS (id_opm, referencia_mes_ano, data_inicio, data_fim, status) VALUES ($1, $2, $3, $4, $5)',
      [id_opm || null, referencia_mes_ano, data_inicio, data_fim, status || 'Aberto']
    );
    res.status(201).json({ success: true, id_ciclo: r.lastID });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/ciclos/:id', async (req, res) => {
  try {
    const { id_opm, referencia_mes_ano, data_inicio, data_fim, status } = req.body;
    if (!referencia_mes_ano || !data_inicio || !data_fim) return res.status(400).json({ error: "Campos obrigatórios ausentes." });
    await db.run(
      'UPDATE CICLOS SET id_opm=$1, referencia_mes_ano=$2, data_inicio=$3, data_fim=$4, status=$5 WHERE id_ciclo=$6',
      [id_opm || null, referencia_mes_ano, data_inicio, data_fim, status || 'Aberto', req.params.id]
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/ciclos/:id', async (req, res) => {
  try {
    const hasReq = await db.get('SELECT 1 FROM REQUERIMENTOS WHERE id_ciclo = $1', [req.params.id]);
    if (hasReq) return res.status(400).json({ error: "Não é possível excluir: Ciclo possui requerimentos ativos." });
    const hasEscala = await db.get('SELECT 1 FROM ESCALA_PLANEJAMENTO WHERE id_ciclo = $1', [req.params.id]);
    if (hasEscala) return res.status(400).json({ error: "Não é possível excluir: Ciclo possui escalas registradas." });
    await db.run('DELETE FROM CICLOS WHERE id_ciclo = $1', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// SERVICOS_EXECUTADOS
// ============================================================
app.get('/api/servicos', async (req, res) => {
  try {
    const { ciclo_id, militar_id } = req.query;
    let q = `
      SELECT se.*, e.nome_guerra, e.matricula, e.posto_graduacao, c.referencia_mes_ano,
             ep.horario_servico, ep.funcao, ep.local_embarque
      FROM SERVICOS_EXECUTADOS se
      JOIN EFETIVO e ON se.id_militar = e.id_militar
      JOIN CICLOS c ON se.id_ciclo = c.id_ciclo
      LEFT JOIN ESCALA_PLANEJAMENTO ep ON se.id_escala = ep.id_escala
      WHERE 1=1
    `;
    const params = [];
    if (ciclo_id) { params.push(ciclo_id); q += ` AND se.id_ciclo = $${params.length}`; }
    if (militar_id) { params.push(militar_id); q += ` AND se.id_militar = $${params.length}`; }
    q += ' ORDER BY se.data_execucao DESC';
    const { rows } = await db.query(q, params);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/servicos', async (req, res) => {
  try {
    const { id_ciclo, id_militar, id_escala, data_execucao, dia_semana, eh_feriado, carga_horaria, valor_remuneracao, status_presenca } = req.body;
    if (!id_ciclo || !id_militar || !data_execucao || !carga_horaria || !status_presenca) {
      return res.status(400).json({ error: "Campos obrigatórios ausentes." });
    }
    // Calcular valor automaticamente se não informado
    const valor = valor_remuneracao || (parseInt(carga_horaria) === 8 ? 250.00 : 192.03);
    const r = await db.run(
      'INSERT INTO SERVICOS_EXECUTADOS (id_ciclo, id_militar, id_escala, data_execucao, dia_semana, eh_feriado, carga_horaria, valor_remuneracao, status_presenca) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
      [id_ciclo, id_militar, id_escala || null, data_execucao, dia_semana || new Date(data_execucao).getDay(), eh_feriado || false, carga_horaria, valor, status_presenca]
    );
    res.status(201).json({ success: true, id_execucao: r.lastID });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/servicos/:id', async (req, res) => {
  try {
    const { data_execucao, dia_semana, eh_feriado, carga_horaria, valor_remuneracao, status_presenca } = req.body;
    const valor = valor_remuneracao || (parseInt(carga_horaria) === 8 ? 250.00 : 192.03);
    await db.run(
      'UPDATE SERVICOS_EXECUTADOS SET data_execucao=$1, dia_semana=$2, eh_feriado=$3, carga_horaria=$4, valor_remuneracao=$5, status_presenca=$6 WHERE id_execucao=$7',
      [data_execucao, dia_semana || new Date(data_execucao).getDay(), eh_feriado || false, carga_horaria, valor, status_presenca, req.params.id]
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/servicos/:id', async (req, res) => {
  try {
    await db.run('DELETE FROM SERVICOS_EXECUTADOS WHERE id_execucao = $1', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// USUARIOS (Gestão de Acesso)
// ============================================================
app.get('/api/usuarios', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT u.id, u.numero_ordem, u.is_admin, u.created_at,
             e.nome_guerra, e.posto_graduacao, e.nome_completo
      FROM users u
      LEFT JOIN EFETIVO e ON u.numero_ordem = e.matricula
      ORDER BY u.is_admin DESC, e.nome_completo ASC
    `);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/usuarios/:id/admin', async (req, res) => {
  try {
    const { is_admin } = req.body;
    await db.run('UPDATE users SET is_admin=$1 WHERE id=$2', [is_admin ? 1 : 0, req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/usuarios/:id/senha', async (req, res) => {
  try {
    // Reset para o CPF do militar (padrão do sistema)
    const user = await db.get('SELECT numero_ordem FROM users WHERE id = $1', [req.params.id]);
    if (!user) return res.status(404).json({ error: "Usuário não encontrado." });
    const efetivo = await db.get('SELECT cpf FROM EFETIVO WHERE matricula = $1', [user.numero_ordem]);
    if (!efetivo) return res.status(404).json({ error: "Militar não encontrado." });
    await db.run('UPDATE users SET password=$1 WHERE id=$2', [efetivo.cpf, req.params.id]);
    res.json({ success: true, message: "Senha resetada para o CPF do militar." });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// FINANCEIRO
// ============================================================
app.get('/api/financeiro/resumo', async (req, res) => {
  try {
    const month = req.query.month || getCurrentMonthKey();
    const q = `
      SELECT
        COUNT(*) FILTER (WHERE horario_servico LIKE '%6h%') as t6,
        COUNT(*) FILTER (WHERE horario_servico LIKE '%8h%') as t8,
        COUNT(DISTINCT id_militar) as militares_unicos,
        COUNT(*) as total_militar_servicos
      FROM ESCALA_PLANEJAMENTO ep
      JOIN CICLOS c ON ep.id_ciclo = c.id_ciclo
      WHERE c.referencia_mes_ano = $1
    `;
    const { rows } = await db.query(q, [month]);
    const stats = rows[0] || { t6: 0, t8: 0, militares_unicos: 0, total_militar_servicos: 0 };
    const v6 = 192.03;
    const v8 = 250.00;
    const total_gasto = (parseInt(stats.t6) * v6) + (parseInt(stats.t8) * v8);
    const verba_ciclo = 35000.00;
    res.json({
      verba_ciclo, total_gasto,
      saldo_restante: verba_ciclo - total_gasto,
      percentual_utilizado: verba_ciclo > 0 ? (total_gasto / verba_ciclo) * 100 : 0,
      total_servicos_6h: parseInt(stats.t6),
      total_servicos_8h: parseInt(stats.t8),
      valor_6h: v6, valor_8h: v8,
      total_militar_servicos: parseInt(stats.total_militar_servicos),
      total_militares_unicos: parseInt(stats.militares_unicos),
      mes_selecionado: month
    });
  } catch (e) { console.error(e); res.status(500).json({ error: e.message }); }
});

app.get('/api/financeiro/detalhado', async (req, res) => {
  try {
    const month = req.query.month || getCurrentMonthKey();
    const qDiario = `
      SELECT TO_CHAR(data_servico, 'DD/MM') as data,
             COUNT(*) as servicos,
             SUM(CASE WHEN horario_servico LIKE '%8h%' THEN 250.00 ELSE 192.03 END) as gasto
      FROM ESCALA_PLANEJAMENTO ep
      JOIN CICLOS c ON ep.id_ciclo = c.id_ciclo
      WHERE c.referencia_mes_ano = $1
      GROUP BY data_servico ORDER BY data_servico ASC
    `;
    const resDiario = await db.query(qDiario, [month]);
    let acumuladoTotal = 0;
    const detalhes_diarios = resDiario.rows.map(row => {
      const gasto = parseFloat(row.gasto);
      acumuladoTotal += gasto;
      return { data: row.data, servicos: parseInt(row.servicos), gasto, acumulado: acumuladoTotal };
    });

    const qTop = `
      SELECT e.matricula as id, e.nome_guerra as name,
             COUNT(*) as servicos,
             SUM(CASE WHEN ep.horario_servico LIKE '%8h%' THEN 250.00 ELSE 192.03 END) as gasto
      FROM ESCALA_PLANEJAMENTO ep
      JOIN EFETIVO e ON ep.id_militar = e.id_militar
      JOIN CICLOS c ON ep.id_ciclo = c.id_ciclo
      WHERE c.referencia_mes_ano = $1
      GROUP BY e.matricula, e.nome_guerra
      ORDER BY servicos DESC LIMIT 10
    `;
    const resTop = await db.query(qTop, [month]);
    res.json({
      detalhes_diarios,
      top_militares: resTop.rows.map(r => ({ ...r, servicos: parseInt(r.servicos), gasto: parseFloat(r.gasto) }))
    });
  } catch (e) { console.error(e); res.status(500).json({ error: e.message }); }
});

// ============================================================
// PDF IMPORT (Requerimentos via PDF)
// ============================================================
function processMarksLine(line, shiftCode, data) {
  let cleanLine = line.trim();
  if (!cleanLine) return;
  let dayCounter = 0;
  for (let i = 0; i < cleanLine.length; i++) {
    const char = cleanLine[i];
    if (char === ' ') continue;
    if (dayCounter === 0) { data.motorist = (char.toUpperCase() === 'X') ? 'Sim' : 'Nao'; dayCounter++; }
    else { const dayStr = String(dayCounter).padStart(2, '0'); if (char.toUpperCase() === 'X') { if (!data.availability[dayStr]) data.availability[dayStr] = []; if (!data.availability[dayStr].includes(shiftCode)) data.availability[dayStr].push(shiftCode); } dayCounter++; if (dayCounter > 31) break; }
  }
}

async function parseRequerimentoPDF(text, db) {
  const data = { numero_ordem: '', name: '', rank: '', phone: '', motorist: 'Nao', availability: {}, month_key: '' };
  const match = text.match(/N\.ORD\.\s*(\d{5,6})/);
  if (match) data.numero_ordem = match[1];
  if (data.numero_ordem && db) {
    try {
      const r = await db.query('SELECT posto_graduacao, nome_guerra, telefone FROM EFETIVO WHERE matricula = $1', [data.numero_ordem]);
      if (r.rows.length) { data.rank = r.rows[0].posto_graduacao; data.name = r.rows[0].nome_guerra; data.phone = r.rows[0].telefone || ''; }
    } catch (e) { console.error(e); }
  }
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim(); const nl = (i + 1 < lines.length) ? lines[i + 1].trim() : '';
    if (l.includes('07:00') && nl === '13:00') processMarksLine(lines[i + 2]?.trim() || '', '07:00 ÀS 13:00', data);
    if (l.includes('13:00') && nl === '19:00') processMarksLine(lines[i + 2]?.trim() || '', '13:00 ÀS 19:00', data);
    if (l.includes('19:00') && nl === '01:00') processMarksLine(lines[i + 2]?.trim() || '', '19:00 ÀS 01:00', data);
    if (l.includes('01:00') && nl === '07:00') processMarksLine(lines[i + 2]?.trim() || '', '01:00 ÀS 07:00', data);
  }
  return data;
}

app.post('/api/import/volunteers/files', upload.array('files', 100), async (req, res) => {
  const { month_key } = req.body;
  if (!req.files || !month_key) return res.status(400).json({ error: "Invalid request" });
  try {
    const volunteers = [], errors = [];
    for (const file of req.files) {
      try {
        const pdf = await pdfParser(file.buffer);
        const parsed = await parseRequerimentoPDF(pdf.text, db);
        parsed.month_key = month_key;
        if (parsed.numero_ordem) volunteers.push(parsed);
        else errors.push({ file: file.originalname, error: "Nao encontrou numero" });
      } catch (e) { errors.push({ file: file.originalname, error: e.message }); }
    }
    const results = [];
    for (const item of volunteers) {
      try {
        const m = await db.get('SELECT id_militar FROM EFETIVO WHERE matricula = $1', [item.numero_ordem]);
        if (!m) { results.push({ numero_ordem: item.numero_ordem, success: false, error: "Militar nao encontrado" }); continue; }
        const c = await db.get('SELECT id_ciclo FROM CICLOS WHERE referencia_mes_ano = $1', [item.month_key]);
        if (!c) { results.push({ numero_ordem: item.numero_ordem, success: false, error: "Ciclo nao encontrado" }); continue; }
        const existing = await db.get('SELECT id_requerimento FROM REQUERIMENTOS r JOIN CICLOS c ON r.id_ciclo = c.id_ciclo WHERE r.id_militar = $1 AND c.referencia_mes_ano = $2', [m.id_militar, item.month_key]);
        let id_req;
        if (existing) {
          id_req = existing.id_requerimento;
          await db.run('DELETE FROM DISPONIBILIDADE_REQUERIMENTO WHERE id_requerimento = $1', [id_req]);
        } else {
          const r = await db.run('INSERT INTO REQUERIMENTOS (id_militar, id_ciclo) VALUES ($1, $2)', [m.id_militar, c.id_ciclo]);
          id_req = r.lastID;
        }
        for (const [day, shifts] of Object.entries(item.availability)) {
          for (const shift of shifts) await db.run('INSERT INTO DISPONIBILIDADE_REQUERIMENTO (id_requerimento, dia_mes, horario_turno, marcado_disponivel) VALUES ($1, $2, $3, TRUE)', [id_req, parseInt(day), shift]);
        }
        results.push({ numero_ordem: item.numero_ordem, success: true });
      } catch (e) { results.push({ numero_ordem: item.numero_ordem, success: false, error: e.message }); }
    }
    res.json({ success: true, processed: volunteers.length, results, errors: errors.slice(0, 20) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});