'use strict';

/**
 * CycleEngine — Motor parametrizável de ciclos operacionais.
 *
 * Regra padrão: ciclo inicia no dia 16 de um mês e termina no dia 15
 * do mês seguinte. O dia de início é configurável para suportar mudanças
 * futuras sem alteração de código.
 *
 * Exemplo (diaInicio = 16):
 *   Requerimento Julho/2026:
 *     Dias 01–15 → Ciclo Junho/Julho  (2026-06-16 a 2026-07-15)
 *     Dias 16–31 → Ciclo Julho/Agosto (2026-07-16 a 2026-08-15)
 *
 * Casos especiais suportados:
 *   - Mudança de ano (Dezembro → Janeiro)
 *   - Fevereiro (28 ou 29 dias)
 *   - Qualquer mês com 28, 29, 30 ou 31 dias
 */
class CycleEngine {
  /**
   * @param {number} diaInicio - Dia do mês em que o ciclo começa (padrão: 16).
   *                             Deve ser inteiro entre 2 e 28 para garantir
   *                             compatibilidade com fevereiro.
   */
  constructor(diaInicio = 16) {
    if (!Number.isInteger(diaInicio) || diaInicio < 2 || diaInicio > 28) {
      throw new Error(`diaInicio inválido: ${diaInicio}. Deve ser inteiro entre 2 e 28.`);
    }
    this.diaInicio = diaInicio;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Helpers públicos
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Determina se um dia pertence ao segmento "anterior" ou "corrente" do ciclo.
   *
   * @param {number} day - Dia do mês civil (1–31)
   * @returns {'anterior'|'corrente'}
   */
  getSegmento(day) {
    return day < this.diaInicio ? 'anterior' : 'corrente';
  }

  /**
   * Verifica se um dia é válido para determinado mês/ano.
   * Ex: dia=31 para abril=false, dia=29 para fev de ano não-bissexto=false.
   *
   * @param {number} day
   * @param {number} year
   * @param {number} month - 1-based
   * @returns {boolean}
   */
  isDayValid(day, year, month) {
    const d = new Date(year, month - 1, day);
    return (
      d.getFullYear() === year &&
      d.getMonth()    === month - 1 &&
      d.getDate()     === day
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Cálculo de limites de ciclo
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Retorna os limites ISO (data_inicio, data_fim) do ciclo ANTERIOR ao mês
   * de referência — isto é, o ciclo que contém os dias 1 a (diaInicio-1).
   *
   * Ex: ref = julho/2026 (year=2026, month=7), diaInicio=16
   *   → inicio = "2026-06-16", fim = "2026-07-15"
   *
   * @param {number} year
   * @param {number} month - 1-based
   * @returns {{ inicio: string, fim: string }}
   */
  getCycleBoundsAnterior(year, month) {
    let prevYear  = year;
    let prevMonth = month - 1;
    if (prevMonth === 0) { prevMonth = 12; prevYear -= 1; }

    const pad   = (n) => String(n).padStart(2, '0');
    const inicio = `${prevYear}-${pad(prevMonth)}-${pad(this.diaInicio)}`;
    const fim    = `${year}-${pad(month)}-${pad(this.diaInicio - 1)}`;
    return { inicio, fim };
  }

  /**
   * Retorna os limites ISO do ciclo CORRENTE — o ciclo que começa no mês
   * de referência e contém os dias diaInicio ao último dia do mês.
   *
   * Ex: ref = julho/2026 (year=2026, month=7), diaInicio=16
   *   → inicio = "2026-07-16", fim = "2026-08-15"
   *
   * @param {number} year
   * @param {number} month - 1-based
   * @returns {{ inicio: string, fim: string }}
   */
  getCycleBoundsCorrente(year, month) {
    let nextYear  = year;
    let nextMonth = month + 1;
    if (nextMonth === 13) { nextMonth = 1; nextYear += 1; }

    const pad   = (n) => String(n).padStart(2, '0');
    const inicio = `${year}-${pad(month)}-${pad(this.diaInicio)}`;
    const fim    = `${nextYear}-${pad(nextMonth)}-${pad(this.diaInicio - 1)}`;
    return { inicio, fim };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Fragmentação de disponibilidade
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Fragmenta um mapa de disponibilidade nos dois segmentos de ciclo,
   * ignorando dias inválidos para o mês e dias fora do intervalo 1–31.
   *
   * @param {Object} availability  - { "1": [shifts], "16": [shifts], ... }
   * @param {number} refYear       - Ano do mês civil de referência
   * @param {number} refMonth      - Mês civil de referência (1-based)
   * @returns {{
   *   anterior: Object,  // dias 1 a (diaInicio-1) → ciclo que TERMINA no mês
   *   corrente: Object,  // dias diaInicio a fim   → ciclo que COMEÇA no mês
   *   ignorados: number[],  // dias inválidos descartados
   * }}
   */
  fragmentAvailabilityByCycle(availability, refYear, refMonth) {
    const anterior  = {};
    const corrente  = {};
    const ignorados = [];
    const pad = (n) => String(n).padStart(2, '0');

    for (const [diaStr, shifts] of Object.entries(availability)) {
      const dia = parseInt(diaStr, 10);

      if (!dia || dia < 1 || dia > 31) {
        ignorados.push(dia);
        continue;
      }

      // Descarta dias inexistentes no mês (ex: 31/Abr, 29/Fev em ano normal)
      if (!this.isDayValid(dia, refYear, refMonth)) {
        ignorados.push(dia);
        continue;
      }

      const dateKey = `${refYear}-${pad(refMonth)}-${pad(dia)}`;

      if (this.getSegmento(dia) === 'anterior') {
        anterior[dateKey] = shifts;
      } else {
        corrente[dateKey] = shifts;
      }
    }

    return { anterior, corrente, ignorados };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Utilitário estático
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Cria uma instância do CycleEngine a partir da configuração no banco.
   * Se não houver configuração, usa o padrão (diaInicio = 16).
   *
   * @param {object} db - Instância do db (com método .get)
   * @returns {Promise<CycleEngine>}
   */
  static async fromDatabase(db) {
    try {
      const config = await db.get(
        `SELECT dia_inicio FROM CICLO_CONFIG ORDER BY vigente_desde DESC LIMIT 1`
      );
      const diaInicio = config?.dia_inicio ?? 16;
      return new CycleEngine(diaInicio);
    } catch {
      return new CycleEngine(16);
    }
  }
}

module.exports = CycleEngine;
