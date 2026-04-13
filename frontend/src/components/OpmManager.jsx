import { useState, useEffect } from 'react';
import axios from 'axios';
import { Building2, Plus, Edit2, Trash2, X, Check, MapPin, Phone, Mail } from 'lucide-react';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001') + '/api';

export function OpmManager() {
  const [opms, setOpms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOpm, setEditingOpm] = useState(null);
  const [formData, setFormData] = useState({
    descricao: '',
    sigla: '',
    endereco: '',
    telefone: '',
    email: ''
  });

  useEffect(() => {
    fetchOpms();
  }, []);

  const fetchOpms = async () => {
    try {
      const res = await axios.get(`${API_URL}/opms`);
      setOpms(res.data);
    } catch (err) {
      alert('Erro ao carregar OPMs');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingOpm) {
        await axios.put(`${API_URL}/opms/${editingOpm.id_opm}`, formData);
      } else {
        await axios.post(`${API_URL}/opms`, formData);
      }
      setIsModalOpen(false);
      setEditingOpm(null);
      setFormData({ descricao: '', sigla: '', endereco: '', telefone: '', email: '' });
      fetchOpms();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao salvar OPM');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Deseja realmente excluir esta OPM?')) return;
    try {
      await axios.delete(`${API_URL}/opms/${id}`);
      fetchOpms();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao excluir OPM');
    }
  };

  const openEdit = (opm) => {
    setEditingOpm(opm);
    setFormData({
      descricao: opm.descricao,
      sigla: opm.sigla,
      endereco: opm.endereco || '',
      telefone: opm.telefone || '',
      email: opm.email || ''
    });
    setIsModalOpen(true);
  };

  return (
    <div className="container" style={{ paddingBottom: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ margin: 0, color: '#1e3a5f', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Building2 /> Gestão de Unidades (OPM)
          </h2>
          <p style={{ margin: '5px 0 0 0', color: '#64748b' }}>Cadastre e gerencie as unidades da corporação</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditingOpm(null); setFormData({ descricao: '', sigla: '', endereco: '', telefone: '', email: '' }); setIsModalOpen(true); }} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={18} /> Nova OPM
        </button>
      </header>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>Carregando...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {opms.map(opm => (
            <div key={opm.id_opm} className="card" style={{ borderTop: '4px solid var(--primary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h3 style={{ margin: 0, color: 'var(--primary)', fontSize: '1.2rem' }}>{opm.sigla}</h3>
                <div className="action-btn-group">
                  <button className="action-btn action-btn-primary" onClick={() => openEdit(opm)} title="Editar">
                    <Edit2 size={16} />
                  </button>
                  <button className="action-btn action-btn-danger" onClick={() => handleDelete(opm.id_opm)} title="Excluir">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem', fontWeight: 500 }}>{opm.descricao}</p>
              
              <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <MapPin size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                  <span>{opm.endereco || 'Endereço não informado'}</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Phone size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                  <span>{opm.telefone || 'Telefone não informado'}</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Mail size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                  <span>{opm.email || 'Email não informado'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content-premium">
            <div className="modal-header">
              <h3 className="modal-title">
                {editingOpm ? 'Editar Unidade' : 'Nova Unidade'}
              </h3>
              <p className="modal-subtitle">Preencha as informações da OPM abaixo</p>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 3fr)', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Sigla *</label>
                  <input className="form-control" value={formData.sigla} onChange={e => setFormData({ ...formData, sigla: e.target.value.toUpperCase() })} required placeholder="Ex: 9º BPM" />
                </div>
                <div className="form-group">
                  <label className="form-label">Descrição Completa *</label>
                  <input className="form-control" value={formData.descricao} onChange={e => setFormData({ ...formData, descricao: e.target.value })} required placeholder="Ex: 9º Batalhão de Polícia Militar" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Endereço</label>
                <input className="form-control" value={formData.endereco} onChange={e => setFormData({ ...formData, endereco: e.target.value })} placeholder="Logradouro, Bairro, Cidade - UF" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="form-group">
                  <label className="form-label">Telefone</label>
                  <input className="form-control" value={formData.telefone} onChange={e => setFormData({ ...formData, telefone: e.target.value })} placeholder="(00) 00000-0000" />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="form-control" type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="unidade@mil.br" />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Salvar Unidade</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
