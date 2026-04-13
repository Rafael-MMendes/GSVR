import { useState, useEffect } from 'react';
import axios from 'axios';
import { ClipboardCheck, Plus, Trash2, Search, Filter, CheckCircle, XCircle, Clock, Edit2, X, FileSpreadsheet, Check } from 'lucide-react';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001') + '/api';

// Função para formatar data vinda do banco de forma segura
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

const STATUS_OPTIONS = ['Presente', 'Ausente', 'Justificado', 'Atestado'];
const CARGA_OPTIONS = [{ value: 6, label: '6h — R$ 192,03' }, { value: 8, label: '8h — R$ 250,00' }];

const statusColor = (s) => ({
  'Presente': '#10b981',
  'Ausente': '#ef4444',
  'Justificado': '#f59e0b',
  'Atestado': '#3b82f6',
}[s] || '#64748b');

const statusIcon = (s) => ({
  'Presente': <CheckCircle size={14} />,
  'Ausente': <XCircle size={14} />,
  'Justificado': <Clock size={14} />,
  'Atestado': <Clock size={14} />,
}[s]);

const formatCurrency = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

export function ServicosExecutadosManager() {
  const [servicos, setServicos] = useState([]);
  const [ciclos, setCiclos] = useState([]);
  const [efetivo, setEfetivo] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingServico, setEditingServico] = useState(null);
  const [filterCiclo, setFilterCiclo] = useState('');
  const [filterMilitar, setFilterMilitar] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDataInicio, setFilterDataInicio] = useState('');
  const [filterDataFim, setFilterDataFim] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [sortConfig, setSortConfig] = useState({ key: 'data_execucao', direction: 'desc' });

  const [formData, setFormData] = useState({
    id_ciclo: '',
    id_militar: '',
    id_escala: null,
    data_execucao: '',
    carga_horaria: 6,
    status_presenca: 'Presente',
    eh_feriado: false,
    valor_remuneracao: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchServicos();
  }, [filterCiclo, filterMilitar, filterDataInicio, filterDataFim]);

  const fetchData = async () => {
    try {
      const [resCiclos, resEfetivo] = await Promise.all([
        axios.get(`${API_URL}/ciclos`),
        axios.get(`${API_URL}/efetivo`)
      ]);
      setCiclos(resCiclos.data);
      setEfetivo(resEfetivo.data.filter(e => e.status_ativo));
      if (resCiclos.data.length > 0 && !filterCiclo) {
        setFilterCiclo(resCiclos.data[0].id_ciclo);
      }
    } catch (e) {
      console.error('Erro ao carregar dados:', e);
    }
  };

  const fetchServicos = async () => {
    setLoading(true);
    setSelectedIds(new Set());
    try {
      const params = {};
      if (filterCiclo) params.ciclo_id = filterCiclo;
      if (filterMilitar) params.militar_id = filterMilitar;
      if (filterDataInicio) params.data_inicio = filterDataInicio;
      if (filterDataFim) params.data_fim = filterDataFim;
      const res = await axios.get(`${API_URL}/servicos`, { params });
      setServicos(res.data);
    } catch (e) {
      console.error('Erro ao carregar serviços:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingServico) {
        await axios.put(`${API_URL}/servicos/${editingServico.id_execucao}`, formData);
      } else {
        await axios.post(`${API_URL}/servicos`, formData);
      }
      setIsModalOpen(false);
      setEditingServico(null);
      resetForm();
      fetchServicos();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao salvar serviço executado.');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Deseja remover este registro de serviço executado?')) return;
    try {
      await axios.delete(`${API_URL}/servicos/${id}`);
      fetchServicos();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao excluir.');
    }
  };

  const handleSelectOne = (id) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(s => s.id_execucao)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Deseja excluir ${selectedIds.size} registro(s) de serviço(s)?`)) return;
    try {
      await Promise.all(Array.from(selectedIds).map(id => axios.delete(`${API_URL}/servicos/${id}`)));
      setSelectedIds(new Set());
      fetchServicos();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao excluir registros.');
    }
  };

  const openEdit = (servico) => {
    setEditingServico(servico);
    setFormData({
      id_ciclo: servico.id_ciclo,
      id_militar: servico.id_militar,
      id_escala: servico.id_escala || null,
      data_execucao: servico.data_execucao?.split('T')[0] || '',
      carga_horaria: servico.carga_horaria,
      status_presenca: servico.status_presenca,
      eh_feriado: servico.eh_feriado || false,
      valor_remuneracao: servico.valor_remuneracao
    });
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      id_ciclo: filterCiclo || '',
      id_militar: '',
      id_escala: null,
      data_execucao: '',
      carga_horaria: 6,
      status_presenca: 'Presente',
      eh_feriado: false,
      valor_remuneracao: ''
    });
  };

  const openNew = () => {
    setEditingServico(null);
    resetForm();
    setIsModalOpen(true);
  };

  const filtered = servicos.filter(s =>
    !searchTerm ||
    s.nome_guerra?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.matricula?.includes(searchTerm)
  ).sort((a, b) => {
    if (!sortConfig.key) return 0;
    
    let aVal = a[sortConfig.key];
    let bVal = b[sortConfig.key];

    // Tratamento especial para números/valores
    if (sortConfig.key === 'valor_remuneracao') {
        aVal = parseFloat(aVal || 0);
        bVal = parseFloat(bVal || 0);
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

  const totalPresentes = filtered.filter(s => s.status_presenca === 'Presente').length;
  const totalValor = filtered.filter(s => s.status_presenca === 'Presente')
    .reduce((acc, s) => acc + parseFloat(s.valor_remuneracao || 0), 0);

  return (
    <div className="container" style={{ paddingBottom: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ margin: 0, color: '#1e3a5f', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ClipboardCheck /> Serviços Executados
          </h2>
          <p style={{ margin: '5px 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>
            Registro e controle dos serviços realizados pelos militares
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button 
            className="btn btn-secondary" 
            onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'import-servicos' }))}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#ecfdf5', color: '#059669', border: '1px solid #bbf7d0' }}
          >
            <FileSpreadsheet size={18} /> Importar FT
          </button>
          <button className="btn btn-primary" onClick={openNew} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={18} /> Registrar Serviço
          </button>
        </div>
      </header>

      {/* Cards de resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="glass-panel" style={{ padding: '1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Total Registros</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#1e3a5f' }}>{filtered.length}</div>
        </div>
        <div className="glass-panel" style={{ padding: '1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Presentes</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#10b981' }}>{totalPresentes}</div>
        </div>
        <div className="glass-panel" style={{ padding: '1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Ausentes</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#ef4444' }}>{filtered.filter(s => s.status_presenca === 'Ausente').length}</div>
        </div>
        <div className="glass-panel" style={{ padding: '1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Valor Total</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#0d3878' }}>{formatCurrency(totalValor)}</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <label style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
            <Filter size={12} style={{ marginRight: '4px' }} /> Ciclo / Mês
          </label>
          <select className="form-control" style={{ margin: 0 }} value={filterCiclo} onChange={e => setFilterCiclo(e.target.value)}>
            <option value="">Todos os ciclos</option>
            {ciclos.map(c => <option key={c.id_ciclo} value={c.id_ciclo}>{c.referencia_mes_ano} — {c.opm_sigla}</option>)}
          </select>
        </div>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <label style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Militar</label>
          <select className="form-control" style={{ margin: 0 }} value={filterMilitar} onChange={e => setFilterMilitar(e.target.value)}>
            <option value="">Todos</option>
            {efetivo.map(e => <option key={e.id_militar} value={e.id_militar}>{e.posto_graduacao} {e.nome_guerra || e.nome_completo}</option>)}
          </select>
        </div>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <label style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Busca</label>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input className="form-control" style={{ margin: 0, paddingLeft: '34px' }} placeholder="Nome ou matrícula..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
        </div>
        <div style={{ flex: 1, minWidth: '140px' }}>
          <label style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Data Início</label>
          <input type="date" className="form-control" style={{ margin: 0 }} value={filterDataInicio} onChange={e => setFilterDataInicio(e.target.value)} />
        </div>
        <div style={{ flex: 1, minWidth: '140px' }}>
          <label style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Data Fim</label>
          <input type="date" className="form-control" style={{ margin: 0 }} value={filterDataFim} onChange={e => setFilterDataFim(e.target.value)} />
        </div>
      </div>

      {/* Botões de ação em massa */}
      {selectedIds.size > 0 && (
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
          <button 
            className="btn btn-primary" 
            onClick={handleDeleteSelected} 
            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#ef4444', borderColor: '#ef4444' }}
          >
            <Trash2 size={16} /> Excluir {selectedIds.size} selecionado(s)
          </button>
          <button className="btn btn-secondary" onClick={() => setSelectedIds(new Set())} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <X size={16} /> Limpar seleção
          </button>
        </div>
      )}

      {/* Tabela */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Carregando...</div>
      ) : (
        <div className="responsive-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>
                  <input 
                    type="checkbox" 
                    checked={selectedIds.size === filtered.length && filtered.length > 0}
                    onChange={handleSelectAll}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                </th>
                <th style={{ cursor: 'pointer' }} onClick={() => requestSort('data_execucao')}>
                    Data {sortConfig.key === 'data_execucao' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th style={{ cursor: 'pointer' }} onClick={() => requestSort('nome_guerra')}>
                    Militar {sortConfig.key === 'nome_guerra' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th style={{ cursor: 'pointer' }} onClick={() => requestSort('posto_graduacao')}>
                    Posto {sortConfig.key === 'posto_graduacao' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => requestSort('carga_horaria')}>
                    Carga {sortConfig.key === 'carga_horaria' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => requestSort('status_presenca')}>
                    Status {sortConfig.key === 'status_presenca' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th style={{ textAlign: 'right', cursor: 'pointer' }} onClick={() => requestSort('valor_remuneracao')}>
                    Valor {sortConfig.key === 'valor_remuneracao' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th style={{ textAlign: 'center' }}>Feriado</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                    Nenhum serviço registrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filtered.map(s => (
                  <tr key={s.id_execucao}>
                    <td>
                      <input 
                        type="checkbox" 
                        checked={selectedIds.has(s.id_execucao)}
                        onChange={() => handleSelectOne(s.id_execucao)}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                    </td>
                    <td style={{ fontWeight: 500 }}>
                      {formatDateDisplay(s.data_execucao)}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{s.nome_guerra || s.nome_completo}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{s.matricula}</div>
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>{s.posto_graduacao}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}>
                        {s.carga_horaria}h
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: statusColor(s.status_presenca) + '20', color: statusColor(s.status_presenca), padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>
                        {statusIcon(s.status_presenca)} {s.status_presenca}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: s.status_presenca === 'Presente' ? '#10b981' : '#94a3b8' }}>
                      {s.status_presenca === 'Presente' ? formatCurrency(s.valor_remuneracao) : '—'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {s.eh_feriado ? <span style={{ color: '#f59e0b', fontSize: '0.75rem', fontWeight: 600 }}>✓ Sim</span> : <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Não</span>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="btn-icon" onClick={() => openEdit(s)} title="Editar"><Edit2 size={14} /></button>
                        <button className="btn-icon btn-icon-danger" onClick={() => handleDelete(s.id_execucao)} title="Excluir"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content-premium">
            <div className="modal-header">
              <h3 className="modal-title">
                {editingServico ? 'Editar Serviço' : 'Registrar Serviço'}
              </h3>
              <p className="modal-subtitle">Informe os detalhes do serviço realizado</p>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Ciclo Operacional *</label>
                  <select className="form-control" value={formData.id_ciclo} onChange={e => setFormData({ ...formData, id_ciclo: e.target.value })} required>
                    <option value="">Selecione o ciclo...</option>
                    {ciclos.map(c => <option key={c.id_ciclo} value={c.id_ciclo}>{c.referencia_mes_ano} — {c.opm_sigla}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Militar *</label>
                  <select className="form-control" value={formData.id_militar} onChange={e => setFormData({ ...formData, id_militar: e.target.value })} required>
                    <option value="">Selecione o militar...</option>
                    {efetivo.map(m => <option key={m.id_militar} value={m.id_militar}>{m.posto_graduacao} {m.nome_guerra || m.nome_completo} — {m.matricula}</option>)}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Data do Serviço *</label>
                    <input type="date" className="form-control" value={formData.data_execucao} onChange={e => setFormData({ ...formData, data_execucao: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Carga Horária *</label>
                    <select className="form-control" value={formData.carga_horaria} onChange={e => setFormData({ ...formData, carga_horaria: parseInt(e.target.value), valor_remuneracao: '' })}>
                      {CARGA_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Status de Presença *</label>
                    <select className="form-control" value={formData.status_presenca} onChange={e => setFormData({ ...formData, status_presenca: e.target.value })}>
                      {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Valor (R$) — Automático</label>
                    <input type="number" step="0.01" className="form-control" placeholder={formData.carga_horaria === 8 ? '250.00' : '192.03'} value={formData.valor_remuneracao} onChange={e => setFormData({ ...formData, valor_remuneracao: e.target.value })} />
                  </div>
                </div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input type="checkbox" id="eh_feriado" checked={formData.eh_feriado} onChange={e => setFormData({ ...formData, eh_feriado: e.target.checked })} style={{ width: '18px', height: '18px' }} />
                  <label htmlFor="eh_feriado" className="form-label" style={{ marginBottom: 0, cursor: 'pointer' }}>Serviço em Feriado</label>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">
                  {editingServico ? 'Salvar Alterações' : 'Registrar Serviço'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
