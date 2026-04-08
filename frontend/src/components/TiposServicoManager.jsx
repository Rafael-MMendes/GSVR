import { useState, useEffect } from 'react';
import axios from 'axios';
import { Briefcase, Plus, Edit2, ShieldAlert, Check, X } from 'lucide-react';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001') + '/api';

export function TiposServicoManager() {
  const [tipos, setTipos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTipo, setEditingTipo] = useState(null);
  const [formData, setFormData] = useState({
    descricao: '',
    carga_horaria: '',
    valor_remuneracao: '',
    ativo: true
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_URL}/tipos-servico`);
      setTipos(data);
    } catch (err) {
      console.error('Erro ao carregar tipos de serviço:', err);
      alert('Erro ao carregar tipos de serviço');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        carga_horaria: parseInt(formData.carga_horaria),
        valor_remuneracao: parseFloat(formData.valor_remuneracao)
      };

      if (editingTipo) {
        await axios.put(`${API_URL}/tipos-servico/${editingTipo.id_tipo_servico}`, payload);
      } else {
        await axios.post(`${API_URL}/tipos-servico`, payload);
      }
      setIsModalOpen(false);
      setEditingTipo(null);
      resetForm();
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao salvar Tipo de Serviço');
    }
  };

  const resetForm = () => {
    setFormData({
      descricao: '',
      carga_horaria: '',
      valor_remuneracao: '',
      ativo: true
    });
  };

  const openEdit = (tipo) => {
    setEditingTipo(tipo);
    setFormData({
      descricao: tipo.descricao,
      carga_horaria: tipo.carga_horaria,
      valor_remuneracao: tipo.valor_remuneracao,
      ativo: tipo.ativo
    });
    setIsModalOpen(true);
  };

  return (
    <div className="container" style={{ paddingBottom: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ margin: 0, color: '#1e3a5f', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Briefcase /> Gestão de Tipos de Serviço
          </h2>
          <p style={{ margin: '5px 0 0 0', color: '#64748b' }}>Cadastre remunerações e horários para as diferentes vertentes (Ex: DPO, FT).</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditingTipo(null); resetForm(); setIsModalOpen(true); }} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={18} /> Novo Tipo
        </button>
      </header>

      {loading && tipos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>Carregando dados...</div>
      ) : (
        <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <tr>
                <th style={{ padding: '1rem', color: '#64748b', fontWeight: 600, fontSize: '0.85rem' }}>Descrição Categoria</th>
                <th style={{ padding: '1rem', color: '#64748b', fontWeight: 600, fontSize: '0.85rem' }}>Carga Horária</th>
                <th style={{ padding: '1rem', color: '#64748b', fontWeight: 600, fontSize: '0.85rem' }}>Valor (R$)</th>
                <th style={{ padding: '1rem', color: '#64748b', fontWeight: 600, fontSize: '0.85rem' }}>Status</th>
                <th style={{ padding: '1rem', color: '#64748b', fontWeight: 600, fontSize: '0.85rem', textAlign: 'end' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {tipos.map((tipo) => (
                <tr key={tipo.id_tipo_servico} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }}>
                  <td style={{ padding: '1rem', fontWeight: 600, color: '#334155' }}>{tipo.descricao}</td>
                  <td style={{ padding: '1rem', color: '#64748b' }}>{tipo.carga_horaria}h</td>
                  <td style={{ padding: '1rem', color: '#64748b' }}>R$ {parseFloat(tipo.valor_remuneracao).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td style={{ padding: '1rem' }}>
                      <span style={{ 
                          padding: '4px 10px', 
                          borderRadius: '16px', 
                          fontSize: '0.75rem', 
                          fontWeight: 'bold',
                          background: tipo.ativo ? '#dcfce7' : '#f1f5f9',
                          color: tipo.ativo ? '#16a34a' : '#64748b'
                      }}>
                          {tipo.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'end' }}>
                    <button onClick={() => openEdit(tipo)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6', padding: '4px' }} title="Editar Valores">
                      <Edit2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {tipos.length === 0 && (
                  <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Nenhum tipo de serviço operando.</td>
                  </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(8px)', zIndex: 1000, padding: '1rem'
        }}>
          <div className="glass-panel" style={{ 
            background: 'white', 
            padding: '2.5rem', 
            width: '100%', 
            maxWidth: '500px', 
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            position: 'relative'
          }}>
            <button 
                onClick={() => setIsModalOpen(false)}
                style={{ 
                    position: 'absolute', top: '1.5rem', right: '1.5rem', 
                    background: '#f1f5f9', border: 'none', borderRadius: '50%', 
                    padding: '8px', cursor: 'pointer', color: '#64748b'
                }}>
                <X size={20} />
            </button>

            <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ marginTop: 0, marginBottom: '0.5rem', color: '#0f172a', fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {editingTipo ? <Edit2 className="text-primary" /> : <Plus className="text-primary" />}
                    {editingTipo ? 'Atualizar Tipo' : 'Novo Tipo de Serviço'}
                </h3>
                <p style={{ color: '#64748b', margin: 0, fontSize: '0.9rem' }}>
                    A alteração do valor só valerá para as PRÓXIMAS escalas executadas, mantendo o controle histórico inalterado.
                </p>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Descrição do Serviço</label>
                <input 
                    type="text"
                    className="form-control" 
                    value={formData.descricao} 
                    onChange={e => setFormData({ ...formData, descricao: e.target.value })}
                    required
                    placeholder="Ex: Força Tarefa Diário (6h)"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Carga Horária (h)</label>
                  <input 
                    type="number"
                    className="form-control" 
                    value={formData.carga_horaria} 
                    onChange={e => setFormData({ ...formData, carga_horaria: e.target.value })} 
                    min="1"
                    required 
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Valor Pago (R$)</label>
                  <input 
                    type="number"
                    step="0.01"
                    className="form-control" 
                    value={formData.valor_remuneracao} 
                    onChange={e => setFormData({ ...formData, valor_remuneracao: e.target.value })} 
                    required 
                  />
                </div>
              </div>

              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input 
                      type="checkbox" 
                      id="ativo" 
                      checked={formData.ativo} 
                      onChange={e => setFormData({ ...formData, ativo: e.target.checked })}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <label htmlFor="ativo" style={{ margin: 0, cursor: 'pointer' }}>Permitir uso em novas escalas</label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setIsModalOpen(false)}>
                    Cancelar
                </button>
                <button type="submit" className="btn btn-primary" style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}>
                    {editingTipo ? 'Salvar Vínculo' : 'Criar Vínculo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
