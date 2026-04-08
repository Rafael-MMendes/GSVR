import { useState, useEffect } from 'react';
import axios from 'axios';
import { Shield, ShieldOff, RefreshCw, Search, User, AlertTriangle } from 'lucide-react';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001') + '/api';

export function UserManager() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const fetchUsuarios = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/usuarios`);
      setUsuarios(res.data);
    } catch (err) {
      alert('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const toggleAdmin = async (user) => {
    if (!confirm(`Deseja ${user.is_admin ? 'REBAIXAR' : 'PROMOVER'} o usuário "${user.nome_guerra || user.numero_ordem}" ${user.is_admin ? 'de administrador' : 'a administrador'}?`)) return;
    setActionLoading(user.id);
    try {
      await axios.put(`${API_URL}/usuarios/${user.id}/admin`, { is_admin: !user.is_admin });
      fetchUsuarios();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao alterar permissão');
    } finally {
      setActionLoading(null);
    }
  };

  const resetSenha = async (user) => {
    if (!confirm(`Deseja resetar a senha do usuário "${user.nome_guerra || user.numero_ordem}" para o CPF (padrão do sistema)?`)) return;
    setActionLoading(user.id);
    try {
      await axios.put(`${API_URL}/usuarios/${user.id}/senha`);
      alert('Senha resetada com sucesso para o CPF do militar.');
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao resetar senha');
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = usuarios.filter(u =>
    !searchTerm ||
    u.nome_guerra?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.nome_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.numero_ordem?.includes(searchTerm)
  );

  const admins = filtered.filter(u => u.is_admin);
  const regulares = filtered.filter(u => !u.is_admin);

  return (
    <div className="container" style={{ paddingBottom: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ margin: 0, color: '#1e3a5f', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Shield /> Gestão de Usuários
          </h2>
          <p style={{ margin: '5px 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>
            Controle de acesso e permissões do sistema
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              className="form-input"
              placeholder="Buscar por nome ou matrícula..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '36px', width: '260px' }}
            />
          </div>
        </div>
      </header>

      {/* Info box */}
      <div style={{ padding: '1rem', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '12px', marginBottom: '1.5rem', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        <AlertTriangle size={20} style={{ color: '#d97706', flexShrink: 0, marginTop: '2px' }} />
        <div style={{ color: '#92400e', fontSize: '0.875rem' }}>
          <strong>Regras de Acesso:</strong> A senha padrão de cada militar é o seu CPF (apenas números).
          Ao resetar a senha, ela voltará ao CPF original registrado no sistema.
          Administradores têm acesso completo ao sistema, incluindo este painel.
        </div>
      </div>

      {/* Cards de resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="glass-panel" style={{ padding: '1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Total de Usuários</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#1e3a5f' }}>{filtered.length}</div>
        </div>
        <div className="glass-panel" style={{ padding: '1rem', textAlign: 'center', borderTop: '3px solid #ef4444' }}>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Administradores</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#ef4444' }}>{admins.length}</div>
        </div>
        <div className="glass-panel" style={{ padding: '1rem', textAlign: 'center', borderTop: '3px solid #10b981' }}>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Usuários Regulares</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#10b981' }}>{regulares.length}</div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Carregando usuários...</div>
      ) : (
        <>
          {/* Administradores */}
          {admins.length > 0 && (
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ color: '#b91c1c', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.75rem' }}>
                <Shield size={16} /> Administradores ({admins.length})
              </h3>
              <div className="responsive-table-container">
                <table className="user-table">
                  <thead><tr>
                    <th>Usuário</th><th>Matrícula</th><th>Posto</th><th>Tipo</th><th>Ações</th>
                  </tr></thead>
                  <tbody>
                    {admins.map(user => (
                      <UserRow key={user.id} user={user} onToggleAdmin={toggleAdmin} onResetSenha={resetSenha} isLoading={actionLoading === user.id} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Usuários regulares */}
          <div>
            <h3 style={{ color: '#475569', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.75rem' }}>
              <User size={16} /> Militares — Acesso Regular ({regulares.length})
            </h3>
            {regulares.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Nenhum usuário regular encontrado.</div>
            ) : (
              <div className="responsive-table-container">
                <table className="user-table">
                  <thead><tr>
                    <th>Usuário</th><th>Matrícula</th><th>Posto</th><th>Tipo</th><th>Ações</th>
                  </tr></thead>
                  <tbody>
                    {regulares.map(user => (
                      <UserRow key={user.id} user={user} onToggleAdmin={toggleAdmin} onResetSenha={resetSenha} isLoading={actionLoading === user.id} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      <style>{`
        .user-table { width: 100%; border-collapse: collapse; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
        .user-table th { background: #f8fafc; padding: 10px 14px; text-align: left; font-size: 0.72rem; text-transform: uppercase; color: #64748b; font-weight: 600; border-bottom: 1px solid #e2e8f0; }
        .user-table td { padding: 10px 14px; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-size: 0.9rem; }
        .user-table tr:last-child td { border-bottom: none; }
        .user-table tr:hover { background: #f8fafc; }
        .action-btn { display: inline-flex; align-items: center; gap: 5px; padding: 5px 12px; border-radius: 6px; font-size: 0.78rem; font-weight: 600; cursor: pointer; border: none; transition: all 0.15s; }
        .action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>
    </div>
  );
}

function UserRow({ user, onToggleAdmin, onResetSenha, isLoading }) {
  return (
    <tr>
      <td>
        <div style={{ fontWeight: 600, color: '#1e293b' }}>{user.nome_guerra || user.nome_completo || '—'}</div>
      </td>
      <td><code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace' }}>{user.numero_ordem}</code></td>
      <td style={{ fontSize: '0.85rem', color: '#64748b' }}>{user.posto_graduacao || '—'}</td>
      <td>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '4px',
          background: user.is_admin ? '#fee2e2' : '#e0f2fe',
          color: user.is_admin ? '#b91c1c' : '#0369a1',
          padding: '3px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700
        }}>
          {user.is_admin ? <Shield size={11} /> : <User size={11} />}
          {user.is_admin ? 'Administrador' : 'Militar'}
        </span>
      </td>
      <td>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button
            className="action-btn"
            style={{
              background: user.is_admin ? '#fef2f2' : '#f0fdf4',
              color: user.is_admin ? '#b91c1c' : '#15803d',
              border: `1px solid ${user.is_admin ? '#fecaca' : '#bbf7d0'}`
            }}
            onClick={() => onToggleAdmin(user)}
            disabled={isLoading}
            title={user.is_admin ? 'Remover acesso admin' : 'Conceder acesso admin'}
          >
            {user.is_admin ? <ShieldOff size={13} /> : <Shield size={13} />}
            {user.is_admin ? 'Remover Admin' : 'Tornar Admin'}
          </button>
          <button
            className="action-btn"
            style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}
            onClick={() => onResetSenha(user)}
            disabled={isLoading}
            title="Resetar senha para o CPF"
          >
            <RefreshCw size={13} /> Resetar Senha
          </button>
        </div>
      </td>
    </tr>
  );
}
