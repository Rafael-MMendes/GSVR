'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { upsertRequerimentoFragmento } = require('../services/RequirementImporter');

describe('RequirementImporter — upsertRequerimentoFragmento (S/s vs X/x)', () => {
  it('persiste S/s com marcado_disponivel=false e marcado_servico_ordinario=true, preservando X/x', async () => {
    const insertedRows = [];
    const mockDb = {
      get: async () => null,
      run: async (sql, params) => {
        if (sql.includes('INSERT INTO REQUERIMENTOS')) {
          return { lastID: 99 };
        }
        if (sql.includes('INSERT INTO DISPONIBILIDADE_REQUERIMENTO')) {
          insertedRows.push({
            id_requerimento: params[0],
            dia_mes: params[1],
            horario_turno: params[2],
            marcado_disponivel: params[3],
            marcado_servico_ordinario: params[4],
            motorista: params[5]
          });
        }
        return { lastID: 1 };
      }
    };

    const diasMap = {
      '2026-11-05': [
        { shift: '07:00 ÀS 13:00', motorista: true, marcado_disponivel: false, marcado_servico_ordinario: true },
        { shift: '13:00 ÀS 19:00', motorista: true }
      ]
    };

    const res = await upsertRequerimentoFragmento(mockDb, 10, 20, diasMap, '52902/2026');
    assert.equal(res.id_requerimento, 99);
    assert.equal(res.dias_inseridos, 2);

    assert.deepEqual(insertedRows[0], {
      id_requerimento: 99,
      dia_mes: '2026-11-05',
      horario_turno: '07:00 ÀS 13:00',
      marcado_disponivel: false,
      marcado_servico_ordinario: true,
      motorista: true
    });

    assert.deepEqual(insertedRows[1], {
      id_requerimento: 99,
      dia_mes: '2026-11-05',
      horario_turno: '13:00 ÀS 19:00',
      marcado_disponivel: true,
      marcado_servico_ordinario: false,
      motorista: true
    });
  });
});

