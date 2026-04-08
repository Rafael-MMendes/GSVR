import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Shield, Plus, Trash2, Edit3, X, CheckCircle, AlertCircle,
  Key, Users, ChevronDown, ChevronRight, Save, Layers
} from 'lucide-react';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001') + '/api';

const MODULO_LABELS = {
  efetivo: 'Efetivo', ciclos: 'Ciclos', escalas: 'Escalas',
  usuarios: 'Usuários', financeiro: 'Financeiro', opm: 'OPM', perfil: 'Perfil'
};

const ROLE_BADGE_STYLES = {
  ADMIN:   { bg: '#fef2f2', color: '#dc2626', border: '#fecaca', label: '★ Admin' },
  GERENTE: { bg: '#fffbeb', color: '#d97706', border: '#fde68a', label: '◆ Gerente' },
  MILITAR: { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', label: '◉ Militar' },
};

function Alert({ type, message }) {
  const s = type === 'success'
    ? { bg: '#f0fdf4', border: '#86efac', color: '#166534', Icon: CheckCircle }
    : { bg: '#fef2f2', border: '#fecaca', color: '#dc2626', Icon: AlertCircle };
  return (
    <div style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color, padding: '0.75rem 1rem', borderRadius: 10, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
      <s.Icon size={15} style={{ flexShrink: 0 }} /> {message}
    </div>
  );
}

function RoleBadge({ nome }) {
  const s = ROLE_BADGE_STYLES[nome] || { bg: '#f8fafc', color: '#475569', border: '#e2e8f0', label: nome };
  return (
    <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`, padding: '0.2rem 0.65rem', borderRadius: 20, fontSize: '0.78rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
      {s.label}
    </span>
  );
}

// Modal para criar/editar role
function RoleModal({ role, allPermissions, onClose, onSave }) {
  const isNew = !role;
  const [nome, setNome] = useState(role?.nome || '');
  const [descricao, setDescricao] = useState(role?.descricao || '');
  const [selectedPerms, setSelectedPerms] = useState(role?.permissions?.map(p => p.id) || []);
  const [loading, setLoading] = useState(false);

  const groupedPerms = allPermissions.reduce((acc, p) => {
    const mod = p.modulo || 'geral';
    if (!acc[mod]) acc[mod] = [];
    acc[mod].push(p);
    return acc;
  }, {});

  const togglePerm = (id) => {
    setSelectedPerms(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSave = async () => {
    if (!isNew && !descricao && selectedPerms.length === 0) return;
    setLoading(true);
    try {
      if (isNew) {
        const res = await axios.post(`${API_URL}/roles`, { nome, descricao });
        if (selectedPerms.length > 0) {
          await axios.put(`${API_URL}/roles/${res.data.id}`, { permission_ids: selectedPerms });
        }
      } else {
        await axios.put(`${API_URL}/roles/${role.id}`, { descricao, permission_ids: selectedPerms });
      }
      onSave();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Erro ao salvar role.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 560, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 25px 70px rgba(0,0,0,0.25)' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>
            {isNew ? '+ Nova Role' : `Editar: ${role.nome}`}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={20} /></button>
        </div>

        <div style={{ padding: '1.5rem' }}>
          {isNew && (
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem', color: '#374151' }}>Nome da Role *</label>
              <input value={nome} onChange={e => setNome(e.target.value.toUpperCase())}
                placeholder="Ex: SUPERVISOR"
                style={{ width: '100%', padding: '0.75rem', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: '0.9rem', boxSizing: 'border-box', outline: 'none', fontFamily: 'monospace', fontWeight: 700 }} />
            </div>
          )}

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem', color: '#374151' }}>Descrição</label>
            <textarea value={descricao} onChange={e => setDescricao(e.target.value)}
              placeholder="Descreva o papel desta role..."
              rows={2}
              style={{ width: '100%', padding: '0.75rem', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: '0.9rem', boxSizing: 'border-box', outline: 'none', resize: 'vertical' }} />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <label style={{ fontWeight: 600, fontSize: '0.85rem', color: '#374151' }}>
                Permissões ({selectedPerms.length} selecionadas)
              </label>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button onClick={() => setSelectedPerms(allPermissions.map(p => p.id))}
                  style={{ background: '#f1f5f9', border: 'none', padding: '0.25rem 0.6rem', borderRadius: 6, cursor: 'pointer', fontSize: '0.75rem', color: '#475569' }}>
                  Todas
                </button>
                <button onClick={() => setSelectedPerms([])}
                  style={{ background: '#f1f5f9', border: 'none', padding: '0.25rem 0.6rem', borderRadius: 6, cursor: 'pointer', fontSize: '0.75rem', color: '#475569' }}>
                  Nenhuma
                </button>
              </div>
            </div>

            {Object.entries(groupedPerms).map(([mod, perms]) => (
              <div key={mod} style={{ marginBottom: '0.75rem', background: '#f8fafc', borderRadius: 10, padding: '0.75rem' }}>
                <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                  {MODULO_LABELS[mod] || mod}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {perms.map(p => (
                    <label key={p.id} style={{
                      display: 'flex', alignItems: 'center', gap: '0.3rem',
                      background: selectedPerms.includes(p.id) ? '#1e3a5f' : 'white',
                      color: selectedPerms.includes(p.id) ? 'white' : '#475569',
                      border: `1px solid ${selectedPerms.includes(p.id) ? '#1e3a5f' : '#e2e8f0'}`,
                      padding: '0.2rem 0.6rem', borderRadius: 20, fontSize: '0.75rem',
                      cursor: 'pointer', fontFamily: 'monospace', transition: 'all 0.15s'
                    }}>
                      <input type="checkbox" checked={selectedPerms.includes(p.id)} onChange={() => togglePerm(p.id)} style={{ display: 'none' }} />
                      {p.code}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
            <button onClick={onClose} style={{ padding: '0.7rem 1.2rem', background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', color: '#64748b', fontWeight: 600 }}>
              Cancelar
            </button>
            <button onClick={handleSave} disabled={loading || (isNew && !nome)} style={{
              padding: '0.7rem 1.5rem',
              background: 'linear-gradient(135deg, #1e3a5f, #0f2744)',
              color: 'white', border: 'none', borderRadius: 8,
              cursor: (loading || (isNew && !nome)) ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              fontWeight: 600, opacity: loading ? 0.7 : 1
            }}>
              <Save size={15} /> {loading ? 'Salvando...' : 'Salvar Role'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RolesManager() {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [expanded, setExpanded] = useState({});

  const showAlert = (type, message) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 4000);
  };

  const load = async () => {
    setLoading(true);
    try {
      const [rolesRes, permsRes] = await Promise.all([
        axios.get(`${API_URL}/roles`),
        axios.get(`${API_URL}/permissions`)
      ]);
      // Para cada role, busca as permissões detalhadas
      const rolesWithPerms = await Promise.all(
        rolesRes.data.data.map(async r => {
          const detail = await axios.get(`${API_URL}/roles/${r.id}`);
          return detail.data.data;
        })
      );
      setRoles(rolesWithPerms);
      setPermissions(permsRes.data.data);
    } catch {
      showAlert('error', 'Erro ao carregar roles e permissões.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (role) => {
    if (!confirm(`Excluir a role "${role.nome}"? Usuários que a possuem perderão essas permissões.`)) return;
    try {
      await axios.delete(`${API_URL}/roles/${role.id}`);
      showAlert('success', `Role "${role.nome}" excluída.`);
      load();
    } catch (err) {
      showAlert('error', err.response?.data?.error?.message || 'Erro ao excluir.');
    }
  };

  const handleModalSave = () => {
    setShowModal(false);
    setEditingRole(null);
    showAlert('success', 'Role salva com sucesso!');
    load();
  };

  const toggleExpand = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  const totalPerms = permissions.length;

  return (
    <div style={{ padding: '1.5rem', maxWidth: 860, margin: '0 auto' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1e3a5f, #0f2744)',
        borderRadius: 16, padding: '1.5rem', marginBottom: '1.5rem', color: 'white',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'rgba(255,255,255,0.15)', padding: '0.75rem', borderRadius: 12 }}>
            <Layers size={28} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700 }}>Controle de Acesso (RBAC)</h2>
            <p style={{ margin: '0.25rem 0 0', opacity: 0.8, fontSize: '0.875rem' }}>
              {roles.length} roles · {totalPerms} permissões disponíveis
            </p>
          </div>
        </div>
        <button onClick={() => { setEditingRole(null); setShowModal(true); }} style={{
          background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
          color: 'white', padding: '0.65rem 1.2rem', borderRadius: 10, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.875rem',
          backdropFilter: 'blur(10px)'
        }}>
          <Plus size={16} /> Nova Role
        </button>
      </div>

      {alert && <Alert type={alert.type} message={alert.message} />}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <div style={{ width: 40, height: 40, border: '3px solid #e2e8f0', borderTopColor: '#1e3a5f', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : (
        <div>
          {roles.map(role => {
            const badge = ROLE_BADGE_STYLES[role.nome] || {};
            const isExpanded = expanded[role.id];
            const groupedPerms = (role.permissions || []).reduce((acc, p) => {
              const mod = p.modulo || 'geral';
              if (!acc[mod]) acc[mod] = [];
              acc[mod].push(p);
              return acc;
            }, {});

            return (
              <div key={role.id} style={{
                background: 'white', borderRadius: 14, marginBottom: '1rem',
                border: '1px solid #f1f5f9',
                boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
                overflow: 'hidden'
              }}>
                {/* Role header */}
                <div style={{ padding: '1.1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => toggleExpand(role.id)}>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <RoleBadge nome={role.nome} />
                    <span style={{ color: '#64748b', fontSize: '0.875rem' }}>{role.descricao}</span>
                    {role.is_sistema && (
                      <span style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #86efac', padding: '0.1rem 0.5rem', borderRadius: 20, fontSize: '0.7rem' }}>
                        sistema
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                    <span style={{ background: '#f1f5f9', color: '#475569', padding: '0.25rem 0.65rem', borderRadius: 20, fontSize: '0.8rem', fontWeight: 600 }}>
                      <Key size={12} style={{ display: 'inline', marginRight: 4 }} />
                      {role.permissions?.length || 0} perm.
                    </span>
                    <button onClick={(e) => { e.stopPropagation(); setEditingRole(role); setShowModal(true); }}
                      style={{ background: '#eff6ff', border: 'none', borderRadius: 8, padding: '0.4rem 0.7rem', cursor: 'pointer', color: '#3b82f6', display: 'flex', alignItems: 'center' }}>
                      <Edit3 size={14} />
                    </button>
                    {!role.is_sistema && (
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(role); }}
                        style={{ background: '#fef2f2', border: 'none', borderRadius: 8, padding: '0.4rem 0.7rem', cursor: 'pointer', color: '#dc2626', display: 'flex', alignItems: 'center' }}>
                        <Trash2 size={14} />
                      </button>
                    )}
                    {isExpanded ? <ChevronDown size={16} color="#94a3b8" /> : <ChevronRight size={16} color="#94a3b8" />}
                  </div>
                </div>

                {/* Permissões expandidas */}
                {isExpanded && (
                  <div style={{ padding: '0 1.25rem 1.25rem', borderTop: '1px solid #f8fafc' }}>
                    {Object.entries(groupedPerms).length === 0 ? (
                      <p style={{ color: '#94a3b8', fontSize: '0.875rem', textAlign: 'center', padding: '1rem' }}>Nenhuma permissão atribuída.</p>
                    ) : (
                      Object.entries(groupedPerms).map(([mod, perms]) => (
                        <div key={mod} style={{ marginTop: '0.75rem' }}>
                          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>
                            {MODULO_LABELS[mod] || mod}
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                            {perms.map(p => (
                              <span key={p.id} style={{
                                background: '#f1f5f9', color: '#475569',
                                padding: '0.2rem 0.6rem', borderRadius: 20,
                                fontSize: '0.75rem', fontFamily: 'monospace'
                              }}>
                                {p.code}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <RoleModal
          role={editingRole}
          allPermissions={permissions}
          onClose={() => { setShowModal(false); setEditingRole(null); }}
          onSave={handleModalSave}
        />
      )}

      <style>{'@keyframes spin { to { transform: rotate(360deg); } }'}</style>
    </div>
  );
}
