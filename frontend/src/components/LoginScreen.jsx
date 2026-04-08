import { useState, useRef } from 'react';
import axios from 'axios';
import { Shield, AlertCircle, Eye, EyeOff, Lock, Hash } from 'lucide-react';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001') + '/api';

export function LoginScreen({ onLogin }) {
  const [numero_ordem, setNumeroOrdem] = useState('');
  const [cpf, setCpf] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!numero_ordem || !cpf) {
      setError('Preencha Nº de Ordem e CPF');
      triggerShake();
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await axios.post(`${API_URL}/login`, {
        numero_ordem: numero_ordem.trim(),
        cpf: cpf.trim(),
        password: cpf.trim()
      });

      if (res.data.success) {
        // Salva tokens JWT no localStorage
        const { access_token, refresh_token, user } = res.data;
        localStorage.setItem('ft_access_token', access_token);
        localStorage.setItem('ft_refresh_token', refresh_token);
        localStorage.setItem('ft_user', JSON.stringify(user));
        // Configura axios para incluir token nas próximas requisições
        axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
        onLogin(user, user.is_admin);
      }
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.response?.data?.error || 'Erro ao conectar com o servidor';
      setError(typeof msg === 'string' ? msg : 'Credenciais inválidas.');
      triggerShake();
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
      background: 'linear-gradient(135deg, #0f2744 0%, #1e3a5f 50%, #0f2744 100%)',
      padding: '1rem',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Decoração de fundo */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.04,
        backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
        backgroundSize: '32px 32px'
      }} />

      <div style={{
        background: 'rgba(255,255,255,0.97)',
        backdropFilter: 'blur(10px)',
        borderRadius: '20px',
        padding: '2.5rem',
        width: '100%',
        maxWidth: '420px',
        boxShadow: '0 25px 80px rgba(0,0,0,0.4)',
        position: 'relative',
        animation: shake ? 'shake 0.5s ease' : 'none',
        transition: 'transform 0.3s ease'
      }}>
        {/* Header com brasão */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: 88, height: 88, margin: '0 auto 1rem',
            background: 'linear-gradient(135deg, #1e3a5f, #0f2744)',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(30,58,95,0.35)'
          }}>
            <img src="/brasao_9bpm.png" alt="Brasão 9º BPM"
              style={{ height: 60, objectFit: 'contain' }}
              onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          </div>
          <h1 style={{ fontSize: '1.35rem', color: '#1e3a5f', margin: 0, fontWeight: 700 }}>
            9º BPM — Força Tarefa
          </h1>
          <p style={{ color: '#64748b', marginTop: '0.4rem', fontSize: '0.9rem' }}>
            Acesso Restrito ao Sistema
          </p>
        </div>

        {/* Erro */}
        {error && (
          <div style={{
            background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626',
            padding: '0.75rem 1rem', borderRadius: '10px', marginBottom: '1.25rem',
            display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem'
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          {/* Campo: Nº de Ordem */}
          <div style={{ marginBottom: '1.1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.45rem', color: '#374151', fontWeight: 600, fontSize: '0.875rem' }}>
              Nº de Ordem / Matrícula
            </label>
            <div style={{ position: 'relative' }}>
              <Hash size={16} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                id="login-matricula"
                type="text"
                value={numero_ordem}
                onChange={(e) => setNumeroOrdem(e.target.value)}
                placeholder="Ex: 102700"
                autoComplete="username"
                style={{
                  width: '100%', padding: '0.8rem 0.8rem 0.8rem 2.5rem',
                  border: '1.5px solid #e2e8f0', borderRadius: '10px',
                  fontSize: '1rem', boxSizing: 'border-box',
                  transition: 'border-color 0.2s',
                  outline: 'none'
                }}
                onFocus={e => e.target.style.borderColor = '#1e3a5f'}
                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>
          </div>

          {/* Campo: CPF / Senha */}
          <div style={{ marginBottom: '1.75rem' }}>
            <label style={{ display: 'block', marginBottom: '0.45rem', color: '#374151', fontWeight: 600, fontSize: '0.875rem' }}>
              CPF (Senha padrão)
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                id="login-password"
                type={showPass ? 'text' : 'password'}
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                placeholder="Digite seu CPF (sem pontos)"
                autoComplete="current-password"
                style={{
                  width: '100%', padding: '0.8rem 2.8rem 0.8rem 2.5rem',
                  border: '1.5px solid #e2e8f0', borderRadius: '10px',
                  fontSize: '1rem', boxSizing: 'border-box',
                  transition: 'border-color 0.2s', outline: 'none'
                }}
                onFocus={e => e.target.style.borderColor = '#1e3a5f'}
                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                style={{
                  position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#94a3b8', display: 'flex', padding: 0
                }}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            id="login-btn"
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '0.9rem',
              background: loading ? '#94a3b8' : 'linear-gradient(135deg, #1e3a5f, #0f2744)',
              color: 'white', border: 'none', borderRadius: '10px',
              fontSize: '1rem', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              boxShadow: loading ? 'none' : '0 4px 16px rgba(30,58,95,0.4)',
              transition: 'all 0.2s',
              letterSpacing: '0.02em'
            }}
          >
            {loading ? (
              <>
                <div style={{
                  width: 18, height: 18, border: '2px solid rgba(255,255,255,0.4)',
                  borderTopColor: '#fff', borderRadius: '50%',
                  animation: 'spin 0.7s linear infinite'
                }} />
                Verificando...
              </>
            ) : (
              <>
                <Shield size={18} />
                Acessar Sistema
              </>
            )}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: '#94a3b8', fontSize: '0.8rem' }}>
          Sistema exclusivo para militares do 9º BPM/PMAL
        </p>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-5px); }
          80% { transform: translateX(5px); }
        }
      `}</style>
    </div>
  );
}
