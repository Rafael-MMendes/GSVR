/**
 * Dynamic API URL resolver
 * Suporta acesso local (dev), rede interna (gsvr.192.168.1.18.nip.io)
 * e acesso externo (gsvr.45.234.245.204.nip.io:36419 ou qualquer outro domínio/porta).
 */
export const getApiUrl = () => {
  if (typeof window !== 'undefined' && window.location) {
    const { hostname, port, protocol } = window.location;

    // Se estiver em desenvolvimento local no Vite
    if ((hostname === 'localhost' || hostname === '127.0.0.1') && port === '5173') {
      return (import.meta.env.VITE_API_URL || 'http://localhost:3001') + '/api';
    }

    // Se estiver acessando por um subdomínio gsvr.* (seja interno ou externo)
    // Ex 1: gsvr.192.168.1.18.nip.io -> api.192.168.1.18.nip.io
    // Ex 2: gsvr.45.234.245.204.nip.io:36419 -> api.45.234.245.204.nip.io:36419
    if (hostname.startsWith('gsvr.')) {
      const apiHost = hostname.replace(/^gsvr\./, 'api.');
      const portSuffix = port ? `:${port}` : '';
      return `${protocol}//${apiHost}${portSuffix}/api`;
    }

    // Fallback para outros acessos (ex: se acessar por IP direto ou outro domínio):
    // usa a mesma origem do navegador + /api
    return `${protocol}//${window.location.host}/api`;
  }

  // Fallback para SSR ou ferramentas sem window
  return (import.meta.env.VITE_API_URL || 'http://localhost:3001') + '/api';
};

export const getApiBaseUrl = () => {
  return getApiUrl().replace(/\/api$/, '');
};

export const API_URL = getApiUrl();
export default API_URL;

