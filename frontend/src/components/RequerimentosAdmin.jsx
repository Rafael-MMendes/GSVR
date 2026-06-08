import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Search, Trash2, Plus, Eye, X, FolderOpen, Upload, FileText, Ban, Edit2, Info } from 'lucide-react';
import { maskPhone, formatPhone, compareByRank, MILITARY_RANK_ORDER } from '../utils/formatters';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001') + '/api';

const ranks = MILITARY_RANK_ORDER;

const SHIFTS = [
  "07:00 ÀS 13:00",
  "13:00 ÀS 19:00",
  "19:00 ÀS 01:00",
  "01:00 ÀS 07:00"
];

// Gera array de dias a partir do intervalo data_inicio..data_fim do ciclo
const getCycleDays = (dataInicio, dataFim) => {
  if (!dataInicio || !dataFim) {
    return [];
  }
  const start = new Date(String(dataInicio).split('T')[0] + 'T12:00:00');
  const end = new Date(String(dataFim).split('T')[0] + 'T12:00:00');
  const days = [];
  const cur = new Date(start);
  while (cur <= end) {
    days.push({
      day: cur.getDate(),
      month: cur.getMonth() + 1,
      year: cur.getFullYear(),
      monthShort: cur.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase()
    });
    cur.setDate(cur.getDate() + 1);
  }
  return days;
};

export function RequerimentosAdmin({ user }) {
  const [volunteers, setVolunteers] = useState([]);
  const [efetivo, setEfetivo] = useState([]);
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
  const [sortConfig, setSortConfig] = useState({ key: 'rank', direction: 'asc' });

  // PDF Folder Import states
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importCycles, setImportCycles] = useState([]);
  const [importCompetencia, setImportCompetencia] = useState('');
  const fileInputRef = useRef(null);

  /** Gera opções MM/YYYY: próximos 2 meses + mês atual + últimos 12 meses (mais recente primeiro) */
  const generateCompetenciaOptions = () => {
    const opts = [];
    const now = new Date();
    for (let offset = 2; offset >= -12; offset--) {
      const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      opts.push(`${mm}/${yyyy}`);
    }
    return opts;
  };

  const toggleImportCycle = (id) => {
    setImportCycles(prev => {
      if (prev.includes(id)) return prev.filter(c => c !== id);
      if (prev.length >= 2) return prev; // limite de 2
      return [...prev, id];
    });
  };

  // New Search States
  const [militarSearch, setMilitarSearch] = useState('');
  const [showMilitarResults, setShowMilitarResults] = useState(false);

  // Search logic
  const filteredEfetivo = militarSearch.length >= 2
    ? efetivo.filter(m => {
      const search = militarSearch.toLowerCase();
      return (
        m.nome_completo?.toLowerCase().includes(search) ||
        m.nome_guerra?.toLowerCase().includes(search) ||
        m.matricula?.toLowerCase().includes(search) ||
        m.numero_ordem?.toLowerCase().includes(search) ||
        m.cpf?.toLowerCase().includes(search)
      );
    }).slice(0, 10)
    : [];

  const selectMilitar = (m) => {
    setFormData({
      ...formData,
      numero_ordem: m.matricula || m.numero_ordem || '',
      name: m.nome_completo,
      rank: m.posto_graduacao,
      nome_guerra: m.nome_guerra,
      phone: m.telefone ? maskPhone(m.telefone) : '',
      motorista: m.motorista || 'Não'
    });
    setMilitarSearch('');
    setShowMilitarResults(false);
  };

  // Cancel availability states
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelingItem, setCancelingItem] = useState(null);
  const [cancelingLoading, setCancelingLoading] = useState(false);
  const [cancelingSelection, setCancelingSelection] = useState({});
  const [cancelObservation, setCancelObservation] = useState('');
  const [showShiftObsModal, setShowShiftObsModal] = useState(false);
  const [obsShiftData, setObsShiftData] = useState(null);

  const [formData, setFormData] = useState({
    numero_ordem: '',
    name: '',
    nome_guerra: '',
    rank: 'Soldado PM',
    phone: '',
    motorista: 'Não',
    observacao: '',
    availability: {}
  });

  useEffect(() => {
    fetchMonths();
    fetchEfetivo();
  }, []);

  const fetchEfetivo = async () => {
    try {
      const res = await axios.get(`${API_URL}/efetivo`);
      const ativos = res.data.filter(e => e.status_ativo);
      ativos.sort((a, b) => compareByRank(a.posto_graduacao, b.posto_graduacao));
      setEfetivo(ativos);
    } catch (e) {
      console.error('Erro ao buscar efetivo', e);
    }
  };

  useEffect(() => {
    if (selectedMonth) {
      fetchVolunteers();
    }
  }, [selectedMonth]);

  const fetchMonths = async () => {
    try {
      const res = await axios.get(`${API_URL}/ciclos`);
      const ciclos = res.data.map(c => {
        const dataInicio = c.data_inicio ? String(c.data_inicio).split('T')[0] : '';
        const mesReferenciaISO = dataInicio ? dataInicio.substring(0, 7) : '';

        return {
          id_ciclo: c.id_ciclo,
          month_key: c.id_ciclo.toString(),
          month_name: c.period_name || `${c.periodo_ciclo} (${c.status})`,
          mes_referencia_iso: mesReferenciaISO,
          status: c.status,
          data_inicio: c.data_inicio || '',
          data_fim: c.data_fim || ''
        };
      });
      setMonths(ciclos);

      const cicloAtivo = ciclos.find(c => c.status === 'Aberto');
      if (cicloAtivo) {
        // FIX: usar cicloAtivo.month_key (não .periodo_ciclo que não existe no objeto mapeado)
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
      const res = await axios.get(`${API_URL}/volunteers?id_ciclo=${selectedMonth}`);
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
    setImportCycles([]);
    setImportCompetencia('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(files.filter(f => f.name.toLowerCase().endsWith('.pdf')));
  };

  const handleImportFromFiles = async () => {
    if (selectedFiles.length === 0) {
      alert('Selecione ao menos um arquivo PDF.');
      return;
    }
    if (importCycles.length === 0) {
      alert('Selecione ao menos 1 ciclo de destino.');
      return;
    }
    if (!importCompetencia) {
      alert('Selecione a Competência (Mês/Ano) de referência.');
      return;
    }

    setImporting(true);
    setImportResult(null);
    try {
      const fd = new FormData();
      selectedFiles.forEach(file => fd.append('files', file));
      fd.append('ciclos_ids', JSON.stringify(importCycles));
      fd.append('competencia', importCompetencia);

      const res = await axios.post(`${API_URL}/import/volunteers/files`, fd);
      setImportResult(res.data);
      fetchVolunteers();
    } catch (e) {
      console.error(e);
      const rawErr = e.response?.data?.error ?? e.response?.data?.message ?? e.message ?? e;
      const errMsg = typeof rawErr === 'string' ? rawErr : JSON.stringify(rawErr);
      alert('Erro ao importar PDFs: ' + errMsg);
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
      observacao: '',
      availability: {}
    });
    setMilitarSearch('');
    setShowMilitarResults(false);
    setShowModal(true);
  };

  // Efeito para buscar militar por Nº de Ordem
  useEffect(() => {
    const matricula = formData.numero_ordem.trim();
    if (matricula.length >= 4 && !editingVolunteer && efetivo.length > 0) {
      const cleanMatricula = matricula.replace(/\D/g, '');
      const militar = efetivo.find(e =>
        e.matricula === matricula ||
        e.numero_ordem === matricula ||
        (e.matricula && e.matricula.replace(/\D/g, '') === cleanMatricula)
      );

      if (militar) {
        setFormData(prev => ({
          ...prev,
          name: militar.nome_completo,
          rank: militar.posto_graduacao,
          phone: militar.telefone ? maskPhone(militar.telefone) : prev.phone,
          motorista: militar.motorista || 'Não'
        }));
      }
    }
  }, [formData.numero_ordem, editingVolunteer, efetivo]);

  const openEditModal = (volunteer) => {
    setEditingVolunteer(volunteer);
    setFormData({
      numero_ordem: volunteer.numero_ordem,
      name: volunteer.name,
      rank: volunteer.rank,
      phone: volunteer.phone || '',
      motorista: volunteer.motorista || 'Não',
      observacao: volunteer.observacao || '',
      availability: volunteer.availability || {},
      availability_completa: volunteer.availability_completa || {}
    });
    setShowModal(true);
  };

  const openViewModal = (volunteer) => {
    setViewingVolunteer(volunteer);
    setShowViewModal(true);
  };

  const openCancelModal = (volunteer) => {
    setCancelingItem(volunteer);
    setCancelingSelection({}); // Começa com seletores em branco conforme solicitado
    setShowCancelModal(true);
  };

  const toggleCancelShiftSelection = (day, shift) => {
    setCancelingSelection(prev => {
      const dayStr = String(day);
      const dayShifts = prev[dayStr] || [];
      const isSelected = dayShifts.includes(shift);
      const newShifts = isSelected ? dayShifts.filter(s => s !== shift) : [...dayShifts, shift];
      const newSelection = { ...prev };
      if (newShifts.length > 0) {
        newSelection[dayStr] = newShifts;
      } else {
        delete newSelection[dayStr];
      }
      return newSelection;
    });
  };

  const handleCancelAvailability = async () => {
    if (!cancelingItem) return;

    // Verifica se há algo selecionado
    if (Object.keys(cancelingSelection).length === 0) {
      alert('Selecione ao menos um turno para cancelar.');
      return;
    }

    setCancelingLoading(true);
    try {
      await axios.put(`${API_URL}/volunteers/${cancelingItem.id}/cancel-availability`, {
        availability: cancelingSelection,
        observacao: cancelObservation
      });
      setShowCancelModal(false);
      setCancelingItem(null);
      setCancelingSelection({});
      setCancelObservation('');
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
      const isSelected = dayShifts.some(s => (typeof s === 'object' ? s.turno === shift : s === shift));

      let newShifts;
      if (isSelected) {
        newShifts = dayShifts.filter(s => (typeof s === 'object' ? s.turno !== shift : s !== shift));
      } else {
        newShifts = [...dayShifts, { turno: shift, observacoes: '' }];
      }

      const newAvailability = { ...prev.availability };
      if (newShifts.length > 0) {
        newAvailability[dayStr] = newShifts;
      } else {
        delete newAvailability[dayStr];
      }
      return { ...prev, availability: newAvailability };
    });
  };

  const openShiftObsModal = (e, day, shift) => {
    e.preventDefault(); // Evita menu do navegador
    const dayStr = String(day);
    const dayShifts = formData.availability[dayStr] || [];
    const shiftData = dayShifts.find(s => (typeof s === 'object' ? s.turno === shift : s === shift));

    if (!shiftData) return; // Só comenta se estiver selecionado

    setObsShiftData({
      day,
      shift,
      value: typeof shiftData === 'object' ? (shiftData.observacoes || '') : ''
    });
    setShowShiftObsModal(true);
  };

  const saveShiftObservation = () => {
    const { day, shift, value } = obsShiftData;
    setFormData(prev => {
      const dayStr = String(day);
      const dayShifts = [...(prev.availability[dayStr] || [])];
      const idx = dayShifts.findIndex(s => (typeof s === 'object' ? s.turno === shift : s === shift));

      if (idx !== -1) {
        const current = dayShifts[idx];
        dayShifts[idx] = {
          turno: typeof current === 'object' ? current.turno : current,
          observacoes: value
        };
      }

      return {
        ...prev,
        availability: {
          ...prev.availability,
          [dayStr]: dayShifts
        }
      };
    });
    setShowShiftObsModal(false);
  };

  const handleSave = async () => {
    const duplicateFound = volunteers.find(v =>
      v.numero_ordem?.trim() === formData.numero_ordem?.trim() &&
      v.id !== editingVolunteer?.id
    );

    if (!formData.numero_ordem.trim() || !formData.name.trim()) {
      alert('Preencha o Nº de Ordem e o Nome.');
      return;
    }

    if (duplicateFound) {
      alert(`Este militar (${formData.numero_ordem}) já possui um requerimento neste ciclo.`);
      return;
    }

    setLoading(true);
    try {
      if (editingVolunteer) {
        await axios.put(`${API_URL}/volunteers/${editingVolunteer.id}`, formData);
      } else {
        await axios.post(`${API_URL}/volunteers`, { ...formData, id_ciclo: activeCycle?.id_ciclo });
      }
      setShowModal(false);
      fetchVolunteers();
    } catch (error) {
      console.error(error);
      alert('Erro: ' + (error.response?.data?.error || error.message));
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

    // Ordenação por hierarquia militar
    if (sortConfig.key === 'rank') {
      const result = compareByRank(a.rank, b.rank);
      return sortConfig.direction === 'asc' ? result : -result;
    }

    let aVal = a[sortConfig.key];
    let bVal = b[sortConfig.key];

    // Tratamento especial para números
    if (sortConfig.key === 'numero_ordem') {
      aVal = parseInt((aVal?.toString() || '').replace(/\D/g, '')) || 0;
      bVal = parseInt((bVal?.toString() || '').replace(/\D/g, '')) || 0;
    }

    if (sortConfig.key === 'turnos') {
      aVal = Object.keys(a.availability || {}).length;
      bVal = Object.keys(b.availability || {}).length;
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

  // Dias reais do ciclo ativo (pode cruzar dois meses, ex: 16/Abr → 15/Mai)
  const cycleDays = getCycleDays(activeCycle?.data_inicio, activeCycle?.data_fim);

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
        <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Gestão de Requerimentos</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className="btn btn-primary"
            onClick={openFolderModal}
            style={{
              width: 'auto',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              border: 'none',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
            }}
          >
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
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Total: <strong>{filteredVolunteers.length}</strong>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.25rem' }}>
          <div className="search-container" style={{ width: '350px' }}>
            <input
              type="text"
              className="search-input"
              placeholder="Buscar por nome, matrícula ou ordem..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            <Search size={18} className="search-icon" />
          </div>
        </div>

        <div className="table-premium-wrapper">
          <table className="table" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr>
                <th onClick={() => requestSort('numero_ordem')} style={{ cursor: 'pointer' }}>
                  Nº Ordem {sortConfig.key === 'numero_ordem' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th onClick={() => requestSort('rank')} style={{ cursor: 'pointer' }}>
                  Posto/Grad {sortConfig.key === 'rank' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th onClick={() => requestSort('name')} style={{ cursor: 'pointer' }}>
                  Nome {sortConfig.key === 'name' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th>Telefone</th>
                <th style={{ textAlign: 'center' }}>Motorista</th>
                <th style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => requestSort('turnos')}>
                  Dias Disponíveis {sortConfig.key === 'turnos' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th>Obs</th>
                <th style={{ textAlign: 'center' }}>Ações</th>
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
                        {Object.keys(v.availability || {}).length}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    {v.observacao && (
                      <div title={v.observacao} style={{
                        maxWidth: '120px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                        cursor: 'help'
                      }}>
                        {v.observacao}
                      </div>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="action-btn-group">
                      <button
                        className="action-btn action-btn-info"
                        onClick={() => openViewModal(v)}
                        title="Visualizar Detalhes"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        className="action-btn action-btn-primary"
                        onClick={() => openEditModal(v)}
                        title="Editar Requerimento"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        className="action-btn action-btn-warning"
                        onClick={() => openCancelModal(v)}
                        title={v.ativo === false ? 'Disponibilidade Cancelada' : 'Cancelar Disponibilidade'}
                        disabled={v.ativo === false}
                      >
                        <Ban size={16} />
                      </button>
                      <button
                        className="action-btn action-btn-danger"
                        onClick={() => handleDelete(v.id)}
                        title="Excluir Requerimento"
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

            {/* Novo Campo de Busca de Militar */}
            {!formData.numero_ordem ? (
              <div className="form-group" style={{ marginBottom: '1.5rem', position: 'relative' }}>
                <label>Buscar Militar (Nome, Matrícula, Nº Ordem ou CPF)</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Digite para buscar..."
                    value={militarSearch}
                    onChange={(e) => {
                      setMilitarSearch(e.target.value);
                      setShowMilitarResults(true);
                    }}
                    onFocus={() => setShowMilitarResults(true)}
                  />
                  <Search size={18} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                </div>

                {showMilitarResults && filteredEfetivo.length > 0 && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0,
                    background: 'white', border: '1px solid var(--border-color)',
                    borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                    zIndex: 10, marginTop: '5px', maxHeight: '250px', overflowY: 'auto'
                  }}>
                    {filteredEfetivo.map(m => (
                      <div
                        key={m.id_militar}
                        onClick={() => selectMilitar(m)}
                        style={{
                          padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)',
                          cursor: 'pointer', transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.background = '#f8fafc'}
                        onMouseLeave={(e) => e.target.style.background = 'transparent'}
                      >
                        <div style={{ fontWeight: '600', color: 'var(--primary)', fontSize: '0.9rem' }}>
                          {m.posto_graduacao} {m.nome_completo}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Matrícula: {m.matricula} | Nº Ordem: {m.numero_ordem}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Label de Militar Selecionado */
              <div style={{
                background: 'rgba(59, 130, 246, 0.05)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                borderRadius: '12px',
                padding: '1rem',
                marginBottom: '1.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                animation: 'fadeIn 0.3s ease-out'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '10px',
                    background: 'var(--primary)', color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <FileText size={20} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 'bold', color: 'var(--primary)', fontSize: '1rem' }}>
                      {formData.rank} - {formData.numero_ordem} {formData.name}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Telefone: {formData.phone || 'N/I'} | Motorista: <strong style={{ color: formData.motorista === 'Sim' ? '#10b981' : 'inherit' }}>{formData.motorista}</strong>
                    </div>
                    {volunteers.some(v => v.numero_ordem?.trim() === formData.numero_ordem?.trim() && v.id !== editingVolunteer?.id) && (
                      <div style={{ color: '#ef4444', fontSize: '0.75rem', fontWeight: 'bold', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Ban size={12} />
                        Militar já cadastrado neste ciclo.
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setFormData({ ...formData, numero_ordem: '', name: '', phone: '', motorista: 'Não' })}
                  style={{
                    background: 'none', border: 'none', color: '#ef4444',
                    cursor: 'pointer', padding: '0.5rem', borderRadius: '6px',
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    fontSize: '0.85rem', fontWeight: '600'
                  }}
                  onMouseEnter={(e) => e.target.style.background = 'rgba(239, 68, 68, 0.1)'}
                  onMouseLeave={(e) => e.target.style.background = 'transparent'}
                >
                  <Ban size={16} />
                  Limpar
                </button>
              </div>
            )}

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label>Observações do Requerimento</label>
              <textarea
                className="form-control"
                placeholder="Ex: Restrições médicas, preferência de guarnição, etc."
                value={formData.observacao}
                onChange={e => setFormData({ ...formData, observacao: e.target.value })}
                rows="2"
                style={{ resize: 'vertical' }}
              />
            </div>

            <h4 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Disponibilidade (Grade)</h4>
            <div className="responsive-table-container" style={{ border: '1px solid var(--border-color)', borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ background: 'var(--primary)', color: 'white', borderBottom: 'none' }}>
                    <th style={{ background: 'var(--primary)', color: 'white', padding: '0.5rem', textAlign: 'left', minWidth: '120px' }}>HORÁRIO:</th>
                    {cycleDays.map((dayObj, idx) => {
                      const showMonth = idx === 0 || cycleDays[idx - 1].month !== dayObj.month;
                      return (
                        <th key={`${dayObj.year}-${dayObj.month}-${dayObj.day}`} style={{ background: 'var(--primary)', color: 'white', padding: '0.3rem 0.2rem', textAlign: 'center', width: '28px', lineHeight: 1.1 }}>
                          {showMonth && <div style={{ fontSize: '0.55rem', opacity: 0.75, letterSpacing: '0.02em' }}>{dayObj.monthShort}</div>}
                          <div style={{ fontSize: '0.75rem' }}>{String(dayObj.day).padStart(2, '0')}</div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {SHIFTS.map((shift, sIdx) => (
                    <tr key={shift} style={{ background: sIdx % 2 === 0 ? 'var(--card-bg)' : 'rgba(0,0,0,0.02)' }}>
                      <td style={{ padding: '0.5rem', fontWeight: 600, color: 'var(--text-muted)' }}>{shift}</td>
                      {cycleDays.map(dayObj => {
                        const dateKey = `${dayObj.year}-${String(dayObj.month).padStart(2, '0')}-${String(dayObj.day).padStart(2, '0')}`;
                        const dayStr = String(dayObj.day);
                        const isSelected = (formData.availability[dateKey] || formData.availability[dayStr] || []).some(s =>
                          (typeof s === 'object' ? s.turno === shift : s === shift)
                        );

                        const currentShiftData = (formData.availability[dateKey] || formData.availability[dayStr] || []).find(s =>
                          (typeof s === 'object' ? s.turno === shift : s === shift)
                        );
                        const hasObs = typeof currentShiftData === 'object' && currentShiftData.observacoes;

                        const completeData = formData.availability_completa?.[dateKey] || formData.availability_completa?.[dayStr] || [];
                        const shiftInfo = Array.isArray(completeData) ? completeData.find(item =>
                          (typeof item === 'object' ? item.turno === shift : item === shift)
                        ) : null;

                        const isCancelado = shiftInfo && typeof shiftInfo === 'object' && shiftInfo.ativo === false;

                        let bgColor = 'transparent';
                        let textColor = 'transparent';
                        let label = '·';

                        if (isSelected) {
                          bgColor = 'var(--primary)';
                          textColor = 'white';
                          label = 'X';
                        } else if (isCancelado) {
                          bgColor = 'var(--danger)';
                          textColor = 'white';
                          label = 'X';
                        }

                        return (
                          <td
                            key={`${dayObj.year}-${dayObj.month}-${dayObj.day}`}
                            onClick={() => toggleShift(dateKey, shift)}
                            onContextMenu={(e) => openShiftObsModal(e, dateKey, shift)}
                            style={{
                              textAlign: 'center',
                              cursor: 'pointer',
                              backgroundColor: bgColor,
                              color: textColor,
                              border: '1px solid #e2e8f0',
                              fontWeight: 'bold',
                              position: 'relative'
                            }}
                            title={isSelected ? `Ativo${hasObs ? ': ' + currentShiftData.observacoes : ''} (Botão direito para editar observação)` : (isCancelado ? `Cancelado${shiftInfo?.observacoes ? ': ' + shiftInfo.observacoes : ''}` : '')}
                          >
                            {label}
                            {isSelected && hasObs && (
                              <div style={{
                                position: 'absolute', top: 0, right: 0,
                                width: '6px', height: '6px',
                                background: '#fbbf24', borderRadius: '50%', margin: '2px'
                              }} />
                            )}
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
              <button
                className="btn btn-primary"
                onClick={handleSave}
                disabled={loading || volunteers.some(v => v.numero_ordem?.trim() === formData.numero_ordem?.trim() && v.id !== editingVolunteer?.id)}
              >
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
              <div><strong>Nº Ordem:</strong><br />{viewingVolunteer.numero_ordem}</div>
              <div><strong>Posto/Grad:</strong><br />{viewingVolunteer.rank}</div>
              <div><strong>Nome:</strong><br />{viewingVolunteer.name}</div>
              <div><strong>Telefone:</strong><br />{formatPhone(viewingVolunteer.phone)}</div>
              <div><strong>Motorista:</strong><br />{(viewingVolunteer.motorista_req || viewingVolunteer.motorista === 'Sim') ? 'Sim' : 'Não'}</div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
              <h4 style={{ margin: 0 }}>Grade de Disponibilidade</h4>
              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ width: 12, height: 12, borderRadius: '3px', background: '#059669' }} /> Executado
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ width: 12, height: 12, borderRadius: '3px', background: '#2563eb' }} /> Disponível
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ width: 12, height: 12, borderRadius: '3px', background: '#dc2626' }} /> Desistência
                </span>
              </div>
            </div>

            <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: 'var(--primary)', color: 'white', borderBottom: 'none' }}>
                    <th style={{ background: 'var(--primary)', color: 'white', padding: '0.5rem', textAlign: 'left', minWidth: '120px' }}>HORÁRIO:</th>
                    {cycleDays.map((dayObj, idx) => {
                      const showMonth = idx === 0 || cycleDays[idx - 1].month !== dayObj.month;
                      return (
                        <th key={`${dayObj.year}-${dayObj.month}-${dayObj.day}`} style={{ background: 'var(--primary)', color: 'white', padding: '0.3rem 0.2rem', textAlign: 'center', width: '28px', lineHeight: 1.1 }}>
                          {showMonth && <div style={{ fontSize: '0.55rem', opacity: 0.75, letterSpacing: '0.02em' }}>{dayObj.monthShort}</div>}
                          <div style={{ fontSize: '0.75rem' }}>{String(dayObj.day).padStart(2, '0')}</div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {SHIFTS.map((shift, sIdx) => (
                    <tr key={shift} style={{ background: sIdx % 2 === 0 ? 'var(--card-bg)' : 'rgba(0,0,0,0.02)' }}>
                      <td style={{ padding: '0.5rem', fontWeight: 600, color: 'var(--text-muted)' }}>{shift}</td>
                      {cycleDays.map(dayObj => {
                        const dateKey = `${dayObj.year}-${String(dayObj.month).padStart(2, '0')}-${String(dayObj.day).padStart(2, '0')}`;
                        const dayStr = String(dayObj.day);
                        const isSelected = (viewingVolunteer.availability?.[dateKey] || viewingVolunteer.availability?.[dayStr] || []).some(s =>
                          (typeof s === 'object' ? s.turno === shift : s === shift)
                        );
                        const currentShiftData = (viewingVolunteer.availability?.[dateKey] || viewingVolunteer.availability?.[dayStr] || []).find(s =>
                          (typeof s === 'object' ? s.turno === shift : s === shift)
                        );
                        const hasObs = typeof currentShiftData === 'object' && currentShiftData.observacoes;
                        const completeData = viewingVolunteer.availability_completa?.[dateKey] || viewingVolunteer.availability_completa?.[dayStr] || [];
                        const shiftInfo = Array.isArray(completeData) ? completeData.find(item =>
                          (typeof item === 'object' ? item.turno === shift : item === shift)
                        ) : null;
                        const isCancelado = shiftInfo && typeof shiftInfo === 'object' && shiftInfo.ativo === false;
                        const teveExecucao = shiftInfo && typeof shiftInfo === 'object' && shiftInfo.teve_execucao === true;

                        let bgColor = '#f8fafc';
                        let borderStyle = '1px dashed #e2e8f0';
                        let textColor = 'transparent';
                        let label = '·';
                        let titleText = '';

                        if (teveExecucao) {
                          bgColor = '#059669';
                          borderStyle = '1px solid #047857';
                          textColor = 'white';
                          label = '✕';
                          titleText = 'Serviço executado';
                        } else if (isCancelado) {
                          bgColor = '#dc2626';
                          borderStyle = '1px solid #b91c1c';
                          textColor = 'white';
                          label = '✕';
                          titleText = `Desistência${shiftInfo?.observacoes ? ': ' + shiftInfo.observacoes : ''}`;
                        } else if (isSelected) {
                          bgColor = '#2563eb';
                          borderStyle = '1px solid #1d4ed8';
                          textColor = 'white';
                          label = '✕';
                          titleText = `Disponível${hasObs ? ': ' + currentShiftData.observacoes : ''}`;
                        }

                        return (
                          <td
                            key={`${dayObj.year}-${dayObj.month}-${dayObj.day}`}
                            style={{ 
                              textAlign: 'center', 
                              backgroundColor: bgColor, 
                              color: textColor, 
                              border: borderStyle, 
                              fontWeight: 'bold', 
                              position: 'relative',
                              padding: '0.25rem 0'
                            }}
                            title={titleText}
                          >
                            {label}
                            {isSelected && hasObs && (
                              <div style={{ position: 'absolute', top: 0, right: 0, width: '6px', height: '6px', background: '#fbbf24', borderRadius: '50%', margin: '2px' }} />
                            )}
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

              {/* ── Seleção de Ciclo(s) ───────────────────────────────── */}
              <div>
                <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                  📅 Ciclo(s) de Destino
                  <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)' }}>
                    (selecione 1 ou 2 ciclos)
                  </span>
                  {importCycles.length === 0 && (
                    <span style={{ marginLeft: '0.5rem', color: '#ef4444', fontSize: '0.75rem', fontWeight: 600 }}>⚠ obrigatório</span>
                  )}
                </label>
                <div style={{
                  maxHeight: '160px', overflowY: 'auto',
                  border: `1px solid ${importCycles.length === 0 ? '#ef4444' : 'var(--border-color)'}`,
                  borderRadius: '8px',
                  padding: '0.25rem'
                }}>
                  {months.length === 0 && (
                    <div style={{ padding: '0.75rem', color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>
                      Nenhum ciclo cadastrado.
                    </div>
                  )}
                  {months.map(ciclo => {
                    const isSelected = importCycles.includes(ciclo.id_ciclo);
                    const isDisabled = !isSelected && importCycles.length >= 2;
                    return (
                      <label
                        key={ciclo.id_ciclo}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.6rem',
                          padding: '0.5rem 0.75rem', borderRadius: '6px', cursor: isDisabled ? 'not-allowed' : 'pointer',
                          background: isSelected ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                          opacity: isDisabled ? 0.45 : 1,
                          transition: 'background 0.15s',
                          marginBottom: '2px'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={isDisabled}
                          onChange={() => toggleImportCycle(ciclo.id_ciclo)}
                          style={{ accentColor: 'var(--primary)', width: '15px', height: '15px', flexShrink: 0 }}
                        />
                        <span style={{ fontSize: '0.85rem', color: isSelected ? 'var(--primary)' : 'var(--text-primary)', fontWeight: isSelected ? 600 : 400 }}>
                          {ciclo.month_name}
                        </span>
                        {ciclo.status === 'Aberto' && (
                          <span style={{ marginLeft: 'auto', fontSize: '0.65rem', background: '#10b981', color: 'white', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 700 }}>ABERTO</span>
                        )}
                        {ciclo.status === 'Fechado' && (
                          <span style={{ marginLeft: 'auto', fontSize: '0.65rem', background: '#6b7280', color: 'white', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>FECHADO</span>
                        )}
                      </label>
                    );
                  })}
                </div>
                {importCycles.length > 0 && (
                  <div style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>
                    ✓ {importCycles.length} ciclo(s) selecionado(s)
                    {importCycles.length === 2 && (
                      <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: '0.4rem' }}>
                        — dias &lt; diaInicio → 1º ciclo · dias ≥ diaInicio → 2º ciclo
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* ── Seleção de Competência MM/YYYY ───────────────────── */}
              <div>
                <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                  🗓️ Competência (Mês/Ano de Referência)
                  {!importCompetencia && (
                    <span style={{ marginLeft: '0.5rem', color: '#ef4444', fontSize: '0.75rem', fontWeight: 600 }}>⚠ obrigatório</span>
                  )}
                </label>
                <select
                  value={importCompetencia}
                  onChange={e => setImportCompetencia(e.target.value)}
                  style={{
                    width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px',
                    border: `1px solid ${!importCompetencia ? '#ef4444' : 'var(--border-color)'}`,
                    fontSize: '0.9rem', background: 'var(--card-bg)', color: 'var(--text-primary)',
                    cursor: 'pointer'
                  }}
                >
                  <option value="">— Selecione o mês/ano —</option>
                  {generateCompetenciaOptions().map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Os dias do PDF serão associados a este mês e ano. A data impressa no PDF será ignorada.
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
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                    borderBottom: `1px solid ${importResult.success ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)'}`
                  }}>
                    <strong style={{ color: importResult.success ? 'var(--success)' : 'var(--danger)' }}>
                      {importResult.success ? '✓ Resultado do Processamento' : '⚠️ Problemas Detectados'}
                    </strong>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      {importResult.competencia_usada && (
                        <span style={{ fontSize: '0.75rem', background: 'rgba(59,130,246,0.15)', color: 'var(--primary)', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>
                          📅 {importResult.competencia_usada}
                        </span>
                      )}
                      {importResult.ciclos_usados?.length > 0 && (
                        <span style={{ fontSize: '0.75rem', background: 'rgba(16,185,129,0.12)', color: '#059669', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                          {importResult.ciclos_usados.length} ciclo(s)
                        </span>
                      )}
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {importResult.processed} arquivo(s) lido(s)
                      </span>
                    </div>
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
                            <span key={r.numero_ordem} style={{ background: 'rgba(34, 197, 94, 0.1)', color: 'var(--success)', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px', flexDirection: 'column' }}>
                              <span>#{r.numero_ordem} {r.name ? `— ${r.name}` : ''}</span>
                              {r.ciclos_afetados?.length > 1 ? (
                                <span style={{ fontSize: '0.65rem', color: '#f59e0b', fontWeight: 'bold' }}>
                                  ⚡ Distribuído em {r.ciclos_afetados.length} ciclos
                                </span>
                              ) : (
                                <span style={{ fontSize: '0.65rem', opacity: 0.6 }}>1 ciclo</span>
                              )}
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
                disabled={importing || selectedFiles.length === 0 || importCycles.length === 0 || !importCompetencia}
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
            animation: 'slideUp 0.3s ease-out',
            color: 'var(--danger)' // Fonte em vermelho conforme solicitado
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
                <div><strong>Nº Ordem:</strong><br />{cancelingItem.numero_ordem}</div>
                <div><strong>Posto/Grad:</strong><br />{cancelingItem.rank}</div>
                <div><strong>Nome:</strong><br />{cancelingItem.name}</div>
                <div><strong>Telefone:</strong><br />{formatPhone(cancelingItem.phone)}</div>
                <div><strong>Motorista:</strong><br />{cancelingItem.motorista_req ? '✅ Sim' : '❌ Não'}</div>
              </div>
            </div>

            {/* Alerta */}
            <div style={{
              background: 'rgba(56, 189, 248, 0.05)', borderLeft: '4px solid var(--primary)',
              padding: '0.75rem 1rem', borderRadius: '0 8px 8px 0', marginBottom: '1rem',
              fontSize: '0.85rem'
            }}>
              <strong style={{ color: 'var(--primary)' }}>ℹ️ Instrução:</strong> Os blocos em azul claro representam a disponibilidade <strong>ATIVA</strong>. Clique nos turnos que deseja cancelar para marcá-los em vermelho (X).
            </div>

            {/* Grade de Disponibilidade */}
            <h4 style={{ marginBottom: '0.5rem', fontSize: '0.95rem' }}>Selecione os turnos para cancelar:</h4>
            <div className="responsive-table-container" style={{ border: '1px solid var(--border-color)', borderRadius: '8px', marginBottom: '1.5rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px', fontSize: '0.75rem' }}>
                <thead>
                  <tr style={{ background: 'var(--primary)', color: 'white' }}>
                    <th style={{ padding: '0.5rem', textAlign: 'left', minWidth: '120px' }}>HORÁRIO:</th>
                    {cycleDays.map((dayObj, idx) => {
                      const showMonth = idx === 0 || cycleDays[idx - 1].month !== dayObj.month;
                      return (
                        <th key={`${dayObj.year}-${dayObj.month}-${dayObj.day}`} style={{ padding: '0.3rem 0.2rem', textAlign: 'center', width: '28px', lineHeight: 1.1 }}>
                          {showMonth && <div style={{ fontSize: '0.55rem', opacity: 0.75 }}>{dayObj.monthShort}</div>}
                          <div style={{ fontSize: '0.7rem' }}>{String(dayObj.day).padStart(2, '0')}</div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {SHIFTS.map((shift, sIdx) => (
                    <tr key={shift} style={{ background: sIdx % 2 === 0 ? 'var(--card-bg)' : 'rgba(0,0,0,0.02)' }}>
                      <td style={{ padding: '0.5rem', fontWeight: 600, color: 'var(--text-muted)' }}>{shift}</td>
                      {cycleDays.map(dayObj => {
                        const dateKey = `${dayObj.year}-${String(dayObj.month).padStart(2, '0')}-${String(dayObj.day).padStart(2, '0')}`;
                        const dayStr = String(dayObj.day);
                        const availabilityData = cancelingItem.availability_completa?.[dateKey] || cancelingItem.availability_completa?.[dayStr] || cancelingItem.availability?.[dateKey] || cancelingItem.availability?.[dayStr] || [];

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

                        const isSelectedToCancel = (cancelingSelection[dateKey] || cancelingSelection[dayStr])?.includes(shift);

                        return (
                          <td
                            key={`${dayObj.year}-${dayObj.month}-${dayObj.day}`}
                            onClick={() => isAtivo && toggleCancelShiftSelection(dateKey, shift)}
                            style={{
                              textAlign: 'center',
                              cursor: isAtivo ? 'pointer' : 'default',
                              backgroundColor: (isCancelado || isSelectedToCancel) ? 'var(--danger)' : (isAtivo ? '#e0f2fe' : 'transparent'),
                              color: (isCancelado || isSelectedToCancel) ? 'white' : (isAtivo ? '#0369a1' : 'transparent'),
                              border: '1px solid #e2e8f0',
                              fontWeight: 'bold',
                              transition: 'all 0.1s ease',
                              opacity: isCancelado ? 0.6 : 1
                            }}
                            title={isCancelado ? 'Já Cancelado' : (isAtivo ? 'Clique para cancelar' : '')}
                          >
                            {(isCancelado || isSelectedToCancel) ? 'X' : (isAtivo ? '✓' : '')}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Campo de Observação */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                Motivo do Cancelamento (Observação):
              </label>
              <textarea
                className="form-control"
                value={cancelObservation}
                onChange={e => setCancelObservation(e.target.value)}
                placeholder="Ex: Solicitado pelo militar via telefone..."
                style={{
                  width: '100%',
                  minHeight: '80px',
                  resize: 'vertical',
                  padding: '0.75rem',
                  fontSize: '0.9rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px'
                }}
              />
            </div>

            {/* Botões de Ação */}
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-outline"
                onClick={() => { setShowCancelModal(false); setCancelingItem(null); setCancelObservation(''); }}
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

      {/* Modal de Observação de Turno */}
      {showShiftObsModal && obsShiftData && (
        <div className="modal-overlay">
          <div className="glass-panel" style={{ width: '400px', maxWidth: '90%', animation: 'slideUp 0.3s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>Observação do Turno</h3>
              <button onClick={() => setShowShiftObsModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={24} />
              </button>
            </div>

            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Dia {String(obsShiftData.day).includes('-') ? obsShiftData.day.split('-').reverse().join('/') : String(obsShiftData.day).padStart(2, '0')} - {obsShiftData.shift}
            </p>

            <textarea
              className="form-control"
              value={obsShiftData.value}
              onChange={e => setObsShiftData({ ...obsShiftData, value: e.target.value })}
              placeholder="Digite observações específicas para este turno..."
              rows="4"
              autoFocus
              style={{ marginBottom: '1.5rem' }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button className="btn btn-outline" onClick={() => setShowShiftObsModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={saveShiftObservation}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}