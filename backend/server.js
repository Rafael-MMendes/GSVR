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

app.post('/api/login', async (req, res) => {
  const { numero_ordem, cpf } = req.body;
  try {
    const user = await db.get('SELECT * FROM users WHERE numero_ordem = ?', [numero_ordem]);
    if (!user || user.password !== cpf) return res.status(401).json({ error: "Credenciais invalidas" });
    const military = await db.get('SELECT posto_graduacao, nome_guerra, telefone FROM EFETIVO WHERE matricula = ?', [numero_ordem]);
    res.json({ success: true, is_admin: user.is_admin === 1, user: { id: user.id, numero_ordem, rank: normalizeRank(military?.posto_graduacao), nome_guerra: military?.nome_guerra || '', phone: military?.telefone || '' } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

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
  const military = await db.get('SELECT id_militar FROM EFETIVO WHERE matricula = ?', [numero_ordem]);
  const cycle = await db.get('SELECT id_ciclo FROM CICLOS WHERE referencia_mes_ano = ?', [getCurrentMonthKey()]);
  if (!military || !cycle) return res.status(400).json({ error: "Militar or Ciclo not found" });
  const reqResult = await db.run('INSERT INTO REQUERIMENTOS (id_militar, id_ciclo) VALUES (?, ?)', [military.id_militar, cycle.id_ciclo]);
  for (const [day, shifts] of Object.entries(availability)) { for (const shift of shifts) await db.run('INSERT INTO DISPONIBILIDADE_REQUERIMENTO (id_requerimento, dia_mes, horario_turno, marcado_disponivel) VALUES (?, ?, ?, TRUE)', [reqResult.lastID, parseInt(day), shift]); }
  res.status(201).json({ id: reqResult.lastID });
});

app.delete('/api/volunteers/:id', async (req, res) => { await db.run('DELETE FROM REQUERIMENTOS WHERE id_requerimento = ?', [req.params.id]); res.json({ success: true }); });

app.get('/api/efetivo', async (req, res) => { res.json(await db.all('SELECT * FROM EFETIVO ORDER BY nome_completo ASC')); });

app.post('/api/efetivo/import', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Nenhum arquivo enviado." });
  
  try {
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    
    let stats = { imported: 0, existing: 0, errors: 0 };
    let errorDetails = [];

    for (const row of data) {
      try {
        const matricula = String(row['MATRÍCULA'] || row['Matrícula'] || row['MATRICULA'] || row['Matricula'] || '').trim();
        const cpf = String(row['CPF'] || row['Cpf'] || '').replace(/\D/g, '').trim();
        const nome = row['NOME COMPLETO'] || row['Nome'] || row['Nome Completo'] || '';
        const posto = row['POSTO/GRAD'] || row['Posto'] || row['Graduação'] || 'Militar';

        if (!matricula || !cpf || !nome) {
          stats.errors++;
          errorDetails.push({ militar: nome || 'Desconhecido', error: "Dados obrigatórios ausentes (Matrícula, CPF ou Nome)." });
          continue;
        }

        const check = await db.get('SELECT 1 FROM EFETIVO WHERE matricula = $1', [matricula]);
        if (check) {
          stats.existing++;
          continue;
        }

        await db.run(
          'INSERT INTO EFETIVO (nome_completo, posto_graduacao, matricula, cpf, nome_guerra) VALUES ($1, $2, $3, $4, $1)', 
          [nome, posto, matricula, cpf]
        );
        
        // Criar usuário se não existir
        await db.run(
          'INSERT INTO users (numero_ordem, password, is_admin) VALUES ($1, $2, 0) ON CONFLICT (numero_ordem) DO NOTHING', 
          [matricula, cpf]
        );

        stats.imported++;
      } catch (err) {
        console.error('Erro na linha do Excel:', err);
        stats.errors++;
        errorDetails.push({ militar: row['NOME COMPLETO'] || 'Indefinido', error: err.message });
      }
    }

    res.json({ 
      success: true, 
      message: `${stats.imported} militares importados com sucesso.`,
      stats,
      errorDetails
    });
  } catch (e) {
    console.error('Erro ao ler Excel:', e);
    res.status(500).json({ error: "Falha ao ler o arquivo Excel." });
  }
});


function processMarksLine(line, shiftCode, data) {
  let cleanLine = line.trim();
  if (!cleanLine) return;
  let visual = '';
  for (let i = 0; i < cleanLine.length; i++) visual += (cleanLine[i] === ' ') ? 'V' : cleanLine[i].toUpperCase();
  console.log(`  LINHA: "${cleanLine}"`);
  console.log(`  VISUAL: "${visual}"`);
  let dayCounter = 0;
  for (let i = 0; i < cleanLine.length; i++) {
    const char = cleanLine[i];
    if (char === ' ') { console.log(`  [${i}] V = espaco`); continue; }
    if (dayCounter === 0) { data.motorist = (char.toUpperCase() === 'X') ? 'Sim' : 'Nao'; console.log(`  [${i}] MOTORISTA = ${char} (${data.motorist})`); dayCounter++; }
    else { const dayStr = String(dayCounter).padStart(2, '0'); if (char.toUpperCase() === 'X') { if (!data.availability[dayStr]) data.availability[dayStr] = []; if (!data.availability[dayStr].includes(shiftCode)) data.availability[dayStr].push(shiftCode); console.log(`  [${i}] Dia ${dayStr} = X`); } else if (char.toUpperCase() === 'S') console.log(`  [${i}] Dia ${dayStr} = S`); dayCounter++; if (dayCounter > 31) break; }
  }
}

async function parseRequerimentoPDF(text, db) {
  const data = { numero_ordem: '', name: '', rank: '', phone: '', motorist: 'Nao', availability: {}, month_key: '' };
  const match = text.match(/N\.ORD\.\s*(\d{5,6})/);
  if (match) data.numero_ordem = match[1];
  if (data.numero_ordem && db) { try { const r = await db.query('SELECT posto_graduacao, nome_guerra, telefone FROM EFETIVO WHERE matricula = $1', [data.numero_ordem]); if (r.rows.length) { data.rank = r.rows[0].posto_graduacao; data.name = r.rows[0].nome_guerra; data.phone = r.rows[0].telefone || ''; } } catch (e) { console.error(e); } }
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) { const l = lines[i].trim(); const nl = (i + 1 < lines.length) ? lines[i + 1].trim() : ''; if (l.includes('07:00') && nl === '13:00') processMarksLine(lines[i + 2]?.trim() || '', '07:00 ÀS 13:00', data); if (l.includes('13:00') && nl === '19:00') processMarksLine(lines[i + 2]?.trim() || '', '13:00 ÀS 19:00', data); if (l.includes('19:00') && nl === '01:00') processMarksLine(lines[i + 2]?.trim() || '', '19:00 ÀS 01:00', data); if (l.includes('01:00') && nl === '07:00') processMarksLine(lines[i + 2]?.trim() || '', '01:00 ÀS 07:00', data); }
  return data;
}

app.post('/api/import/volunteers/files', upload.array('files', 100), async (req, res) => {
  const { month_key } = req.body;
  if (!req.files || !month_key) return res.status(400).json({ error: "Invalid request" });
  try {
    const volunteers = [], errors = [];
    for (const file of req.files) {
      try { const pdf = await pdfParser(file.buffer); const parsed = await parseRequerimentoPDF(pdf.text, db); parsed.month_key = month_key; if (parsed.numero_ordem) volunteers.push(parsed); else errors.push({ file: file.originalname, error: "Nao encontrou numero" }); } catch (e) { errors.push({ file: file.originalname, error: e.message }); }
    }
    const results = [];
    for (const item of volunteers) {
      try { const m = await db.get('SELECT id_militar FROM EFETIVO WHERE matricula = ?', [item.numero_ordem]); if (!m) { results.push({ numero_ordem: item.numero_ordem, success: false, error: "Militar nao encontrado" }); continue; } const c = await db.get('SELECT id_ciclo FROM CICLOS WHERE referencia_mes_ano = ?', [item.month_key]); if (!c) { results.push({ numero_ordem: item.numero_ordem, success: false, error: "Ciclo nao encontrado" }); continue; } const existing = await db.get('SELECT id_requerimento FROM REQUERIMENTOS r JOIN CICLOS c ON r.id_ciclo = c.id_ciclo WHERE r.id_militar = ? AND c.referencia_mes_ano = ?', [m.id_militar, item.month_key]); let id_req; if (existing) { id_req = existing.id_requerimento; await db.run('DELETE FROM DISPONIBILIDADE_REQUERIMENTO WHERE id_requerimento = ?', [id_req]); } else { const r = await db.run('INSERT INTO REQUERIMENTOS (id_militar, id_ciclo) VALUES (?, ?)', [m.id_militar, c.id_ciclo]); id_req = r.lastID; } for (const [day, shifts] of Object.entries(item.availability)) { for (const shift of shifts) await db.run('INSERT INTO DISPONIBILIDADE_REQUERIMENTO (id_requerimento, dia_mes, horario_turno, marcado_disponivel) VALUES (?, ?, ?, TRUE)', [id_req, parseInt(day), shift]); } results.push({ numero_ordem: item.numero_ordem, success: true }); } catch (e) { results.push({ numero_ordem: item.numero_ordem, success: false, error: e.message }); } }
    res.json({ success: true, processed: volunteers.length, results, errors: errors.slice(0, 20) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/ciclos', async (req, res) => { res.json(await db.all('SELECT * FROM vw_detalhes_ciclos ORDER BY referencia_mes_ano DESC')); });
app.get('/api/opms', async (req, res) => { res.json(await db.all('SELECT * FROM OPM ORDER BY sigla ASC')); });
app.post('/api/opms', async (req, res) => { const { descricao, sigla } = req.body; if (!descricao || !sigla) return res.status(400).json({ error: "Required" }); const r = await db.run('INSERT INTO OPM (descricao, sigla) VALUES (?, ?)', [descricao, sigla]); res.status(201).json({ success: true, id_opm: r.lastID }); });

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
    const verba_ciclo = 35000.00; // Valor padrão ou configurável

    res.json({
      verba_ciclo,
      total_gasto,
      saldo_restante: verba_ciclo - total_gasto,
      percentual_utilizado: (total_gasto / verba_ciclo) * 100,
      total_servicos_6h: parseInt(stats.t6),
      total_servicos_8h: parseInt(stats.t8),
      valor_6h: v6,
      valor_8h: v8,
      total_militar_servicos: parseInt(stats.total_militar_servicos),
      total_militares_unicos: parseInt(stats.militares_unicos),
      mes_selecionado: month
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/financeiro/detalhado', async (req, res) => {
  try {
    const month = req.query.month || getCurrentMonthKey();
    
    // Gastos diários
    const qDiario = `
      SELECT 
        TO_CHAR(data_servico, 'DD/MM') as data, 
        COUNT(*) as servicos, 
        SUM(CASE WHEN horario_servico LIKE '%8h%' THEN 250.00 ELSE 192.03 END) as gasto
      FROM ESCALA_PLANEJAMENTO ep
      JOIN CICLOS c ON ep.id_ciclo = c.id_ciclo
      WHERE c.referencia_mes_ano = $1
      GROUP BY data_servico
      ORDER BY data_servico ASC
    `;
    const resDiario = await db.query(qDiario, [month]);
    
    // Calcular acumulado
    let acumuladoTotal = 0;
    const detalhes_diarios = resDiario.rows.map(row => {
      const gasto = parseFloat(row.gasto);
      acumuladoTotal += gasto;
      return {
        data: row.data,
        servicos: parseInt(row.servicos),
        gasto: gasto,
        acumulado: acumuladoTotal
      };
    });

    // Top militares
    const qTop = `
      SELECT 
        e.matricula as id, 
        e.nome_guerra as name, 
        COUNT(*) as servicos,
        SUM(CASE WHEN ep.horario_servico LIKE '%8h%' THEN 250.00 ELSE 192.03 END) as gasto
      FROM ESCALA_PLANEJAMENTO ep
      JOIN EFETIVO e ON ep.id_militar = e.id_militar
      JOIN CICLOS c ON ep.id_ciclo = c.id_ciclo
      WHERE c.referencia_mes_ano = $1
      GROUP BY e.matricula, e.nome_guerra
      ORDER BY servicos DESC
      LIMIT 10
    `;
    const resTop = await db.query(qTop, [month]);

    res.json({
      detalhes_diarios,
      top_militares: resTop.rows.map(r => ({
        ...r,
        servicos: parseInt(r.servicos),
        gasto: parseFloat(r.gasto)
      }))
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});