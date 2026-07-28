/**
 * Formata uma string de telefone para o padrão (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
 * @param {string} value 
 * @returns {string}
 */
export const maskPhone = (value) => {
  if (!value) return "";
  let v = value.replace(/\D/g, ""); // Remove tudo o que não é dígito
  
  if (v.length > 11) v = v.slice(0, 11); // Limita a 11 dígitos
  
  if (v.length > 10) {
    // Celular: (XX) XXXXX-XXXX
    v = v.replace(/^(\d{2})(\d{5})(\d{4}).*/, "($1) $2-$3");
  } else if (v.length > 5) {
    // Fixo ou parcial: (XX) XXXX-XXXX
    v = v.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, "($1) $2-$3");
  } else if (v.length > 2) {
    // Parcial: (XX) XXXX
    v = v.replace(/^(\d{2})(\d{0,5})/, "($1) $2");
  } else if (v.length > 0) {
    // Parcial: (XX
    v = v.replace(/^(\d*)/, "($1");
  }
  return v;
};

/**
 * Formata um telefone vindo do banco (apenas números) para exibição
 * @param {string} phone 
 * @returns {string}
 */
export const formatPhone = (phone) => {
  if (!phone) return "-";
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 11) {
    return cleaned.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
  }
  if (cleaned.length === 10) {
    return cleaned.replace(/^(\d{2})(\d{4})(\d{4})$/, "($1) $2-$3");
  }
  return phone;
};

/**
 * Lista de postos/graduações em ordem decrescente de hierarquia militar.
 * Índice 0 = maior hierarquia.
 */
export const MILITARY_RANK_ORDER = [
  "CEL PM",
  "TC PM",
  "MAJ PM",
  "CAP PM",
  "1º TEN PM",
  "2º TEN PM",
  "ASP PM",
  "CAD 1º PM",
  "CAD 2º PM",
  "CAD 3º PM",
  "SUB PM",
  "1º SGT PM",
  "2º SGT PM",
  "3º SGT PM",
  "CB PM",
  "SD PM",
];

/**
 * Retorna o índice hierárquico de um posto/graduação.
 * Menor índice = maior hierarquia. Postos desconhecidos ficam no final.
 * @param {string} rank
 * @returns {number}
 */
export const getRankIndex = (rank) => {
  const idx = MILITARY_RANK_ORDER.findIndex(
    (r) => r.toUpperCase() === String(rank || "").trim().toUpperCase()
  );
  return idx === -1 ? MILITARY_RANK_ORDER.length : idx;
};

/**
 * Normaliza o nome de uma OPM (unidade militar) removendo caracteres especiais,
 * variações de grau (º, °, o, ª), traços e espaços redundantes.
 * Exemplo: '9º BPM', '9o BPM', '9.º BPM', '9BPM' -> '9º BPM'
 * @param {string} opm 
 * @returns {string}
 */
export const normalizeOpm = (opm) => {
  if (!opm || typeof opm !== 'string') return '';
  let cleaned = opm
    .trim()
    .toUpperCase()
    .replace(/º/g, 'º')
    .replace(/°/g, 'º')
    .replace(/ª/g, 'ª')
    .replace(/\./g, '')
    .replace(/\s+/g, ' ');

  // Normaliza padrões comuns de batalhões e companhias (ex: 9O BPM / 9 O BPM / 9BPM -> 9º BPM)
  cleaned = cleaned.replace(/(\d+)\s*[O|°|º]?\s*(BPM|CPM|EM|DAL|CPC|CPI)/g, '$1º $2');
  cleaned = cleaned.replace(/(\d+)\s*[A|ª]?\s*(CIA)/g, '$1ª $2');

  return cleaned;
};

/**
 * Comparador para uso em Array.sort() baseado em hierarquia militar.
 * Ordena do maior para o menor posto.
 * @param {string} rankA
 * @param {string} rankB
 * @returns {number}
 */
export const compareByRank = (rankA, rankB) => getRankIndex(rankA) - getRankIndex(rankB);
