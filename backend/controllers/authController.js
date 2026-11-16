'use strict';
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { cleanCPF, isValidCPF, formatCPF } = require('../utils/cpf');
const { generateSecret, generateTOTP, verifyTOTP, getOtpAuthUrl } = require('../utils/totp');
const { generateToken, hashToken, validatePasswordRules, auditLog } = require('../utils/helpers');
const { issueSessionTokens, JWT_SECRET, JWT_EXPIRES_IN, BCRYPT_ROUNDS, REFRESH_EXPIRES_DAYS, getUserRoles, getUserPermissions } = require('../middleware/auth');

const authController = {};

/**
 * POST /login
 */
authController.login = async (req, res, next) => {
  const { cpf, numero_ordem, username, password } = req.body;
  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const userAgent = req.headers['user-agent'] || null;

  const rawIdent = cpf || numero_ordem || username;
  if (!rawIdent || !password) {
    return res.status(400).json({
      success: false,
      error: { code: 'MISSING_CREDENTIALS', message: 'CPF e senha são obrigatórios.' }
    });
  }

  const cleanedCpf = cleanCPF(rawIdent);
  const isCpfFormat = cleanedCpf.length === 11;

  if (isCpfFormat && !isValidCPF(cleanedCpf)) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_CPF', message: 'CPF inválido pelos critérios da Receita Federal.' }
    });
  }

  try {
    let user;
    if (isCpfFormat) {
      user = await db.get('SELECT * FROM users WHERE cpf = $1 OR numero_ordem = $1', [cleanedCpf]);
    } else {
      user = await db.get('SELECT * FROM users WHERE numero_ordem = $1', [String(rawIdent).trim()]);
    }

    if (!user) {
      auditLog(null, 'LOGIN_FAILED', { cpf: cleanedCpf, numero_ordem: rawIdent, ip, userAgent, reason: 'USER_NOT_FOUND' }, 'FAILED');
      return res.status(401).json({
        success: false,
        error: { code: 'AUTH_FAILED', message: 'CPF ou senha incorretos.' }
      });
    }

    // Verifica bloqueio de conta
    if (user.bloqueado || user.status === 'bloqueado') {
      auditLog(user.id, 'LOGIN_BLOCKED', { cpf: user.cpf, numero_ordem: user.numero_ordem, ip, userAgent }, 'FAILED');
      return res.status(403).json({
        success: false,
        error: { code: 'ACCOUNT_BLOCKED', message: 'Conta bloqueada por motivo de segurança. Contate o administrador.' }
      });
    }

    // Verifica bloqueio temporário por tentativas
    if (user.bloqueado_ate && new Date(user.bloqueado_ate) > new Date()) {
      const remainingMin = Math.ceil((new Date(user.bloqueado_ate) - new Date()) / 60000);
      return res.status(429).json({
        success: false,
        error: {
          code: 'TEMPORARILY_LOCKED',
          message: `Muitas tentativas incorretas. Conta temporariamente suspensa. Tente novamente em ${remainingMin} minuto(s).`
        }
      });
    }

    // Verifica se a conta está pendente de primeiro acesso
    if (!user.senha_definida && !user.password_hash) {
      auditLog(user.id, 'FIRST_ACCESS_PROMPT', { cpf: user.cpf, numero_ordem: user.numero_ordem, ip });
      return res.status(403).json({
        success: false,
        error: {
          code: 'FIRST_ACCESS_REQUIRED',
          message: 'Seu primeiro acesso ainda não foi realizado. Por favor, clique na opção "Primeiro Acesso" para definir sua senha de acesso.'
        }
      });
    }

    // Validação de senha por bcrypt (com migração de transição para hash seguro se necessário)
    let credOk = false;
    if (user.password_hash) {
      credOk = await bcrypt.compare(password, user.password_hash);
    } else if (user.password && user.password === password) {
      credOk = true;
      const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      await db.run('UPDATE users SET password_hash=$1, senha_definida=TRUE, primeiro_acesso_concluido=TRUE, updated_at=NOW() WHERE id=$2', [hash, user.id]);
    }

    if (!credOk) {
      const newTentativas = (user.tentativas_falhas || 0) + 1;
      let updateSql = 'UPDATE users SET tentativas_falhas = $1 WHERE id = $2';
      let updateParams = [newTentativas, user.id];

      if (newTentativas >= 5) {
        updateSql = 'UPDATE users SET tentativas_falhas = $1, bloqueado_ate = NOW() + INTERVAL \'15 minutes\' WHERE id = $2';
        auditLog(user.id, 'ACCOUNT_TEMPORARILY_LOCKED', { cpf: user.cpf, numero_ordem: user.numero_ordem, ip, userAgent }, 'FAILED');
      } else {
        auditLog(user.id, 'LOGIN_FAILED', { cpf: user.cpf, numero_ordem: user.numero_ordem, ip, userAgent, tentativas: newTentativas }, 'FAILED');
      }
      await db.run(updateSql, updateParams);

      return res.status(401).json({
        success: false,
        error: { code: 'AUTH_FAILED', message: 'CPF ou senha incorretos.' }
      });
    }

    // Verifica se MFA está habilitado para esta conta (MFA / 2FA para SUPERUSER / Admin)
    if (user.mfa_enabled && user.mfa_secret) {
      const mfaTempToken = jwt.sign(
        { userId: user.id, purpose: 'MFA_VERIFY' },
        JWT_SECRET,
        { expiresIn: '5m' }
      );
      auditLog(user.id, 'MFA_CHALLENGE_ISSUED', { cpf: user.cpf, ip });
      return res.json({
        success: true,
        mfa_required: true,
        mfa_token: mfaTempToken,
        message: 'Autenticação em duas etapas requerida.'
      });
    }

    // Emite tokens e retorna dados
    return await issueSessionTokens(user, req, res);

  } catch (e) {
    console.error('[LOGIN ERROR]', e);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Erro interno ao processar autenticação.' } });
  }
};

/**
 * POST /auth/mfa/verify
 */
authController.verifyMfa = async (req, res, next) => {
  const { mfa_token, code } = req.body;
  if (!mfa_token || !code) {
    return res.status(400).json({ success: false, error: { code: 'MISSING_DATA', message: 'Token de desafio e código de 6 dígitos são obrigatórios.' } });
  }

  try {
    const decoded = jwt.verify(mfa_token, JWT_SECRET);
    if (decoded.purpose !== 'MFA_VERIFY') {
      return res.status(401).json({ success: false, error: { code: 'INVALID_TOKEN', message: 'Token inválido.' } });
    }

    const user = await db.get('SELECT * FROM users WHERE id=$1', [decoded.userId]);
    if (!user || !user.mfa_secret) {
      return res.status(401).json({ success: false, error: { code: 'USER_INVALID', message: 'MFA não configurado para este usuário.' } });
    }

    const isValid = verifyTOTP(code, user.mfa_secret);
    if (!isValid) {
      auditLog(user.id, 'MFA_VERIFICATION_FAILED', { ip: req.ip }, 'FAILED');
      return res.status(401).json({ success: false, error: { code: 'INVALID_CODE', message: 'Código de autenticação incorreto ou expirado.' } });
    }

    auditLog(user.id, 'MFA_VERIFICATION_SUCCESS', { ip: req.ip });
    return await issueSessionTokens(user, req, res);

  } catch (err) {
    return res.status(401).json({ success: false, error: { code: 'TOKEN_EXPIRED', message: 'Tempo limite expirado. Por favor, tente novamente.' } });
  }
};

/**
 * POST /auth/mfa/setup
 */
authController.setupMfa = async (req, res, next) => {
  try {
    const user = await db.get('SELECT id, cpf, numero_ordem, mfa_enabled FROM users WHERE id=$1', [req.user.id]);
    const secret = generateSecret();
    const otpAuthUrl = getOtpAuthUrl(formatCPF(user.cpf) || user.numero_ordem, 'GSVR 9BPM', secret);

    // Salva segredo temporariamente (só confirma no endpoint /confirm)
    await db.run('UPDATE users SET mfa_secret = $1 WHERE id = $2', [secret, user.id]);

    res.json({
      success: true,
      secret,
      otpauth_url: otpAuthUrl,
      mfa_enabled: Boolean(user.mfa_enabled)
    });
  } catch (e) {
    res.status(500).json({ success: false, error: { message: e.message } });
  }
};

/**
 * POST /auth/mfa/confirm
 */
authController.confirmMfa = async (req, res, next) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ success: false, error: { message: 'Código de 6 dígitos é obrigatório.' } });

  try {
    const user = await db.get('SELECT id, mfa_secret FROM users WHERE id=$1', [req.user.id]);
    if (!user?.mfa_secret) return res.status(400).json({ success: false, error: { message: 'Inicie a configuração do MFA antes de confirmar.' } });

    const isValid = verifyTOTP(code, user.mfa_secret);
    if (!isValid) {
      return res.status(400).json({ success: false, error: { message: 'Código incorreto. Verifique o horário do dispositivo e tente novamente.' } });
    }

    await db.run('UPDATE users SET mfa_enabled = TRUE WHERE id = $1', [user.id]);
    auditLog(user.id, 'MFA_ACTIVATED', { ip: req.ip });
    res.json({ success: true, message: 'Autenticação em duas etapas (MFA) ativada com sucesso!' });
  } catch (e) {
    res.status(500).json({ success: false, error: { message: e.message } });
  }
};

/**
 * POST /auth/first-access/validate
 */
authController.validateFirstAccess = async (req, res, next) => {
  const { cpf, matricula } = req.body;
  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  if (!cpf || !matricula) {
    return res.status(400).json({
      success: false,
      error: { code: 'MISSING_FIELDS', message: 'CPF e Matrícula Funcional (Nº de Ordem) são obrigatórios.' }
    });
  }

  const cleanedCpf = cleanCPF(cpf);
  if (!isValidCPF(cleanedCpf)) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_CPF', message: 'CPF inválido.' }
    });
  }

  const cleanMatricula = String(matricula).trim();

  try {
    // 1. Verifica se usuário existe no sistema
    const user = await db.get('SELECT * FROM users WHERE cpf = $1 OR numero_ordem = $2', [cleanedCpf, cleanMatricula]);
    if (!user) {
      auditLog(null, 'FIRST_ACCESS_VALIDATE_FAILED', { cpf: cleanedCpf, matricula: cleanMatricula, ip, reason: 'USER_NOT_FOUND' }, 'FAILED');
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'Conta de usuário não encontrada. Contate a administração do 9º BPM.' }
      });
    }

    // 2. Se a conta já tiver senha_definida e primeiro_acesso_concluido, bloqueia repetição indevida
    if (user.senha_definida && user.primeiro_acesso_concluido) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'ALREADY_COMPLETED',
          message: 'O primeiro acesso para esta conta já foi concluído anteriormente. Utilize o login regular ou a Recuperação de Senha.'
        }
      });
    }

    // 3. Validação rigorosa dos dados com o cadastro EFETIVO (ou matrícula de desenvolvedor)
    const military = await db.get(
      'SELECT id_militar, matricula, cpf, nome_completo, nome_guerra, posto_graduacao, status_ativo FROM EFETIVO WHERE cpf = $1 AND matricula = $2',
      [cleanedCpf, cleanMatricula]
    );

    const isMatch = military || (user.numero_ordem === cleanMatricula && user.cpf === cleanedCpf);

    if (!isMatch) {
      auditLog(user.id, 'FIRST_ACCESS_VALIDATE_FAILED', { cpf: cleanedCpf, matricula: cleanMatricula, ip, reason: 'MISMATCH_MATRICULA' }, 'FAILED');
      return res.status(401).json({
        success: false,
        error: { code: 'IDENTITY_MISMATCH', message: 'A Matrícula informada não confere com o cadastro deste CPF.' }
      });
    }

    // 4. Gera token criptográfico temporário de uso único (15 minutos)
    const rawToken = generateToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min

    await db.run('UPDATE first_access_tokens SET used_at=NOW() WHERE user_id=$1 AND used_at IS NULL', [user.id]);
    await db.run(
      'INSERT INTO first_access_tokens (user_id, token_hash, expires_at, ip_solicitante) VALUES ($1, $2, $3, $4)',
      [user.id, tokenHash, expiresAt, ip]
    );

    auditLog(user.id, 'FIRST_ACCESS_VALIDATE_SUCCESS', { cpf: cleanedCpf, matricula: cleanMatricula, ip });

    return res.json({
      success: true,
      first_access_token: rawToken,
      nome: military?.nome_guerra || military?.nome_completo || 'Militar',
      posto_graduacao: military?.posto_graduacao || '',
      cpf: formatCPF(cleanedCpf)
    });

  } catch (err) {
    console.error('[FIRST ACCESS VALIDATE ERROR]', err);
    res.status(500).json({ success: false, error: { message: 'Erro ao validar primeiro acesso.' } });
  }
};

/**
 * POST /auth/first-access/set-password
 */
authController.setPasswordFirstAccess = async (req, res, next) => {
  const token = req.body.token || req.body.first_access_token || req.body.activation_token;
  const new_password = req.body.new_password || req.body.password;
  const confirm_password = req.body.confirm_password;
  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  if (!token || !new_password || !confirm_password) {
    return res.status(400).json({
      success: false,
      error: { code: 'MISSING_FIELDS', message: 'Token de ativação e senhas são obrigatórios.' }
    });
  }

  if (new_password !== confirm_password) {
    return res.status(400).json({
      success: false,
      error: { code: 'PASSWORD_MISMATCH', message: 'A confirmação de senha não coincide com a nova senha digitada.' }
    });
  }

  const pwdRuleError = validatePasswordRules(new_password);
  if (pwdRuleError) {
    return res.status(400).json({
      success: false,
      error: { code: 'WEAK_PASSWORD', message: pwdRuleError }
    });
  }

  try {
    const tokenHash = hashToken(token);
    const stored = await db.get(
      'SELECT * FROM first_access_tokens WHERE token_hash=$1 AND used_at IS NULL AND expires_at > NOW()',
      [tokenHash]
    );

    if (!stored) {
      return res.status(400).json({
        success: false,
        error: { code: 'TOKEN_INVALID', message: 'Token de ativação inválido, expirado ou já utilizado. Inicie novamente o primeiro acesso.' }
      });
    }

    const newHash = await bcrypt.hash(new_password, BCRYPT_ROUNDS);

    await db.run(`
      UPDATE users
      SET password_hash = $1,
          senha_definida = TRUE,
          primeiro_acesso_concluido = TRUE,
          tentativas_falhas = 0,
          bloqueado = FALSE,
          bloqueado_ate = NULL,
          updated_at = NOW()
      WHERE id = $2
    `, [newHash, stored.user_id]);

    await db.run('UPDATE first_access_tokens SET used_at = NOW() WHERE id = $1', [stored.id]);
    await db.run('UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL', [stored.user_id]);

    auditLog(stored.user_id, 'FIRST_ACCESS_COMPLETED', { ip });

    return res.json({
      success: true,
      message: 'Senha cadastrada com sucesso! Você já pode realizar o login com seu CPF e nova senha.'
    });

  } catch (err) {
    console.error('[SET PASSWORD ERROR]', err);
    res.status(500).json({ success: false, error: { message: 'Erro ao cadastrar senha.' } });
  }
};

/**
 * POST /auth/refresh
 */
authController.refreshToken = async (req, res, next) => {
  const { refresh_token } = req.body;
  if (!refresh_token) return res.status(400).json({ success: false, error: { code: 'MISSING_TOKEN' } });
  try {
    const hash = hashToken(refresh_token);
    const stored = await db.get(
      'SELECT * FROM refresh_tokens WHERE token_hash=$1 AND revoked_at IS NULL AND expires_at > NOW()',
      [hash]
    );
    if (!stored) return res.status(401).json({ success: false, error: { code: 'TOKEN_INVALID', message: 'Refresh token inválido ou expirado.' } });

    const user = await db.get('SELECT * FROM users WHERE id=$1', [stored.user_id]);
    if (!user || user.bloqueado) {
      return res.status(401).json({ success: false, error: { code: 'USER_INACTIVE', message: 'Usuário inativo ou bloqueado.' } });
    }

    const permissions = await getUserPermissions(user.id);
    const roles = await getUserRoles(user.id);
    const isSuperuser = roles.includes('SUPERUSER');
    const isAdmin = user.is_admin === 1 || isSuperuser || roles.includes('ADMIN');

    const accessToken = jwt.sign(
      { id: user.id, cpf: user.cpf, numero_ordem: user.numero_ordem, is_admin: isAdmin, is_superuser: isSuperuser, roles, permissions },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    res.json({ success: true, access_token: accessToken });
  } catch (e) { res.status(500).json({ success: false, error: { message: e.message } }); }
};

/**
 * POST /auth/logout
 */
authController.logout = async (req, res, next) => {
  const { refresh_token } = req.body;
  try {
    if (refresh_token) {
      const hash = hashToken(refresh_token);
      await db.run('UPDATE refresh_tokens SET revoked_at=NOW() WHERE token_hash=$1', [hash]);
    }
    auditLog(req.user.id, 'LOGOUT', { ip: req.ip });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, error: { message: e.message } }); }
};

/**
 * POST /auth/password/change
 */
authController.changePassword = async (req, res, next) => {
  const { current_password, new_password, confirm_password } = req.body;
  if (!current_password || !new_password) {
    return res.status(400).json({ success: false, error: { message: 'Senha atual e nova senha são obrigatórias.' } });
  }
  if (confirm_password && new_password !== confirm_password) {
    return res.status(400).json({ success: false, error: { message: 'A confirmação de senha não confere.' } });
  }

  const pwdRuleError = validatePasswordRules(new_password);
  if (pwdRuleError) {
    return res.status(400).json({ success: false, error: { message: pwdRuleError } });
  }

  try {
    const user = await db.get('SELECT * FROM users WHERE id=$1', [req.user.id]);
    let currentOk = false;
    if (user.password_hash) currentOk = await bcrypt.compare(current_password, user.password_hash);
    else currentOk = (user.password === current_password);

    if (!currentOk) {
      return res.status(401).json({ success: false, error: { code: 'INVALID_CURRENT_PASSWORD', message: 'Senha atual incorreta.' } });
    }

    const newHash = await bcrypt.hash(new_password, BCRYPT_ROUNDS);
    await db.run('UPDATE users SET password_hash=$1, senha_definida=TRUE, primeiro_acesso_concluido=TRUE, updated_at=NOW() WHERE id=$2', [newHash, user.id]);
    await db.run('UPDATE refresh_tokens SET revoked_at=NOW() WHERE user_id=$1 AND revoked_at IS NULL', [user.id]);

    auditLog(user.id, 'PASSWORD_CHANGED', { ip: req.ip });
    res.json({ success: true, message: 'Senha alterada com sucesso.' });
  } catch (e) { res.status(500).json({ success: false, error: { message: e.message } }); }
};

/**
 * POST /auth/password/forgot
 */
authController.forgotPassword = async (req, res, next) => {
  const { cpf, numero_ordem, matricula } = req.body;
  const rawIdent = cpf || numero_ordem;
  const rawMatricula = matricula || numero_ordem;

  if (!rawIdent) return res.status(400).json({ success: false, error: { message: 'CPF ou Matrícula é obrigatório.' } });

  const cleanedCpf = cleanCPF(rawIdent);
  const isCpf = cleanedCpf.length === 11;

  try {
    let user;
    if (isCpf) {
      user = await db.get('SELECT id, cpf, numero_ordem FROM users WHERE cpf=$1', [cleanedCpf]);
    } else {
      user = await db.get('SELECT id, cpf, numero_ordem FROM users WHERE numero_ordem=$1', [String(rawIdent).trim()]);
    }

    if (!user) {
      // Resposta genérica (não revela se o usuário existe)
      return res.json({ success: true, message: 'Se os dados existirem no cadastro, o procedimento de recuperação foi registrado.' });
    }

    // Se fornecida matrícula para conferência, valida
    if (rawMatricula && user.numero_ordem !== String(rawMatricula).trim()) {
      return res.json({ success: true, message: 'Se os dados existirem no cadastro, o procedimento de recuperação foi registrado.' });
    }

    const rawToken = generateToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2h

    await db.run('UPDATE password_reset_tokens SET used_at=NOW() WHERE user_id=$1 AND used_at IS NULL', [user.id]);
    await db.run(
      'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, ip_solicitante) VALUES ($1,$2,$3,$4)',
      [user.id, tokenHash, expiresAt, req.ip]
    );

    auditLog(user.id, 'PASSWORD_RESET_REQUESTED', { cpf: user.cpf, ip: req.ip });

    res.json({
      success: true,
      message: 'Token de redefinição gerado.',
      reset_token: rawToken,
      expires_at: expiresAt
    });
  } catch (e) { res.status(500).json({ success: false, error: { message: e.message } }); }
};

/**
 * POST /auth/password/reset
 */
authController.resetPassword = async (req, res, next) => {
  const { token, new_password, confirm_password } = req.body;
  if (!token || !new_password) return res.status(400).json({ success: false, error: { message: 'Token e nova senha são obrigatórios.' } });
  if (confirm_password && new_password !== confirm_password) {
    return res.status(400).json({ success: false, error: { message: 'A confirmação de senha não confere.' } });
  }

  const pwdRuleError = validatePasswordRules(new_password);
  if (pwdRuleError) {
    return res.status(400).json({ success: false, error: { message: pwdRuleError } });
  }

  try {
    const tokenHash = hashToken(token);
    const stored = await db.get(
      'SELECT * FROM password_reset_tokens WHERE token_hash=$1 AND used_at IS NULL AND expires_at > NOW()',
      [tokenHash]
    );
    if (!stored) return res.status(400).json({ success: false, error: { code: 'TOKEN_INVALID', message: 'Token inválido, expirado ou já utilizado.' } });

    const newHash = await bcrypt.hash(new_password, BCRYPT_ROUNDS);
    await db.run('UPDATE users SET password_hash=$1, senha_definida=TRUE, primeiro_acesso_concluido=TRUE, tentativas_falhas=0, bloqueado=FALSE, bloqueado_ate=NULL, updated_at=NOW() WHERE id=$2', [newHash, stored.user_id]);
    await db.run('UPDATE password_reset_tokens SET used_at=NOW() WHERE id=$1', [stored.id]);
    await db.run('UPDATE refresh_tokens SET revoked_at=NOW() WHERE user_id=$1 AND revoked_at IS NULL', [stored.user_id]);

    auditLog(stored.user_id, 'PASSWORD_RESET_SUCCESS', { ip: req.ip });
    res.json({ success: true, message: 'Senha redefinida com sucesso! Você já pode realizar o login.' });
  } catch (e) { res.status(500).json({ success: false, error: { message: e.message } }); }
};

module.exports = authController;
