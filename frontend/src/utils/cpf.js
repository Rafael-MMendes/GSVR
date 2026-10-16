/**
 * Utilitários de CPF para Validação e Máscara no Frontend
 * GSVR - 9º BPM/PMAL
 */

export function cleanCPF(cpf) {
  if (!cpf) return '';
  return String(cpf).replace(/\D/g, '');
}

export function formatCPF(cpf) {
  const clean = cleanCPF(cpf);
  if (!clean) return '';
  if (clean.length <= 3) return clean;
  if (clean.length <= 6) return `${clean.slice(0, 3)}.${clean.slice(3)}`;
  if (clean.length <= 9) return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6)}`;
  return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9, 11)}`;
}

export function isValidCPF(cpf) {
  const clean = cleanCPF(cpf);
  if (!clean || clean.length !== 11) return false;

  // Rejeita sequências repetidas (00000000000, 11111111111, etc.)
  if (/^(\d)\1{10}$/.test(clean)) return false;

  // 1º Dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(clean.charAt(i), 10) * (10 - i);
  }
  let rev = 11 - (sum % 11);
  let d1 = (rev >= 10) ? 0 : rev;
  if (d1 !== parseInt(clean.charAt(9), 10)) return false;

  // 2º Dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(clean.charAt(i), 10) * (11 - i);
  }
  rev = 11 - (sum % 11);
  let d2 = (rev >= 10) ? 0 : rev;
  if (d2 !== parseInt(clean.charAt(10), 10)) return false;

  return true;
}
