import { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, Plus, Edit2, Trash2, Search, User, CreditCard, Shield, MapPin, Phone, CheckCircle, XCircle, FileSpreadsheet, X, MoreVertical } from 'lucide-react';
import { maskPhone, formatPhone } from '../utils/formatters';
import { EfetivoImport } from './EfetivoImport';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001') + '/api';

export function EfetivoManager() {
  const [efetivo, setEfetivo] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingMilitar, setEditingMilitar] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'nome_completo', direction: 'asc' });
  const [formData, setFormData] = useState({
    nome_completo: '',
    nome_guerra: '',
    posto_graduacao: '',
    matricula: '',
    numero_ordem: '',
    cpf: '',
    rgpm: '',
    opm: '',
    telefone: '',
    status_ativo: true
  });

  useEffect(() => {
    fetchEfetivo();
  }, []);

  const fetchEfetivo = async () => {
    try {
      const res = await axios.get(`${API_URL}/efetivo`);
      setEfetivo(res.data);
    } catch (err) {
      alert('Erro ao carregar o efetivo');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingMilitar) {
        await axios.put(`${API_URL}/efetivo/${editingMilitar.id_militar}`, formData);
      } else {
        await axios.post(`${API_URL}/efetivo`, formData);
      }
      setIsModalOpen(false);
      setEditingMilitar(null);
      resetForm();
      fetchEfetivo();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao salvar militar');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Deseja realmente excluir este militar do sistema?')) return;
    try {
      await axios.delete(`${API_URL}/efetivo/${id}`);
      fetchEfetivo();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao excluir militar');
    }
  };

  const resetForm = () => {
    setFormData({
      nome_completo: '',
      nome_guerra: '',
      posto_graduacao: '',
      matricula: '',
      numero_ordem: '',
      cpf: '',
      rgpm: '',
      opm: '',
      telefone: '',
      status_ativo: true
    });
  };

  const openEdit = (militar) => {
    setEditingMilitar(militar);
    setFormData({
      nome_completo: militar.nome_completo,
      nome_guerra: militar.nome_guerra || '',
      posto_graduacao: militar.posto_graduacao,
      matricula: militar.matricula,
      numero_ordem: militar.numero_ordem || '',
      cpf: militar.cpf,
      rgpm: militar.rgpm || '',
      opm: militar.opm || '',
      telefone: militar.telefone || '',
      status_ativo: militar.status_ativo === true || militar.status_ativo === 1
    });
    setIsModalOpen(true);
  };

  const filteredEfetivo = efetivo.filter(m =>
    m.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.matricula.includes(searchTerm) ||
    m.numero_ordem?.includes(searchTerm) ||
    m.nome_guerra?.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => {
    if (!sortConfig.key) return 0;
    
    let aVal = a[sortConfig.key];
    let bVal = b[sortConfig.key];

    // Tratamento especial para números
    if (sortConfig.key === 'matricula' || sortConfig.key === 'numero_ordem') {
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

  return (
    <div className="container" style={{ paddingBottom: '2rem' }}>
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2.5rem',
        flexWrap: 'wrap',
        gap: '1.5rem',
        background: 'white',
        padding: '1.5rem',
        borderRadius: '16px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
      }}>
        <div>
          <h2 style={{ margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.75rem' }}>
            <div style={{ padding: '10px', background: 'rgba(30, 58, 138, 0.1)', borderRadius: '12px', color: '#1e3a8a' }}>
              <Users size={28} />
            </div>
            Gestão de Efetivo
          </h2>
          <p style={{ margin: '8px 0 0 0', color: '#64748b', fontSize: '1rem' }}>Gerencie o cadastro de militares e identificações do batalhão</p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              className="form-input"
              placeholder="Nome, matrícula ou ordem..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '40px', width: '280px', height: '44px', borderRadius: '12px' }}
            />
          </div>

          <button
            className="btn btn-outline"
            onClick={() => setIsImportModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              height: '44px',
              borderRadius: '12px',
              borderColor: '#ffffffff',
              backgroundColor: '#1ABC9C',
              color: '#ffffffff'

            }}
          >
            <FileSpreadsheet size={18} /> Importar Efetivo
          </button>

          <button
            className="btn btn-primary"
            onClick={() => { setEditingMilitar(null); resetForm(); setIsModalOpen(true); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              height: '44px',
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(30, 58, 138, 0.2)'
            }}
          >
            <Plus size={18} /> Novo Militar
          </button>
        </div>
      </header>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>Carregando...</div>
      ) : (
        <div className="responsive-table-container" style={{ background: 'white', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          <table className="admin-table" style={{ border: 'none' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #f1f5f9' }}>
                <th style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer' }} onClick={() => requestSort('status_ativo')}>
                  Status {sortConfig.key === 'status_ativo' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer' }} onClick={() => requestSort('posto_graduacao')}>
                  Posto/Grad {sortConfig.key === 'posto_graduacao' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer' }} onClick={() => requestSort('nome_guerra')}>
                  Nome de Guerra {sortConfig.key === 'nome_guerra' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer' }} onClick={() => requestSort('nome_completo')}>
                  Identificação {sortConfig.key === 'nome_completo' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>CPF</th>
                <th style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Telefone</th>
                <th style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredEfetivo.map(m => (
                <tr key={m.id_militar} style={{ borderBottom: '1px solid #f1f5f9', transition: '0.2s' }} className="table-row-hover">
                  <td>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 10px',
                      borderRadius: '20px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      background: m.status_ativo ? '#ecfdf5' : '#fef2f2',
                      color: m.status_ativo ? '#059669' : '#dc2626',
                      border: `1px solid ${m.status_ativo ? '#a7f3d0' : '#fecaca'}`
                    }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }}></div>
                      {m.status_ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td style={{ fontWeight: 700, color: '#1e293b' }}>{m.posto_graduacao}</td>
                  <td style={{ fontWeight: 500, color: '#0f172a' }}>{m.nome_guerra || '-'}</td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontSize: '0.9rem', color: '#0f172a', fontWeight: 500 }}>{m.nome_completo}</span>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', background: '#f1f5f9', padding: '1px 6px', borderRadius: '4px' }}>Mat: {m.matricula}</span>
                        <span style={{ fontSize: '0.75rem', color: '#1e3a8a', background: 'rgba(30, 58, 138, 0.05)', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>Ordem: {m.numero_ordem || '-'}</span>
                      </div>
                    </div>
                  </td>
                  <td style={{ color: '#475569' }}>{m.cpf ? String(m.cpf).padStart(11, '0') : '-'}</td>
                  <td style={{ color: '#475569' }}>{formatPhone(m.telefone)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button
                        className="btn-icon"
                        onClick={() => openEdit(m)}
                        style={{ color: '#3b82f6', background: '#eff6ff', border: 'none', padding: '8px', borderRadius: '10px' }}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        className="btn-icon"
                        onClick={() => handleDelete(m.id_militar)}
                        style={{ color: '#ef4444', background: '#fef2f2', border: 'none', padding: '8px', borderRadius: '10px' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredEfetivo.length === 0 && (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Nenhum militar encontrado.</div>
          )}
        </div>
      )}

      {/* MODAL DE IMPORTAÇÃO */}
      {isImportModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '850px', width: '95%', padding: 0, overflow: 'hidden' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #f1f5f9',
              background: '#f8fafc'
            }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a' }}>
                <FileSpreadsheet size={20} color="#1e3a8a" /> Importação de Efetivo
              </h3>
              <button onClick={() => setIsImportModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={24} />
              </button>
            </div>
            <div style={{ padding: '1.5rem', maxHeight: '80vh', overflowY: 'auto' }}>
              <EfetivoImport onComplete={() => {
                fetchEfetivo();
              }} />
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CADASTRO/EDIÇÃO */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3>{editingMilitar ? 'Editar Militar' : 'Novo Militar'}</h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div>
                  <label className="form-label">Nome Completo *</label>
                  <input className="form-input" value={formData.nome_completo} onChange={e => setFormData({ ...formData, nome_completo: e.target.value })} required />
                </div>
                <div>
                  <label className="form-label">Nome de Guerra</label>
                  <input className="form-input" value={formData.nome_guerra} onChange={e => setFormData({ ...formData, nome_guerra: e.target.value })} />
                </div>
                <div>
                  <label className="form-label">Posto / Graduação *</label>
                  <select className="form-input" value={formData.posto_graduacao} onChange={e => setFormData({ ...formData, posto_graduacao: e.target.value })} required>
                    <option value="">Selecione...</option>
                    <option value="CEL PM">CORONEL PM</option>
                    <option value="TC PM">TC PM</option>
                    <option value="MAJ PM">MAJ PM</option>
                    <option value="CAP PM">CAP PM</option>
                    <option value="1º TEN PM">1º TEN PM</option>
                    <option value="2º TEN PM">2º TEN PM</option>
                    <option value="ASP PM">ASPIRANTE PM</option>
                    <option value="SUB PM">SUB-TENENTE PM</option>
                    <option value="1º SGT PM">1º SGT PM</option>
                    <option value="2º SGT PM">2º SGT PM</option>
                    <option value="3º SGT PM">3º SGT PM</option>
                    <option value="CB PM">CABO PM</option>
                    <option value="SD PM">SOLDADO PM</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">Matrícula (Login) *</label>
                  <input className="form-input" value={formData.matricula} onChange={e => setFormData({ ...formData, matricula: e.target.value })} required />
                </div>
                <div>
                  <label className="form-label">Nº de Ordem</label>
                  <input className="form-input" value={formData.numero_ordem} onChange={e => setFormData({ ...formData, numero_ordem: e.target.value })} />
                </div>
                <div>
                  <label className="form-label">CPF *</label>
                  <input
                    className="form-input"
                    value={formData.cpf}
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, '').substring(0, 11);
                      setFormData({ ...formData, cpf: val });
                    }}
                    required
                    placeholder="Somente números"
                  />
                </div>
                <div>
                  <label className="form-label">OPM / Lotação</label>
                  <input className="form-input" value={formData.opm} onChange={e => setFormData({ ...formData, opm: e.target.value })} />
                </div>
                <div>
                  <label className="form-label">Telefone</label>
                  <input className="form-input" value={formData.telefone} onChange={e => setFormData({ ...formData, telefone: maskPhone(e.target.value) })} placeholder="(00) 00000-0000" />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '25px' }}>
                  <input type="checkbox" checked={formData.status_ativo} onChange={e => setFormData({ ...formData, status_ativo: e.target.checked })} />
                  <label className="form-label" style={{ marginBottom: 0 }}>Militar Ativo</label>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setIsModalOpen(false)} style={{ flex: 1 }}>Cancelar</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>{editingMilitar ? 'Salvar Alterações' : 'Cadastrar Militar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          backdrop-filter: blur(4px);
          padding: 1rem;
        }
        .modal-content {
          background: white;
          border-radius: 16px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          width: 100%;
          max-width: 700px;
          max-height: 90vh;
          overflow-y: auto;
          position: relative;
          animation: modalAppear 0.3s ease-out;
          padding: 2rem;
        }
        @keyframes modalAppear {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .admin-table {
          width: 100%;
          border-collapse: collapse;
          background: white;
        }
        .admin-table th {
          background: #f8fafc;
          padding: 12px 16px;
          text-align: left;
          font-size: 0.75rem;
          text-transform: uppercase;
          color: #64748b;
          font-weight: 600;
          border-bottom: 2px solid #f1f5f9;
        }
        .admin-table td {
          padding: 12px 16px;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: middle;
        }
        .table-row-hover:hover {
          background-color: #f8fafc !important;
        }
        .btn-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px;
          border-radius: 10px;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-icon:hover {
          transform: scale(1.1);
        }
      `}</style>
    </div>
  );
}
