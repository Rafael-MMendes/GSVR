'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');

function createMockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
}

describe('userController.updateUserAdmin (promover/rebaixar)', () => {
  const dbPath = require.resolve('../db');
  const authPath = require.resolve('../middleware/auth');
  const ctrlPath = require.resolve('../controllers/userController');

  let origDbCache;
  let origAuthCache;
  let origCtrlCache;

  beforeEach(() => {
    origDbCache = require.cache[dbPath];
    origAuthCache = require.cache[authPath];
    origCtrlCache = require.cache[ctrlPath];
    delete require.cache[ctrlPath];
  });

  afterEach(() => {
    if (origDbCache) require.cache[dbPath] = origDbCache; else delete require.cache[dbPath];
    if (origAuthCache) require.cache[authPath] = origAuthCache; else delete require.cache[authPath];
    if (origCtrlCache) require.cache[ctrlPath] = origCtrlCache; else delete require.cache[ctrlPath];
  });

  it('promove e rebaixa usuário comum usando getUserRoles sem ReferenceError', async () => {
    const queries = [];
    let invalidatedId = null;

    require.cache[dbPath] = {
      id: dbPath,
      filename: dbPath,
      loaded: true,
      exports: {
        run: async (sql, params) => {
          queries.push({ sql, params });
          return { lastID: 1 };
        },
        get: async () => null,
        query: async () => ({ rows: [] })
      }
    };

    require.cache[authPath] = {
      id: authPath,
      filename: authPath,
      loaded: true,
      exports: {
        BCRYPT_ROUNDS: 10,
        getUserRoles: async () => ['MILITAR'],
        getUserPermissions: async () => [],
        invalidateUserAuthCache: (id) => { invalidatedId = id; }
      }
    };

    const userController = require('../controllers/userController');

    // Rebaixar
    const resDemote = createMockRes();
    await userController.updateUserAdmin(
      { params: { id: '2' }, body: { is_admin: false }, user: { id: 65, roles: ['ADMIN'] }, ip: '127.0.0.1' },
      resDemote,
      () => {}
    );
    assert.equal(resDemote.statusCode, 200);
    assert.deepEqual(resDemote.body, { success: true });
    assert.equal(invalidatedId, 2);
    assert.ok(queries.some(q => q.sql.includes('UPDATE users SET is_admin=$1') && q.params[0] === 0 && q.params[1] === 2));
    assert.ok(queries.some(q => q.sql.includes('DELETE FROM user_roles')));

    // Promover
    const resPromote = createMockRes();
    await userController.updateUserAdmin(
      { params: { id: '396' }, body: { is_admin: true }, user: { id: 65, roles: ['ADMIN'] }, ip: '127.0.0.1' },
      resPromote,
      () => {}
    );
    assert.equal(resPromote.statusCode, 200);
    assert.deepEqual(resPromote.body, { success: true });
    assert.equal(invalidatedId, 396);
    assert.ok(queries.some(q => q.sql.includes('UPDATE users SET is_admin=$1') && q.params[0] === 1 && q.params[1] === 396));
    assert.ok(queries.some(q => q.sql.includes('INSERT INTO user_roles')));
  });

  it('bloqueia alteração de SUPERUSER por usuário não-SUPERUSER (403)', async () => {
    require.cache[dbPath] = {
      id: dbPath,
      filename: dbPath,
      loaded: true,
      exports: { run: async () => ({}), get: async () => null, query: async () => ({ rows: [] }) }
    };
    require.cache[authPath] = {
      id: authPath,
      filename: authPath,
      loaded: true,
      exports: {
        BCRYPT_ROUNDS: 10,
        getUserRoles: async () => ['SUPERUSER'],
        getUserPermissions: async () => [],
        invalidateUserAuthCache: () => {}
      }
    };

    const userController = require('../controllers/userController');
    const res = createMockRes();
    await userController.updateUserAdmin(
      { params: { id: '1' }, body: { is_admin: false }, user: { id: 65, roles: ['ADMIN'] }, ip: '127.0.0.1' },
      res,
      () => {}
    );
    assert.equal(res.statusCode, 403);
  });
});
