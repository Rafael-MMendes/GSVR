'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { extractFromText, extractMonthKey, SHIFT_CODES } = require('../services/PdfExtractor');

describe('PdfExtractor', () => {
  it('expõe os 4 turnos canônicos em SHIFT_CODES', () => {
    assert.equal(SHIFT_CODES.length, 4);
    assert.ok(SHIFT_CODES.includes('07:00 ÀS 13:00'));
    assert.ok(SHIFT_CODES.includes('01:00 ÀS 07:00'));
  });

  describe('extractMonthKey', () => {
    it('extrai mês/ano pela Estratégia 1 ("no mês de [MÊS] de [ANO]")', () => {
      const txt = 'Solicito inclusão no SVR no mês de Novembro de 2026.';
      assert.equal(extractMonthKey(txt), '2026-11');
    });

    it('extrai mês/ano pela Estratégia 2 ("REFERÊNCIA 10/2026")', () => {
      const txt = 'REQUERIMENTO DE VOLUNTÁRIO\nREFERÊNCIA: 10/2026\nDados...';
      assert.equal(extractMonthKey(txt), '2026-10');
    });

    it('extrai mês/ano pela Estratégia 3 (nome do mês por extenso com barra)', () => {
      const txt = 'Escala referente a Março/2026 para o 9º BPM.';
      assert.equal(extractMonthKey(txt), '2026-03');
    });

    it('retorna null quando não encontra mês/ano', () => {
      assert.equal(extractMonthKey('Texto sem data de referência'), null);
    });
  });

  describe('extractFromText (requerimento completo)', () => {
    it('extrai campos cadastrais e grade de disponibilidade em 2 linhas', () => {
      // Posições: idx 0 = motorista ('X' ou ' '), idx 1 = dia 01, idx 2 = dia 02, idx 16 = dia 16
      const line07 = 'XX' + ' '.repeat(14) + 'X'; // Motorista=X, dia 01=X, dia 16=X
      const line19 = ' ' + ' ' + 'X';            // Motorista=' ', dia 02=X

      const samplePdfText = [
        'POLÍCIA MILITAR DE ALAGOAS',
        'REQUERIMENTO: 1234/2026',
        'Eu, JOÃO DA SILVA - 2º SGT PM, portador do CPF: 123.456.789-01, MATRÍCULA: 655120,',
        'venho requerer participação no SVR no mês de Outubro de 2026.',
        '07:00 ÀS',
        '13:00',
        line07,
        '18:00 ÀS',
        '00:00',
        line19,
      ].join('\n');

      const res = extractFromText(samplePdfText);

      assert.equal(res.numero_requerimento, '1234/2026');
      assert.equal(res.month_key, '2026-10');
      assert.equal(res.numero_ordem, '655120');
      assert.equal(res.cpf, '12345678901');
      assert.equal(res.rank, '2º SGT PM');
      assert.equal(res.name, 'JOÃO DA SILVA');
      assert.equal(res.motorist, 'Sim');

      assert.deepEqual(res.availability['01'], [{ shift: '07:00 ÀS 13:00', motorista: true }]);
      assert.deepEqual(res.availability['16'], [{ shift: '07:00 ÀS 13:00', motorista: true }]);
      // 18:00 ÀS 00:00 deve ser mapeado para o turno canônico 19:00 ÀS 01:00
      assert.deepEqual(res.availability['02'], [{ shift: '19:00 ÀS 01:00', motorista: false }]);
    });

    it('extrai disponibilidade via Estratégia 2 (turno inline) e mapeia 00:00 ÀS 07:00', () => {
      const sampleInline = [
        'NOME: CARLOS ALBERTO',
        'MATRÍCULA: 998877',
        'REFERÊNCIA: 08/2026',
        '00:00 ÀS 07:00',
        '   X       X',
      ].join('\n');

      const res = extractFromText(sampleInline);
      assert.equal(res.name, 'CARLOS ALBERTO');
      assert.equal(res.month_key, '2026-08');
      assert.equal(res.motorist, 'Nao');
      assert.deepEqual(res.availability['03'], [{ shift: '01:00 ÀS 07:00', motorista: false }]);
      assert.deepEqual(res.availability['11'], [{ shift: '01:00 ÀS 07:00', motorista: false }]);
    });

    it('extrai marcações S e s como serviço ordinário (marcado_servico_ordinario=true, marcado_disponivel=false) sem alterar X/x', () => {
      // pos 0 = 'X' (motorista), pos 1 = 'S', pos 2 = 's', pos 3 = 'X', pos 4 = 'x'
      const line07 = 'XSsXx';
      const txt = [
        'NOME: SGT TESTE',
        'MATRÍCULA: 123456',
        'REFERÊNCIA: 11/2026',
        '07:00 ÀS',
        '13:00',
        line07,
      ].join('\n');

      const res = extractFromText(txt);
      assert.deepEqual(res.availability['01'], [{
        shift: '07:00 ÀS 13:00',
        motorista: true,
        marcado_disponivel: false,
        marcado_servico_ordinario: true
      }]);
      assert.deepEqual(res.availability['02'], [{
        shift: '07:00 ÀS 13:00',
        motorista: true,
        marcado_disponivel: false,
        marcado_servico_ordinario: true
      }]);
      assert.deepEqual(res.availability['03'], [{ shift: '07:00 ÀS 13:00', motorista: true }]);
      assert.deepEqual(res.availability['04'], [{ shift: '07:00 ÀS 13:00', motorista: true }]);
    });
  });
});
