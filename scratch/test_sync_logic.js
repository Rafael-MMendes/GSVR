const XLSX = require('./backend/node_modules/xlsx');
const path = require('path');
const fs = require('fs');

const rankMap = { 
  'CEL': 'CEL PM', 'CEL PM': 'CEL PM',
  'TC': 'TC PM', 'TEN CEL': 'TC PM', 'TC PM': 'TC PM',
  'MAJ': 'MAJ PM', 'MAJ PM': 'MAJ PM',
  'CAP': 'CAP PM', 'CAP PM': 'CAP PM',
  '1º TEN': '1º TEN PM', '1º TEN PM': '1º TEN PM',
  '2º TEN': '2º TEN PM', '2º TEN PM': '2º TEN PM',
  'SUB': 'SUB PM', 'SUB PM': 'SUB PM', 'SUBTEN': 'SUB PM',
  '1º SGT': '1º SGT PM', '1º SGT PM': '1º SGT PM',
  '2º SGT': '2º SGT PM', '2º SGT PM': '2º SGT PM',
  '3º SGT': '3º SGT PM', '3º SGT PM': '3º SGT PM',
  'CB': 'CB PM', 'CABO': 'CB PM', 'CB PM': 'CB PM',
  'SD': 'SD PM', 'SOLDADO': 'SD PM', 'SD PM': 'SD PM',
  'ASP': 'ASP PM', 'ASP PM': 'ASP PM', 'ASP OF': 'ASP PM'
};

function normalizeRank(rank) {
  if (!rank) return 'SD PM';
  const r = String(rank).toUpperCase().trim();
  if (rankMap[r]) return rankMap[r];
  if (r.includes('CORONEL') || r === 'CEL') return 'CEL PM';
  if (r.includes('TENENTE CORONEL') || r.includes('TC PM') || r === 'TC') return 'TC PM';
  if (r.includes('MAJOR') || r === 'MAJ') return 'MAJ PM';
  if (r.includes('CAPIT') || r === 'CAP') return 'CAP PM';
  if (r.match(/1.?\s*TEN/) || r.includes('PRIMEIRO TENENTE')) return '1º TEN PM';
  if (r.match(/2.?\s*TEN/) || r.includes('SEGUNDO TENENTE')) return '2º TEN PM';
  if (r.includes('ASPIRANTE') || r === 'ASP') return 'ASP PM';
  if (r.includes('SUBTENENTE') || r.includes('SUB-TENENTE') || r === 'SUB') return 'SUB PM';
  if (r.match(/1.?\s*SGT/) || r.includes('PRIMEIRO SARGENTO')) return '1º SGT PM';
  if (r.match(/2.?\s*SGT/) || r.includes('SEGUNDO SARGENTO')) return '2º SGT PM';
  if (r.match(/3.?\s*SGT/) || r.includes('TERCEIRO SARGENTO')) return '3º SGT PM';
  if (r.includes('CABO') || r === 'CB') return 'CB PM';
  if (r.includes('SOLDADO') || r === 'SD') return 'SD PM';
  return r;
}

function padCpf(cpf) {
  if (!cpf) return '';
  const cleaned = String(cpf).replace(/\D/g, '');
  return cleaned ? cleaned.padStart(11, '0') : '';
}

function deepCleanText(text) {
  if (!text) return "";
  let s = String(text)
    .replace(/&[a-z0-9#]+;/gi, " ")
    .replace(/[+\-|]{2,}/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (s === "+" || s === "|" || s === "-") return "";
  return s;
}

function normalizeKey(key) {
  const clean = deepCleanText(key);
  return clean.toUpperCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]/g, "");
}

function formatPhone(phone) {
  if (!phone) return null;
  const cleaned = String(phone).replace(/\D/g, '');
  if (cleaned.length === 11) {
    return cleaned.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1)$2-$3');
  } else if (cleaned.length === 10) {
    return cleaned.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1)$2-$3');
  }
  return cleaned;
}

function isEmpty(val) {
  const s = String(val ?? '').trim();
  return !s || s === '-' || s === '--' || s === 'null' || s === 'undefined';
}

const filePath = path.resolve(__dirname, '..', 'util', 'efetivo - 03-10-2026.xlsx');
const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: '' });

console.log('Linhas totais lidas:', rows.length);

// Detecção inteligente de cabeçalho
const targetKeys = ['MATRICULA', 'NOME', 'CPF', 'PG', 'ORDEM', 'NORDEM', 'NRORDEM', 'POSTO', 'GRADUACAO'];
let bestHeaderIndex = -1;
let maxMatches = 0;

for (let i = 0; i < Math.min(rows.length, 30); i++) {
  const rowData = rows[i];
  if (!rowData || rowData.length === 0) continue;
  const normalizedRow = rowData.map(cell => normalizeKey(cell));
  const matches = normalizedRow.filter(k => k && targetKeys.includes(k)).length;
  let bonus = 0;
  if (normalizedRow.includes('CPF')) bonus += 2;
  if (normalizedRow.includes('MATRICULA')) bonus += 2;
  if (normalizedRow.includes('NORDEM') || normalizedRow.includes('ORDEM')) bonus += 1;
  const score = matches + bonus;
  if (score > maxMatches) {
    maxMatches = score;
    bestHeaderIndex = i;
  }
}

console.log('Melhor cabeçalho linha:', bestHeaderIndex);
const headers = rows[bestHeaderIndex];
const dataRows = rows.slice(bestHeaderIndex + 1);

const parsedData = [];
const seenCpfsInFile = new Map();
let duplicateCount = 0;

for (const row of dataRows) {
  const rowObj = {};
  headers.forEach((h, idx) => {
    if (h) rowObj[h] = row[idx];
  });
  if (Object.keys(rowObj).length === 0) continue;

  let matricula = '', nrOrdem = '', cpf = '', nome = '', nomeGuerra = '', posto = 'SD PM';
  let rgpm = null, opm = null, telefone = null;
  let hasMotoristaCol = false, motorista = null;

  Object.keys(rowObj).forEach(key => {
    const k = normalizeKey(key);
    const rawVal = rowObj[key];
    if (isEmpty(rawVal)) return;
    const val = String(rawVal).trim();

    if (k === 'MATRICULA' || k.startsWith('MATRICUL')) matricula = val;
    else if (k === 'NORDEM' || k === 'NRORDEM' || k === 'NUMEROORDEM' || k === 'ORDEM' || k === 'NODEORDEM' || k === 'ORD' || k === 'NO') nrOrdem = val;
    else if (k === 'CPF') cpf = padCpf(val);
    else if (k === 'NOMECOMPLETO' || k === 'NOME') nome = deepCleanText(val);
    else if (k.includes('GUERRA')) nomeGuerra = deepCleanText(val);
    else if (k === 'PG' || k === 'POSTOGRAD' || k === 'POSTOGRADUACAO' || k.startsWith('POSTO') || k.startsWith('GRAD')) posto = normalizeRank(val);
    else if (k === 'RGPM' || k === 'RG' || k === 'RGPOLICIAL' || k === 'REGISTROGERAL') rgpm = val;
    else if (k === 'OPM' || k === 'LOTACAO' || k === 'UNIDADE' || k === 'ORGANIZACAO' || k === 'ORGAO') {
      if (!opm || k === 'OPM') opm = val;
    }
    else if (k === 'TELEFONE' || k === 'CELULAR' || k === 'TEL' || k === 'FONE') telefone = formatPhone(val);
    else if (k === 'MOTORISTA' || k === 'CONDUTOR' || k === 'MOT' || k === 'COND') {
      hasMotoristaCol = true;
      const v = val.toUpperCase();
      motorista = (v === 'SIM' || v === 'S' || v === 'TRUE' || v === '1') ? 'Sim' : 'Não';
    }
  });

  if (!matricula && nrOrdem) matricula = nrOrdem;
  if (!nrOrdem && matricula) nrOrdem = matricula;
  if (!nomeGuerra && nome) nomeGuerra = nome.split(' ')[0];

  if (!cpf || !matricula || !nome) {
    console.warn('Linha pulada por falta de campos:', { cpf, matricula, nome });
    continue;
  }

  const record = { cpf, matricula, nrOrdem, nome, nomeGuerra, posto, rgpm, opm, telefone, motorista, hasMotoristaCol };
  if (seenCpfsInFile.has(cpf)) {
    duplicateCount++;
    console.warn('CPF duplicado na planilha:', cpf);
  } else {
    seenCpfsInFile.set(cpf, record);
    parsedData.push(record);
  }
}

console.log('Militares válidos e deduplicados extraídos:', parsedData.length);
console.log('Duplicidades na planilha detectadas:', duplicateCount);
console.log('Exemplo primeiro registro:', parsedData[0]);
