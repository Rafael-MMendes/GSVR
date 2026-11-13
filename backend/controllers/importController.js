'use strict';
const db = require('../db');
const { processFile } = require('../services/RequirementImporter');
let pdfParser;
try {
  pdfParser = require('pdf-parse');
} catch (e) {
  console.warn('pdf-parse nao disponivel');
}

const importController = {};

/**
 * POST /import/volunteers/files
 */
importController.importVolunteersFiles = async (req, res, next) => {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ success: false, error: 'Nenhum arquivo recebido.' });
      }
      if (!pdfParser) {
        return res.status(503).json({ success: false, error: 'Módulo pdf-parse não disponível no servidor.' });
      }

      // ── Valida e parseia os novos campos obrigatórios ──────────────────────
      let ciclosIds = [];
      try {
        const rawCiclos = req.body.ciclos_ids;
        ciclosIds = typeof rawCiclos === 'string' ? JSON.parse(rawCiclos) : (rawCiclos || []);
        ciclosIds = ciclosIds.map(Number).filter(n => !isNaN(n) && n > 0);
      } catch {
        return res.status(400).json({ success: false, error: 'ciclos_ids inválido. Envie um array JSON com 1 ou 2 IDs de ciclo.' });
      }

      if (ciclosIds.length < 1 || ciclosIds.length > 2) {
        return res.status(400).json({ success: false, error: 'Selecione ao menos 1 e no máximo 2 ciclos para a importação.' });
      }

      const competencia = (req.body.competencia || '').trim();
      if (!competencia || !/^(0[1-9]|1[0-2])\/20\d{2}$/.test(competencia)) {
        return res.status(400).json({ success: false, error: 'Competência inválida. Use o formato MM/YYYY (ex: 06/2026).' });
      }

      // Valida existência dos ciclos no banco antes de processar os arquivos
      for (const idCiclo of ciclosIds) {
        const ciclo = await db.get('SELECT id_ciclo FROM CICLOS WHERE id_ciclo = $1', [idCiclo]);
        if (!ciclo) {
          return res.status(400).json({ success: false, error: `Ciclo ID ${idCiclo} não encontrado no banco de dados.` });
        }
      }

      const results = [];
      const errors  = [];

      for (const file of req.files) {
        try {
          const result = await processFile({
            buffer:       file.buffer,
            originalname: file.originalname,
            mimetype:     file.mimetype,
            size:         file.size,
            db,
            pdfParser,
            idUsuario:    req.user?.id || null,
            dryRun:       false,
            ciclosIds,
            competencia,
          });

          if (result.success) {
            results.push(result);
          } else {
            errors.push({ file: file.originalname, ...result });
          }
        } catch (e) {
          console.error(`[IMPORT] Erro inesperado em ${file.originalname}:`, e.message);
          errors.push({ file: file.originalname, success: false, error: e.message });
        }
      }

      res.json({
        success:   true,
        processed: results.length,
        competencia_usada: competencia,
        ciclos_usados: ciclosIds,
        results,
        errors:    errors.slice(0, 50),
      });
    };

/**
 * POST /import/preview
 */
importController.importPreview = async (req, res, next) => {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'Nenhum arquivo recebido.' });
      }
      if (!pdfParser) {
        return res.status(503).json({ success: false, error: 'Módulo pdf-parse não disponível.' });
      }

      try {
        const result = await processFile({
          buffer:       req.file.buffer,
          originalname: req.file.originalname,
          mimetype:     req.file.mimetype,
          size:         req.file.size,
          db,
          pdfParser,
          idUsuario:    req.user?.id || null,
          dryRun:       true,
        });
        res.json(result);
      } catch (e) {
        res.status(500).json({ success: false, error: e.message });
      }
    };

/**
 * GET /import/logs
 */
importController.getImportLogs = async (req, res, next) => {
    try {
      const { id_militar, id_usuario, status, limit = 100 } = req.query;
      const conditions = [];
      const params     = [];

      if (id_militar) { params.push(id_militar); conditions.push(`il.id_militar = $${params.length}`); }
      if (id_usuario) { params.push(id_usuario); conditions.push(`il.id_usuario = $${params.length}`); }
      if (status)     { params.push(status);     conditions.push(`il.status = $${params.length}`); }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      params.push(Math.min(parseInt(limit, 10) || 100, 500));

      const rows = await db.all(
        `SELECT il.*, e.nome_guerra, e.posto_graduacao, u.numero_ordem as usuario_ordem
           FROM IMPORTACAO_LOG il
           LEFT JOIN EFETIVO e ON il.id_militar = e.id_militar
           LEFT JOIN users   u ON il.id_usuario = u.id
         ${where}
         ORDER BY il.importado_em DESC
         LIMIT $${params.length}`,
        params
      );
      res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
  };

module.exports = importController;
