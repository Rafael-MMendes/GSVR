import { useState, useEffect } from 'react';
import axios from 'axios';
import { Shield, ShieldOff, RefreshCw, Search, User, AlertTriangle, Plus, Trash2, X, CheckCircle2, Key, Save } from 'lucide-react';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001') + '/api';

export function UserManager() {
  const [usuarios, setUsuarios] = useState([]);
  const [militaresSemConta, setMilitaresSemConta] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showPermsModal, setShowPermsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userPermissions, setUserPermissions] = useState([]);
  const [newUserData, setNewUserData] = useState({ matricula: '', is_admin: false });
  const [sortConfig, setSortConfig] = useState({ key: 'nome_guerra', direction: 'asc' });

  useEffect(() => {
    fetchUsuarios();
    fetchMilitaresSemConta();
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

  const fetchMilitaresSemConta = async () => {
    try {
      const res = await axios.get(`${API_URL}/militares/not-users`);
      setMilitaresSemConta(res.data);
    } catch (err) {
      console.error('Erro ao buscar militares sem conta', err);
    }
  };

  const toggleAdmin = async (user) => {
    const action = user.is_admin ? 'REBAIXAR' : 'PROMOVER';
    if (!confirm(`Deseja ${action} o militar "${user.nome_guerra || user.numero_ordem}"?`)) return;
    
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
    if (!confirm(`Deseja resetar a senha de ${user.nome_guerra || user.numero_ordem} para o CPF?`)) return;
    
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

  const deleteUser = async (user) => {
    if (!confirm(`AVISO: Deseja EXCLUIR permanentemente a conta de acesso de "${user.nome_guerra || user.numero_ordem}"? O militar continuará no efetivo, mas não poderá logar.`)) return;
    
    setActionLoading(user.id);
    try {
      await axios.delete(`${API_URL}/usuarios/${user.id}`);
      fetchUsuarios();
      fetchMilitaresSemConta();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao excluir usuário');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUserData.matricula) return alert('Selecione um militar');
    
    setLoading(true);
    try {
      await axios.post(`${API_URL}/usuarios`, newUserData);
      setShowModal(false);
      setNewUserData({ matricula: '', is_admin: false });
      fetchUsuarios();
      fetchMilitaresSemConta();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao criar usuário');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPerms = async (user) => {
    setSelectedUser(user);
    setActionLoading(user.id);
    try {
      const res = await axios.get(`${API_URL}/usuarios/${user.id}/permissoes`);
      setUserPermissions(res.data);
      setShowPermsModal(true);
    } catch (err) {
      alert('Erro ao carregar permissões do usuário');
    } finally {
      setActionLoading(null);
    }
  };

  const toggleUserPermission = async (permId, currentVal) => {
    if (!selectedUser) return;
    
    // Novo valor: true -> false -> null -> true
    let newVal;
    if (currentVal === true) newVal = false;
    else if (currentVal === false) newVal = null;
    else newVal = true;

    try {
      await axios.put(`${API_URL}/usuarios/${selectedUser.id}/permissoes`, {
        permission_id: permId,
        permitido: newVal
      });
      
      // Atualizar estado local
      setUserPermissions(prev => prev.map(p => 
        p.id === permId ? { ...p, permitido: newVal } : p
      ));
    } catch (err) {
      alert('Erro ao atualizar permissão');
    }
  };

  const filtered = usuarios.filter(u =>
    !searchTerm ||
    u.nome_guerra?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.nome_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.numero_ordem?.includes(searchTerm)
  ).sort((a, b) => {
    if (!sortConfig.key) return 0;
    
    let aVal = a[sortConfig.key];
    let bVal = b[sortConfig.key];

    // Tratamento especial para números
    if (sortConfig.key === 'numero_ordem') {
        aVal = parseInt(String(aVal || '0').replace(/\D/g, '')) || 0;
        bVal = parseInt(String(bVal || '0').replace(/\D/g, '')) || 0;
    }

    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const admins = filtered.filter(u => u.is_admin);
  const regulares = filtered.filter(u => !u.is_admin);

  return (
    <div className="container" style={{ paddingBottom: '3rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ margin: 0, color: '#1e3a5f', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Shield /> Gestão de Usuários
          </h2>
          <p style={{ margin: '5px 0 0 0', color: '#64748b', fontSize: '0.85rem' }}>
            Administração de contas de acesso e níveis de permissão
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              className="form-control"
              placeholder="Buscar usuário..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '34px', width: '220px', fontSize: '0.85rem' }}
            />
          </div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={18} /> Novo Usuário
          </button>
        </div>
      </header>

      <div style={{ padding: '0.75rem 1rem', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', marginBottom: '1.5rem', display: 'flex', gap: '10px', alignItems: 'center' }}>
        <CheckCircle2 size={18} style={{ color: '#3b82f6', flexShrink: 0 }} />
        <div style={{ color: '#1e40af', fontSize: '0.8rem' }}>
          <strong>Dica:</strong> A senha padrão é sempre o <strong>CPF</strong> (somente números). O acesso é feito pela <strong>Matrícula</strong>.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <StatCard label="Total de Contas" value={usuarios.length} color="#1e3a5f" />
        <StatCard label="Administradores" value={usuarios.filter(u => u.is_admin).length} color="#ef4444" />
        <StatCard label="Militares (Acesso)" value={usuarios.filter(u => !u.is_admin).length} color="#10b981" />
      </div>

      {loading && usuarios.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>
          <Shield className="animate-pulse" size={48} style={{ opacity: 0.2, margin: '0 auto 1rem' }} />
          Carregando base de usuários...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div>
            <SectionTitle icon={<Shield size={16} />} title={`Administradores (${admins.length})`} color="#ef4444" />
            <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="responsive-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th style={{ cursor: 'pointer' }} onClick={() => requestSort('nome_guerra')}>
                        Militar {sortConfig.key === 'nome_guerra' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                      </th>
                      <th style={{ cursor: 'pointer' }} onClick={() => requestSort('numero_ordem')}>
                        Matrícula {sortConfig.key === 'numero_ordem' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                      </th>
                      <th style={{ cursor: 'pointer' }} onClick={() => requestSort('posto_graduacao')}>
                        Posto/OPM {sortConfig.key === 'posto_graduacao' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                      </th>
                      <th style={{ textAlign: 'center' }}>Nível</th>
                      <th style={{ textAlign: 'right' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {admins.map(u => (
                      <UserRow 
                        key={u.id} 
                        user={u} 
                        onToggle={toggleAdmin} 
                        onReset={resetSenha} 
                        onDelete={deleteUser} 
                        onPerms={handleOpenPerms}
                        loading={actionLoading === u.id} 
                      />
                    ))}
                    {admins.length === 0 && <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Nenhum administrador encontrado</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div>
            <SectionTitle icon={<User size={16} />} title={`Acesso Padrão (${regulares.length})`} color="#64748b" />
            <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="responsive-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th style={{ cursor: 'pointer' }} onClick={() => requestSort('nome_guerra')}>
                        Militar {sortConfig.key === 'nome_guerra' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                      </th>
                      <th style={{ cursor: 'pointer' }} onClick={() => requestSort('numero_ordem')}>
                        Matrícula {sortConfig.key === 'numero_ordem' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                      </th>
                      <th style={{ cursor: 'pointer' }} onClick={() => requestSort('posto_graduacao')}>
                        Posto/OPM {sortConfig.key === 'posto_graduacao' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                      </th>
                      <th style={{ textAlign: 'center' }}>Nível</th>
                      <th style={{ textAlign: 'right' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {regulares.map(u => (
                      <UserRow 
                        key={u.id} 
                        user={u} 
                        onToggle={toggleAdmin} 
                        onReset={resetSenha} 
                        onDelete={deleteUser} 
                        onPerms={handleOpenPerms}
                        loading={actionLoading === u.id} 
                      />
                    ))}
                    {regulares.length === 0 && <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Nenhum usuário padrão encontrado</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPermsModal && selectedUser && (
        <div className="modal-overlay">
          <div className="modal-content-premium" style={{ width: '600px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', padding: 0 }}>
            <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid #f1f5f9' }}>
               <button className="btn-close" onClick={() => setShowPermsModal(false)}><X size={20} /></button>
               <h3 style={{ margin: 0, color: '#1e3a5f', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Key size={20} /> Permissões: {selectedUser.nome_guerra || selectedUser.numero_ordem}
              </h3>
              <p style={{ margin: '5px 0 0 0', color: '#64748b', fontSize: '0.8rem' }}>
                Atribua ou revogue permissões específicas para este usuário (sobrepõe as roles).
              </p>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 2rem' }}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#e2e8f0', border: '1px solid #cbd5e1' }}></div>
                  Padrão (Role)
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#dcfce7', border: '1px solid #86efac' }}></div>
                  Concedida Direta
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#fee2e2', border: '1px solid #fecaca' }}></div>
                  Negada Direta
                </div>
              </div>

              {Object.entries(
                userPermissions.reduce((acc, p) => {
                  if (!acc[p.modulo]) acc[p.modulo] = [];
                  acc[p.modulo].push(p);
                  return acc;
                }, {})
              ).map(([modulo, perms]) => (
                <div key={modulo} style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '4px' }}>
                    Módulo: {modulo}
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {perms.map(p => (
                      <div 
                        key={p.id}
                        onClick={() => toggleUserPermission(p.id, p.permitido)}
                        style={{ 
                          padding: '8px 12px', 
                          borderRadius: '8px', 
                          border: '1px solid',
                          borderColor: p.permitido === true ? '#86efac' : p.permitido === false ? '#fecaca' : '#e2e8f0',
                          background: p.permitido === true ? '#f0fdf4' : p.permitido === false ? '#fef2f2' : '#fff',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          transition: 'all 0.2s'
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1e293b' }}>{p.code}</div>
                          <div style={{ fontSize: '0.65rem', color: '#64748b' }}>{p.descricao}</div>
                        </div>
                        {p.permitido === true && <CheckCircle2 size={14} style={{ color: '#10b981' }} />}
                        {p.permitido === false && <X size={14} style={{ color: '#ef4444' }} />}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ padding: '1.25rem 2rem', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={() => setShowPermsModal(false)}>Concluído</button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content-premium" style={{ width: '450px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Nova Conta de Acesso</h3>
              <p className="modal-subtitle">Crie um acesso para um militar já cadastrado no efetivo.</p>
            </div>
            <form onSubmit={handleCreateUser}>
              <div className="form-group">
                <label className="form-label">Selecionar Militar</label>
                <select 
                  className="form-control" 
                  value={newUserData.matricula}
                  onChange={e => setNewUserData({...newUserData, matricula: e.target.value})}
                  required
                >
                  <option value="">Selecione um militar disponível...</option>
                  {militaresSemConta.map(m => (
                    <option key={m.matricula} value={m.matricula}>
                      {m.posto_graduacao} {m.nome_completo} ({m.matricula})
                    </option>
                  ))}
                </select>
                {militaresSemConta.length === 0 && (
                  <p style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '5px' }}>
                    Todos os militares cadastrados já possuem conta de acesso.
                  </p>
                )}
              </div>

              <div style={{ margin: '1.5rem 0', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
                <input 
                  type="checkbox" 
                  id="isAdmin" 
                  checked={newUserData.is_admin}
                  onChange={e => setNewUserData({...newUserData, is_admin: e.target.checked})}
                  style={{ width: '18px', height: '18px' }}
                />
                <label htmlFor="isAdmin" style={{ cursor: 'pointer', fontWeight: 600, color: '#1e293b', margin: 0 }}>
                  Conceder privilégios de Administrador
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={loading || !newUserData.matricula}>
                  {loading ? 'Criando...' : 'Criar Acesso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: '1.75rem', fontWeight: 800, color }}>{value}</span>
    </div>
  );
}

function SectionTitle({ icon, title, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem', paddingLeft: '4px' }}>
      <div style={{ color }}>{icon}</div>
      <h3 style={{ margin: 0, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569', fontWeight: 700 }}>{title}</h3>
    </div>
  );
}

function UserRow({ user, onToggle, onReset, onDelete, onPerms, loading }) {
  return (
    <tr style={{ opacity: loading ? 0.6 : 1 }}>
      <td>
        <div style={{ fontWeight: 600, color: '#1e293b' }}>{user.nome_guerra || user.nome_completo || '—'}</div>
        <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{user.nome_completo || '—'}</div>
      </td>
      <td><code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontSize: '0.8rem' }}>{user.numero_ordem}</code></td>
      <td>
        <div style={{ fontSize: '0.85rem', color: '#475569' }}>{user.posto_graduacao}</div>
        <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{user.opm || 'OPM não informada'}</div>
      </td>
      <td style={{ textAlign: 'center' }}>
        <span style={{
          padding: '4px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
          background: user.is_admin ? '#fee2e2' : '#f0fdf4',
          color: user.is_admin ? '#ef4444' : '#10b981'
        }}>
          {user.is_admin ? 'Admin' : 'Militar'}
        </span>
      </td>
      <td style={{ textAlign: 'right' }}>
        <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
          <button className="action-icon" disabled={loading} onClick={() => onPerms(user)} title="Gerenciar Permissões Individuais">
            <Key size={16} />
          </button>
          <button className="action-icon" disabled={loading} onClick={() => onToggle(user)} title="Alternar Permissão Admin">
            {user.is_admin ? <ShieldOff size={16} /> : <Shield size={16} />}
          </button>
          <button className="action-icon" disabled={loading} onClick={() => onReset(user)} title="Resetar Senha para CPF">
            <RefreshCw size={16} />
          </button>
          <button className="action-icon delete" disabled={loading || user.numero_ordem === '999999'} onClick={() => onDelete(user)} title="Remover Conta de Acesso">
            <Trash2 size={16} />
          </button>
        </div>
      </td>
    </tr>
  );
}
