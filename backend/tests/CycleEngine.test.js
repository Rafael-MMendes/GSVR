'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const CycleEngine = require('../services/CycleEngine');

describe('CycleEngine', () => {
  describe('constructor', () => {
    it('usa diaInicio=16 por padrão', () => {
      const engine = new CycleEngine();
      assert.equal(engine.diaInicio, 16);
    });

    it('aceita diaInicio válido entre 2 e 28', () => {
      const engine = new CycleEngine(10);
      assert.equal(engine.diaInicio, 10);
    });

    it('rejeita diaInicio fora do intervalo 2..28 ou não inteiro', () => {
      assert.throws(() => new CycleEngine(1), /diaInicio inválido/);
      assert.throws(() => new CycleEngine(29), /diaInicio inválido/);
      assert.throws(() => new CycleEngine(16.5), /diaInicio inválido/);
      assert.throws(() => new CycleEngine('16'), /diaInicio inválido/);
    });
  });

  describe('getSegmento', () => {
    it('classifica dias 1..15 como anterior e 16..31 como corrente', () => {
      const engine = new CycleEngine(16);
      assert.equal(engine.getSegmento(1), 'anterior');
      assert.equal(engine.getSegmento(15), 'anterior');
      assert.equal(engine.getSegmento(16), 'corrente');
      assert.equal(engine.getSegmento(31), 'corrente');
    });
  });

  describe('isDayValid', () => {
    const engine = new CycleEngine(16);

    it('valida meses de 30 e 31 dias corretamente', () => {
      assert.equal(engine.isDayValid(31, 2026, 7), true);
      assert.equal(engine.isDayValid(31, 2026, 4), false);
      assert.equal(engine.isDayValid(30, 2026, 4), true);
    });

    it('trata fevereiro em anos bissextos e não-bissextos', () => {
      assert.equal(engine.isDayValid(29, 2026, 2), false);
      assert.equal(engine.isDayValid(28, 2026, 2), true);
      assert.equal(engine.isDayValid(29, 2024, 2), true);
      assert.equal(engine.isDayValid(30, 2024, 2), false);
    });
  });

  describe('getCycleBoundsAnterior & getCycleBoundsCorrente', () => {
    const engine = new CycleEngine(16);

    it('calcula limites corretos para mês intermediário (Julho/2026)', () => {
      assert.deepEqual(engine.getCycleBoundsAnterior(2026, 7), {
        inicio: '2026-06-16',
        fim: '2026-07-15',
      });
      assert.deepEqual(engine.getCycleBoundsCorrente(2026, 7), {
        inicio: '2026-07-16',
        fim: '2026-08-15',
      });
    });

    it('trata virada de ano em Janeiro (ciclo anterior) e Dezembro (ciclo corrente)', () => {
      assert.deepEqual(engine.getCycleBoundsAnterior(2027, 1), {
        inicio: '2026-12-16',
        fim: '2027-01-15',
      });
      assert.deepEqual(engine.getCycleBoundsCorrente(2026, 12), {
        inicio: '2026-12-16',
        fim: '2027-01-15',
      });
    });
  });

  describe('fragmentAvailabilityByCycle', () => {
    const engine = new CycleEngine(16);

    it('fragmenta dias entre anterior e corrente e descarta dias inválidos', () => {
      const availability = {
        '01': [{ shift: '07:00 ÀS 13:00', motorista: false }],
        '15': [{ shift: '13:00 ÀS 19:00', motorista: true }],
        '16': [{ shift: '19:00 ÀS 01:00', motorista: false }],
        '30': [{ shift: '07:00 ÀS 13:00', motorista: false }],
        '31': [{ shift: '07:00 ÀS 13:00', motorista: false }], // inválido em abril
        '99': [{ shift: '07:00 ÀS 13:00', motorista: false }], // fora de 1..31
      };

      const result = engine.fragmentAvailabilityByCycle(availability, 2026, 4);

      assert.deepEqual(Object.keys(result.anterior).sort(), ['2026-04-01', '2026-04-15']);
      assert.deepEqual(Object.keys(result.corrente).sort(), ['2026-04-16', '2026-04-30']);
      assert.deepEqual(result.ignorados.sort((a, b) => a - b), [31, 99]);
    });
  });

  describe('fromDatabase', () => {
    it('carrega dia_inicio do banco quando disponível', async () => {
      const mockDb = { get: async () => ({ dia_inicio: 20 }) };
      const engine = await CycleEngine.fromDatabase(mockDb);
      assert.equal(engine.diaInicio, 20);
    });

    it('faz fallback para 16 quando banco falha ou não possui config', async () => {
      const mockDbErr = { get: async () => { throw new Error('no table'); } };
      const engine = await CycleEngine.fromDatabase(mockDbErr);
      assert.equal(engine.diaInicio, 16);
    });
  });
});

