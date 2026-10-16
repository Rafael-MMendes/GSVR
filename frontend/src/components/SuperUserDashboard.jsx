import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  ShieldAlert, Activity, Database, Server, Users, KeyRound,
  RefreshCw, Search, Filter, AlertTriangle, CheckCircle2, Clock,
  Smartphone, Lock, Unlock, Eye, Terminal, Cpu, FileText
} from 'lucide-react';
import { formatCPF } from '../utils/cpf';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001') + '/api';

export function SuperUserDashboard() {
  const [activeTab, setActiveTab] = useState('diagnostics'); // 'diagnostics', 'audit', 'mfa-setup'

  // Diagnósticos
  const [diagnostics, setDiagnostics] = useState(null);
  const [diagLoading, setDiagLoading] = useState(false);

  // Auditoria
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [filterAction, setFilterAction] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);

  // MFA Setup para a conta logada
  const [mfaData, setMfaData] = useState(null);
  const [mfaCodeInput, setMfaCodeInput] = useState('');
  const [mfaMessage, setMfaMessage] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);

  useEffect(() => {
    fetchDiagnostics();
    fetchAuditLogs(1);
  }, []);

  const fetchDiagnostics = async () => {
    setDiagLoading(true);
    try {
      const res = await axios.get(`${API_URL}/admin/diagnostics`);
      if (res.data.success) {
        setDiagnostics(res.data.diagnostics);
      }
    } catch (err) {
      console.error('Erro ao carregar diagnósticos', err);
    } finally {
      setDiagLoading(false);
    }
  };

  const fetchAuditLogs = async (page = 1) => {
    setAuditLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20'
      });
      if (filterAction) params.append('action', filterAction);
      if (filterStatus) params.append('status', filterStatus);
      if (searchTerm) params.append('search', searchTerm);

      const res = await axios.get(`${API_URL}/admin/audit-logs?${params.toString()}`);
      if (res.data.success) {
        setAuditLogs(res.data.data);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      console.error('Erro ao carregar logs de auditoria', err);
    } finally {
      setAuditLoading(false);
    }
  };

  const handleStartMfaSetup = async () => {
    setMfaLoading(true);
    setMfaMessage('');
    try {
      const res = await axios.post(`${API_URL}/auth/mfa/setup`);
      if (res.data.success) {
        setMfaData(res.data);
      }
    } catch (err) {
      setMfaMessage('Falha ao iniciar configuração do MFA.');
    } finally {
      setMfaLoading(false);
    }
  };

  const handleConfirmMfa = async (e) => {
    e.preventDefault();
    if (!mfaCodeInput || mfaCodeInput.length !== 6) {
      setMfaMessage('Digite o código de 6 dígitos.');
      return;
    }
    setMfaLoading(true);
    try {
      const res = await axios.post(`${API_URL}/auth/mfa/confirm`, { code: mfaCodeInput });
      if (res.data.success) {
        setMfaMessage('✅ ' + res.data.message);
        setMfaData(prev => ({ ...prev, mfa_enabled: true }));
        fetchDiagnostics();
      }
    } catch (err) {
      setMfaMessage('Código incorreto. Tente novamente.');
    } finally {
      setMfaLoading(false);
    }
  };

  const formatUptime = (seconds) => {
    if (!seconds) return '0s';
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${d > 0 ? d + 'd ' : ''}${h}h ${m}m ${s}s`;
  };

  const getActionBadgeColor = (action, status) => {
    if (status === 'FAILED') return { bg: '#fee2e2', text: '#dc2626' };
    if (action.includes('LOGIN_SUCCESS')) return { bg: '#dcfce7', text: '#15803d' };
    if (action.includes('FIRST_ACCESS')) return { bg: '#e0e7ff', text: '#4338ca' };
    if (action.includes('SUPERUSER')) return { bg: '#fef3c7', text: '#b45309' };
    if (action.includes('BLOCKED')) return { bg: '#fecaca', text: '#b91c1c' };
    return { bg: '#f1f5f9', text: '#475569' };
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1440px', margin: '0 auto', color: '#1e293b' }}>
      {/* Top Banner de Identificação SUPERUSER */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        borderRadius: '16px',
        padding: '1.5rem 2rem',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '2rem',
        boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.4)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            padding: '0.85rem',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
          }}>
            <ShieldAlert size={28} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, letterSpacing: '-0.01em' }}>
                Painel Técnico do Desenvolvedor (SUPERUSER)
              </h1>
              <span style={{
                background: '#f59e0b', color: '#78350f', fontSize: '0.7rem', fontWeight: 800,
                padding: '0.2rem 0.55rem', borderRadius: '6px', textTransform: 'uppercase'
              }}>
                Acesso Total
              </span>
            </div>
            <p style={{ margin: '0.3rem 0 0', color: '#94a3b8', fontSize: '0.875rem' }}>
              Gestão de Integridade da Plataforma, Logs de Auditoria e Diagnósticos Técnicos do GSVR
            </p>
          </div>
        </div>

        {/* Abas */}
        <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.08)', padding: '0.35rem', borderRadius: '10px' }}>
          <button
            onClick={() => setActiveTab('diagnostics')}
            style={{
              background: activeTab === 'diagnostics' ? '#3b82f6' : 'transparent',
              color: 'white', border: 'none', padding: '0.55rem 1rem', borderRadius: '8px',
              fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem'
            }}
          >
            <Activity size={16} /> Diagnóstico
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            style={{
              background: activeTab === 'audit' ? '#3b82f6' : 'transparent',
              color: 'white', border: 'none', padding: '0.55rem 1rem', borderRadius: '8px',
              fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem'
            }}
          >
            <FileText size={16} /> Auditoria do Sistema
          </button>
          <button
            onClick={() => { setActiveTab('mfa-setup'); handleStartMfaSetup(); }}
            style={{
              background: activeTab === 'mfa-setup' ? '#3b82f6' : 'transparent',
              color: 'white', border: 'none', padding: '0.55rem 1rem', borderRadius: '8px',
              fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem'
            }}
          >
            <Smartphone size={16} /> Meu MFA (2FA)
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* ABA 1: DIAGNÓSTICO DO SISTEMA */}
      {/* ============================================================ */}
      {activeTab === 'diagnostics' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
            <button
              onClick={fetchDiagnostics}
              disabled={diagLoading}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.55rem 1rem',
                background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px',
                fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer'
              }}
            >
              <RefreshCw size={14} className={diagLoading ? 'spin' : ''} />
              Atualizar Diagnósticos
            </button>
          </div>

          {diagnostics ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
              {/* Card Banco de Dados */}
              <div style={{ background: 'white', padding: '1.5rem', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
                  <div style={{ background: '#ecfdf5', padding: '0.6rem', borderRadius: '10px', color: '#059669' }}>
                    <Database size={22} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>PostgreSQL 16</h3>
                    <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>● Conectado e Saudável</span>
                  </div>
                </div>
                <div style={{ fontSize: '0.875rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Latência de Consulta:</span>
                    <strong>{diagnostics.database.latency_ms} ms</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Conexões Ativas:</span>
                    <strong>{diagnostics.database.active_connections}</strong>
                  </div>
                </div>
              </div>

              {/* Card Resumo de Usuários */}
              <div style={{ background: 'white', padding: '1.5rem', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
                  <div style={{ background: '#eff6ff', padding: '0.6rem', borderRadius: '10px', color: '#2563eb' }}>
                    <Users size={22} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Usuários e Contas</h3>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Total Cadastrado: {diagnostics.users_summary.total}</span>
                  </div>
                </div>
                <div style={{ fontSize: '0.875rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Ativos / Operacionais:</span>
                    <strong style={{ color: '#16a34a' }}>{diagnostics.users_summary.ativos}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Senhas Definidas:</span>
                    <strong>{diagnostics.users_summary.senhas_definidas}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Contas Bloqueadas:</span>
                    <strong style={{ color: diagnostics.users_summary.bloqueados > 0 ? '#dc2626' : '#16a34a' }}>
                      {diagnostics.users_summary.bloqueados}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Superusuários Ativos:</span>
                    <strong style={{ color: '#d97706' }}>{diagnostics.total_superusers}</strong>
                  </div>
                </div>
              </div>

              {/* Card Servidor Node.js */}
              <div style={{ background: 'white', padding: '1.5rem', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
                  <div style={{ background: '#fef3c7', padding: '0.6rem', borderRadius: '10px', color: '#d97706' }}>
                    <Server size={22} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Ambiente Node.js</h3>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Versão: {diagnostics.node_version}</span>
                  </div>
                </div>
                <div style={{ fontSize: '0.875rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Tempo de Atividade (Uptime):</span>
                    <strong>{formatUptime(diagnostics.uptime_seconds)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Memória RSS:</span>
                    <strong>{diagnostics.memory.rss_mb} MB</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Memória Heap Usada:</span>
                    <strong>{diagnostics.memory.heap_used_mb} / {diagnostics.memory.heap_total_mb} MB</strong>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>Carregando dados de diagnóstico...</div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* ABA 2: LOGS DE AUDITORIA DO SISTEMA */}
      {/* ============================================================ */}
      {activeTab === 'audit' && (
        <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}>
          {/* Barra de Filtros */}
          <div style={{ padding: '1.25rem', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', flex: 1 }}>
              <div style={{ position: 'relative', minWidth: '220px', flex: 1 }}>
                <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Buscar por CPF, Nome, IP ou Ação..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') fetchAuditLogs(1); }}
                  style={{
                    width: '100%', padding: '0.55rem 0.75rem 0.55rem 2.2rem',
                    border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.875rem', outline: 'none'
                  }}
                />
              </div>

              <select
                value={filterAction}
                onChange={(e) => { setFilterAction(e.target.value); }}
                style={{ padding: '0.55rem 0.85rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.875rem', outline: 'none' }}
              >
                <option value="">Todas as Ações</option>
                <option value="LOGIN_SUCCESS">LOGIN_SUCCESS</option>
                <option value="LOGIN_FAILED">LOGIN_FAILED</option>
                <option value="FIRST_ACCESS_COMPLETED">FIRST_ACCESS_COMPLETED</option>
                <option value="SUPERUSER_PROVISIONED">SUPERUSER_PROVISIONED</option>
                <option value="USER_BLOCKED">USER_BLOCKED</option>
                <option value="USER_UNBLOCKED">USER_UNBLOCKED</option>
                <option value="PASSWORD_CHANGED">PASSWORD_CHANGED</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => { setFilterStatus(e.target.value); }}
                style={{ padding: '0.55rem 0.85rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.875rem', outline: 'none' }}
              >
                <option value="">Status (Todos)</option>
                <option value="SUCCESS">Sucesso (SUCCESS)</option>
                <option value="FAILED">Falha (FAILED)</option>
              </select>

              <button
                onClick={() => fetchAuditLogs(1)}
                style={{
                  background: '#1e3a5f', color: 'white', border: 'none', padding: '0.55rem 1rem',
                  borderRadius: '8px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem'
                }}
              >
                Filtrar
              </button>
            </div>

            <div style={{ color: '#64748b', fontSize: '0.85rem' }}>
              Total: <strong>{pagination.total}</strong> eventos
            </div>
          </div>

          {/* Tabela de Logs */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '0.785rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Data / Hora</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Ação Executada</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Usuário / Militar</th>
                  <th style={{ padding: '0.75rem 1rem' }}>CPF Identificador</th>
                  <th style={{ padding: '0.75rem 1rem' }}>IP de Origem</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Resultado</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {auditLoading ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>Carregando logs de auditoria...</td>
                  </tr>
                ) : auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>Nenhum log encontrado para os filtros selecionados.</td>
                  </tr>
                ) : (
                  auditLogs.map((log) => {
                    const badge = getActionBadgeColor(log.action, log.status);
                    return (
                      <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }} onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                        <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap', color: '#64748b', fontSize: '0.8rem' }}>
                          {new Date(log.created_at).toLocaleString('pt-BR')}
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span style={{
                            background: badge.bg, color: badge.text, padding: '0.2rem 0.55rem',
                            borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700
                          }}>
                            {log.action}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>
                          {log.usuario_nome}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: '#475569', fontFamily: 'monospace' }}>
                          {log.cpf ? formatCPF(log.cpf) : (log.numero_ordem || 'N/A')}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: '#64748b', fontSize: '0.8rem' }}>
                          {log.ip || '-'}
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span style={{
                            color: log.status === 'SUCCESS' ? '#16a34a' : '#dc2626',
                            fontWeight: 700, fontSize: '0.75rem'
                          }}>
                            {log.status === 'SUCCESS' ? '✓ SUCESSO' : '✗ FALHA'}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                          <button
                            onClick={() => setSelectedLog(log)}
                            style={{
                              background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#1e3a5f',
                              padding: '0.3rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer'
                            }}
                          >
                            Ver Detalhes
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          <div style={{ padding: '1rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
              Página <strong>{pagination.page}</strong> de <strong>{pagination.totalPages || 1}</strong>
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchAuditLogs(pagination.page - 1)}
                style={{ padding: '0.4rem 0.85rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: 'white', cursor: pagination.page <= 1 ? 'not-allowed' : 'pointer' }}
              >
                Anterior
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchAuditLogs(pagination.page + 1)}
                style={{ padding: '0.4rem 0.85rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: 'white', cursor: pagination.page >= pagination.totalPages ? 'not-allowed' : 'pointer' }}
              >
                Próxima
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* ABA 3: CONFIGURAÇÃO DE MFA DO DESENVOLVEDOR */}
      {/* ============================================================ */}
      {activeTab === 'mfa-setup' && (
        <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>
            Autenticação em Duas Etapas (MFA / TOTP)
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem', lineHeight: '1.5', margin: '0 0 1.5rem 0' }}>
            Recomendada para contas de desenvolvedor e administração técnica. Protege seu acesso mesmo caso sua senha seja comprometida.
          </p>

          {mfaMessage && (
            <div style={{
              padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.875rem',
              background: mfaMessage.startsWith('✅') ? '#f0fdf4' : '#fef2f2',
              color: mfaMessage.startsWith('✅') ? '#166534' : '#dc2626',
              border: `1px solid ${mfaMessage.startsWith('✅') ? '#bbf7d0' : '#fecaca'}`
            }}>
              {mfaMessage}
            </div>
          )}

          {mfaData ? (
            <div>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem', textAlign: 'center' }}>
                <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.5rem' }}>
                  Chave Secreta Manual (Base32):
                </div>
                <div style={{
                  fontFamily: 'monospace', fontSize: '1.2rem', fontWeight: 700, letterSpacing: '0.15em',
                  color: '#1e3a5f', background: 'white', padding: '0.6rem', borderRadius: '8px', border: '1px dashed #94a3b8'
                }}>
                  {mfaData.secret}
                </div>
                <p style={{ fontSize: '0.785rem', color: '#64748b', marginTop: '0.75rem' }}>
                  Copie e adicione esta chave no <strong>Google Authenticator</strong>, <strong>Microsoft Authenticator</strong> ou <strong>Authy</strong>.
                </p>
              </div>

              <form onSubmit={handleConfirmMfa}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.45rem' }}>
                  Digite o código de 6 dígitos gerado no app para confirmar:
                </label>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <input
                    type="text"
                    value={mfaCodeInput}
                    onChange={(e) => setMfaCodeInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    style={{
                      flex: 1, padding: '0.75rem', fontSize: '1.2rem', textAlign: 'center',
                      fontWeight: 700, letterSpacing: '0.2em', border: '1.5px solid #cbd5e1', borderRadius: '8px'
                    }}
                  />
                  <button
                    type="submit"
                    disabled={mfaLoading || mfaCodeInput.length !== 6}
                    style={{
                      padding: '0.75rem 1.5rem', background: '#1e3a5f', color: 'white',
                      border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer'
                    }}
                  >
                    Ativar MFA
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <button
                onClick={handleStartMfaSetup}
                style={{
                  padding: '0.85rem 1.5rem', background: '#1e3a5f', color: 'white', border: 'none',
                  borderRadius: '10px', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer'
                }}
              >
                Configurar MFA Agora
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal de Detalhes do Log de Auditoria */}
      {selectedLog && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '1.75rem', maxWidth: '600px', width: '100%', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>
                Detalhes do Evento de Auditoria #{selectedLog.id}
              </h3>
              <button
                onClick={() => setSelectedLog(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <div style={{ fontSize: '0.875rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <div><strong>Ação:</strong> {selectedLog.action}</div>
              <div><strong>Data/Hora:</strong> {new Date(selectedLog.created_at).toLocaleString('pt-BR')}</div>
              <div><strong>Usuário:</strong> {selectedLog.usuario_nome} (ID: {selectedLog.user_id || 'N/A'})</div>
              <div><strong>CPF:</strong> {selectedLog.cpf ? formatCPF(selectedLog.cpf) : 'N/A'}</div>
              <div><strong>Matrícula:</strong> {selectedLog.numero_ordem || 'N/A'}</div>
              <div><strong>IP:</strong> {selectedLog.ip || 'N/A'}</div>
              <div><strong>User Agent:</strong> <span style={{ wordBreak: 'break-all' }}>{selectedLog.user_agent || 'N/A'}</span></div>
              <div><strong>Status:</strong> {selectedLog.status}</div>

              <div>
                <strong>Metadados / Detalhes JSON:</strong>
                <pre style={{
                  background: '#f1f5f9', padding: '0.75rem', borderRadius: '8px', fontSize: '0.8rem',
                  overflowX: 'auto', marginTop: '0.35rem', color: '#0f172a'
                }}>
                  {JSON.stringify(selectedLog.details, null, 2)}
                </pre>
              </div>
            </div>

            <button
              onClick={() => setSelectedLog(null)}
              style={{
                marginTop: '1.25rem', width: '100%', padding: '0.75rem', background: '#1e3a5f',
                color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer'
              }}
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
