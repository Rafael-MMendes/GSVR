import { useState, useEffect } from 'react';
import axios from 'axios';
import { Save, CheckCircle, AlertTriangle, Calendar } from 'lucide-react';
import { maskPhone } from '../utils/formatters';

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

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001') + '/api';

const EMPTY_FORM = { numero_ordem: '', name: '', rank: 'Soldado PM', phone: '', motorista: 'Não', availability: {} };

export function VolunteerForm({ userData }) {
  const hasUserData = Boolean(userData && userData.numero_ordem);
  
  const [formData, setFormData] = useState(() => {
    if (userData) {
      return {
        id_ciclo: '',
        numero_ordem: userData.numero_ordem || '',
        name: userData.nome_guerra || '',
        rank: userData.rank || 'Soldado PM',
        phone: userData.phone || '',
        // Normalizar motorista: aceitar 'Sim', true, 1, 'true', '1'
        motorista: (userData.motorista === 'Sim' || userData.motorista === true || userData.motorista === 'true' || userData.motorista === 1 || userData.motorista === '1') ? 'Sim' : 'Não',
        availability: {}
      };
    }
    return { ...EMPTY_FORM, id_ciclo: '' };
  });
  const [ciclos, setCiclos] = useState([]);
  const [selectedCiclo, setSelectedCiclo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Overwrite confirmation state
  const [conflictInfo, setConflictInfo] = useState(null); // { id, name, rank }
  const [showConflictModal, setShowConflictModal] = useState(false);

  const daysInMonth = Array.from({ length: 31 }, (_, i) => i + 1);

  useEffect(() => {
    const fetchCiclos = async () => {
      try {
        const res = await axios.get(`${API_URL}/ciclos`);
        const abertos = res.data.filter(c => c.status === 'Aberto');
        setCiclos(abertos);
        if (abertos.length > 0) {
          setFormData(prev => ({ ...prev, id_ciclo: abertos[0].id_ciclo }));
          setSelectedCiclo(abertos[0]);
        }
      } catch (err) {
        console.error('Erro ao carregar ciclos:', err);
      }
    };
    fetchCiclos();
  }, []);

  const handleCicloChange = (id) => {
    const ciclo = ciclos.find(c => c.id_ciclo === parseInt(id));
    setSelectedCiclo(ciclo);
    setFormData(prev => ({ ...prev, id_ciclo: id }));
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

  const validate = () => {
    if (!formData.numero_ordem.trim() || !formData.name.trim() || !formData.phone.trim() || !formData.id_ciclo) {
      alert('Por favor, preencha todos os campos e selecione o ciclo.');
      return false;
    }
    if (Object.keys(formData.availability).length === 0) {
      alert('Selecione pelo menos um horário na grade.');
      return false;
    }
    return true;
  };

  const doSave = async (overwriteId = null) => {
    setLoading(true);
    setErrorMsg('');
    try {
      if (overwriteId) {
        await axios.put(`${API_URL}/volunteers/${overwriteId}`, formData);
      } else {
        await axios.post(`${API_URL}/volunteers`, formData);
      }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
      setFormData({ ...EMPTY_FORM });
      setShowConflictModal(false);
      setConflictInfo(null);
    } catch (error) {
      console.error(error);
      setErrorMsg('Erro ao salvar dados. Verifique se o servidor backend está em execução.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      // Check if numero_ordem already exists
      const check = await axios.get(`${API_URL}/volunteers/check/${formData.numero_ordem.trim()}`);
      if (check.data.exists) {
        setConflictInfo(check.data);
        setShowConflictModal(true);
        setLoading(false);
        return;
      }
      await doSave(null);
    } catch (error) {
      console.error(error);
      setErrorMsg('Erro ao verificar dados. Verifique se o servidor backend está em execução.');
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '100%' }}>

      {/* MODAL DE CONFLITO */}
      {showConflictModal && conflictInfo && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{
            background: 'white', borderRadius: '16px', padding: '2rem',
            maxWidth: '480px', width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <AlertTriangle size={32} color="#f59e0b" />
              <h3 style={{ margin: 0, color: '#1e293b' }}>Inscrição Já Existente</h3>
            </div>
            <p style={{ color: '#475569', marginBottom: '1.5rem', lineHeight: 1.6 }}>
              Já existe uma inscrição para o <strong>Nº de Ordem {formData.numero_ordem}</strong> em nome de{' '}
              <strong>{conflictInfo.rank} {conflictInfo.name}</strong>.
              <br /><br />
              Deseja <strong>substituir</strong> a inscrição existente pelos novos dados?
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-outline"
                onClick={() => { setShowConflictModal(false); setConflictInfo(null); setLoading(false); }}
              >
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                style={{ background: '#f59e0b', boxShadow: 'none' }}
                onClick={() => doSave(conflictInfo.id)}
                disabled={loading}
              >
                {loading ? 'Substituindo...' : 'Sim, Substituir'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="glass-panel" style={{ maxWidth: '1400px', margin: '0 auto', overflowX: 'auto' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '0.5rem' }}>Requerimento FT - Força Tarefa</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9rem', textAlign: 'center' }}>
          Preencha seus dados institucionais e marque um "X" nos dias/horários disponíveis.
        </p>

        {success && (
          <div style={{ background: 'var(--success)', color: 'white', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle size={20} />
            Requerimento computado com sucesso!
          </div>
        )}

        {errorMsg && (
          <div style={{ background: 'var(--danger)', color: 'white', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
            {errorMsg}
          </div>
        )}

        <div className="responsive-ciclo-selector" style={{ 
            background: 'rgba(13, 56, 120, 0.05)', 
            padding: '1.25rem', 
            borderRadius: '12px', 
            marginBottom: '1.5rem', 
            border: '1px solid rgba(13, 56, 120, 0.1)',
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem'
        }}>
            <div style={{ flex: '1 1 300px' }}>
                <h4 style={{ margin: 0, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={18} /> Ciclo de Escala
                </h4>
                <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.85rem' }}>
                    {selectedCiclo 
                        ? `Vigência: ${formatDateDisplay(selectedCiclo.data_inicio)} até ${formatDateDisplay(selectedCiclo.data_fim)}`
                        : 'Selecione um período aberto para inscrição'}
                </p>
            </div>
            <select 
                className="form-control" 
                style={{ width: '100%', maxWidth: '300px', margin: 0 }}
                value={formData.id_ciclo}
                onChange={e => handleCicloChange(e.target.value)}
            >
                {ciclos.map(c => (
                    <option key={c.id_ciclo} value={c.id_ciclo}>{c.referencia_mes_ano} ({c.opm_sigla})</option>
                ))}
                {ciclos.length === 0 && <option value="">Nenhum ciclo aberto</option>}
            </select>
        </div>

        <form onSubmit={handleSubmit}>
          {/* CAMPOS DE IDENTIFICAÇÃO */}
          <div className="form-grid-stack" style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '1rem', 
              marginBottom: '2rem' 
          }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Nº de Ordem</label>
              <input
                type="text"
                className="form-control"
                placeholder="Ex: 12345"
                value={formData.numero_ordem}
                onChange={e => setFormData({ ...formData, numero_ordem: e.target.value })}
                disabled={hasUserData}
                style={hasUserData ? { backgroundColor: '#e9ecef', cursor: 'not-allowed' } : {}}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Posto / Graduação</label>
              <select
                className="form-control"
                value={formData.rank}
                onChange={e => setFormData({ ...formData, rank: e.target.value })}
                disabled={hasUserData}
                style={hasUserData ? { backgroundColor: '#e9ecef', cursor: 'not-allowed' } : {}}
              >
                {ranks.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Nome Completo / Guerra</label>
              <input
                type="text"
                className="form-control"
                placeholder="Ex: SD PM João Silva"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                disabled={hasUserData}
                style={hasUserData ? { backgroundColor: '#e9ecef', cursor: 'not-allowed' } : {}}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Telefone / WhatsApp</label>
              <input
                type="text"
                className="form-control"
                placeholder="(82) 99999-9999"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: maskPhone(e.target.value) })}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Motorista?</label>
              <select
                className="form-control"
                value={formData.motorista}
                onChange={e => setFormData({ ...formData, motorista: e.target.value })}
                style={{ borderLeft: `4px solid ${formData.motorista === 'Sim' ? 'var(--success)' : 'var(--border-color)'}` }}
              >
                <option value="Não">Não</option>
                <option value="Sim">Sim</option>
              </select>
            </div>
          </div>

          {/* MATRIZ DE HORÁRIOS */}
          <div style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.8rem' }}>
            <span style={{ animation: 'bounceX 2s infinite' }}>← Deslize para ver todos os dias →</span>
          </div>
          <div className="responsive-table-container" style={{ marginBottom: '2rem', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '850px', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'var(--primary)', color: 'white' }}>
                  <th style={{ padding: '1rem', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'left', minWidth: '160px', position: 'sticky', left: 0, zIndex: 10, background: 'var(--primary)' }}>
                    TURNO / DATA
                  </th>
                  {daysInMonth.map(day => (
                    <th key={day} style={{ padding: '0.5rem 0', width: '32px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
                      {String(day).padStart(2, '0')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SHIFTS.map((shift, sIdx) => (
                  <tr key={shift} style={{ background: sIdx % 2 === 0 ? 'var(--card-bg)' : 'rgba(0,0,0,0.01)' }}>
                    <td style={{ 
                        padding: '1rem', 
                        fontWeight: 600, 
                        borderRight: '1px solid var(--border-color)', 
                        borderTop: '1px solid var(--border-color)', 
                        color: 'var(--text-muted)', 
                        whiteSpace: 'nowrap',
                        position: 'sticky',
                        left: 0,
                        zIndex: 10,
                        background: sIdx % 2 === 0 ? 'var(--card-bg)' : '#f9fafb'
                    }}>
                      {shift}
                    </td>
                    {daysInMonth.map(day => {
                      const isSelected = (formData.availability[String(day)] || []).includes(shift);
                      return (
                        <td
                          key={day}
                          onClick={() => toggleShift(day, shift)}
                          style={{
                            borderRight: '1px solid var(--border-color)',
                            borderTop: '1px solid var(--border-color)',
                            textAlign: 'center',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            fontWeight: isSelected ? 'bold' : 'normal',
                            color: isSelected ? 'white' : '#e2e8f0',
                            backgroundColor: isSelected ? 'var(--primary)' : 'transparent',
                            userSelect: 'none',
                            transition: 'all 0.1s ease',
                            width: '44px',
                            height: '44px' // Improved touch target
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

          <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary btn-mobile-full" disabled={loading}>
              <Save size={18} />
              {loading ? 'Verificando...' : 'Confirmar Requerimento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
