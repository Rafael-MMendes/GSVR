'use strict';

const multer = require('multer');
const fs = require('fs');

const AVATARS_DIR = process.env.AVATARS_DIR || '/tmp/avatars';
if (!fs.existsSync(AVATARS_DIR)) {
  try {
    fs.mkdirSync(AVATARS_DIR, { recursive: true });
  } catch (err) {
    console.warn(`[WARN] Não foi possível criar pasta de avatares ${AVATARS_DIR}:`, err.message);
  }
}

// Multer configurado para memória (Excel / planilhas)
const uploadMemory = multer({ storage: multer.memoryStorage() });

// Multer configurado para disco (avatares de perfil)
const uploadAvatar = multer({
  storage: multer.diskStorage({
    destination: AVATARS_DIR,
    filename: (req, file, cb) => cb(null, `${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9.]/g, '_')}`)
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Apenas imagens são aceitas'));
    cb(null, true);
  }
});

module.exports = {
  AVATARS_DIR,
  uploadMemory,
  uploadAvatar
};

