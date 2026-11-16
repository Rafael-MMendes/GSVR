/**
 * @typedef {import('../types/gsvr.types').Cycle} Cycle
 * @typedef {import('../types/gsvr.types').CycleDayInfo} CycleDayInfo
 * @typedef {import('../types/gsvr.types').CycleDayOption} CycleDayOption
 */

export const ROLES = ['Comandante', 'Motorista', 'Patrulheiro'];
export const SHIFTS = ['07:00 ÀS 13:00', '13:00 ÀS 19:00', '19:00 ÀS 01:00', '01:00 ÀS 07:00'];
export const MAX_MEMBERS = 3;

/**
 * Normaliza nomes legados de guarnição para o padrão 'GSVR'.
 * @param {string} name
 * @returns {string}
 */
export const normalizePatrolName = (name) => {
  const value = String(name || '').trim();
  if (/^gsvr$/i.test(value)) return 'GSVR';
  if (/^guarni[cç]ão\s*\d+$/i.test(value) || /^guarnicao\s*\d+$/i.test(value)) return 'GSVR';
  return value;
};

/**
 * Gera opções de horários com base na carga horária selecionada (ex: '6h').
 * @param {string} durationStr
 * @returns {string[]}
 */
export const getTimeOptions = (durationStr) => {
  const hours = parseInt(durationStr, 10);
  const options = [];
  for (let i = 0; i < 24; i++) {
    const start = String(i).padStart(2, '0') + ':00';
    const end = String((i + hours) % 24).padStart(2, '0') + ':00';
    options.push(`${start} às ${end}`);
  }
  return options;
};

/**
 * Retorna a lista estruturada de dias entre dataInicio e dataFim de um ciclo.
 * @param {string} [dataInicio]
 * @param {string} [dataFim]
 * @returns {CycleDayInfo[]}
 */
export const getCycleDays = (dataInicio, dataFim) => {
  if (!dataInicio || !dataFim) {
    return Array.from({ length: 31 }, (_, i) => ({ day: i + 1, month: null, monthShort: null, year: null }));
  }
  const start = new Date(String(dataInicio).split('T')[0] + 'T12:00:00');
  const end = new Date(String(dataFim).split('T')[0] + 'T12:00:00');
  const days = [];
  const cur = new Date(start);
  while (cur <= end) {
    days.push({
      day: cur.getDate(),
      month: cur.getMonth() + 1,
      year: cur.getFullYear(),
      monthShort: cur.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase()
    });
    cur.setDate(cur.getDate() + 1);
  }
  return days;
};

/**
 * Constrói opções de seleção de dias formatadas para dropdowns de ciclo.
 * @param {Cycle | undefined} currentCycle
 * @returns {CycleDayOption[]}
 */
export const buildCycleDayOptions = (currentCycle) => {
  if (!currentCycle) return [];
  const start = new Date(String(currentCycle.data_inicio).split('T')[0] + 'T12:00:00');
  const end = new Date(String(currentCycle.data_fim).split('T')[0] + 'T12:00:00');
  const days = [];
  const curr = new Date(start);
  while (curr <= end) {
    const d = curr.getDate();
    const yyyy = curr.getFullYear();
    const mm = String(curr.getMonth() + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    const isoDate = `${yyyy}-${mm}-${dd}`;
    const monthName = curr.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
    const monthCap = monthName.charAt(0).toUpperCase() + monthName.slice(1);
    const wday = curr.toLocaleDateString('pt-BR', { weekday: 'short' });
    const wdayCap = ' (' + wday.charAt(0).toUpperCase() + wday.slice(1) + ')';
    days.push({
      isoDate,
      label: `Dia ${dd}/${monthCap}${wdayCap}`,
      key: curr.getTime()
    });
    curr.setDate(curr.getDate() + 1);
  }
  return days;
};

