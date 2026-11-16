'use strict';

const assert = require('assert');
const http = require('http');
const { app } = require('./server');

// Coleta todas as rotas registradas no Express 5 App
function getRegisteredRoutes(expressApp) {
  const routes = [];

  function scanRouter(router, prefix) {
    if (!router || !router.stack) return;
    router.stack.forEach(layer => {
      if (layer.route) {
        const methods = Object.keys(layer.route.methods || {}).filter(m => layer.route.methods[m]);
        methods.forEach(method => {
          routes.push({
            method: method.toUpperCase(),
            path: (prefix + layer.route.path).replace(/\/+/g, '/')
          });
        });
      } else if (layer.name === 'router' && layer.handle) {
        scanRouter(layer.handle, prefix);
      }
    });
  }

  const routerStack = expressApp.router ? expressApp.router.stack : [];
  routerStack.forEach(layer => {
    if (layer.name === 'router' && layer.handle) {
      // O router principal foi montado em /api
      scanRouter(layer.handle, '/api');
    }
  });

  return routes;
}

console.log('=== TESTE 1: INICIALIZAÇÃO E AUDITORIA DE PARIDADE DE ROTAS (EXPRESS 5) ===');

const TEST_PORT = 3199;
const server = app.listen(TEST_PORT, async () => {
  console.log(`Servidor de teste ativo na porta ${TEST_PORT}`);

  try {
    const routes = getRegisteredRoutes(app);
    console.log(`Total de rotas registradas no novo servidor modular: ${routes.length}`);

    // Validar que todas as 92 rotas esperadas estão registradas
    const expectedCriticalRoutes = [
      { method: 'POST', path: '/api/login' },
      { method: 'POST', path: '/api/auth/mfa/verify' },
      { method: 'POST', path: '/api/auth/mfa/setup' },
      { method: 'POST', path: '/api/auth/mfa/confirm' },
      { method: 'POST', path: '/api/auth/first-access/validate' },
      { method: 'POST', path: '/api/auth/first-access/set-password' },
      { method: 'POST', path: '/api/auth/refresh' },
      { method: 'POST', path: '/api/auth/logout' },
      { method: 'POST', path: '/api/auth/password/change' },
      { method: 'POST', path: '/api/auth/password/forgot' },
      { method: 'POST', path: '/api/auth/password/reset' },
      { method: 'GET', path: '/api/admin/audit-logs' },
      { method: 'GET', path: '/api/admin/diagnostics' },
      { method: 'GET', path: '/api/admin/migrate-fix' },
      { method: 'GET', path: '/api/me' },
      { method: 'PUT', path: '/api/me/profile' },
      { method: 'POST', path: '/api/me/avatar' },
      { method: 'DELETE', path: '/api/me/avatar' },
      { method: 'DELETE', path: '/api/me' },
      { method: 'GET', path: '/api/usuarios' },
      { method: 'GET', path: '/api/militares/not-users' },
      { method: 'POST', path: '/api/usuarios' },
      { method: 'DELETE', path: '/api/usuarios/:id' },
      { method: 'PUT', path: '/api/usuarios/:id/status' },
      { method: 'PUT', path: '/api/usuarios/:id/reset-first-access' },
      { method: 'PUT', path: '/api/usuarios/:id/admin' },
      { method: 'PUT', path: '/api/usuarios/:id/senha' },
      { method: 'GET', path: '/api/usuarios/:id/permissoes' },
      { method: 'PUT', path: '/api/usuarios/:id/permissoes' },
      { method: 'GET', path: '/api/roles' },
      { method: 'GET', path: '/api/roles/:id' },
      { method: 'POST', path: '/api/roles' },
      { method: 'PUT', path: '/api/roles/:id' },
      { method: 'DELETE', path: '/api/roles/:id' },
      { method: 'GET', path: '/api/permissions' },
      { method: 'PUT', path: '/api/usuarios/:id/roles' },
      { method: 'GET', path: '/api/my-schedules' },
      { method: 'GET', path: '/api/my-schedules/:id' },
      { method: 'GET', path: '/api/volunteers' },
      { method: 'GET', path: '/api/months' },
      { method: 'POST', path: '/api/volunteers' },
      { method: 'DELETE', path: '/api/volunteers/:id' },
      { method: 'PUT', path: '/api/volunteers/:id' },
      { method: 'PUT', path: '/api/volunteers/:id/cancel-availability' },
      { method: 'GET', path: '/api/efetivo' },
      { method: 'GET', path: '/api/efetivo/desenvolvedores' },
      { method: 'POST', path: '/api/efetivo' },
      { method: 'PUT', path: '/api/efetivo/:id' },
      { method: 'GET', path: '/api/efetivo/lookup/:matricula' },
      { method: 'DELETE', path: '/api/efetivo/:id' },
      { method: 'POST', path: '/api/efetivo/import/preview' },
      { method: 'POST', path: '/api/efetivo/import' },
      { method: 'GET', path: '/api/opms' },
      { method: 'POST', path: '/api/opms' },
      { method: 'PUT', path: '/api/opms/:id' },
      { method: 'DELETE', path: '/api/opms/:id' },
      { method: 'GET', path: '/api/ciclos' },
      { method: 'GET', path: '/api/ciclos/:id' },
      { method: 'POST', path: '/api/ciclos' },
      { method: 'PUT', path: '/api/ciclos/:id' },
      { method: 'DELETE', path: '/api/ciclos/:id' },
      { method: 'GET', path: '/api/ciclos/:id/metas' },
      { method: 'PUT', path: '/api/metas/:id' },
      { method: 'DELETE', path: '/api/metas/:id' },
      { method: 'GET', path: '/api/ciclos/:id/gastos-matriz' },
      { method: 'POST', path: '/api/ciclos/:id/gastos-matriz' },
      { method: 'GET', path: '/api/ciclos/:id/gastos-matriz/sync-escala' },
      { method: 'GET', path: '/api/ciclo-config' },
      { method: 'PUT', path: '/api/ciclo-config' },
      { method: 'GET', path: '/api/servicos' },
      { method: 'POST', path: '/api/servicos' },
      { method: 'PUT', path: '/api/servicos/:id' },
      { method: 'DELETE', path: '/api/servicos/:id' },
      { method: 'POST', path: '/api/servicos/corrigir-cargas' },
      { method: 'DELETE', path: '/api/servicos/ciclo/:cicloId' },
      { method: 'POST', path: '/api/servicos/import/preview' },
      { method: 'POST', path: '/api/servicos/import' },
      { method: 'GET', path: '/api/schedules' },
      { method: 'POST', path: '/api/schedules' },
      { method: 'DELETE', path: '/api/schedules/patrol' },
      { method: 'GET', path: '/api/reports/operacional-detalhado' },
      { method: 'GET', path: '/api/reports/disponibilidade-grid' },
      { method: 'GET', path: '/api/reports/escalas-planejadas' },
      { method: 'GET', path: '/api/reports/conferencia' },
      { method: 'GET', path: '/api/tipos-servico' },
      { method: 'POST', path: '/api/tipos-servico' },
      { method: 'PUT', path: '/api/tipos-servico/:id' },
      { method: 'GET', path: '/api/financeiro/resumo' },
      { method: 'GET', path: '/api/financeiro/detalhado' },
      { method: 'POST', path: '/api/import/volunteers/files' },
      { method: 'POST', path: '/api/import/preview' },
      { method: 'GET', path: '/api/import/logs' },
      { method: 'GET', path: '/api/health' },
      { method: 'POST', path: '/api/schedules/suggest' },
      { method: 'POST', path: '/api/my-schedules/:id/ciente' },
      { method: 'POST', path: '/api/my-schedules/:id/permuta' },
      { method: 'GET', path: '/api/permutas' },
      { method: 'PUT', path: '/api/permutas/:id/responder' },
      { method: 'POST', path: '/api/servicos/conferencia-digital' },
      { method: 'GET', path: '/api/reports/equidade-orcamento' }
    ];

    let missing = 0;
    for (const exp of expectedCriticalRoutes) {
      const found = routes.some(r => r.method === exp.method && r.path === exp.path);
      if (!found) {
        console.error(`❌ ROTA FALTANDO: ${exp.method} ${exp.path}`);
        missing++;
      }
    }

    if (missing === 0) {
      console.log(`✅ 100% de paridade! Todas as ${expectedCriticalRoutes.length} rotas foram verificadas com sucesso.`);
    } else {
      console.error(`❌ ${missing} rotas não foram encontradas!`);
      server.close(() => process.exit(1));
      return;
    }

    // ============================================================
    // TESTE 2: REQUISIÇÕES HTTP REAIS
    // ============================================================
    console.log('\n=== TESTE 2: REQUISIÇÕES HTTP CONTRA O EXPRESS MODULAR ===');

    function makeRequest(method, path, body = null, headers = {}) {
      return new Promise((resolve, reject) => {
        const options = {
          hostname: 'localhost',
          port: TEST_PORT,
          path,
          method,
          headers: {
            'Content-Type': 'application/json',
            ...headers
          }
        };

        const req = http.request(options, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            let parsed;
            try {
              parsed = JSON.parse(data);
            } catch {
              parsed = data;
            }
            resolve({ status: res.statusCode, data: parsed, headers: res.headers });
          });
        });

        req.on('error', reject);
        if (body) {
          req.write(JSON.stringify(body));
        }
        req.end();
      });
    }

    // 2.1 Rota inexistente -> 404
    const r404 = await makeRequest('GET', '/api/rota-que-nao-existe');
    assert.strictEqual(r404.status, 404, 'Deve retornar 404 para rotas não mapeadas');
    console.log('✅ 404 Handler funcionando corretamente.');

    // 2.2 Rota protegida sem token -> 401 UNAUTHORIZED
    const rMe = await makeRequest('GET', '/api/me');
    assert.strictEqual(rMe.status, 401, 'Deve retornar 401 sem token');
    assert.strictEqual(rMe.data.error.code, 'UNAUTHORIZED');
    console.log('✅ Middleware authenticate bloqueia requisição não autenticada com 401.');

    // 2.2b Rotas recém-protegidas sem token -> 401 UNAUTHORIZED (M01)
    for (const protectedPath of ['/api/efetivo', '/api/servicos', '/api/schedules', '/api/admin/migrate-fix', '/api/usuarios/1/permissoes']) {
      const rUnauth = await makeRequest('GET', protectedPath);
      assert.strictEqual(rUnauth.status, 401, `Rota ${protectedPath} deve retornar 401 sem token`);
    }
    console.log('✅ Regressão M01: Todas as rotas sensíveis recém-protegidas retornam 401 sem token.');

    // 2.2c Health check público -> 200 OK (M04)
    const rHealth = await makeRequest('GET', '/api/health');
    assert.strictEqual(rHealth.status, 200, 'GET /api/health deve retornar 200');
    assert.strictEqual(rHealth.data.status, 'ok');
    console.log('✅ GET /api/health responde 200 OK com status do banco.');

    // 2.3 Rota de login com credenciais ausentes -> 400
    const rLoginBad = await makeRequest('POST', '/api/login', {});
    assert.strictEqual(rLoginBad.status, 400, 'Deve retornar 400 para credenciais faltantes');
    assert.strictEqual(rLoginBad.data.error.code, 'MISSING_CREDENTIALS');
    console.log('✅ authController.login validação de credenciais 400 OK.');

    // 2.4 Rota de login com CPF inválido -> 400
    const rLoginCpf = await makeRequest('POST', '/api/login', { cpf: '11111111111', password: '123' });
    assert.strictEqual(rLoginCpf.status, 400, 'Deve rejeitar CPF com dígitos iguais');
    assert.strictEqual(rLoginCpf.data.error.code, 'INVALID_CPF');
    console.log('✅ authController.login validação estrita de CPF da Receita Federal OK.');

    // 2.5 Rota de Primeiro Acesso sem dados -> 400
    const rFirstAcc = await makeRequest('POST', '/api/auth/first-access/validate', {});
    assert.strictEqual(rFirstAcc.status, 400);
    console.log('✅ authController.validateFirstAccess validação 400 OK.');

    // 2.6 Rota de MFA sem dados -> 400
    const rMfa = await makeRequest('POST', '/api/auth/mfa/verify', {});
    assert.strictEqual(rMfa.status, 400);
    console.log('✅ authController.verifyMfa validação 400 OK.');

    // 2.7 Rota de Auditoria sem token -> 401
    const rAudit = await makeRequest('GET', '/api/admin/audit-logs');
    assert.strictEqual(rAudit.status, 401);
    console.log('✅ adminController.getAuditLogs proteção de rota OK.');

    // 2.8 Rota de Minhas Escalas sem token -> 401
    const rSchedules = await makeRequest('GET', '/api/my-schedules');
    assert.strictEqual(rSchedules.status, 401);
    console.log('✅ mySchedulesController.getMySchedules proteção de rota OK.');

    console.log('\n🎉 TODOS OS TESTES PASSARAM COM 100% DE SUCESSO!');
    server.close(() => {
      console.log('Servidor de teste encerrado.');
      process.exit(0);
    });
  } catch (err) {
    console.error('❌ FALHA NO TESTE:', err);
    server.close(() => process.exit(1));
  }
});
