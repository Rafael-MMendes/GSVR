'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { TtlCache } = require('../utils/cache');

describe('TtlCache (M07)', () => {
  it('armazena e recupera valores dentro do TTL', () => {
    const cache = new TtlCache(5000);
    cache.set('k1', { ok: true });
    assert.deepEqual(cache.get('k1'), { ok: true });
  });

  it('expira valores após o TTL configurado', async () => {
    const cache = new TtlCache(25);
    cache.set('k2', 'valor');
    await new Promise(r => setTimeout(r, 40));
    assert.equal(cache.get('k2'), undefined);
  });

  it('limpa entradas por prefixo e clearAll', () => {
    const cache = new TtlCache(5000);
    cache.set('user:1:roles', ['ADMIN']);
    cache.set('user:2:roles', ['USER']);
    cache.set('opms:all', [1, 2]);

    cache.clearPrefix('user:1:');
    assert.equal(cache.get('user:1:roles'), undefined);
    assert.deepEqual(cache.get('user:2:roles'), ['USER']);
    assert.deepEqual(cache.get('opms:all'), [1, 2]);

    cache.clearAll();
    assert.equal(cache.get('user:2:roles'), undefined);
    assert.equal(cache.get('opms:all'), undefined);
  });
});

