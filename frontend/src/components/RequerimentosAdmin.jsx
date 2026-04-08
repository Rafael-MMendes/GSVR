import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Search, Trash2, Plus, Eye, X, FolderOpen, Upload, FileText } from 'lucide-react';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001') + '/api';

const ranks = [
  "Aspirante PM", "Soldado PM", "Cabo PM", "3º Sargento PM", "2º Sargento PM", 
  "1º Sargento PM", "Subtenente PM", "2º Tenente PM", "1º Tenente PM", 
  "Capitão PM", "Major PM", "Tenente Coronel PM", "Coronel PM"
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
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingVolunteer, setEditingVolunteer] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingVolunteer, setViewingVolunteer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // PDF Folder Import states
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

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
      const res = await axios.get(`${API_URL}/months`);
      setMonths(res.data);
      if (res.data.length > 0) {
        setSelectedMonth(res.data[0].month_key);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchVolunteers = async () => {
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
      formData.append('month_key', selectedMonth);

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
  });

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
          <button className="btn btn-secondary" onClick={openFolderModal} style={{ width: 'auto' }}>
            <FolderOpen size={18} style={{ marginRight: '0.5rem' }} />
            <span>Importar PDF</span>
          </button>
          <button className="btn btn-primary" onClick={openAddModal} style={{ width: 'auto' }}>
            <Plus size={18} style={{ marginRight: '0.5rem' }} />
            <span>Novo</span>
          </button>
        </div>
      </div>

      <div className="glass-panel">
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '1 1 auto' }}>
            <label style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Mês:</label>
            <select 
              className="form-control" 
              style={{ width: '150px', margin: 0, padding: '0.4rem' }}
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
            >
              {months.map(m => (
                <option key={m.month_key} value={m.month_key}>{m.month_name}</option>
              ))}
            </select>
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
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Nº Ordem</th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Posto/Grad</th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Nome</th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Telefone</th>
                <th style={{ padding: '0.75rem', textAlign: 'center' }}>Motorista</th>
                <th style={{ padding: '0.75rem', textAlign: 'center' }}>Turnos</th>
                <th style={{ padding: '0.75rem', textAlign: 'center' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredVolunteers.map((v, idx) => (
                <tr key={v.id} style={{ background: idx % 2 === 0 ? 'var(--card-bg)' : 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '0.75rem', fontWeight: 'bold' }}>{v.numero_ordem}</td>
                  <td style={{ padding: '0.75rem' }}>{v.rank}</td>
                  <td style={{ padding: '0.75rem', fontWeight: 500 }}>{v.name}</td>
                  <td style={{ padding: '0.75rem' }}>{v.phone || '-'}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                    {v.motorista === 'Sim' ? (
                      <span style={{ background: 'var(--success)', color: 'white', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>Sim</span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>Não</span>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {Object.keys(v.availability || {}).length > 0 
                      ? `${Object.values(v.availability).flat().length} turnos` 
                      : 'Nenhum'}
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
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
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
              <div><strong>Telefone:</strong><br/>{viewingVolunteer.phone || '-'}</div>
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

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Selecione o Mês:</label>
              <select 
                className="form-control"
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
              >
                <option value="">Selecione...</option>
                {months.map(m => (
                  <option key={m.month_key} value={m.month_key}>{m.month_name}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Selecione os Arquivos PDF:</label>
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".pdf"
                multiple
                style={{ 
                  display: 'block',
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px dashed var(--border-color)',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              />
              {selectedFiles.length > 0 && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--success)' }}>
                  {selectedFiles.length} arquivo(s) selecionado(s): {selectedFiles.map(f => f.name).join(', ')}
                </div>
              )}
            </div>

            {importResult && (
              <div style={{ 
                marginBottom: '1.5rem', 
                padding: '1rem', 
                background: importResult.success ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                borderRadius: '8px',
                border: `1px solid ${importResult.success ? 'var(--success)' : 'var(--danger)'}`
              }}>
                <strong>Resultado:</strong>
                <p style={{ margin: '0.5rem 0' }}>{importResult.processed} requerimentos processados.</p>
                {importResult.results && importResult.results.length > 0 && (
                  <div style={{ fontSize: '0.85rem', maxHeight: '100px', overflowY: 'auto' }}>
                    {importResult.results.filter(r => r.success).map(r => (
                      <span key={r.numero_ordem} style={{ marginRight: '0.5rem', color: 'var(--success)' }}>✓ {r.numero_ordem}</span>
                    ))}
                  </div>
                )}
                {importResult.errors && importResult.errors.length > 0 && (
                  <details style={{ marginTop: '0.5rem' }}>
                    <summary style={{ cursor: 'pointer', color: 'var(--danger)' }}>Ver erros ({importResult.errors.length})</summary>
                    <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1rem', fontSize: '0.8rem' }}>
                      {importResult.errors.slice(0, 5).map((e, i) => (
                        <li key={i} style={{ color: 'var(--danger)' }}>{e.file}: {e.error}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={() => setShowFolderModal(false)}>Cancelar</button>
              <button 
                className="btn btn-primary" 
                onClick={() => { console.log('Importar clicked:', { selectedFiles: selectedFiles.length, selectedMonth, importing }); handleImportFromFiles(); }} 
                disabled={importing || selectedFiles.length === 0 || !selectedMonth}
              >
                {importing ? 'Importando...' : 'Importar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}