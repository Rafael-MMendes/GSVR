'use strict';
const db = require('../db');
const { auditLog } = require('../utils/helpers');

const opmController = {};

/**
 * GET /opms
 */
opmController.getOpms = async (req, res, next) => {
  try { res.json(await db.all('SELECT * FROM OPM ORDER BY sigla ASC')); }
  catch (e) { res.status(500).json({ error: e.message }); }
};

/**
 * POST /opms
 */
opmController.createOpm = async (req, res, next) => {
  try {
    const { descricao, sigla, endereco, telefone, email } = req.body;
    if (!descricao || !sigla) return res.status(400).json({ error: "Sigla e descrição são obrigatórios." });
    const r = await db.run(
      'INSERT INTO OPM (descricao, sigla, endereco, telefone, email) VALUES ($1, $2, $3, $4, $5)',
      [descricao, sigla, endereco || null, telefone || null, email || null]
    );
    res.status(201).json({ success: true, id_opm: r.lastID });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

/**
 * PUT /opms/:id
 */
opmController.updateOpm = async (req, res, next) => {
  try {
    const { descricao, sigla, endereco, telefone, email } = req.body;
    if (!descricao || !sigla) return res.status(400).json({ error: "Sigla e descrição são obrigatórios." });
    await db.run(
      'UPDATE OPM SET descricao=$1, sigla=$2, endereco=$3, telefone=$4, email=$5 WHERE id_opm=$6',
      [descricao, sigla, endereco || null, telefone || null, email || null, req.params.id]
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

/**
 * DELETE /opms/:id
 */
opmController.deleteOpm = async (req, res, next) => {
  try {
    const hasCiclos = await db.get('SELECT 1 FROM CICLOS WHERE id_opm = $1', [req.params.id]);
    if (hasCiclos) return res.status(400).json({ error: "Não é possível excluir: OPM possui ciclos de escala vinculados." });
    await db.run('DELETE FROM OPM WHERE id_opm = $1', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

module.exports = opmController;
