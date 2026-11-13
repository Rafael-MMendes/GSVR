'use strict';

process.env.FORCE_COLOR = '0';
process.env.NO_COLOR = '1';
process.env.TERM = 'dumb';

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Middlewares de Segurança
let helmet;
try {
  helmet = require('helmet');
} catch {
  console.warn('[WARN] helmet não disponível, pulando headers de segurança.');
}

const { setupDB } = require('./db');
const { loadHolidays } = require('./utils/helpers');
const { AVATARS_DIR } = require('./middleware/upload');
const apiRoutes = require('./routes');

const app = express();
app.set('trust proxy', 1);

const PORT = process.env.PORT || 3001;

// Middlewares Globais
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logger de requisições simples
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Servir avatares estáticos
app.use('/avatars', express.static(AVATARS_DIR));

// Proteção de Cabeçalhos HTTP com Helmet
if (helmet) {
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  }));
  console.log('[Security] Helmet ativado — headers HTTP protegidos.');
}

// ============================================================
// ROTAS DA APLICAÇÃO (MODULARIZADAS)
// ============================================================
app.use('/api', apiRoutes);

// Tratamento de Rota 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Rota ${req.method} ${req.originalUrl} não encontrada.`
    }
  });
});

// Tratamento Global de Erros
app.use((err, req, res, next) => {
  console.error('[UNHANDLED ERROR]', err);
  res.status(err.status || 500).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message || 'Erro interno no servidor.'
    }
  });
});

// ============================================================
// INICIALIZAÇÃO DO SERVIDOR
// ============================================================
let server = null;

async function startServer() {
  try {
    await setupDB();
    await loadHolidays();
    server = app.listen(PORT, () => {
      console.log(`[SERVER] GSVR Backend modularizado rodando em http://localhost:${PORT}`);
    });
    return server;
  } catch (err) {
    console.error('[FATAL] Falha na inicialização do servidor:', err);
    process.exit(1);
  }
}

// Inicia se executado diretamente
if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
