import { useState } from 'react';
import axios from 'axios';
import {
  Shield, AlertCircle, Eye, EyeOff, Lock, UserCheck, KeyRound,
  CheckCircle2, ArrowRight, ArrowLeft, RefreshCw, Key, Sparkles, HelpCircle
} from 'lucide-react';
import { cleanCPF, formatCPF, isValidCPF } from '../utils/cpf';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001') + '/api';

export function LoginScreen({ onLogin }) {
  // Modos da tela: 'login', 'first-access-step1', 'first-access-step2', 'mfa', 'forgot'
  const [mode, setMode] = useState('login');

  // Campos de Login
  const [cpf, setCpf] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  // Campos de Primeiro Acesso
  const [faCpf, setFaCpf] = useState('');
  const [faMatricula, setFaMatricula] = useState('');
  const [faToken, setFaToken] = useState('');
  const [faUserData, setFaUserData] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);

  // Campos de MFA
  const [mfaToken, setMfaToken] = useState('');
  const [mfaCode, setMfaCode] = useState('');

  // Campos de Recuperação de Senha
  const [forgotCpf, setForgotCpf] = useState('');
  const [forgotMatricula, setForgotMatricula] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');

  // Estados de feedback
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [shake, setShake] = useState(false);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  // Regras de validação de senha
  const passwordRules = {
    length: newPassword.length >= 8,
    upper: /[A-Z]/.test(newPassword),
    lower: /[a-z]/.test(newPassword),
    number: /[0-9]/.test(newPassword),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword),
    match: newPassword.length > 0 && newPassword === confirmPassword
  };

  const isPasswordValid = Object.values(passwordRules).every(Boolean);

  // Manipulador de máscara de CPF
  const handleCpfChange = (setter) => (e) => {
    const raw = e.target.value;
    setter(formatCPF(raw));
    setError('');
  };

  // ============================================================
  // FLUXO DE LOGIN PRINCIPAL
  // ============================================================
  const handleLogin = async (e) => {
    e.preventDefault();
    const rawCpf = cleanCPF(cpf);

    if (!rawCpf || !password) {
      setError('Informe o CPF e a senha de acesso.');
      triggerShake();
      return;
    }

    if (!isValidCPF(rawCpf)) {
      setError('O CPF informado possui formato inválido.');
      triggerShake();
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await axios.post(`${API_URL}/login`, {
        cpf: rawCpf,
        password: password.trim()
      });

      if (res.data.success) {
        // Desafio MFA / 2FA necessário (SUPERUSER / Admin)
        if (res.data.mfa_required) {
          setMfaToken(res.data.mfa_token);
          setMode('mfa');
          setLoading(false);
          return;
        }

        // Login direto bem-sucedido
        finalizeLogin(res.data);
      }
    } catch (err) {
      const errCode = err.response?.data?.error?.code;
      const msg = err.response?.data?.error?.message || err.response?.data?.error || 'Erro ao conectar ao servidor.';

      if (errCode === 'FIRST_ACCESS_REQUIRED') {
        setError(msg);
        setFaCpf(formatCPF(rawCpf));
      } else {
        setError(typeof msg === 'string' ? msg : 'Credenciais inválidas.');
      }
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // FLUXO DE VERIFICAÇÃO MFA (2FA)
  // ============================================================
  const handleVerifyMfa = async (e) => {
    e.preventDefault();
    if (!mfaCode || mfaCode.trim().length !== 6) {
      setError('Digite o código de 6 dígitos gerado pelo seu aplicativo autenticador.');
      triggerShake();
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await axios.post(`${API_URL}/auth/mfa/verify`, {
        mfa_token: mfaToken,
        code: mfaCode.trim()
      });

      if (res.data.success) {
        finalizeLogin(res.data);
      }
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Código de verificação incorreto.';
      setError(msg);
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  // Finalização e armazenamento de tokens
  const finalizeLogin = ({ access_token, refresh_token, user }) => {
    localStorage.setItem('ft_access_token', access_token);
    localStorage.setItem('ft_refresh_token', refresh_token);
    localStorage.setItem('ft_user', JSON.stringify(user));
    axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
    onLogin(user, user.is_admin);
  };

  // ============================================================
  // FLUXO DE PRIMEIRO ACESSO - ETAPA 1 (VALIDAÇÃO DE IDENTIDADE)
  // ============================================================
  const handleValidateFirstAccess = async (e) => {
    e.preventDefault();
    const rawCpf = cleanCPF(faCpf);

    if (!rawCpf || !faMatricula) {
      setError('Preencha seu CPF e sua Matrícula Funcional (Nº de Ordem).');
      triggerShake();
      return;
    }

    if (!isValidCPF(rawCpf)) {
      setError('O CPF informado possui formato inválido.');
      triggerShake();
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await axios.post(`${API_URL}/auth/first-access/validate`, {
        cpf: rawCpf,
        matricula: faMatricula.trim()
      });

      if (res.data.success) {
        setFaToken(res.data.first_access_token);
        setFaUserData({
          nome: res.data.nome,
          posto: res.data.posto_graduacao,
          cpf: res.data.cpf
        });
        setMode('first-access-step2');
      }
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Dados não conferem com o cadastro do efetivo do 9º BPM.';
      setError(msg);
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // FLUXO DE PRIMEIRO ACESSO - ETAPA 2 (DEFINIÇÃO DA SENHA)
  // ============================================================
  const handleSetFirstAccessPassword = async (e) => {
    e.preventDefault();

    if (!isPasswordValid) {
      setError('Por favor, atenda a todos os requisitos mínimos de segurança da senha.');
      triggerShake();
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await axios.post(`${API_URL}/auth/first-access/set-password`, {
        token: faToken,
        new_password: newPassword,
        confirm_password: confirmPassword
      });

      if (res.data.success) {
        setSuccessMsg('Senha cadastrada com sucesso! Realize seu acesso agora com seu CPF e nova senha.');
        setCpf(faUserData?.cpf || faCpf);
        setPassword('');
        setMode('login');
      }
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Falha ao cadastrar senha.';
      setError(msg);
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // FLUXO DE RECUPERAÇÃO DE SENHA
  // ============================================================
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    const rawCpf = cleanCPF(forgotCpf);

    if (!rawCpf) {
      setError('Informe seu CPF cadastrado.');
      triggerShake();
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await axios.post(`${API_URL}/auth/password/forgot`, {
        cpf: rawCpf,
        matricula: forgotMatricula.trim()
      });

      if (res.data.success) {
        setForgotSuccess('Solicitação recebida. Se a conta existir, entre em contato com a administração do 9º BPM ou utilize o token de suporte.');
      }
    } catch (err) {
      setError('Não foi possível processar a recuperação de senha.');
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
      background: 'radial-gradient(ellipse at 50% 20%, #173256 0%, #0d1e34 60%, #081220 100%)',
      padding: '1.25rem',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Grade decorativa de fundo militar */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.05,
        backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
        backgroundSize: '28px 28px'
      }} />

      {/* Card Principal */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.98)',
        backdropFilter: 'blur(16px)',
        borderRadius: '24px',
        padding: '2.5rem',
        width: '100%',
        maxWidth: mode === 'first-access-step2' ? '460px' : '430px',
        boxShadow: '0 30px 90px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.6)',
        position: 'relative',
        animation: shake ? 'shake 0.5s ease' : 'none',
        transition: 'all 0.3s ease'
      }}>
        {/* Cabeçalho Institucional com Brasão */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{
            width: 86, height: 86, margin: '0 auto 1rem',
            background: 'linear-gradient(135deg, #1e3a5f 0%, #0f2744 100%)',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(30,58,95,0.35)',
            border: '2px solid rgba(255,255,255,0.8)'
          }}>
            <img
              src="/brasao_9bpm.png"
              alt="Brasão 9º BPM"
              style={{ height: 60, objectFit: 'contain' }}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          </div>
          <h1 style={{ fontSize: '1.35rem', color: '#1e3a5f', margin: 0, fontWeight: 800, letterSpacing: '-0.01em' }}>
            9º BPM — GSVR
          </h1>
          <p style={{ color: '#64748b', marginTop: '0.35rem', fontSize: '0.875rem', fontWeight: 500 }}>
            {mode === 'login' && 'Autenticação Segura por CPF'}
            {mode === 'first-access-step1' && 'Primeiro Acesso — Identificação'}
            {mode === 'first-access-step2' && 'Definição de Nova Senha'}
            {mode === 'mfa' && 'Autenticação em Duas Etapas'}
            {mode === 'forgot' && 'Recuperação de Senha'}
          </p>
        </div>

        {/* Mensagens de Sucesso */}
        {successMsg && (
          <div style={{
            background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534',
            padding: '0.85rem 1rem', borderRadius: '12px', marginBottom: '1.25rem',
            display: 'flex', alignItems: 'flex-start', gap: '0.6rem', fontSize: '0.875rem', lineHeight: '1.4'
          }}>
            <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>{successMsg}</div>
          </div>
        )}

        {/* Mensagens de Erro */}
        {error && (
          <div style={{
            background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626',
            padding: '0.85rem 1rem', borderRadius: '12px', marginBottom: '1.25rem',
            display: 'flex', alignItems: 'flex-start', gap: '0.6rem', fontSize: '0.875rem', lineHeight: '1.4'
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>{error}</div>
          </div>
        )}

        {/* ============================================================ */}
        {/* MODO 1: LOGIN POR CPF E SENHA */}
        {/* ============================================================ */}
        {mode === 'login' && (
          <form onSubmit={handleLogin}>
            {/* Campo: CPF */}
            <div style={{ marginBottom: '1.2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                <label style={{ color: '#1e293b', fontWeight: 600, fontSize: '0.875rem' }}>
                  CPF do Usuário
                </label>
                {cleanCPF(cpf).length === 11 && (
                  <span style={{ fontSize: '0.75rem', color: isValidCPF(cleanCPF(cpf)) ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                    {isValidCPF(cleanCPF(cpf)) ? '✓ CPF Válido' : '✗ CPF Inválido'}
                  </span>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <UserCheck size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <input
                  id="login-cpf"
                  type="text"
                  value={cpf}
                  onChange={handleCpfChange(setCpf)}
                  maxLength={14}
                  placeholder="000.000.000-00"
                  autoComplete="username"
                  style={{
                    width: '100%', padding: '0.85rem 1rem 0.85rem 2.75rem',
                    border: `1.5px solid ${cleanCPF(cpf).length === 11 ? (isValidCPF(cleanCPF(cpf)) ? '#22c55e' : '#ef4444') : '#cbd5e1'}`,
                    borderRadius: '12px', fontSize: '1rem', boxSizing: 'border-box',
                    outline: 'none', transition: 'border-color 0.2s', letterSpacing: '0.04em'
                  }}
                  onFocus={e => e.target.style.borderColor = '#1e3a5f'}
                  onBlur={e => e.target.style.borderColor = cleanCPF(cpf).length === 11 ? (isValidCPF(cleanCPF(cpf)) ? '#22c55e' : '#ef4444') : '#cbd5e1'}
                />
              </div>
            </div>

            {/* Campo: Senha */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                <label style={{ color: '#1e293b', fontWeight: 600, fontSize: '0.875rem' }}>
                  Senha de Acesso
                </label>
                <button
                  type="button"
                  onClick={() => { setMode('forgot'); setError(''); }}
                  style={{ background: 'none', border: 'none', color: '#0284c7', fontSize: '0.775rem', cursor: 'pointer', padding: 0 }}
                >
                  Esqueceu a senha?
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <input
                  id="login-password"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  autoComplete="current-password"
                  style={{
                    width: '100%', padding: '0.85rem 2.85rem 0.85rem 2.75rem',
                    border: '1.5px solid #cbd5e1', borderRadius: '12px',
                    fontSize: '1rem', boxSizing: 'border-box', outline: 'none',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={e => e.target.style.borderColor = '#1e3a5f'}
                  onBlur={e => e.target.style.borderColor = '#cbd5e1'}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{
                    position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', padding: 0
                  }}
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Botão Entrar */}
            <button
              id="login-submit-btn"
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '0.95rem',
                background: loading ? '#94a3b8' : 'linear-gradient(135deg, #1e3a5f 0%, #0f2744 100%)',
                color: 'white', border: 'none', borderRadius: '12px',
                fontSize: '1rem', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                boxShadow: loading ? 'none' : '0 4px 16px rgba(30,58,95,0.35)',
                transition: 'all 0.2s', letterSpacing: '0.01em'
              }}
            >
              {loading ? (
                <>
                  <div style={{
                    width: 18, height: 18, border: '2px solid rgba(255,255,255,0.4)',
                    borderTopColor: '#fff', borderRadius: '50%',
                    animation: 'spin 0.7s linear infinite'
                  }} />
                  Autenticando...
                </>
              ) : (
                <>
                  <Shield size={18} />
                  Acessar Sistema
                </>
              )}
            </button>

            {/* Botão de Primeiro Acesso */}
            <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid #e2e8f0', textAlign: 'center' }}>
              <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '0.6rem' }}>
                Ainda não cadastrou sua senha pessoal?
              </p>
              <button
                type="button"
                onClick={() => {
                  setMode('first-access-step1');
                  setError('');
                  setSuccessMsg('');
                  setFaCpf(cpf);
                }}
                style={{
                  width: '100%', padding: '0.75rem',
                  background: '#f8fafc', color: '#1e3a5f',
                  border: '1.5px solid #cbd5e1', borderRadius: '10px',
                  fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'}
                onMouseLeave={e => e.currentTarget.style.background = '#f8fafc'}
              >
                <KeyRound size={16} />
                Primeiro Acesso — Criar Minha Senha
              </button>
            </div>
          </form>
        )}

        {/* ============================================================ */}
        {/* MODO 2: PRIMEIRO ACESSO - ETAPA 1 (VALIDAR DADOS) */}
        {/* ============================================================ */}
        {mode === 'first-access-step1' && (
          <form onSubmit={handleValidateFirstAccess}>
            <div style={{
              background: '#f0f9ff', border: '1px solid #bae6fd', color: '#0369a1',
              padding: '0.85rem', borderRadius: '10px', marginBottom: '1.25rem', fontSize: '0.825rem', lineHeight: '1.4'
            }}>
              <strong>Verificação de Titularidade:</strong> Informe seu CPF e sua Matrícula Funcional registrada no efetivo do 9º BPM para liberar a criação da sua senha.
            </div>

            <div style={{ marginBottom: '1.1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.45rem', color: '#1e293b', fontWeight: 600, fontSize: '0.875rem' }}>
                CPF do Militar
              </label>
              <div style={{ position: 'relative' }}>
                <UserCheck size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <input
                  type="text"
                  value={faCpf}
                  onChange={handleCpfChange(setFaCpf)}
                  maxLength={14}
                  placeholder="000.000.000-00"
                  style={{
                    width: '100%', padding: '0.85rem 1rem 0.85rem 2.75rem',
                    border: '1.5px solid #cbd5e1', borderRadius: '12px', fontSize: '1rem', boxSizing: 'border-box', outline: 'none'
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.45rem', color: '#1e293b', fontWeight: 600, fontSize: '0.875rem' }}>
                Matrícula Funcional (Nº de Ordem)
              </label>
              <div style={{ position: 'relative' }}>
                <Key size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <input
                  type="text"
                  value={faMatricula}
                  onChange={(e) => setFaMatricula(e.target.value)}
                  placeholder="Ex: 102700"
                  style={{
                    width: '100%', padding: '0.85rem 1rem 0.85rem 2.75rem',
                    border: '1.5px solid #cbd5e1', borderRadius: '12px', fontSize: '1rem', boxSizing: 'border-box', outline: 'none'
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '0.9rem',
                background: loading ? '#94a3b8' : 'linear-gradient(135deg, #1e3a5f, #0f2744)',
                color: 'white', border: 'none', borderRadius: '12px', fontSize: '0.95rem', fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                boxShadow: '0 4px 14px rgba(30,58,95,0.3)'
              }}
            >
              {loading ? 'Validando Cadastro...' : (
                <>
                  Verificar Cadastro <ArrowRight size={16} />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); }}
              style={{
                width: '100%', marginTop: '0.9rem', padding: '0.6rem', background: 'none', border: 'none',
                color: '#64748b', fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem'
              }}
            >
              <ArrowLeft size={16} /> Voltar para o Login
            </button>
          </form>
        )}

        {/* ============================================================ */}
        {/* MODO 3: PRIMEIRO ACESSO - ETAPA 2 (DEFINIR NOVA SENHA) */}
        {/* ============================================================ */}
        {mode === 'first-access-step2' && (
          <form onSubmit={handleSetFirstAccessPassword}>
            {faUserData && (
              <div style={{
                background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0.85rem', marginBottom: '1.25rem'
              }}>
                <div style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Militar Identificado</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#1e3a5f', marginTop: '2px' }}>
                  {faUserData.posto} {faUserData.nome}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '2px' }}>
                  CPF: {faUserData.cpf}
                </div>
              </div>
            )}

            {/* Nova Senha */}
            <div style={{ marginBottom: '1.1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.45rem', color: '#1e293b', fontWeight: 600, fontSize: '0.875rem' }}>
                Nova Senha Pessoal
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <input
                  type={showNewPass ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Defina sua nova senha"
                  style={{
                    width: '100%', padding: '0.85rem 2.85rem 0.85rem 2.75rem',
                    border: '1.5px solid #cbd5e1', borderRadius: '12px', fontSize: '1rem', boxSizing: 'border-box', outline: 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  style={{
                    position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', padding: 0
                  }}
                >
                  {showNewPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Confirmar Nova Senha */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', marginBottom: '0.45rem', color: '#1e293b', fontWeight: 600, fontSize: '0.875rem' }}>
                Confirmação da Nova Senha
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <input
                  type={showNewPass ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a nova senha"
                  style={{
                    width: '100%', padding: '0.85rem 1rem 0.85rem 2.75rem',
                    border: '1.5px solid #cbd5e1', borderRadius: '12px', fontSize: '1rem', boxSizing: 'border-box', outline: 'none'
                  }}
                />
              </div>
            </div>

            {/* Checklist de Regras de Segurança */}
            <div style={{
              background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0.85rem', marginBottom: '1.5rem', fontSize: '0.8rem'
            }}>
              <div style={{ fontWeight: 700, color: '#334155', marginBottom: '0.5rem' }}>Requisitos de Segurança:</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem' }}>
                <div style={{ color: passwordRules.length ? '#16a34a' : '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <CheckCircle2 size={14} /> Mínimo 8 dígitos
                </div>
                <div style={{ color: passwordRules.upper ? '#16a34a' : '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <CheckCircle2 size={14} /> Letra maiúscula (A-Z)
                </div>
                <div style={{ color: passwordRules.lower ? '#16a34a' : '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <CheckCircle2 size={14} /> Letra minúscula (a-z)
                </div>
                <div style={{ color: passwordRules.number ? '#16a34a' : '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <CheckCircle2 size={14} /> Número (0-9)
                </div>
                <div style={{ color: passwordRules.special ? '#16a34a' : '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <CheckCircle2 size={14} /> Especial (!@#$...)
                </div>
                <div style={{ color: passwordRules.match ? '#16a34a' : '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <CheckCircle2 size={14} /> Senhas coincidem
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !isPasswordValid}
              style={{
                width: '100%', padding: '0.95rem',
                background: (loading || !isPasswordValid) ? '#94a3b8' : 'linear-gradient(135deg, #1e3a5f, #0f2744)',
                color: 'white', border: 'none', borderRadius: '12px', fontSize: '1rem', fontWeight: 700,
                cursor: (loading || !isPasswordValid) ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                boxShadow: (loading || !isPasswordValid) ? 'none' : '0 4px 16px rgba(30,58,95,0.35)'
              }}
            >
              {loading ? 'Gravando Senha...' : (
                <>
                  <Sparkles size={18} />
                  Confirmar e Concluir Cadastro
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => { setMode('first-access-step1'); setError(''); }}
              style={{
                width: '100%', marginTop: '0.9rem', padding: '0.6rem', background: 'none', border: 'none',
                color: '#64748b', fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem'
              }}
            >
              <ArrowLeft size={16} /> Voltar à Identificação
            </button>
          </form>
        )}

        {/* ============================================================ */}
        {/* MODO 4: SEGUNDO FATOR DE AUTENTICAÇÃO (MFA / TOTP) */}
        {/* ============================================================ */}
        {mode === 'mfa' && (
          <form onSubmit={handleVerifyMfa}>
            <div style={{
              background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af',
              padding: '0.85rem', borderRadius: '10px', marginBottom: '1.25rem', fontSize: '0.85rem', lineHeight: '1.4'
            }}>
              <strong>Conta Protegida com 2FA:</strong> Abra seu aplicativo autenticador (Google Authenticator, Microsoft Authenticator) e insira o código de 6 dígitos.
            </div>

            <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
              <label style={{ display: 'block', marginBottom: '0.6rem', color: '#1e293b', fontWeight: 600, fontSize: '0.9rem' }}>
                Código do Autenticador (6 dígitos)
              </label>
              <input
                type="text"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                autoFocus
                style={{
                  width: '200px', margin: '0 auto', padding: '0.8rem', textAlign: 'center',
                  fontSize: '1.6rem', fontWeight: 700, letterSpacing: '0.3em',
                  border: '2px solid #1e3a5f', borderRadius: '12px', outline: 'none'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading || mfaCode.length !== 6}
              style={{
                width: '100%', padding: '0.9rem',
                background: (loading || mfaCode.length !== 6) ? '#94a3b8' : 'linear-gradient(135deg, #1e3a5f, #0f2744)',
                color: 'white', border: 'none', borderRadius: '12px', fontSize: '1rem', fontWeight: 700,
                cursor: (loading || mfaCode.length !== 6) ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Verificando...' : 'Confirmar e Entrar'}
            </button>

            <button
              type="button"
              onClick={() => { setMode('login'); setMfaCode(''); setError(''); }}
              style={{
                width: '100%', marginTop: '0.9rem', padding: '0.6rem', background: 'none', border: 'none',
                color: '#64748b', fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem'
              }}
            >
              <ArrowLeft size={16} /> Voltar ao Login
            </button>
          </form>
        )}

        {/* ============================================================ */}
        {/* MODO 5: RECUPERAÇÃO DE SENHA */}
        {/* ============================================================ */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgotPassword}>
            {forgotSuccess ? (
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <CheckCircle2 size={48} color="#16a34a" style={{ margin: '0 auto 1rem' }} />
                <h3 style={{ color: '#1e3a5f', marginBottom: '0.5rem' }}>Solicitação Registrada</h3>
                <p style={{ color: '#475569', fontSize: '0.875rem', lineHeight: '1.5' }}>
                  {forgotSuccess}
                </p>
                <button
                  type="button"
                  onClick={() => { setMode('login'); setForgotSuccess(''); setError(''); }}
                  style={{
                    marginTop: '1.25rem', padding: '0.8rem 1.5rem', background: '#1e3a5f', color: 'white',
                    border: 'none', borderRadius: '10px', fontWeight: 600, cursor: 'pointer'
                  }}
                >
                  Voltar ao Login
                </button>
              </div>
            ) : (
              <>
                <div style={{
                  background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569',
                  padding: '0.85rem', borderRadius: '10px', marginBottom: '1.25rem', fontSize: '0.85rem', lineHeight: '1.4'
                }}>
                  Informe seu CPF para validação. Por segurança militar, redefinições são registradas em log de auditoria.
                </div>

                <div style={{ marginBottom: '1.1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.45rem', color: '#1e293b', fontWeight: 600, fontSize: '0.875rem' }}>
                    CPF do Usuário
                  </label>
                  <input
                    type="text"
                    value={forgotCpf}
                    onChange={handleCpfChange(setForgotCpf)}
                    maxLength={14}
                    placeholder="000.000.000-00"
                    style={{
                      width: '100%', padding: '0.85rem', border: '1.5px solid #cbd5e1',
                      borderRadius: '12px', fontSize: '1rem', boxSizing: 'border-box', outline: 'none'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.45rem', color: '#1e293b', fontWeight: 600, fontSize: '0.875rem' }}>
                    Matrícula Funcional (Confirmação)
                  </label>
                  <input
                    type="text"
                    value={forgotMatricula}
                    onChange={(e) => setForgotMatricula(e.target.value)}
                    placeholder="Ex: 102700"
                    style={{
                      width: '100%', padding: '0.85rem', border: '1.5px solid #cbd5e1',
                      borderRadius: '12px', fontSize: '1rem', boxSizing: 'border-box', outline: 'none'
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%', padding: '0.9rem',
                    background: loading ? '#94a3b8' : 'linear-gradient(135deg, #1e3a5f, #0f2744)',
                    color: 'white', border: 'none', borderRadius: '12px', fontSize: '1rem', fontWeight: 700,
                    cursor: loading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {loading ? 'Processando...' : 'Solicitar Redefinição'}
                </button>

                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(''); }}
                  style={{
                    width: '100%', marginTop: '0.9rem', padding: '0.6rem', background: 'none', border: 'none',
                    color: '#64748b', fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem'
                  }}
                >
                  <ArrowLeft size={16} /> Voltar ao Login
                </button>
              </>
            )}
          </form>
        )}

        <div style={{ textAlign: 'center', marginTop: '1.5rem', color: '#94a3b8', fontSize: '0.785rem' }}>
          Sistema GSVR • 9º Batalhão de Polícia Militar de Alagoas
        </div>
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
