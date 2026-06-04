'use strict';

/**
 * PdfExtractor — Extração resiliente de dados de Requerimentos SVR em PDF.
 *
 * Aplica múltiplas estratégias em cascata para cada campo, garantindo
 * maior resiliência a variações de layout, fonte e exportador de PDF.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────────────────────

const MONTH_PT = {
  janeiro: 1, fevereiro: 2, marco: 3, março: 3, abril: 4,
  maio: 5, junho: 6, julho: 7, agosto: 8, setembro: 9,
  outubro: 10, novembro: 11, dezembro: 12,
};

const MONTH_PT_NAMES = Object.keys(MONTH_PT);

/** Turnos padrão do GSVR */
const SHIFT_CODES = [
  '07:00 ÀS 13:00',
  '13:00 ÀS 19:00',
  '19:00 ÀS 01:00',
  '01:00 ÀS 07:00',
];

/** Palavras de cabeçalho que contaminam extração de nomes */
const HEADER_NOISE = [
  'POLÍCIA MILITAR', 'POLICIA MILITAR', 'ALAGOAS', 'COMANDO', 'REGIONAL',
  'REGIAO', 'REGIÃO', 'POLICIAMENTO', 'DIRETORIA', 'REQUERIMENTO',
  'VOLUNTÁRIO', 'VOLUNTARIO', 'SUBCOMANDO', 'ESTADO', 'SECRETARIA',
  'C.P.C', 'C.P.I',
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Normaliza string: remove acentos, coloca em maiúsculas */
function normalize(str) {
  return String(str ?? '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** Remove ruído de cabeçalho de um nome extraído */
function cleanName(raw) {
  let s = raw.trim().replace(/\s+/g, ' ');
  for (const noise of HEADER_NOISE) {
    s = s.replace(new RegExp(noise, 'gi'), '');
  }
  return s.replace(/^\s*(?:DE\s+)?DA\s+/i, '').replace(/^\s*DE\s+/i, '').trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// Extração de mês — 5 estratégias em cascata
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tenta extrair o mês de referência civil do texto do PDF.
 * Retorna "YYYY-MM" ou null se não for possível.
 *
 * Estratégias (ordem de prioridade):
 *   1. Nome completo do mês + ano: "JULHO/2026" ou "JULHO DE 2026"
 *   2. Prefixo institucional: "MÊS: 07/2026", "REFERÊNCIA: 07/2026"
 *   3. Número isolado no cabeçalho: "07/2026" (primeiras 600 chars)
 *   4. Ano do número do requerimento + contexto adjacente
 *   5. null → MONTH_NOT_FOUND
 *
 * @param {string} text
 * @returns {string|null} "YYYY-MM" ou null
 */
function extractMonthKey(text) {
  // Estratégia 1 — Nome do mês por extenso
  const s1 = text.match(
    /\b(JANEIRO|FEVEREIRO|MAR[ÇC]O|ABRIL|MAIO|JUNHO|JULHO|AGOSTO|SETEMBRO|OUTUBRO|NOVEMBRO|DEZEMBRO)\s*(?:DE\s*)?[\/\-]?\s*(20\d{2})\b/i
  );
  if (s1) {
    const nomeMes = normalize(s1[1]).toLowerCase();
    const num = MONTH_PT[nomeMes];
    if (num) return `${s1[2]}-${String(num).padStart(2, '0')}`;
  }

  // Estratégia 2 — Prefixo institucional com número
  const s2 = text.match(
    /(?:M[ÊE]S|REFERENCIA|REFERÊNCIA|PER[ÍI]ODO|PERIODO)[^\n]{0,60}?(0[1-9]|1[0-2])\/(20\d{2})/i
  );
  if (s2) return `${s2[2]}-${s2[1]}`;

  // Estratégia 3 — Número isolado no cabeçalho (primeiras 600 chars)
  const header = text.slice(0, 600);
  const s3 = header.match(/\b(0[1-9]|1[0-2])\/(20\d{2})\b/);
  if (s3) return `${s3[2]}-${s3[1]}`;

  // Estratégia 4 — Extrai mês de nome por extenso em qualquer posição
  for (const nomeMes of MONTH_PT_NAMES) {
    const regex = new RegExp(`\\b${nomeMes}\\b[^\\d]{0,20}(20\\d{2})`, 'i');
    const m = text.match(regex);
    if (m) {
      const num = MONTH_PT[nomeMes];
      if (num) return `${m[1]}-${String(num).padStart(2, '0')}`;
    }
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Extração de número do requerimento
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {string} text
 * @returns {string|null}
 */
function extractNumeroRequerimento(text) {
  const m = text.match(
    /(?:Requerido\s+n[º°o]|REQUERIMENTO\s+N[º°O]?)[:\.]?\s*(\d{1,10}\/\d{4}[^\n]*)/i
  );
  return m ? m[1].trim().split('\n')[0].trim() : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Extração de matrícula / número de ordem
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {string} text
 * @returns {string|null}
 */
function extractNumeroOrdem(text) {
  const m = text.match(
    /(?:N[º°o]?\.?\s*(?:ORD(?:EM)?|ORDEM)|MATR[ÍI]CULA|MATRICULA|N[º°o]?\s*MATR)\s*[:\.]?\s*(\d{3,10})/i
  );
  return m ? m[1] : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Extração de CPF
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {string} text
 * @returns {string|null} CPF somente dígitos (11 chars) ou null
 */
function extractCpf(text) {
  const m = text.match(/(?:CPF|C\.P\.F)[:\.]?\s*([\d\.\-]{11,14})/i);
  if (!m) return null;
  const digits = m[1].replace(/\D/g, '');
  return digits.length === 11 ? digits : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Extração de posto/graduação
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {string} text
 * @returns {string|null}
 */
function extractRank(text) {
  const m = text.match(
    /(?:CEL|TC|MAJ|CAP|1[°º]\s*TEN|2[°º]\s*TEN|SUB|1[°º]\s*SGT|2[°º]\s*SGT|3[°º]\s*SGT|CB|SD)\s+PM/i
  );
  if (m) return m[0].toUpperCase().replace(/\s+/g, ' ').trim();

  const m2 = text.match(
    /(?:CORONEL|TENENTE\s*CORONEL|MAJOR|CAPIT[ÃA]O|TENENTE|SUBTENENTE|SARGENTO|CABO|SOLDADO)/i
  );
  return m2 ? m2[0].toUpperCase() : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Extração de nome
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {string} text
 * @returns {string|null}
 */
function extractName(text) {
  const m = text.match(
    /(?:NOME(?:\s*COMPLETO)?|MILITAR)[:\.\-]?\s*([A-ZÀ-Ú\s]{5,60})/i
  );
  if (m) {
    const cleaned = cleanName(m[1]);
    if (cleaned.length > 3) return cleaned;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Parsing de linha de marcações (disponibilidade por dia)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Interpreta uma linha de marcações posicionais do PDF.
 * Posição 0 = flag de motorista, posições 1–31 = dias 01–31.
 *
 * Estratégia primária: leitura posicional após normalização de espaços.
 *
 * @param {string} line      - Linha bruta do PDF
 * @param {string} shiftCode - Ex: "07:00 ÀS 13:00"
 * @param {object} data      - Acumula { availability, motorist }
 */
function processMarksLine(line, shiftCode, data) {
  if (!line || line.length === 0) return;

  // Preserva os espaços para manter posições — não usar trim()
  const chars = line.split('');

  // Posição 0 = MOTORISTA
  const isMotorist = chars[0] && chars[0].toUpperCase() === 'X';

  if (isMotorist) data.motorist = 'Sim';

  // Posições 1 a 31 = dias
  for (let pos = 1; pos < chars.length && pos <= 31; pos++) {
    const ch = chars[pos];
    if (ch && ch.toUpperCase() === 'X') {
      const dayStr = String(pos).padStart(2, '0');
      if (!data.availability[dayStr]) data.availability[dayStr] = [];
      // Evita duplicata do mesmo turno no mesmo dia
      if (!data.availability[dayStr].some((s) => s.shift === shiftCode)) {
        data.availability[dayStr].push({ shift: shiftCode, motorista: isMotorist });
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Parsing de disponibilidades — múltiplas estratégias
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extrai o mapa de disponibilidade do texto PDF.
 * Tenta a estratégia posicional (primária) e, se falhar, a busca por turno inline.
 *
 * @param {string[]} lines - Array de linhas do texto extraído
 * @returns {{ availability: Object, motorist: string }}
 */
function extractAvailability(lines) {
  const data = { availability: {}, motorist: 'Nao' };

  // ── Estratégia 1: Cabeçalho de turno em 2 linhas ───────────────────────
  // Padrão: linha[i] = "07:00 ÀS", linha[i+1] = "13:00", linha[i+2] = marcações
  for (let i = 0; i < lines.length; i++) {
    const l  = lines[i].trim().toUpperCase();
    const nl = (i + 1 < lines.length) ? lines[i + 1].trim().toUpperCase() : '';

    if (l === '07:00 ÀS' && nl === '13:00')
      { processMarksLine(lines[i + 2] || '', '07:00 ÀS 13:00', data); }
    else if (l === '13:00 ÀS' && nl === '19:00')
      { processMarksLine(lines[i + 2] || '', '13:00 ÀS 19:00', data); }
    else if (l === '19:00 ÀS' && nl === '01:00')
      { processMarksLine(lines[i + 2] || '', '19:00 ÀS 01:00', data); }
    else if (l === '01:00 ÀS' && nl === '07:00')
      { processMarksLine(lines[i + 2] || '', '01:00 ÀS 07:00', data); }
  }

  if (Object.keys(data.availability).length > 0) return data;

  // ── Estratégia 2: Turno inline na mesma linha ───────────────────────────
  // Padrão: linha = "07:00 ÀS 13:00", próxima linha = marcações
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim().toUpperCase();
    const nextLine = lines[i + 1] || '';

    if (l.includes('07:00') && l.includes('13:00') && l.length < 25 && nextLine.trim().length > 5)
      { processMarksLine(nextLine, '07:00 ÀS 13:00', data); }
    else if (l.includes('13:00') && l.includes('19:00') && l.length < 25 && nextLine.trim().length > 5)
      { processMarksLine(nextLine, '13:00 ÀS 19:00', data); }
    else if (l.includes('19:00') && l.includes('01:00') && l.length < 25 && nextLine.trim().length > 5)
      { processMarksLine(nextLine, '19:00 ÀS 01:00', data); }
    else if (l.includes('01:00') && l.includes('07:00') && l.length < 25 && nextLine.trim().length > 5)
      { processMarksLine(nextLine, '01:00 ÀS 07:00', data); }
  }

  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// API pública
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extrai todos os campos de um requerimento SVR a partir do texto bruto do PDF.
 *
 * @param {string} text - Texto extraído pelo pdf-parse
 * @returns {{
 *   numero_requerimento: string|null,
 *   month_key: string|null,        // "YYYY-MM" ou null (MONTH_NOT_FOUND)
 *   numero_ordem: string|null,
 *   cpf: string|null,
 *   rank: string|null,
 *   name: string|null,
 *   motorist: string,              // "Sim" ou "Nao"
 *   availability: Object,          // { "01": [{shift, motorista}], ... }
 * }}
 */
function extractFromText(text) {
  const lines = text.split('\n');

  const { availability, motorist } = extractAvailability(lines);

  return {
    numero_requerimento: extractNumeroRequerimento(text),
    month_key:           extractMonthKey(text),
    numero_ordem:        extractNumeroOrdem(text),
    cpf:                 extractCpf(text),
    rank:                extractRank(text),
    name:                extractName(text),
    motorist,
    availability,
  };
}

module.exports = { extractFromText, extractMonthKey, SHIFT_CODES };
