'use strict';

const multer = require('multer');

/** 10MB por arquivo */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/** Máximo de arquivos por requisição de importação em lote */
const MAX_FILES = 50;

/**
 * Middleware multer configurado para upload de PDFs de requerimento.
 * - Armazenamento em memória (sem disco)
 * - Apenas application/pdf aceito
 * - Máximo de 10MB por arquivo
 * - Máximo de 50 arquivos por request
 */
const uploadPdf = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files:    MAX_FILES,
  },
  fileFilter: (_req, file, cb) => {
    const isValidMime = file.mimetype === 'application/pdf' ||
                        file.originalname.toLowerCase().endsWith('.pdf');
    if (!isValidMime) {
      return cb(new Error('INVALID_FILE_TYPE'));
    }
    cb(null, true);
  },
});

/**
 * Handler de erros do multer.
 * Converte erros de limit e fileFilter em respostas JSON padronizadas.
 */
function handleUploadError(err, _req, res, next) {
  if (!err) return next();

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      error_code: 'FILE_TOO_LARGE',
      error: 'Arquivo muito grande: o limite é 10MB por PDF.',
    });
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    return res.status(413).json({
      success: false,
      error_code: 'TOO_MANY_FILES',
      error: `Máximo de ${MAX_FILES} arquivos por requisição.`,
    });
  }

  if (err.message === 'INVALID_FILE_TYPE') {
    return res.status(415).json({
      success: false,
      error_code: 'INVALID_FILE_TYPE',
      error: 'Arquivo rejeitado: apenas PDFs são aceitos.',
    });
  }

  next(err);
}

module.exports = { uploadPdf, handleUploadError };
