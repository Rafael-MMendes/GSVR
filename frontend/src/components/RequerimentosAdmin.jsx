import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Search, Trash2, Plus, Eye, X, FolderOpen, Upload, FileText, Ban } from 'lucide-react';
import { maskPhone, formatPhone } from '../utils/formatters';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001') + '/api';

const ranks = [
  "CEL PM", "TC PM", "MAJ PM", "CAP PM", "1º TEN PM", "2º TEN PM", 
  "SUB PM", "1º SGT PM", "2º SGT PM", "3º SGT PM", "CB PM", "SD PM"
];

const SHIFTS = [
  "07:00 ÀS 13:00",
  "13:00 ÀS 19:00",
  "19:00 ÀS 01:00",
  "01:00 ÀS 07:00"
];

const daysInMonth = Array.from({ length: 31 }, (_, i) => i + 1);

export function RequerimentosAdmin() {
  const [volunteers, setVolunteers] = useState([]);
  const [months, setMonths] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [activeCycle, setActiveCycle] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingVolunteer, setEditingVolunteer] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingVolunteer, setViewingVolunteer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'data_solicitacao', direction: 'desc' });

  // PDF Folder Import states
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

  // Cancel availability states
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelingItem, setCancelingItem] = useState(null);
  const [cancelingLoading, setCancelingLoading] = useState(false);

  const [formData, setFormData] = useState({
    numero_ordem: '',
    name: '',
    rank: 'Soldado PM',
    phone: '',
    motorista: 'Não',
    availability: {}
  });

  useEffect(() => {
    fetchMonths();
  }, []);

  useEffect(() => {
    if (selectedMonth) {
      fetchVolunteers();
    }
  }, [selectedMonth]);

  const fetchMonths = async () => {
    try {
      const res = await axios.get(`${API_URL}/ciclos`);
      const ciclos = res.data.map(c => ({
        id_ciclo: c.id_ciclo,
        month_key: c.month_key || c.referencia_mes_ano,
        month_name: c.period_name || `${c.referencia_mes_ano} (${c.status})`,
        status: c.status
      }));
      setMonths(ciclos);
      
      const cicloAtivo = ciclos.find(c => c.status === 'Aberto');
      if (cicloAtivo) {
        setSelectedMonth(cicloAtivo.month_key);
        setActiveCycle(cicloAtivo);
      } else {
        setSelectedMonth('');
        setActiveCycle(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchVolunteers = async () => {
    if (!selectedMonth) {
      setVolunteers([]);
      return;
    }
    try {
      const res = await axios.get(`${API_URL}/volunteers?month=${selectedMonth}`);
      setVolunteers(res.data);
    } catch (e) {
      console.error(e);
      setErrorMsg('Erro ao carregar requerimentos.');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Tem certeza que deseja excluir este requerimento?')) return;
    
    try {
      await axios.delete(`${API_URL}/volunteers/${id}`);
      fetchVolunteers();
    } catch (e) {
      console.error(e);
      alert('Erro ao excluir requerimento.');
    }
  };

  const openFolderModal = () => {
    setShowFolderModal(true);
    setImportResult(null);
    setSelectedFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(files.filter(f => f.name.toLowerCase().endsWith('.pdf')));
  };

  const handleImportFromFiles = async () => {
    if (selectedFiles.length === 0 || !selectedMonth) {
      alert('Selecione arquivos PDF e um mês.');
      return;
    }

    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      selectedFiles.forEach(file => {
        formData.append('files', file);
      });
      formData.append('id_ciclo', activeCycle?.id_ciclo);

      const res = await axios.post(`${API_URL}/import/volunteers/files`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setImportResult(res.data);
      fetchVolunteers();
    } catch (e) {
      console.error(e);
      alert('Erro ao importar PDFs: ' + (e.response?.data?.error || e.message));
    } finally {
      setImporting(false);
    }
  };

  const openAddModal = () => {
    setEditingVolunteer(null);
    setFormData({
      numero_ordem: '',
      name: '',
      rank: 'Soldado PM',
      phone: '',
      motorista: 'Não',
      availability: {}
    });
    setShowModal(true);
  };

  // Efeito para buscar militar por Nº de Ordem
  useEffect(() => {
    const lookupMilitar = async () => {
      const matricula = formData.numero_ordem.trim();
      if (matricula.length >= 4 && !editingVolunteer) {
        try {
          const res = await axios.get(`${API_URL}/efetivo/lookup/${matricula}`);
          if (res.data) {
            setFormData(prev => ({
              ...prev,
              name: res.data.nome_completo,
              rank: res.data.posto_graduacao,
              phone: res.data.telefone ? maskPhone(res.data.telefone) : prev.phone
            }));
          }
        } catch (e) {
          // Militar não encontrado ou erro, ignorar silenciosamente
        }
      }
    };

    const timeoutId = setTimeout(lookupMilitar, 500);
    return () => clearTimeout(timeoutId);
  }, [formData.numero_ordem, editingVolunteer]);

  const openEditModal = (volunteer) => {
    setEditingVolunteer(volunteer);
    setFormData({
      numero_ordem: volunteer.numero_ordem,
      name: volunteer.name,
      rank: volunteer.rank,
      phone: volunteer.phone || '',
      motorista: volunteer.motorista || 'Não',
      availability: volunteer.availability || {}
    });
    setShowModal(true);
  };

  const openViewModal = (volunteer) => {
    setViewingVolunteer(volunteer);
    setShowViewModal(true);
  };

  const openCancelModal = (volunteer) => {
    setCancelingItem(volunteer);
    setShowCancelModal(true);
  };

  const handleCancelAvailability = async () => {
    if (!cancelingItem) return;

    setCancelingLoading(true);
    try {
      await axios.put(`${API_URL}/volunteers/${cancelingItem.id}/cancel-availability`, {
        numero_ordem: cancelingItem.numero_ordem,
        name: cancelingItem.name,
        rank: cancelingItem.rank,
        phone: cancelingItem.phone,
        availability: cancelingItem.availability_completa || cancelingItem.availability || {}
      });
      setShowCancelModal(false);
      setCancelingItem(null);
      fetchVolunteers();
    } catch (error) {
      console.error('Error canceling availability:', error);
      alert('Erro ao cancelar disponibilidade.');
    } finally {
      setCancelingLoading(false);
    }
  };

  const toggleShift = (day, shift) => {
    setFormData(prev => {
      const dayStr = String(day);
      const dayShifts = prev.availability[dayStr] || [];
      const isSelected = dayShifts.includes(shift);
      const newShifts = isSelected ? dayShifts.filter(s => s !== shift) : [...dayShifts, shift];
      const newAvailability = { ...prev.availability };
      if (newShifts.length > 0) {
        newAvailability[dayStr] = newShifts;
      } else {
        delete newAvailability[dayStr];
      }
      return { ...prev, availability: newAvailability };
    });
  };

  const handleSave = async () => {
    if (!formData.numero_ordem.trim() || !formData.name.trim()) {
      alert('Preencha o Nº de Ordem e o Nome.');
      return;
    }

    setLoading(true);
    try {
      if (editingVolunteer) {
        await axios.put(`${API_URL}/volunteers/${editingVolunteer.id}`, formData);
      } else {
        await axios.post(`${API_URL}/volunteers`, formData);
      }
      setShowModal(false);
      fetchVolunteers();
    } catch (error) {
      console.error(error);
      alert('Erro ao salvar requerimento.');
    } finally {
      setLoading(false);
    }
  };

  const filteredVolunteers = volunteers.filter(v => {
    const term = searchTerm.toLowerCase();
    return (
      v.numero_ordem?.toLowerCase().includes(term) ||
      v.name?.toLowerCase().includes(term) ||
      v.rank?.toLowerCase().includes(term)
    );
  }).sort((a, b) => {
    if (!sortConfig.key) return 0;
    
    let aVal = a[sortConfig.key];
    let bVal = b[sortConfig.key];

    // Tratamento especial para números
    if (sortConfig.key === 'numero_ordem') {
        aVal = parseInt(aVal.replace(/\D/g, '')) || 0;
        bVal = parseInt(bVal.replace(/\D/g, '')) || 0;
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
    <div className="container" style={{ maxWidth: '1400px' }}>
      <div className="admin-controls-header" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.5rem',
          padding: '1rem',
          background: 'var(--card-bg)',
          borderRadius: '12px',
          border: '1px solid var(--border-color)'
      }}>
        <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Gerenciamento de Requerimentos</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary" onClick={openFolderModal} disabled={!activeCycle} style={{ width: 'auto' }}>
            <FolderOpen size={18} style={{ marginRight: '0.5rem' }} />
            <span>Importar PDF</span>
          </button>
          <button className="btn btn-primary" onClick={openAddModal} disabled={!activeCycle} style={{ width: 'auto' }}>
            <Plus size={18} style={{ marginRight: '0.5rem' }} />
            <span>Novo</span>
          </button>
        </div>
      </div>

      <div className="glass-panel">
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '1 1 auto' }}>
            <strong style={{ color: activeCycle ? 'var(--primary)' : 'var(--danger)', fontSize: '1.1rem' }}>
              Ciclo Ativo: {activeCycle ? activeCycle.month_name : 'Nenhum ciclo aberto'}
            </strong>
          </div>
          <div style={{ position: 'relative', flex: '1 1 300px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-control"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '40px' }}
            />
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Total: <strong>{filteredVolunteers.length}</strong>
          </div>
        </div>

        <div className="responsive-table-container">
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
            <thead>
              <tr style={{ background: 'var(--primary)', color: 'white' }}>
                <th style={{ padding: '0.75rem', textAlign: 'left', cursor: 'pointer' }} onClick={() => requestSort('numero_ordem')}>
                    Nº Ordem {sortConfig.key === 'numero_ordem' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th style={{ padding: '0.75rem', textAlign: 'left', cursor: 'pointer' }} onClick={() => requestSort('rank')}>
                    Posto/Grad {sortConfig.key === 'rank' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th style={{ padding: '0.75rem', textAlign: 'left', cursor: 'pointer' }} onClick={() => requestSort('name')}>
                    Nome {sortConfig.key === 'name' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Telefone</th>
                <th style={{ padding: '0.75rem', textAlign: 'center' }}>Motorista</th>
                <th style={{ padding: '0.75rem', textAlign: 'center' }}>Turnos</th>
                <th style={{ padding: '0.75rem', textAlign: 'center' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredVolunteers.map((v, idx) => (
                <tr key={v.id} style={{ 
                  background: v.ativo === false ? 'rgba(239, 68, 68, 0.05)' : (idx % 2 === 0 ? 'var(--card-bg)' : 'rgba(0,0,0,0.02)'), 
                  borderBottom: v.ativo === false ? '2px solid var(--danger)' : '1px solid var(--border-color)',
                  opacity: v.ativo === false ? 0.7 : 1
                }}>
                  <td style={{ padding: '0.75rem', fontWeight: 'bold', color: v.ativo === false ? 'var(--danger)' : 'inherit' }}>{v.numero_ordem}</td>
                  <td style={{ padding: '0.75rem', color: v.ativo === false ? 'var(--danger)' : 'inherit' }}>{v.rank}</td>
                  <td style={{ padding: '0.75rem', fontWeight: 500, color: v.ativo === false ? 'var(--danger)' : 'inherit' }}>{v.name}</td>
                  <td style={{ padding: '0.75rem', color: v.ativo === false ? 'var(--danger)' : 'inherit' }}>{formatPhone(v.phone)}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                    {(v.motorista_req || v.motorista === 'Sim') ? (
                      <span style={{ background: 'var(--success)', color: 'white', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>Sim</span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>Não</span>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'center' }}>
                      {v.ativo === false && (
                        <span style={{ 
                          background: 'var(--danger)', 
                          color: 'white', 
                          padding: '0.15rem 0.4rem', 
                          borderRadius: '4px', 
                          fontSize: '0.7rem',
                          fontWeight: 'bold'
                        }}>
                          CANCELADO
                        </span>
                      )}
                      <span>
                        {Object.keys(v.availability || {}).length > 0
                          ? `${Object.values(v.availability).flat().length} turnos`
                          : 'Nenhum'}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                      <button
                        className="btn btn-outline"
                        style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                        onClick={() => openViewModal(v)}
                        title="Visualizar"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        className="btn btn-outline"
                        style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                        onClick={() => openEditModal(v)}
                        title="Editar"
                      >
                        ✏️
                      </button>
                      <button
                        className="btn btn-outline"
                        style={{ 
                          padding: '0.4rem 0.6rem', 
                          fontSize: '0.8rem', 
                          color: v.ativo === false ? 'var(--danger)' : 'var(--warning)',
                          background: v.ativo === false ? 'rgba(239, 68, 68, 0.1)' : 'transparent'
                        }}
                        onClick={() => openCancelModal(v)}
                        title={v.ativo === false ? 'Disponibilidade Cancelada' : 'Cancelar Disponibilidade'}
                        disabled={v.ativo === false}
                      >
                        <Ban size={16} />
                      </button>
                      <button
                        className="btn btn-outline"
                        style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', color: 'var(--danger)' }}
                        onClick={() => handleDelete(v.id)}
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredVolunteers.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Nenhum requerimento encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE ADIÇÃO/EDIÇÃO */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{
            background: 'white', borderRadius: '12px', padding: '1.5rem',
            maxWidth: '900px', width: '95%', maxHeight: '90vh', overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>{editingVolunteer ? 'Editar Requerimento' : 'Novo Requerimento'}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={24} />
              </button>
            </div>

            <div className="form-grid-stack" style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
                gap: '1rem', 
                marginBottom: '1.5rem' 
            }}>
              <div className="form-group">
                <label>Nº de Ordem</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.numero_ordem}
                  onChange={e => setFormData({ ...formData, numero_ordem: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Posto/Graduação</label>
                <select
                  className="form-control"
                  value={formData.rank}
                  onChange={e => setFormData({ ...formData, rank: e.target.value })}
                >
                  {ranks.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Nome Completo</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Telefone</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="(00) 00000-0000"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: maskPhone(e.target.value) })}
                />
              </div>
              <div className="form-group">
                <label>Motorista?</label>
                <select
                  className="form-control"
                  value={formData.motorista}
                  onChange={e => setFormData({ ...formData, motorista: e.target.value })}
                >
                  <option value="Não">Não</option>
                  <option value="Sim">Sim</option>
                </select>
              </div>
            </div>

            <h4 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Disponibilidade (Grade)</h4>
            <div className="responsive-table-container" style={{ border: '1px solid var(--border-color)', borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ background: 'var(--primary)', color: 'white' }}>
                    <th style={{ padding: '0.5rem', textAlign: 'left', minWidth: '120px' }}>HORÁRIO:</th>
                    {daysInMonth.map(day => (
                      <th key={day} style={{ padding: '0.5rem', textAlign: 'center', width: '28px' }}>
                        {String(day).padStart(2, '0')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {SHIFTS.map((shift, sIdx) => (
                    <tr key={shift} style={{ background: sIdx % 2 === 0 ? 'var(--card-bg)' : 'rgba(0,0,0,0.02)' }}>
                      <td style={{ padding: '0.5rem', fontWeight: 600, color: 'var(--text-muted)' }}>{shift}</td>
                      {daysInMonth.map(day => {
                        const isSelected = (formData.availability[String(day)] || []).includes(shift);
                        return (
                          <td
                            key={day}
                            onClick={() => toggleShift(day, shift)}
                            style={{
                              textAlign: 'center',
                              cursor: 'pointer',
                              backgroundColor: isSelected ? 'var(--primary)' : 'transparent',
                              color: isSelected ? 'white' : 'transparent'
                            }}
                          >
                            {isSelected ? 'X' : '·'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE VISUALIZAÇÃO */}
      {showViewModal && viewingVolunteer && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{
            background: 'white', borderRadius: '12px', padding: '1.5rem',
            maxWidth: '900px', width: '95%', maxHeight: '90vh', overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>Detalhes do Requerimento</h3>
              <button onClick={() => setShowViewModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={24} />
              </button>
            </div>

            <div className="form-grid-stack" style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
                gap: '1rem', 
                marginBottom: '1.5rem', 
                background: 'var(--card-bg)', 
                padding: '1rem', 
                borderRadius: '8px' 
            }}>
              <div><strong>Nº Ordem:</strong><br/>{viewingVolunteer.numero_ordem}</div>
              <div><strong>Posto/Grad:</strong><br/>{viewingVolunteer.rank}</div>
              <div><strong>Nome:</strong><br/>{viewingVolunteer.name}</div>
              <div><strong>Telefone:</strong><br/>{formatPhone(viewingVolunteer.phone)}</div>
              <div><strong>Motorista:</strong><br/>{viewingVolunteer.motorista === 'Sim' ? '✅ Sim' : '❌ Não'}</div>
            </div>

            <h4 style={{ marginBottom: '1rem' }}>Grade de Disponibilidade</h4>
            <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: 'var(--primary)', color: 'white' }}>
                    <th style={{ padding: '0.5rem', textAlign: 'left', minWidth: '120px' }}>HORÁRIO:</th>
                    {daysInMonth.map(day => (
                      <th key={day} style={{ padding: '0.5rem', textAlign: 'center', width: '28px' }}>
                        {String(day).padStart(2, '0')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {SHIFTS.map((shift, sIdx) => (
                    <tr key={shift} style={{ background: sIdx % 2 === 0 ? 'var(--card-bg)' : 'rgba(0,0,0,0.02)' }}>
                      <td style={{ padding: '0.5rem', fontWeight: 600, color: 'var(--text-muted)' }}>{shift}</td>
                      {daysInMonth.map(day => {
                        const isSelected = (viewingVolunteer.availability?.[String(day)] || []).includes(shift);
                        return (
                          <td
                            key={day}
                            style={{
                              textAlign: 'center',
                              backgroundColor: isSelected ? 'var(--primary)' : 'transparent',
                              color: isSelected ? 'white' : 'transparent'
                            }}
                          >
                            {isSelected ? 'X' : '·'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button className="btn btn-primary" onClick={() => setShowViewModal(false)}>Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE SELEÇÃO DE PASTA */}
      {showFolderModal && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{
            background: 'white', borderRadius: '12px', padding: '1.5rem',
            maxWidth: '600px', width: '95%', maxHeight: '80vh', overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>Importar Requerimentos via PDF</h3>
              <button onClick={() => setShowFolderModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={24} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Header do Modal com Status do Ciclo */}
              <div style={{ 
                background: 'rgba(56, 189, 248, 0.05)', 
                borderLeft: '4px solid var(--accent)', 
                padding: '1rem',
                borderRadius: '0 8px 8px 0'
              }}>
                <h4 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <i className="fas fa-calendar-check"></i> Ciclo de Destino
                </h4>
                <div style={{ marginTop: '0.4rem', color: 'var(--accent)', fontWeight: 'bold', fontSize: '1.2rem' }}>
                  {activeCycle ? activeCycle.month_name : 'Nenhum ciclo ativo selecionado'}
                </div>
                <p style={{ margin: '0.3rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                  Todos os arquivos processados serão vinculados automaticamente a este período.
                </p>
              </div>

              {/* Seletor de Arquivos Customizado */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                style={{ 
                  border: '2px dashed var(--border-color)', 
                  borderRadius: '12px', 
                  padding: '2rem', 
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  background: 'rgba(255,255,255,0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '1rem'
                }}
                onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
                onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
              >
                <div style={{ fontSize: '2.5rem', opacity: 0.5 }}>📂</div>
                <div>
                  <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>Selecionar PDFs dos Voluntários</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>Clique ou arraste vários arquivos simultâneos</div>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept=".pdf"
                  multiple
                  style={{ display: 'none' }}
                />
              </div>

              {/* Lista Suspensa de Arquivos Selecionados */}
              {selectedFiles.length > 0 && (
                <div style={{ maxHeight: '120px', overflowY: 'auto', padding: '0.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {selectedFiles.map((f, i) => (
                      <span key={i} style={{ background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-secondary)' }}>
                        📄 {f.name.length > 15 ? f.name.substring(0, 12) + '...' : f.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Painel de Resultados (Apenas após processamento) */}
              {importResult && (
                <div style={{ 
                  borderRadius: '12px', 
                  overflow: 'hidden', 
                  border: `1px solid ${importResult.success ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                  background: 'rgba(0,0,0,0.2)'
                }}>
                  <div style={{ 
                    padding: '1rem', 
                    background: importResult.success ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: `1px solid ${importResult.success ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)'}`
                  }}>
                    <strong style={{ color: importResult.success ? 'var(--success)' : 'var(--danger)' }}>
                      {importResult.success ? '✓ Resultado do Processamento' : '⚠️ Problemas Detectados'}
                    </strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {importResult.processed} arquivos lidos
                    </span>
                  </div>

                  <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {/* Lista Curta de Sucessos */}
                    {importResult.results && importResult.results.some(r => r.success) && (
                      <div>
                        <div style={{ color: 'var(--success)', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                          ✓ Militar(es) Vinculado(s):
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                          {importResult.results.filter(r => r.success).map(r => (
                            <span key={r.numero_ordem} style={{ background: 'rgba(34, 197, 94, 0.1)', color: 'var(--success)', padding: '0.1rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>
                              #{r.numero_ordem}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Falhas de Identificação - Destaque */}
                    {importResult.results && importResult.results.some(r => !r.success) && (
                      <div style={{ animation: 'shake 0.4s ease-in-out' }}>
                        <div style={{ color: 'var(--danger)', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                          ❌ Não Encontrados no Efetivo ({importResult.results.filter(r => !r.success).length}):
                        </div>
                        <div style={{ 
                          maxHeight: '150px', 
                          overflowY: 'auto', 
                          background: 'rgba(239, 68, 68, 0.05)', 
                          padding: '0.8rem', 
                          borderRadius: '8px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.5rem'
                        }}>
                          {importResult.results.filter(r => !r.success).map((r, i) => (
                            <div key={i} style={{ padding: '0.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ color: 'var(--text-primary)' }}>Nº <strong>{r.numero_ordem}</strong> ({r.name || 'Nome não identificado'})</span>
                              <span style={{ color: 'var(--danger)', fontSize: '0.7rem' }}>{r.error}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Erros Gerais */}
                    {importResult.errors && importResult.errors.length > 0 && (
                      <details>
                        <summary style={{ cursor: 'pointer', color: 'var(--warning)', fontSize: '0.85rem' }}>Ver erros de cabeçalho/leitura ({importResult.errors.length})</summary>
                        <div style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: 'var(--text-secondary)' }}>
                          {importResult.errors.map((e, i) => (
                            <div key={i} style={{ marginBottom: '0.2rem' }}>• {e.file}: {e.error}</div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
              <button 
                className="btn btn-outline" 
                onClick={() => { setShowFolderModal(false); setSelectedFiles([]); setImportResult(null); }}
                style={{ 
                  padding: '0.75rem 1.5rem', 
                  minWidth: '120px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-secondary)'
                }}
              >
                Cancelar
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleImportFromFiles} 
                disabled={importing || selectedFiles.length === 0 || (!selectedMonth && !activeCycle)}
                style={{ 
                  padding: '0.75rem 2rem', 
                  minWidth: '150px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  justifyContent: 'center',
                  background: '#166534', // VERDE ESCURO MAIS FORTE
                  backgroundColor: '#166534',
                  color: 'white',
                  fontWeight: 'bold',
                  boxShadow: '0 4px 12px rgba(22, 101, 52, 0.4)',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                {importing ? (
                  <>
                    <div className="spinner-small"></div>
                    Importando...
                  </>
                ) : (
                  <>
                    <i className="fas fa-file-import"></i>
                    Iniciar Importação
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE CANCELAMENTO */}
      {showCancelModal && cancelingItem && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            background: 'white', borderRadius: '12px', padding: '1.5rem',
            maxWidth: '900px', width: '95%', maxHeight: '90vh', overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            animation: 'slideUp 0.3s ease-out'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Ban size={24} />
                Cancelar Disponibilidade
              </h3>
              <button onClick={() => { setShowCancelModal(false); setCancelingItem(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={24} />
              </button>
            </div>

            {/* Dados do Militar */}
            <div style={{
              background: 'var(--card-bg)', padding: '1rem', borderRadius: '8px',
              marginBottom: '1.5rem', border: '1px solid var(--border-color)'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
                <div><strong>Nº Ordem:</strong><br/>{cancelingItem.numero_ordem}</div>
                <div><strong>Posto/Grad:</strong><br/>{cancelingItem.rank}</div>
                <div><strong>Nome:</strong><br/>{cancelingItem.name}</div>
                <div><strong>Telefone:</strong><br/>{formatPhone(cancelingItem.phone)}</div>
                <div><strong>Motorista:</strong><br/>{cancelingItem.motorista_req ? '✅ Sim' : '❌ Não'}</div>
              </div>
            </div>

            {/* Alerta */}
            <div style={{
              background: 'rgba(239, 68, 68, 0.05)', borderLeft: '4px solid var(--danger)',
              padding: '0.75rem 1rem', borderRadius: '0 8px 8px 0', marginBottom: '1rem',
              fontSize: '0.85rem', color: 'var(--text-secondary)'
            }}>
              <strong style={{ color: 'var(--danger)' }}>⚠️ Atenção:</strong> Esta ação marcará todos os turnos de disponibilidade abaixo como <strong>INATIVOS</strong> (vermelho). Os turnos já inativos aparecerão marcados em vermelho escuro.
            </div>

            {/* Grade de Disponibilidade */}
            <h4 style={{ marginBottom: '0.5rem', fontSize: '0.95rem' }}>Disponibilidade que será cancelada:</h4>
            <div className="responsive-table-container" style={{ border: '1px solid var(--border-color)', borderRadius: '8px', marginBottom: '1.5rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px', fontSize: '0.75rem' }}>
                <thead>
                  <tr style={{ background: 'var(--danger)', color: 'white' }}>
                    <th style={{ padding: '0.5rem', textAlign: 'left', minWidth: '120px' }}>HORÁRIO:</th>
                    {daysInMonth.map(day => (
                      <th key={day} style={{ padding: '0.5rem', textAlign: 'center', width: '28px' }}>
                        {String(day).padStart(2, '0')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {SHIFTS.map((shift, sIdx) => (
                    <tr key={shift} style={{ background: sIdx % 2 === 0 ? 'var(--card-bg)' : 'rgba(0,0,0,0.02)' }}>
                      <td style={{ padding: '0.5rem', fontWeight: 600, color: 'var(--text-muted)' }}>{shift}</td>
                      {daysInMonth.map(day => {
                        const dayStr = String(day);
                        const availabilityData = cancelingItem.availability_completa?.[dayStr] || cancelingItem.availability?.[dayStr] || [];
                        
                        // Verifica se é um array de objetos (availability_completa) ou array de strings (availability)
                        const isAtivo = Array.isArray(availabilityData) 
                          ? availabilityData.some(item => {
                              const turno = typeof item === 'string' ? item : item.turno;
                              const ativo = typeof item === 'string' ? true : item.ativo;
                              return turno === shift && ativo !== false;
                            })
                          : false;
                        
                        const isCancelado = Array.isArray(availabilityData)
                          ? availabilityData.some(item => {
                              const turno = typeof item === 'string' ? item : item.turno;
                              const ativo = typeof item === 'string' ? true : item.ativo;
                              return turno === shift && ativo === false;
                            })
                          : false;

                        return (
                          <td
                            key={day}
                            style={{
                              textAlign: 'center',
                              backgroundColor: isCancelado ? 'rgba(239, 68, 68, 0.3)' : (isAtivo ? 'var(--danger)' : 'transparent'),
                              color: isCancelado ? 'rgba(255,255,255,0.5)' : (isAtivo ? 'white' : 'transparent'),
                              fontWeight: isCancelado ? 'bold' : 'normal',
                              textDecoration: isCancelado ? 'line-through' : 'none'
                            }}
                          >
                            {(isAtivo || isCancelado) ? 'X' : '·'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Botões de Ação */}
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-outline"
                onClick={() => { setShowCancelModal(false); setCancelingItem(null); }}
                disabled={cancelingLoading}
                style={{
                  padding: '0.75rem 1.5rem',
                  minWidth: '120px'
                }}
              >
                Não, Voltar
              </button>
              <button
                className="btn btn-primary"
                onClick={handleCancelAvailability}
                disabled={cancelingLoading}
                style={{
                  padding: '0.75rem 1.5rem',
                  minWidth: '150px',
                  background: 'var(--danger)',
                  border: 'none',
                  color: 'white',
                  fontWeight: 'bold',
                  cursor: cancelingLoading ? 'not-allowed' : 'pointer',
                  opacity: cancelingLoading ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                {cancelingLoading ? (
                  <>
                    <div className="spinner-small" style={{ width: '16px', height: '16px', borderWidth: '2px', borderColor: 'white', borderTopColor: 'transparent' }}></div>
                    Cancelando...
                  </>
                ) : (
                  <>
                    <Ban size={18} />
                    Sim, Cancelar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}