'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const XLSX = require('xlsx');

function createXlsxBuffer(rows) {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'FT');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

function createMockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
}

describe('servicoController — importServicosPreview & importServicos', () => {
  const dbPath = require.resolve('../db');
  const optPath = require.resolve('../services/ScaleOptimizationService');
  const ctrlPath = require.resolve('../controllers/servicoController');

  let origDbCache;
  let origOptCache;
  let origCtrlCache;

  beforeEach(() => {
    origDbCache = require.cache[dbPath];
    origOptCache = require.cache[optPath];
    origCtrlCache = require.cache[ctrlPath];
    delete require.cache[ctrlPath];
  });

  afterEach(() => {
    if (origDbCache) require.cache[dbPath] = origDbCache; else delete require.cache[dbPath];
    if (origOptCache) require.cache[optPath] = origOptCache; else delete require.cache[optPath];
    if (origCtrlCache) require.cache[ctrlPath] = origCtrlCache; else delete require.cache[ctrlPath];
  });

  it('importServicosPreview detecta cabeçalho e normaliza chaves sem erro', async () => {
    const servicoController = require('../controllers/servicoController');
    const buffer = createXlsxBuffer([
      ['Relatório FT 9º BPM'],
      ['PG', 'Nome de Guerra', 'CPF', 'Data', 'OPM', 'Modalidade'],
      ['SGT', 'ALAN KLEBER', '1234567890', '11/11/2026', '9º BPM', 'POG']
    ]);

    const req = { file: { buffer } };
    const res = createMockRes();
    await servicoController.importServicosPreview(req, res, () => {});

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.header_row, 1);
    assert.equal(res.body.total_rows, 1);
    assert.ok(res.body.colunas.some(c => c.normalizado === 'CPF'));
    assert.ok(res.body.colunas.some(c => c.normalizado === 'NOMEDEGUERRA'));
  });

  it('importServicos processa planilha XLSX usando normalizeKey e padCpf e importa registro válido', async () => {
    const inserted = [];
    require.cache[dbPath] = {
      id: dbPath,
      filename: dbPath,
      loaded: true,
      exports: {
        get: async (sql, params) => {
          if (sql.includes('FROM EFETIVO')) {
            assert.equal(params[0], '01234567890');
            return { id_militar: 10, status_ativo: true, nome_completo: 'ALAN KLEBER', matricula: '12345', opm: '9º BPM' };
          }
          if (sql.includes('FROM CICLOS')) {
            return { id_ciclo: 5, valor_total_previsto: 10000, data_inicio: '2026-10-16', data_fim: '2026-11-15', sigla_opm: '9º BPM' };
          }
          if (sql.includes('FROM SERVICOS_EXECUTADOS WHERE id_militar')) {
            return null;
          }
          if (sql.includes('FROM TIPOS_SERVICO')) {
            return { id_tipo_servico: 2 };
          }
          return null;
        },
        query: async () => ({ rows: [{ total: '0' }] }),
        run: async (sql, params) => {
          if (sql.includes('INSERT INTO SERVICOS_EXECUTADOS')) {
            inserted.push(params);
          }
          return { lastID: 1 };
        }
      }
    };
    require.cache[optPath] = {
      id: optPath,
      filename: optPath,
      loaded: true,
      exports: { recalculateMetas: async () => {} }
    };

    const servicoController = require('../controllers/servicoController');
    const buffer = createXlsxBuffer([
      ['PG', 'Nome de Guerra', 'CPF', 'Data', 'OPM', 'Modalidade', 'Guarnição'],
      ['SGT', 'ALAN KLEBER', '1234567890', '11/11/2026', '9º BPM', 'POG', 'VTR 01']
    ]);

    const req = { file: { buffer } };
    const res = createMockRes();
    await servicoController.importServicos(req, res, () => {});

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.stats.imported, 1);
    assert.equal(res.body.stats.errors, 0);
    assert.equal(inserted.length, 1);
    assert.equal(inserted[0][0], 5);
    assert.equal(inserted[0][1], 10);
    assert.equal(inserted[0][2], '2026-11-11');
  });
});
