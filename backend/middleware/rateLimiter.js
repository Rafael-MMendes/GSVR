'use strict';

let rateLimit;
try {
  rateLimit = require('express-rate-limit');
} catch {
  console.warn('[WARN] express-rate-limit não disponível, pulando rate limiting.');
}

// Rate limit geral para rotas de auth: 15 req/min por IP
const authLimiter = rateLimit ? rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'TOO_MANY_REQUESTS', message: 'Muitas tentativas. Aguarde 1 minuto.' } }
}) : (req, res, next) => next();

// Rate limit estrito para /login: 30 tentativas/min por IP (compatível com NAT em OPMs)
const loginLimiter = rateLimit ? rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'TOO_MANY_REQUESTS', message: 'Muitas tentativas de login a partir desta rede. Aguarde 1 minuto.' } }
}) : (req, res, next) => next();

module.exports = {
  authLimiter,
  loginLimiter
};
