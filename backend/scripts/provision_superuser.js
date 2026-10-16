/**
 * CLI de Provisionamento Seguro de Superusuários / Desenvolvedores
 * GSVR - 9º BPM/PMAL
 *
 * Uso:
 *   node provision_superuser.js list
 *   node provision_superuser.js create --nome "Rafael Mendes" --cpf "05626561463" --matricula "DEV_RAFAEL" --password "Senha@Forte2026" --mfa
 *   node provision_superuser.js revoke --cpf "05626561463"
 *   node provision_superuser.js reset-password --cpf "05626561463" --password "NovaSenha@2026"
 */

const readline = require('readline');
const bcrypt = require('bcrypt');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { cleanCPF, isValidCPF, formatCPF } = require('../utils/cpf');
const { generateSecret, getOtpAuthUrl } = require('../utils/totp');
const { logAudit } = require('../utils/audit');

const BCRYPT_ROUNDS = 12;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'escala_ft',
  port: parseInt(process.env.DB_PORT || '5432')
});

function parseArgs() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  const options = {};

  for (let i = 1; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      if (args[i + 1] && !args[i + 1].startsWith('--')) {
        options[key] = args[i + 1];
        i++;
      } else {
        options[key] = true;
      }
    }
  }

  return { command, options };
}

function validatePassword(password) {
  if (!password || password.length < 8) {
    return 'A senha deve conter no mínimo 8 caracteres.';
  }
  if (!/[A-Z]/.test(password)) {
    return 'A senha deve conter pelo menos uma letra maiúscula.';
  }
  if (!/[a-z]/.test(password)) {
    return 'A senha deve conter pelo menos uma letra minúscula.';
  }
  if (!/[0-9]/.test(password)) {
    return 'A senha deve conter pelo menos um dígito numérico.';
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return 'A senha deve conter pelo menos um caractere especial (!@#$%...).';
  }
  return null;
}

async function listSuperusers() {
  console.log('\n========================================================================');
  console.log('LISTA DE SUPERUSUÁRIOS / DESENVOLVEDORES (GSVR)');
  console.log('========================================================================');

  const { rows } = await pool.query(`
    SELECT u.id, u.cpf, u.numero_ordem, u.status, u.bloqueado, u.mfa_enabled,
           u.last_login_at, u.created_at,
           COALESCE(up.email, 'N/A') as email,
           COALESCE(e.nome_completo, e.nome_guerra, 'Desenvolvedor GSVR') as nome
    FROM users u
    JOIN user_roles ur ON u.id = ur.user_id
    JOIN roles r ON ur.role_id = r.id
    LEFT JOIN user_profiles up ON u.id = up.user_id
    LEFT JOIN EFETIVO e ON u.numero_ordem = e.matricula
    WHERE r.nome = 'SUPERUSER'
    ORDER BY u.id ASC;
  `);

  if (rows.length === 0) {
    console.log('Nenhum SUPERUSER provisionado no momento.');
  } else {
    rows.forEach((r, idx) => {
      console.log(`[${idx + 1}] ID: ${r.id} | Nome: ${r.nome} | Matrícula: ${r.numero_ordem}`);
      console.log(`    CPF: ${formatCPF(r.cpf)} | Status: ${r.status} | Bloqueado: ${r.bloqueado ? 'SIM' : 'NÃO'}`);
      console.log(`    MFA: ${r.mfa_enabled ? 'ATIVADO' : 'DESATIVADO'} | Email: ${r.email}`);
      console.log(`    Último Login: ${r.last_login_at ? new Date(r.last_login_at).toLocaleString('pt-BR') : 'Nunca'}`);
      console.log('------------------------------------------------------------------------');
    });
  }
}

async function createSuperuser(options) {
  const nome = options.nome;
  const rawCpf = options.cpf;
  const matricula = options.matricula || `DEV_${Date.now()}`;
  const password = options.password;
  const email = options.email || null;
  const enableMfa = Boolean(options.mfa);

  if (!rawCpf) {
    console.error('ERRO: Parâmetro --cpf é obrigatório.');
    process.exit(1);
  }

  const cpf = cleanCPF(rawCpf);
  if (!isValidCPF(cpf)) {
    console.error(`ERRO: CPF '${rawCpf}' é inválido pelos critérios da Receita Federal.`);
    process.exit(1);
  }

  const pwdErr = validatePassword(password);
  if (pwdErr) {
    console.error(`ERRO na senha: ${pwdErr}`);
    process.exit(1);
  }

  console.log(`\nProvisionando SUPERUSER para: ${nome || 'Desenvolvedor'} (CPF: ${formatCPF(cpf)})...`);

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  let mfaSecret = null;
  if (enableMfa) {
    mfaSecret = generateSecret();
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Garantir que a role SUPERUSER existe
    let roleRes = await client.query("SELECT id FROM roles WHERE nome = 'SUPERUSER'");
    if (roleRes.rows.length === 0) {
      const insRole = await client.query("INSERT INTO roles (nome, descricao, is_sistema) VALUES ('SUPERUSER', 'Superusuário / Desenvolvedor', TRUE) RETURNING id");
      roleRes = insRole;
    }
    const roleId = roleRes.rows[0].id;

    // 2. Verificar se usuário com este CPF já existe
    const existing = await client.query('SELECT id, numero_ordem FROM users WHERE cpf = $1', [cpf]);
    let userId;

    if (existing.rows.length > 0) {
      userId = existing.rows[0].id;
      console.log(`Usuário existente encontrado (ID: ${userId}). Atualizando credenciais e promovendo a SUPERUSER...`);
      await client.query(`
        UPDATE users
        SET password_hash = $1,
            password = $2,
            is_admin = 1,
            status = 'ativo',
            bloqueado = FALSE,
            senha_definida = TRUE,
            primeiro_acesso_concluido = TRUE,
            mfa_enabled = $3,
            mfa_secret = COALESCE($4, mfa_secret),
            updated_at = NOW()
        WHERE id = $5
      `, [passwordHash, cpf, enableMfa, mfaSecret, userId]);
    } else {
      console.log(`Criando nova conta de desenvolvedor (Matrícula: ${matricula})...`);
      const insUser = await client.query(`
        INSERT INTO users (
          cpf, numero_ordem, password, password_hash, is_admin, status,
          bloqueado, senha_definida, primeiro_acesso_concluido, mfa_enabled, mfa_secret
        ) VALUES ($1, $2, $3, $4, 1, 'ativo', FALSE, TRUE, TRUE, $5, $6)
        RETURNING id
      `, [cpf, matricula, cpf, passwordHash, enableMfa, mfaSecret]);
      userId = insUser.rows[0].id;
    }

    // 3. Vincular role SUPERUSER e ADMIN
    await client.query(`
      INSERT INTO user_roles (user_id, role_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
    `, [userId, roleId]);

    // Garantir também role ADMIN caso algum módulo antigo verifique apenas ADMIN
    const adminRoleRes = await client.query("SELECT id FROM roles WHERE nome = 'ADMIN'");
    if (adminRoleRes.rows.length > 0) {
      await client.query(`
        INSERT INTO user_roles (user_id, role_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
      `, [userId, adminRoleRes.rows[0].id]);
    }

    // 4. Perfil estendido se tiver email
    if (email) {
      await client.query(`
        INSERT INTO user_profiles (user_id, email, status_ativo)
        VALUES ($1, $2, TRUE)
        ON CONFLICT (user_id) DO UPDATE SET email = EXCLUDED.email
      `, [userId, email]);
    }

    await client.query('COMMIT');

    await logAudit(pool, {
      userId,
      cpf,
      numero_ordem: matricula,
      action: 'SUPERUSER_PROVISIONED',
      entity: 'users',
      entityId: userId,
      details: { nome, enableMfa, email },
      status: 'SUCCESS'
    });

    console.log('\n========================================================================');
    console.log('✅ SUPERUSER PROVISIONADO COM SUCESSO!');
    console.log('========================================================================');
    console.log(`ID: ${userId}`);
    console.log(`Nome: ${nome || 'Desenvolvedor'}`);
    console.log(`CPF: ${formatCPF(cpf)}`);
    console.log(`Matrícula / ID: ${matricula}`);
    console.log(`Status: ATIVO`);
    console.log(`Senha: [CONFIGURADA - HASH BCRYPT 12 ROUNDS]`);

    if (enableMfa && mfaSecret) {
      const otpUrl = getOtpAuthUrl(`${formatCPF(cpf)} (${nome || 'Dev'})`, 'GSVR 9BPM', mfaSecret);
      console.log('\n--- AUTENTICAÇÃO REFORÇADA (MFA / 2FA) ---');
      console.log(`Chave Secreta Base32: ${mfaSecret}`);
      console.log(`URI do Autenticador:  ${otpUrl}`);
      console.log('Cadastre esta chave no Google Authenticator ou Microsoft Authenticator.');
    }
    console.log('========================================================================\n');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('ERRO ao provisionar superusuário:', err.message);
  } finally {
    client.release();
  }
}

async function revokeSuperuser(options) {
  const rawCpf = options.cpf;
  if (!rawCpf) {
    console.error('ERRO: Parâmetro --cpf é obrigatório.');
    process.exit(1);
  }
  const cpf = cleanCPF(rawCpf);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const uRes = await client.query('SELECT id, numero_ordem FROM users WHERE cpf = $1', [cpf]);
    if (uRes.rows.length === 0) {
      console.error(`ERRO: Usuário com CPF '${formatCPF(cpf)}' não encontrado.`);
      process.exit(1);
    }
    const userId = uRes.rows[0].id;

    // Remove role SUPERUSER
    await client.query(`
      DELETE FROM user_roles
      WHERE user_id = $1 AND role_id IN (SELECT id FROM roles WHERE nome = 'SUPERUSER')
    `, [userId]);

    // Opcionalmente bloqueia a conta se solicitado com --block
    if (options.block) {
      await client.query('UPDATE users SET bloqueado = TRUE, status = \'bloqueado\' WHERE id = $1', [userId]);
      console.log(`Conta ID: ${userId} bloqueada.`);
    }

    // Revoga todos os refresh tokens
    await client.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL', [userId]);

    await client.query('COMMIT');

    await logAudit(pool, {
      userId,
      cpf,
      numero_ordem: uRes.rows[0].numero_ordem,
      action: 'SUPERUSER_REVOKED',
      entity: 'users',
      entityId: userId,
      details: { blocked: Boolean(options.block) },
      status: 'SUCCESS'
    });

    console.log(`\nPrivilégios de SUPERUSER revogados com sucesso para o CPF ${formatCPF(cpf)}.`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('ERRO ao revogar superusuário:', err.message);
  } finally {
    client.release();
  }
}

async function resetPassword(options) {
  const rawCpf = options.cpf;
  const password = options.password;
  if (!rawCpf || !password) {
    console.error('ERRO: --cpf e --password são obrigatórios.');
    process.exit(1);
  }
  const cpf = cleanCPF(rawCpf);
  const pwdErr = validatePassword(password);
  if (pwdErr) {
    console.error(`ERRO na senha: ${pwdErr}`);
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const r = await pool.query(`
    UPDATE users
    SET password_hash = $1,
        senha_definida = TRUE,
        primeiro_acesso_concluido = TRUE,
        bloqueado = FALSE,
        tentativas_falhas = 0,
        bloqueado_ate = NULL,
        updated_at = NOW()
    WHERE cpf = $2
    RETURNING id, numero_ordem
  `, [hash, cpf]);

  if (r.rows.length === 0) {
    console.error(`Usuário com CPF ${formatCPF(cpf)} não encontrado.`);
    process.exit(1);
  }

  const user = r.rows[0];
  await pool.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL', [user.id]);

  await logAudit(pool, {
    userId: user.id,
    cpf,
    numero_ordem: user.numero_ordem,
    action: 'PASSWORD_RESET_BY_CLI',
    entity: 'users',
    entityId: user.id,
    status: 'SUCCESS'
  });

  console.log(`Senha redefinida com sucesso para o usuário CPF ${formatCPF(cpf)}.`);
}

async function main() {
  const { command, options } = parseArgs();

  try {
    switch (command) {
      case 'list':
        await listSuperusers();
        break;
      case 'create':
        await createSuperuser(options);
        break;
      case 'revoke':
        await revokeSuperuser(options);
        break;
      case 'reset-password':
        await resetPassword(options);
        break;
      default:
        console.log(`
Uso do utilitário provision_superuser.js:
  node provision_superuser.js list
  node provision_superuser.js create --nome "<Nome>" --cpf "<CPF>" --password "<SenhaForte>" [--matricula "<Matricula>"] [--email "<email>"] [--mfa]
  node provision_superuser.js revoke --cpf "<CPF>" [--block]
  node provision_superuser.js reset-password --cpf "<CPF>" --password "<NovaSenha>"
        `);
        break;
    }
  } catch (err) {
    console.error('Falha na execução:', err);
  } finally {
    await pool.end();
  }
}

main();
