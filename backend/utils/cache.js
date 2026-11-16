'use strict';

/**
 * Cache em memória leve com expiração por TTL (ms).
 * Ideal para catálogos (OPM, Tipos de Serviço, Feriados) e permissões RBAC.
 */
class TtlCache {
  constructor(defaultTtlMs = 30000) {
    this.store = new Map();
    this.defaultTtlMs = defaultTtlMs;
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key, value, ttlMs = this.defaultTtlMs) {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs
    });
  }

  del(key) {
    this.store.delete(key);
  }

  clearPrefix(prefix) {
    for (const k of this.store.keys()) {
      if (String(k).startsWith(prefix)) {
        this.store.delete(k);
      }
    }
  }

  clearAll() {
    this.store.clear();
  }
}

const defaultCache = new TtlCache();
defaultCache.TtlCache = TtlCache;
module.exports = defaultCache;
