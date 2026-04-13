import { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, Plus, Edit2, Trash2, X, Check, Building2, Users, ClipboardCheck, AlertCircle, Activity, DollarSign } from 'lucide-react';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001') + '/api';

// Função para formatar data vinda do banco (Postgres) de forma segura
const formatDateDisplay = (dateValue) => {
  if (!dateValue) return '---';
  try {
    const dateStr = String(dateValue).split('T')[0]; 
    const [ano, mes, dia] = dateStr.split('-');
    return `${dia}/${mes}/${ano}`;
  } catch (e) {
    return '---';
  }
};

export function CicloManager() {
  const [ciclos, setCiclos] = useState([]);
  const [opms, setOpms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCiclo, setEditingCiclo] = useState(null);
  const [formData, setFormData] = useState({
    id_opm: '',
    data_inicio: '',
    data_fim: '',
    status: 'Aberto',
    valor_total_previsto: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resCiclos, resOpms] = await Promise.all([
        axios.get(`${API_URL}/ciclos`),
        axios.get(`${API_URL}/opms`)
      ]);
      setCiclos(resCiclos.data);
      setOpms(resOpms.data);
      
      // Auto-select first OPM if exists and not editing
      if (resOpms.data.length > 0 && !formData.id_opm) {
        setFormData(prev => ({ ...prev, id_opm: resOpms.data[0].id_opm }));
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      alert('Erro ao carregar ciclos ou unidades');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCiclo) {
        await axios.put(`${API_URL}/ciclos/${editingCiclo.id_ciclo}`, formData);
      } else {
        await axios.post(`${API_URL}/ciclos`, formData);
      }
      setIsModalOpen(false);
      setEditingCiclo(null);
      resetForm();
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao salvar Ciclo');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Deseja realmente excluir este ciclo? Todos os dados vinculados podem ser afetados.')) return;
    try {
      await axios.delete(`${API_URL}/ciclos/${id}`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao excluir Ciclo');
    }
  };

  const resetForm = () => {
    setFormData({
      id_opm: opms.length > 0 ? opms[0].id_opm : '',
      data_inicio: '',
      data_fim: '',
      status: 'Aberto',
      valor_total_previsto: ''
    });
  };

  const openEdit = (ciclo) => {
    setEditingCiclo(ciclo);
    
    const formatParaInput = (data) => {
      if (!data) return '';
      return typeof data === 'string' ? data.split('T')[0] : '';
    };
    
    setFormData({
      id_opm: ciclo.id_opm,
      data_inicio: formatParaInput(ciclo.data_inicio),
      data_fim: formatParaInput(ciclo.data_fim),
      status: ciclo.status,
      valor_total_previsto: ciclo.valor_total_previsto || ''
    });
    setIsModalOpen(true);
  };

  const getStatusColor = (status) => {
    return status === 'Aberto' ? '#10b981' : '#64748b';
  };

  return (
    <div className="container" style={{ paddingBottom: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ margin: 0, color: '#1e3a5f', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Calendar /> Gestão de Ciclos de Escala
          </h2>
          <p style={{ margin: '5px 0 0 0', color: '#64748b' }}>Gerenciamento de períodos mensais e vigência das escalas</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditingCiclo(null); resetForm(); setIsModalOpen(true); }} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={18} /> Novo Ciclo
        </button>
      </header>

      {loading && ciclos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>Carregando períodos...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
          {ciclos.map(ciclo => (
            <div key={ciclo.id_ciclo} className="card" style={{ position: 'relative', borderTop: `4px solid ${getStatusColor(ciclo.status)}`, transition: 'all 0.3s ease' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#1e3a5f' }}>{ciclo.referencia_mes_ano}</span>
                        <span style={{ 
                            padding: '2px 8px', 
                            borderRadius: '12px', 
                            fontSize: '0.7rem', 
                            background: getStatusColor(ciclo.status) + '20', 
                            color: getStatusColor(ciclo.status),
                            fontWeight: 'bold',
                            border: `1px solid ${getStatusColor(ciclo.status)}40`
                        }}>
                            {ciclo.status.toUpperCase()}
                        </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '0.85rem' }}>
                        <Building2 size={14} />
                        <span>{ciclo.opm_sigla} - {ciclo.opm_descricao}</span>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => openEdit(ciclo)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6' }} title="Editar">
                    <Edit2 size={18} />
                  </button>
                  <button onClick={() => handleDelete(ciclo.id_ciclo)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }} title="Excluir">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '1.5rem', background: '#f8fafc', padding: '10px', borderRadius: '8px' }}>
                <div>
                    <label style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 'bold' }}>Início</label>
                    <div style={{ color: '#334155', fontWeight: 500 }}>
                      {formatDateDisplay(ciclo.data_inicio)}
                    </div>
                </div>
                <div>
                    <label style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 'bold' }}>Término</label>
                    <div style={{ color: '#334155', fontWeight: 500 }}>
                      {formatDateDisplay(ciclo.data_fim)}
                    </div>
                </div>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-around', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#64748b', fontSize: '0.8rem', marginBottom: '4px' }}>
                        <Users size={14} /> Inscritos
                    </div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#1e3a5f' }}>{ciclo.total_inscritos}</div>
                </div>
                <div style={{ height: '30px', width: '1px', background: '#e2e8f0' }}></div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#64748b', fontSize: '0.8rem', marginBottom: '4px' }}>
                        <ClipboardCheck size={14} /> Escalados
                    </div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#1e3a5f' }}>{ciclo.total_escalados}</div>
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
                {editingCiclo ? 'Ajustar Ciclo Operacional' : 'Novo Ciclo de Escala'}
              </h3>
              <p className="modal-subtitle">Configure os parâmetros do período e a unidade responsável.</p>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Unidade Operacional (OPM)</label>
                <select 
                    className="form-control" 
                    value={formData.id_opm} 
                    onChange={e => setFormData({ ...formData, id_opm: e.target.value })}
                    required
                >
                    <option value="">Selecione a unidade...</option>
                    {opms.map(opm => (
                        <option key={opm.id_opm} value={opm.id_opm}>{opm.sigla} - {opm.descricao}</option>
                    ))}
                </select>
              </div>

              <div className="form-group">
                  <label className="form-label">Status Inicial</label>
                  <select 
                    className="form-control" 
                    value={formData.status} 
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="Aberto">Aberto (Inscrições liberadas)</option>
                    <option value="Fechado">Fechado (Somente consulta)</option>
                  </select>
              </div>

              <div className="form-group">
                <label className="form-label">Valor Total Previsto (Teto do Ciclo)</label>
                <input 
                  type="number"
                  step="0.01"
                  min="0"
                  className="form-control" 
                  value={formData.valor_total_previsto} 
                  onChange={e => setFormData({ ...formData, valor_total_previsto: e.target.value })} 
                  placeholder="R$ 0,00"
                />
                <small style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>Orçamento financeiro disponível para validação da execução. Preencha zero para não estabelecer teto.</small>
              </div>

              <div style={{ 
                  background: '#f8fafc', 
                  padding: '1.5rem', 
                  borderRadius: '12px', 
                  border: '1px solid #e2e8f0',
                  marginBottom: '2rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', color: '#475569', fontWeight: 600, fontSize: '0.9rem' }}>
                    Vigência do Período
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Início</label>
                    <input 
                        type="date"
                        className="form-control" 
                        value={formData.data_inicio} 
                        onChange={e => setFormData({ ...formData, data_inicio: e.target.value })} 
                        required 
                    />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Término</label>
                    <input 
                        type="date"
                        className="form-control" 
                        value={formData.data_fim} 
                        onChange={e => setFormData({ ...formData, data_fim: e.target.value })} 
                        required 
                    />
                    </div>
                </div>
              </div>

              {formData.data_inicio && formData.data_fim && formData.data_inicio > formData.data_fim && (
                <div style={{ padding: '1rem', background: '#fff1f2', border: '1px solid #fda4af', borderRadius: '8px', marginBottom: '1.5rem', color: '#e11d48', fontSize: '0.875rem' }}>
                    A data de início não pode ser superior à data de término.
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={formData.data_inicio > formData.data_fim}>
                    {editingCiclo ? 'Salvar Alterações' : 'Criar Ciclo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
