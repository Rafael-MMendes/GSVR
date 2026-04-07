import { useState } from 'react';
import axios from 'axios';
import { Shield, AlertCircle } from 'lucide-react';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001') + '/api';

export function LoginScreen({ onLogin }) {
  const [numero_ordem, setNumeroOrdem] = useState('');
  const [cpf, setCpf] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!numero_ordem || !cpf) {
      setError('Preencha Nº de Ordem e CPF');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await axios.post(`${API_URL}/login`, {
        numero_ordem: numero_ordem.trim(),
        cpf: cpf.trim()
      });

      if (res.data.success) {
        onLogin(res.data.user, res.data.is_admin);
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'Erro ao conectar com o servidor';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #1e3a5f 0%, #0f2744 100%)',
      padding: '1rem'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '2.5rem',
        width: '100%',
        maxWidth: '400px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img src="/brasao_9bpm.png" alt="Brasão 9º BPM" style={{ height: '80px', marginBottom: '1rem' }} />
          <h1 style={{ fontSize: '1.5rem', color: '#1e3a5f', margin: 0 }}>9º BPM - Força Tarefa</h1>
          <p style={{ color: '#64748b', marginTop: '0.5rem' }}>Acesso Restrito</p>
        </div>

        {error && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#dc2626',
            padding: '0.75rem',
            borderRadius: '8px',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.9rem'
          }}>
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#374151', fontWeight: 500 }}>
              Nº de Ordem
            </label>
            <input
              type="text"
              value={numero_ordem}
              onChange={(e) => setNumeroOrdem(e.target.value)}
              placeholder="Ex: 102700"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '1rem',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#374151', fontWeight: 500 }}>
              CPF (Senha)
            </label>
            <input
              type="password"
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
              placeholder="Digite seu CPF"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '1rem',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.875rem',
              background: '#1e3a5f',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            <Shield size={18} />
            {loading ? 'Entrando...' : 'Acessar'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: '#9ca3af', fontSize: '0.85rem' }}>
          Sistema de requerimento exclusivo para militares do 9º BPM
        </p>
      </div>
    </div>
  );
}
