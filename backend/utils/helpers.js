'use strict';

const crypto = require('crypto');
const db = require('../db');
const { logAudit } = require('./audit');

// ============================================================
// DATA & HORA HELPERS
// ============================================================
function formatDateToISO(dateOrString) {
  if (!dateOrString) return null;

  if (dateOrString instanceof Date) {
    const y = dateOrString.getUTCFullYear();
    const m = String(dateOrString.getUTCMonth() + 1).padStart(2, '0');
    const d = String(dateOrString.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const dataStr = String(dateOrString).trim();
  if (dataStr.includes('T')) {
    return dataStr.split('T')[0];
  }

  if (dataStr.includes('/')) {
    const parts = dataStr.split('/');
    if (parts[2]?.length === 4) {
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  }

  if (dataStr.includes('-') && dataStr.split('-')[0].length === 4) {
    return dataStr;
  }

  return dataStr;
}

function parseDayToDate(day, cycleDataInicio, cycleDataFim) {
  if (!day) return null;
  const dayStr = String(day).trim();
  if (dayStr.includes('-')) {
    return dayStr; // Já é uma data YYYY-MM-DD
  }
  const dayNum = parseInt(dayStr, 10);
  if (isNaN(dayNum)) return null;

  const dInicio = new Date(cycleDataInicio);
  const dFim = new Date(cycleDataFim);
  const startDay = dInicio.getUTCDate();

  let targetYear, targetMonth;
  if (dayNum >= startDay) {
    targetYear = dInicio.getUTCFullYear();
    targetMonth = dInicio.getUTCMonth() + 1;
  } else {
    targetYear = dFim.getUTCFullYear();
    targetMonth = dFim.getUTCMonth() + 1;
  }

  const pad = (n) => String(n).padStart(2, '0');
  return `${targetYear}-${pad(targetMonth)}-${pad(dayNum)}`;
}

const monthNames = ['Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getMonthName(monthKey) {
  const [year, month] = monthKey.split('-');
  return `${monthNames[parseInt(month) - 1]} / ${year}`;
}

// ============================================================
// FERIADOS (CACHE EM MEMÓRIA)
// ============================================================
let holidaysSet = new Set();

async function loadHolidays() {
  if (!db) return;
  try {
    const rows = await db.all('SELECT data FROM FERIADOS');
    holidaysSet = new Set(rows.map(r => {
      if (!r.data) return null;
      const d = new Date(r.data);
      return d.toISOString().split('T')[0];
    }).filter(Boolean));
    console.log(`[DB] ${holidaysSet.size} feriados carregados na cache.`);
  } catch (e) {
    console.error('[ERR] Falha ao carregar feriados:', e.message);
  }
}

function isFeriado(dateObj) {
  if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) return false;
  const iso = dateObj.toISOString().split('T')[0];
  return holidaysSet.has(iso);
}

// ============================================================
// CRIPTO & TOKENS
// ============================================================
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function validatePasswordRules(password) {
  if (!password || password.length < 8) {
    return 'A senha deve conter no mínimo 8 caracteres.';
  }
  if (!/[A-Z]/.test(password)) {
    return 'A senha deve conter pelo menos uma letra maiúscula.';
  }
  if (!/[a-z]/.test(password)) {
    return 'A senha deve conter pelo menos uma letra minúscula.';
  }
  if (!/[0-9]/.test(password)) {
    return 'A senha deve conter pelo menos um dígito numérico.';
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return 'A senha deve conter pelo menos um caractere especial (!@#$%...).';
  }
  return null;
}

// ============================================================
// MILITAR & EFETIVO
// ============================================================
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

  if (r.startsWith('1')) return '1º SGT PM';
  if (r.startsWith('2')) return '2º SGT PM';
  if (r.startsWith('3')) return '3º SGT PM';

  return r;
}

function padCpf(cpf) {
  if (!cpf) return '';
  const cleaned = String(cpf).replace(/\D/g, '');
  return cleaned.padStart(11, '0');
}

async function getMilitarFromUser(user) {
  if (!user) return null;
  const cpfDigits = user.cpf ? String(user.cpf).replace(/\D/g, '') : null;
  const numOrdem = user.numero_ordem ? String(user.numero_ordem).trim() : null;

  let row = null;
  if (cpfDigits) {
    row = await db.get(
      `SELECT * FROM EFETIVO 
       WHERE regexp_replace(cpf, '[^0-9]', '', 'g') = $1 
          OR LPAD(regexp_replace(cpf, '[^0-9]', '', 'g'), 11, '0') = LPAD($1, 11, '0')
       LIMIT 1`,
      [cpfDigits]
    );
  }
  if (!row && numOrdem) {
    row = await db.get(
      'SELECT * FROM EFETIVO WHERE matricula = $1 OR numero_ordem = $1 LIMIT 1',
      [numOrdem]
    );
  }
  return row || null;
}

// ============================================================
// TEXT & IMPORT HELPERS
// ============================================================
function deepCleanText(text) {
  if (!text) return '';
  let cleaned = String(text);
  cleaned = cleaned.replace(/[\u200B-\u200D\uFEFF]/g, '');
  cleaned = cleaned.replace(/\u00A0/g, ' ');
  cleaned = cleaned.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
  return cleaned.trim().replace(/\s+/g, ' ');
}

function normalizeKey(key) {
  return String(key || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function formatPhone(phone) {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  } else if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return digits;
}

function isEmpty(val) {
  return val === undefined || val === null || String(val).trim() === '';
}

// ============================================================
// AUDITORIA WRAPPER
// ============================================================
function auditLog(userId, action, metadata = {}, status = 'SUCCESS') {
  logAudit(db, {
    userId,
    cpf: metadata.cpf || null,
    numero_ordem: metadata.numero_ordem || null,
    action,
    entity: metadata.entity || null,
    entityId: metadata.entityId || null,
    details: metadata,
    ip: metadata.ip || null,
    userAgent: metadata.userAgent || null,
    status
  });
}

module.exports = {
  formatDateToISO,
  parseDayToDate,
  getCurrentMonthKey,
  getMonthName,
  loadHolidays,
  isFeriado,
  hashToken,
  generateToken,
  validatePasswordRules,
  rankMap,
  normalizeRank,
  padCpf,
  getMilitarFromUser,
  deepCleanText,
  normalizeKey,
  formatPhone,
  isEmpty,
  auditLog
};

