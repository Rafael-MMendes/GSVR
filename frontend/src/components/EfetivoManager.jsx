import { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, Plus, Edit2, Trash2, Search, User, CreditCard, Shield, MapPin, Phone, CheckCircle, XCircle } from 'lucide-react';
import { maskPhone, formatPhone } from '../utils/formatters';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001') + '/api';

export function EfetivoManager() {
  const [efetivo, setEfetivo] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMilitar, setEditingMilitar] = useState(null);
  const [formData, setFormData] = useState({
    nome_completo: '',
    nome_guerra: '',
    posto_graduacao: '',
    matricula: '',
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
    m.nome_guerra?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container" style={{ paddingBottom: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ margin: 0, color: '#1e3a5f', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users /> Gestão de Efetivo
          </h2>
          <p style={{ margin: '5px 0 0 0', color: '#64748b' }}>Gerencie o cadastro de militares do batalhão</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input 
              type="text" 
              className="form-input" 
              placeholder="Buscar por nome ou matrícula..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '40px', width: '250px' }}
            />
          </div>
          <button className="btn btn-primary" onClick={() => { setEditingMilitar(null); resetForm(); setIsModalOpen(true); }} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={18} /> Novo Militar
          </button>
        </div>
      </header>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>Carregando...</div>
      ) : (
        <div className="responsive-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Posto/Grad</th>
                <th>Nome de Guerra</th>
                <th>Nome Completo</th>
                <th>Matrícula</th>
                <th>CPF</th>
                <th>Telefone</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredEfetivo.map(m => (
                <tr key={m.id_militar}>
                  <td>
                    {m.status_ativo ? (
                      <span style={{ color: '#22c55e', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}>
                        <CheckCircle size={14} /> Ativo
                      </span>
                    ) : (
                      <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}>
                        <XCircle size={14} /> Inativo
                      </span>
                    )}
                  </td>
                  <td><strong>{m.posto_graduacao}</strong></td>
                  <td>{m.nome_guerra || '-'}</td>
                  <td style={{ fontSize: '0.9rem' }}>{m.nome_completo}</td>
                  <td><code>{m.matricula}</code></td>
                  <td style={{ fontSize: '0.8rem' }}>{m.cpf}</td>
                  <td>{formatPhone(m.telefone)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn-icon" onClick={() => openEdit(m)} title="Editar"><Edit2 size={16} /></button>
                      <button className="btn-icon btn-icon-danger" onClick={() => handleDelete(m.id_militar)} title="Excluir"><Trash2 size={16} /></button>
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

      {isModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(4px)', zIndex: 1000
        }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '16px', width: '90%', maxWidth: '700px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, color: '#1e3a5f' }}>
                {editingMilitar ? 'Editar Militar' : 'Novo Cadastro de Militar'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><Plus size={24} style={{ transform: 'rotate(45deg)' }} /></button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="form-grid-stack" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Nome Completo *</label>
                  <input className="form-input" value={formData.nome_completo} onChange={e => setFormData({ ...formData, nome_completo: e.target.value.toUpperCase() })} required placeholder="NOME COMPLETO DO MILITAR" />
                </div>
                
                <div>
                  <label className="form-label">Nome de Guerra</label>
                  <input className="form-input" value={formData.nome_guerra} onChange={e => setFormData({ ...formData, nome_guerra: e.target.value.toUpperCase() })} placeholder="EX: SD PM ALAN" />
                </div>
                
                <div>
                  <label className="form-label">Posto / Graduação *</label>
                  <select className="form-input" value={formData.posto_graduacao} onChange={e => setFormData({ ...formData, posto_graduacao: e.target.value })} required>
                    <option value="">Selecione...</option>
                    <option value="CEL PM">CEL PM</option>
                    <option value="TC PM">TC PM</option>
                    <option value="MAJ PM">MAJ PM</option>
                    <option value="CAP PM">CAP PM</option>
                    <option value="1º TEN PM">1º TEN PM</option>
                    <option value="2º TEN PM">2º TEN PM</option>
                    <option value="SUB PM">SUB PM</option>
                    <option value="1º SGT PM">1º SGT PM</option>
                    <option value="2º SGT PM">2º SGT PM</option>
                    <option value="3º SGT PM">3º SGT PM</option>
                    <option value="CB PM">CB PM</option>
                    <option value="SD PM">SD PM</option>
                  </select>
                </div>
                
                <div>
                  <label className="form-label">Matrícula (Nº Ordem) *</label>
                  <input className="form-input" value={formData.matricula} onChange={e => setFormData({ ...formData, matricula: e.target.value })} required placeholder="000.000-0" />
                </div>
                
                <div>
                  <label className="form-label">CPF *</label>
                  <input className="form-input" value={formData.cpf} onChange={e => setFormData({ ...formData, cpf: e.target.value.replace(/\D/g, '') })} required placeholder="Apenas números" maxLength={11} />
                </div>
                
                <div>
                  <label className="form-label">RGPM</label>
                  <input className="form-input" value={formData.rgpm} onChange={e => setFormData({ ...formData, rgpm: e.target.value })} placeholder="Identidade Militar" />
                </div>
                
                <div>
                  <label className="form-label">OPM (Unidade)</label>
                  <input className="form-input" value={formData.opm} onChange={e => setFormData({ ...formData, opm: e.target.value.toUpperCase() })} placeholder="EX: 9º BPM" />
                </div>
                
                <div>
                  <label className="form-label">Telefone</label>
                  <input 
                    className="form-input" 
                    value={formData.telefone} 
                    onChange={e => setFormData({ ...formData, telefone: maskPhone(e.target.value) })} 
                    placeholder="(00) 00000-0000" 
                  />
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '10px' }}>
                  <input 
                    type="checkbox" 
                    id="status_ativo" 
                    checked={formData.status_ativo} 
                    onChange={e => setFormData({ ...formData, status_ativo: e.target.checked })}
                    style={{ width: '20px', height: '20px' }}
                  />
                  <label htmlFor="status_ativo" style={{ cursor: 'pointer', fontWeight: 500 }}>Militar Ativo no Sistema</label>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Salvar Militar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .admin-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 1rem;
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .admin-table th {
          background: #f8fafc;
          padding: 12px 16px;
          text-align: left;
          font-size: 0.75rem;
          text-transform: uppercase;
          color: #64748b;
          font-weight: 600;
          border-bottom: 1px solid #e2e8f0;
        }
        .admin-table td {
          padding: 12px 16px;
          border-bottom: 1px solid #f1f5f9;
          color: #1e293b;
        }
        .admin-table tr:last-child td {
          border-bottom: none;
        }
        .admin-table tr:hover {
          background: #f8fafc;
        }
        .btn-icon {
          padding: 6px;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
          background: white;
          color: #3b82f6;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-icon:hover {
          background: #3b82f6;
          color: white;
        }
        .btn-icon-danger {
          color: #ef4444;
        }
        .btn-icon-danger:hover {
          background: #ef4444;
          color: white;
        }
        code {
          background: #f1f5f9;
          padding: 2px 6px;
          border-radius: 4px;
          font-family: monospace;
          color: #0f172a;
        }
      `}</style>
    </div>
  );
}
