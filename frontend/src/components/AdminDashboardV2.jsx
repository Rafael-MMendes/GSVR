import { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import { Download, Printer, UserCircle, AlertTriangle, Plus, Trash2, Search, MousePointer2, X, Check, Users, GripVertical, Calendar, Clock, ChevronRight, Shield } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001') + '/api';

const ROLES = ['Comandante', 'Motorista', 'Patrulheiro'];
const SHIFTS = ['07:00 ÀS 13:00', '13:00 ÀS 19:00', '19:00 ÀS 01:00', '01:00 ÀS 07:00'];
const MAX_MEMBERS = 3;

const normalizePatrolName = (name) => {
  const value = String(name || '').trim();
  if (!value) return 'FORÇA TAREFA';
  if (/^força tarefa$/i.test(value)) return 'FORÇA TAREFA';
  if (/^guarni[cç]ão\s*\d+$/i.test(value) || /^guarnicao\s*\d+$/i.test(value)) return 'FORÇA TAREFA';
  return value;
};

const getTimeOptions = (durationStr) => {
  const hours = parseInt(durationStr);
  const options = [];
  for (let i = 0; i < 24; i++) {
    const start = String(i).padStart(2, '0') + ':00';
    const end = String((i + hours) % 24).padStart(2, '0') + ':00';
    options.push(`${start} às ${end}`);
  }
  return options;
};

export function AdminDashboardV2() {
  const [volunteers, setVolunteers] = useState([]);
  const [months, setMonths] = useState([]);
  const [selectedCycleId, setSelectedCycleId] = useState('');
  const [selectedDate, setSelectedDate] = useState(String(new Date().getDate()));
  const [selectedShift, setSelectedShift] = useState('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSlot, setActiveSlot] = useState(null);
  const [selectionMode, setSelectionMode] = useState(null);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [loadingVolunteers, setLoadingVolunteers] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savingPatrolId, setSavingPatrolId] = useState(null);
  const [newPatrolDuration, setNewPatrolDuration] = useState('6h');
  const [newPatrolShift, setNewPatrolShift] = useState('Diurno (07:00 - 13:00)');

  const [state, setState] = useState({
    pool: [],
    patrols: []
  });

  const printRef = useRef();
  const volunteersRef = useRef([]);

  useEffect(() => {
    const init = async () => {
      try {
        const monthsRes = await axios.get(`${API_URL}/ciclos`);
        setMonths(monthsRes.data);
        const activeCycle = monthsRes.data.find(c => c.status === 'Aberto');
        if (activeCycle) {
          setSelectedCycleId(activeCycle.id_ciclo);
        } else if (monthsRes.data.length > 0) {
          setSelectedCycleId(monthsRes.data[0].id_ciclo);
        }
      } catch (e) {
        console.error('[Init] Erro ao carregar ciclos:', e);
      }
    };
    init();
  }, []);

  const loadScheduleData = (volunteersData, schedulesData, monthKey, dateVal) => {
    if (!volunteersData) return;
    const selectedDateNum = parseInt(dateVal);
    const dayKey1 = String(selectedDateNum);
    const dayKey2 = String(selectedDateNum).padStart(2, '0');

    const processedVolunteers = volunteersData.map(v => {
      const availabilityForDay =
        (v.availability && v.availability[dayKey1]) ||
        (v.availability && v.availability[dayKey2]) ||
        (v.availability && v.availability[selectedDateNum]);
      return { ...v, isAvailableToday: !!availabilityForDay, todayShifts: availabilityForDay || [] };
    });

    let patrols = [];
    if (Array.isArray(schedulesData) && schedulesData.length > 0 && schedulesData[0].patrols) {
      patrols = schedulesData[0].patrols;
    } else if (schedulesData && schedulesData.patrols) {
      patrols = schedulesData.patrols;
    } else {
      patrols = [];
    }

    patrols = patrols.map(p => ({ ...p, name: normalizePatrolName(p.name) }));

    const assignedIds = new Set();
    patrols.forEach(patrol => {
      if (patrol.members && Array.isArray(patrol.members)) {
        patrol.members.forEach(m => {
          if (m && m.id) assignedIds.add(String(m.id));
          if (m && m.id_militar) assignedIds.add(`m${m.id_militar}`);
        });
      }
    });

    const pool = processedVolunteers.filter(p => !assignedIds.has(String(p.id)) && !(p.id_militar && assignedIds.has(`m${p.id_militar}`)))
      .sort((a, b) => {
        if (a.isAvailableToday && !b.isAvailableToday) return -1;
        if (!a.isAvailableToday && b.isAvailableToday) return 1;
        return 0;
      });

    setState({ pool, patrols });
  };

  useEffect(() => {
    if (!selectedCycleId) return;
    const loadVolunteers = async () => {
      try {
        setLoadingVolunteers(true);
        const volRes = await axios.get(`${API_URL}/volunteers?id_ciclo=${selectedCycleId}`);
        volunteersRef.current = volRes.data;
        setVolunteers(volRes.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingVolunteers(false);
      }
    };
    loadVolunteers();
  }, [selectedCycleId]);

  const loadSchedule = async () => {
    if (!selectedCycleId || volunteersRef.current.length === 0) return;
    try {
      const schedRes = await axios.get(`${API_URL}/schedules?date=${selectedDate}&id_ciclo=${selectedCycleId}`);
      loadScheduleData(volunteersRef.current, schedRes.data, selectedCycleId, selectedDate);
    } catch (e) {
      loadScheduleData(volunteersRef.current, [], selectedCycleId, selectedDate);
    }
  };

  useEffect(() => {
    loadSchedule();
  }, [selectedDate, volunteers, selectedCycleId]);

  const saveSchedule = async (overridePatrols = null) => {
    try {
      // Defesa: se for chamado por um evento de clique, overridePatrols será o objeto de evento.
      // Nesse caso, ignoramos e usamos o state.patrols.
      const patrolsToSave = Array.isArray(overridePatrols) ? overridePatrols : state.patrols;

      if (!patrolsToSave || patrolsToSave.length === 0) return;

      await axios.post(`${API_URL}/schedules`, {
        date: selectedDate,
        id_ciclo: selectedCycleId,
        patrols: patrolsToSave
      });

      // Recarregar do banco após o salvamento para garantir sincronia total
      await loadSchedule();
    } catch (error) {
      console.error('Erro ao salvar escala:', error);
      alert('Erro ao sincronizar com o banco: ' + (error.response?.data?.error || error.message));
    }
  };

  const saveConfig = saveSchedule; // compatibilidade com possíveis referências antigas

  const filteredPool = useMemo(() => {
    return state.pool.filter(p => {
      // Regra: Exibir apenas militares com até 7 serviços (limite de 8 atingido oculta do pool)
      if (p.service_count >= 8) return false;

      const matchesSearch = (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.numero_ordem && String(p.numero_ordem).includes(searchTerm));
      if (searchTerm.length > 1) return matchesSearch;
      if (selectedShift === 'Todos') return matchesSearch;
      if (!p.isAvailableToday) return false;
      return matchesSearch && p.todayShifts.some(s => {
        if (!s) return false;
        const dbShift = String(s).toUpperCase();
        const selShift = selectedShift.toUpperCase();
        return dbShift.includes(selShift.split(' ')[0]) ||
          (selShift.includes('07') && dbShift.includes('07:00')) ||
          (selShift.includes('13') && dbShift.includes('13:00')) ||
          (selShift.includes('19') && dbShift.includes('19:00')) ||
          (selShift.includes('01') && dbShift.includes('01:00'));
      });
    });
  }, [state.pool, searchTerm, selectedShift, selectedDate]);

  const assignToActiveSlot = (person) => {
    if (!activeSlot) return;
    setState(prev => {
      const newState = {
        pool: prev.pool.filter(p => p.id !== person.id),
        patrols: prev.patrols.map(p => {
          if (p.id === activeSlot.patrolId) {
            const newMembers = [...p.members];
            if (newMembers[activeSlot.roleIndex]) prev.pool.push(newMembers[activeSlot.roleIndex]);
            newMembers[activeSlot.roleIndex] = person;
            return { ...p, members: newMembers };
          }
          return p;
        })
      };
      return newState;
    });
    setActiveSlot(null);
  };

  const removeFromSlot = (patrolId, roleIndex) => {
    setState(prev => {
      const newPatrols = prev.patrols.map(p => {
        if (p.id === patrolId) {
          const newMembers = [...p.members];
          newMembers[roleIndex] = null;
          return { ...p, members: newMembers };
        }
        return p;
      });
      const removedPerson = prev.patrols.find(p => p.id === patrolId)?.members[roleIndex];
      return { pool: removedPerson ? [...prev.pool, removedPerson] : prev.pool, patrols: newPatrols };
    });
  };

  const openSelectionModal = (patrolId) => { setSelectionMode({ patrolId, selectedMembers: [] }); setSelectedMembers([]); };
  const closeSelectionModal = () => { setSelectionMode(null); setSelectedMembers([]); };

  const toggleMemberSelection = (member) => {
    const isSelected = selectedMembers.some(m => m.id === member.id);
    const limit = selectionMode?.slotIndex !== undefined ? 1 : MAX_MEMBERS;

    if (isSelected) {
      setSelectedMembers(prev => prev.filter(m => m.id !== member.id));
    } else if (selectedMembers.length < limit) {
      if (limit === 1) setSelectedMembers([member]);
      else setSelectedMembers(prev => [...prev, member]);
    }
  };

  const confirmSelection = async () => {
    if (!selectionMode) return;
    const { patrolId, slotIndex } = selectionMode;

    setState(prev => {
      let newPatrols = [...prev.patrols];

      if (slotIndex !== undefined) {
        // MODO SUBSTITUIÇÃO DE SLOT ÚNICO
        newPatrols = newPatrols.map(p => {
          if (p.id === patrolId) {
            const newMembers = [...p.members];
            if (selectedMembers.length > 0) newMembers[slotIndex] = selectedMembers[0];
            return { ...p, members: newMembers };
          }
          return p;
        });
      } else {
        // MODO CRIAÇÃO/EDIÇÃO DE GUARNÇÃO COMPLETA
        const newMembers = [null, null, null];
        selectedMembers.forEach((m, idx) => { if (idx < 3) newMembers[idx] = m; });

        if (patrolId === 'NEW') {
          newPatrols.push({
            id: `p${Date.now()}`,
            name: 'FORÇA TAREFA',
            duration: newPatrolDuration,
            timeSpan: newPatrolShift,
            members: newMembers
          });
        } else {
          newPatrols = newPatrols.map(p => {
            if (p.id === patrolId) return { ...p, members: newMembers };
            return p;
          });
        }
      }

      return { ...prev, patrols: newPatrols };
    });

    closeSelectionModal();
  };

  const moveMember = (patrolId, fromIndex, toIndex) => {
    if (fromIndex === toIndex) return;
    setState(prev => ({
      ...prev,
      patrols: prev.patrols.map(p => {
        if (p.id === patrolId) {
          const newMembers = [...p.members];
          [newMembers[fromIndex], newMembers[toIndex]] = [newMembers[toIndex], newMembers[fromIndex]];
          return { ...p, members: newMembers };
        }
        return p;
      })
    }));
  };

  const handleDragStart = (e, personId, sourceId) => {
    e.dataTransfer.setData('personId', personId);
    e.dataTransfer.setData('sourceId', sourceId);
  };
  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = (e, targetId) => {
    const personId = e.dataTransfer.getData('personId');
    const sourceId = e.dataTransfer.getData('sourceId');
    if (sourceId === targetId) return;

    setState(prev => {
      const newState = { pool: [...prev.pool], patrols: prev.patrols.map(p => ({ ...p, members: [...p.members] })) };
      let person;

      if (sourceId === 'pool') {
        const idx = newState.pool.findIndex(p => String(p.id) === String(personId));
        if (idx > -1) person = newState.pool.splice(idx, 1)[0];
      } else {
        const pIdx = newState.patrols.findIndex(p => p.id === sourceId);
        if (pIdx > -1) {
          const mIdx = newState.patrols[pIdx].members.findIndex(m => String(m.id) === String(personId));
          if (mIdx > -1) person = newState.patrols[pIdx].members.splice(mIdx, 1)[0];
        }
      }

      if (!person) return prev;

      if (targetId === 'pool') newState.pool.push(person);
      else {
        const ptIdx = newState.patrols.findIndex(p => p.id === targetId);
        if (newState.patrols[ptIdx].members.length >= 3) {
          alert("Guarnição cheia (Máximo 3 componentes).");
          if (sourceId === 'pool') newState.pool.push(person);
          else newState.patrols.find(p => p.id === sourceId).members.push(person);
          return newState;
        }
        newState.patrols[ptIdx].members.push(person);
      }
      return newState;
    });
  };

  const handlePatrolSettingChange = (patrolId, field, value) => {
    setState(prev => ({ ...prev, patrols: prev.patrols.map(p => p.id === patrolId ? { ...p, [field]: value } : p) }));
  };
  const handleDurationChange = (patrolId, duration) => {
    setState(prev => ({ ...prev, patrols: prev.patrols.map(p => p.id === patrolId ? { ...p, duration, timeSpan: '' } : p) }));
  };
  const addPatrol = () => {
    setSelectionMode({ patrolId: 'NEW', selectedMembers: [] });
    setSelectedMembers([]);
  };
  const removePatrol = async (patrolId) => {
    const patrolToRemove = state.patrols.find(p => p.id === patrolId);
    if (!patrolToRemove) return;

    const patrolName = patrolToRemove.name || patrolId;

    if (!window.confirm(`Deseja realmente excluir a guarnição "${patrolName}"? Esta ação removerá os registros planejados do banco de dados.`)) return;

    try {
      // Chama API para exclusão física no banco
      await axios.delete(`${API_URL}/schedules/patrol`, {
        params: {
          nome_recurso: patrolName,
          data_servico: selectedDate,
          id_ciclo: selectedCycleId
        }
      });

      setState(prev => {
        const pRem = prev.patrols.find(p => p.id === patrolId);
        if (!pRem) return prev;
        const membersToReturn = (pRem.members || []).filter(Boolean);
        return {
          ...prev,
          pool: [...prev.pool, ...membersToReturn],
          patrols: prev.patrols.filter(p => p.id !== patrolId)
        };
      });

      // Feedback opcional ou apenas sucesso silencioso na UI
    } catch (error) {
      console.error('Erro ao excluir guarnição:', error);
      const errorData = error.response?.data;
      const msg = (typeof errorData === 'object' ? errorData.error : null) || error.response?.statusText || error.message;
      alert(`Erro ao excluir guarnição: ${msg}`);
    }
  };

  const handleRoleChange = (patrolId, sourceIdx, targetIdx) => {
    if (sourceIdx === targetIdx) return;

    setState(prev => {
      const pIdx = prev.patrols.findIndex(p => p.id === patrolId);
      if (pIdx === -1) return prev;

      const updatedPatrols = [...prev.patrols];
      const newMembers = [...updatedPatrols[pIdx].members];

      // Swap logic: Se o destino estiver ocupado, as funções são trocadas entre os dois militares
      const temp = newMembers[targetIdx];
      newMembers[targetIdx] = newMembers[sourceIdx];
      newMembers[sourceIdx] = temp;

      updatedPatrols[pIdx] = { ...updatedPatrols[pIdx], members: newMembers };
      return { ...prev, patrols: updatedPatrols };
    });
  };

  const generatePDF = async () => {
    // Mesma lógica de PDF da versão 1
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageW = pdf.internal.pageSize.getWidth();
    const margin = 10;
    const headerH = 28;
    pdf.setFillColor(13, 56, 120); pdf.rect(0, 0, pageW, headerH, 'F');
    pdf.setFillColor(0, 156, 59); pdf.rect(0, headerH, pageW, 1.5, 'F');
    pdf.setFillColor(255, 223, 0); pdf.rect(0, headerH + 1.5, pageW, 1.5, 'F');

    const toBase64 = async (url) => {
      try {
        const resp = await fetch(url);
        const blob = await resp.blob();
        return await new Promise((res, rej) => {
          const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob);
        });
      } catch { return null; }
    };
    const [b64Municipio, b64Bpm] = await Promise.all([toBase64('/brasao_municipio.png'), toBase64('/brasao_9bpm.png')]);
    const logoSize = 22; const logoY = (headerH - logoSize) / 2;
    if (b64Municipio) pdf.addImage(b64Municipio, 'PNG', margin, logoY, logoSize, logoSize);
    if (b64Bpm) pdf.addImage(b64Bpm, 'PNG', pageW - margin - logoSize, logoY, logoSize, logoSize);

    pdf.setTextColor(255, 255, 255); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(13);
    pdf.text('POLÍCIA MILITAR DE ALAGOAS', pageW / 2, 9, { align: 'center' });
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9.5);
    pdf.text('9º Batalhão de Polícia Militar — Batalhão de Divisas', pageW / 2, 15, { align: 'center' });
    pdf.setFont('helvetica', 'italic'); pdf.setFontSize(8.5); pdf.setTextColor(200, 220, 255);
    pdf.text(`Escala Operacional da Força Tarefa (Dia ${selectedDate})`, pageW / 2, 21, { align: 'center' });

    const source = printRef.current;
    const clone = source.cloneNode(true);
    clone.style.position = 'fixed'; clone.style.top = '-9999px'; clone.style.left = '0';
    clone.style.width = source.offsetWidth + 'px'; clone.style.background = 'white';
    clone.style.padding = '1rem'; clone.style.zIndex = '-1';

    // Preparar clone (Ocultar elementos desnecessários na impressão)
    Array.from(clone.querySelectorAll('.no-print, .v2-header')).forEach(el => el.style.display = 'none');

    document.body.appendChild(clone);
    try {
      const canvas = await html2canvas(clone, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const topOffset = headerH + 3 + 1.5;
      const availH = pdf.internal.pageSize.getHeight() - topOffset - margin;
      const imgW = pageW - margin * 2;
      const imgH = (canvas.height * imgW) / canvas.width;
      pdf.addImage(imgData, 'PNG', margin, topOffset + 2, imgW, Math.min(imgH, availH));
      pdf.save(`Escala_9BPM_Dia_${selectedDate}.pdf`);
    } finally {
      document.body.removeChild(clone);
    }
  };

  // --- DESIGN SYSTEM TOKENS ---
  const colors = {
    primary: '#0D3878',
    primaryLight: '#1e40af',
    secondary: '#009C3B',
    accent: '#cbd5e1',
    bg: '#f8fafc',
    text: '#1e293b',
    textMuted: '#64748b',
    danger: '#ef4444',
    warning: '#f59e0b',
    white: '#ffffff',
    glass: 'rgba(255, 255, 255, 0.85)',
    border: '#e2e8f0',
    primaryGradient: 'linear-gradient(135deg, #0D3878 0%, #1e40af 100%)'
  };

  const transitions = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
  const shadowSm = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
  const shadowMd = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
  const shadowLg = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';

  return (
    <div className="v2-dashboard-container" style={{
      fontFamily: "'Outfit', 'Inter', sans-serif",
      background: '#f1f5f9',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'row',
      overflow: 'hidden'
    }}>
      {/* MODERN SIDEBAR */}
      <div className="v2-sidebar no-print" style={{
        width: '320px',
        background: colors.white,
        borderRight: `1px solid ${colors.border}`,
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'sticky',
        top: 0,
        flexShrink: 0,
        zIndex: 100,
        boxShadow: '4px 0 24px rgba(0,0,0,0.02)'
      }}>
        {/* Sidebar Header / Branding */}
        <div style={{
          padding: '2rem',
          borderBottom: `1px solid ${colors.border}`,
          background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{
              background: 'linear-gradient(135deg, #0D3878 0%, #1e40af 100%)',
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              boxShadow: '0 8px 16px rgba(13, 56, 120, 0.25)'
            }}>
              <Calendar size={22} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.25rem', color: colors.primary, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                GSVR Admin
              </h1>
              <p style={{ margin: 0, fontSize: '0.75rem', color: colors.textMuted, fontWeight: 600 }}>Planejamento Pro v2</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{
              padding: '0.75rem 1rem',
              borderRadius: '12px',
              background: '#f0f9ff',
              color: colors.primary,
              border: '1px solid #bae6fd',
              fontWeight: 700,
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}>
              <Clock size={16} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.65rem', opacity: 0.7, textTransform: 'uppercase' }}>Ciclo Ativo</div>
                {months.find(m => m.id_ciclo === selectedCycleId)?.period_name || '---'}
              </div>
            </div>

            <div style={{
              padding: '0.75rem 1rem',
              borderRadius: '12px',
              background: '#f8fafc',
              color: '#4f46e5',
              border: '1px solid #e2e8f0',
              fontWeight: 700,
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}>
              <Users size={16} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.65rem', opacity: 0.7, textTransform: 'uppercase' }}>Militares</div>
                Disponíveis: {filteredPool.length}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Navigation / Filters */}
        <div style={{ padding: '0.5rem 2rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <label style={{ fontSize: '0.7rem', fontWeight: 800, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Configurações de Visualização</label>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <select
                style={{
                  width: '100%',
                  padding: '0.85rem 1rem',
                  borderRadius: '12px',
                  border: `1px solid ${colors.border}`,
                  background: colors.white,
                  color: colors.text,
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  outline: 'none',
                  boxShadow: shadowSm
                }}
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
              >
                {/* Options logic stays the same */}
                {(() => {
                  const currentCycle = months.find(m => m.id_ciclo === selectedCycleId);
                  if (!currentCycle) return null;
                  const startBy = new Date(currentCycle.data_inicio);
                  const endBy = new Date(currentCycle.data_fim);
                  const daysBy = [];
                  let currBy = new Date(startBy);
                  while (currBy <= endBy) {
                    daysBy.push(new Date(currBy));
                    currBy.setDate(currBy.getDate() + 1);
                  }
                  return daysBy.map(date => {
                    const d = date.getDate();
                    const month = date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
                    const monthCap = month.charAt(0).toUpperCase() + month.slice(1);
                    const wday = date.toLocaleDateString('pt-BR', { weekday: 'short' });
                    const wdayCap = ' (' + wday.charAt(0).toUpperCase() + wday.slice(1) + ')';
                    return <option key={date.getTime()} value={d}>Dia {String(d).padStart(2, '0')}/{monthCap}{wdayCap}</option>
                  });
                })()}
              </select>

              <select
                style={{
                  width: '100%',
                  padding: '0.85rem 1rem',
                  borderRadius: '12px',
                  border: `1px solid ${colors.border}`,
                  background: colors.white,
                  color: colors.text,
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  outline: 'none',
                  boxShadow: shadowSm
                }}
                value={selectedShift}
                onChange={e => setSelectedShift(e.target.value)}
              >
                <option value="Todos">Turno: Todos</option>
                {SHIFTS.map(s => <option key={s} value={s}>{s.split(' ')[0]}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <label style={{ fontSize: '0.7rem', fontWeight: 800, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ações de Escala</label>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button
                onClick={addPatrol}
                style={{
                  width: '100%',
                  padding: '1rem',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '14px',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  transition: transitions,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.75rem',
                  boxShadow: '0 8px 16px rgba(16, 185, 129, 0.2)'
                }}
                onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <Plus size={20} strokeWidth={3} />
                Nova Guarnição
              </button>

              <button
                onClick={() => saveSchedule()}
                style={{
                  width: '100%',
                  padding: '1rem',
                  background: 'linear-gradient(135deg, #0D3878 0%, #1e40af 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '14px',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  transition: transitions,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.75rem',
                  boxShadow: '0 10px 20px rgba(13, 56, 120, 0.2)'
                }}
                onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <Check size={20} strokeWidth={3} />
                Salvar Escala
              </button>

              <button
                onClick={generatePDF}
                style={{
                  width: '100%',
                  padding: '0.85rem',
                  background: '#f1f5f9',
                  color: '#64748b',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: transitions,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.75rem',
                  marginTop: '0.5rem'
                }}
                onMouseOver={e => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.color = '#334155'; }}
                onMouseOut={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#64748b'; }}
              >
                <Printer size={18} />
                <span>Imprimir Escala</span>
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* MAIN CONTENT AREA */}
      <div className="v2-main-content" style={{ flex: 1, padding: '2rem', overflowY: 'auto', height: '100vh' }}>
        <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: colors.primary }}>
              Escala de Serviço
            </h2>
            <p style={{ margin: 0, color: colors.textMuted, fontSize: '0.9rem' }}>
              Gerencie as guarnições para o dia selecionado
            </p>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            {/* Additional stats or info could go here */}
          </div>
        </div>

        <div style={{ flex: 1, padding: '0.5rem' }} ref={printRef}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '1.5rem',
            paddingBottom: '4rem'
          }}>
            {state.patrols.map(patrol => (
              <div
                key={patrol.id}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, patrol.id)}
                style={{
                  background: colors.white,
                  borderRadius: '20px',
                  border: `1px solid ${colors.border}`,
                  boxShadow: shadowMd,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                  animation: 'fadeIn 0.5s ease-out'
                }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'; e.currentTarget.style.transform = 'translateY(-5px)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = shadowMd; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                {/* Card Header (Patrol) */}
                <div style={{
                  background: colors.primaryGradient,
                  padding: '0.75rem 1.25rem',
                  color: 'white',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  {savingPatrolId === patrol.id && (
                    <div style={{
                      position: 'absolute',
                      top: 0, left: 0, right: 0, bottom: 0,
                      background: 'rgba(255,255,255,0.2)',
                      backdropFilter: 'blur(2px)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 20
                    }}>
                      <MousePointer2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 1 }}>
                      <Shield size={18} style={{ opacity: 0.8 }} />
                      <input
                        type="text"
                        value={normalizePatrolName(patrol.name)}
                        onChange={e => handlePatrolSettingChange(patrol.id, 'name', normalizePatrolName(e.target.value))}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          fontSize: '1rem',
                          fontWeight: 800,
                          color: 'white',
                          width: '100%',
                          outline: 'none',
                          letterSpacing: '-0.01em'
                        }}
                        placeholder="Nome da Guarnição"
                      />
                    </div>
                    <button
                      onClick={() => removePatrol(patrol.id)}
                      className="no-print"
                      style={{
                        background: 'rgba(255, 255, 255, 0.12)',
                        backdropFilter: 'blur(8px)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        color: 'white',
                        cursor: 'pointer',
                        borderRadius: '12px',
                        padding: '8px',
                        display: 'flex',
                        transition: transitions,
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                      }}
                      onMouseOver={e => { e.currentTarget.style.background = colors.danger; e.currentTarget.style.borderColor = colors.danger; }}
                      onMouseOut={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'; e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'; }}
                      title="Remover Guarnição"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {/* Status Pills inside header */}
                  <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.6rem' }}>
                    <div style={{
                      fontSize: '0.6rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      background: 'rgba(255,255,255,0.15)',
                      padding: '2px 8px',
                      borderRadius: '20px',
                      backdropFilter: 'blur(4px)'
                    }}>
                      {patrol.duration}
                    </div>
                    {patrol.timeSpan && (
                      <div style={{
                        fontSize: '0.6rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        background: 'rgba(255,255,255,0.15)',
                        padding: '2px 8px',
                        borderRadius: '20px',
                        backdropFilter: 'blur(4px)'
                      }}>
                        {patrol.timeSpan}
                      </div>
                    )}
                  </div>
                </div>



                {/* Slots Container */}
                <div style={{
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  flex: 1,
                  background: 'linear-gradient(180deg, #ffffff 0%, #f9fafb 100%)'
                }}>
                  {Array.from({ length: 3 }).map((_, index) => {
                    const m = patrol.members[index];
                    const roleName = ROLES[index];
                    const isActiveSlot = activeSlot?.patrolId === patrol.id && activeSlot?.roleIndex === index;

                    if (m) {
                      return (
                        <div
                          key={m.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, m.id, patrol.id)}
                          style={{
                            background: colors.white,
                            border: `1px solid ${colors.border}`,
                            borderRadius: '12px',
                            padding: '0.65rem 0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            position: 'relative',
                            cursor: 'grab',
                            boxShadow: shadowSm,
                            transition: transitions
                          }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = colors.primary; e.currentTarget.style.boxShadow = shadowMd; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = colors.border; e.currentTarget.style.boxShadow = shadowSm; }}
                        >
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '10px',
                            background: '#f0f9ff',
                            color: colors.primary,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <GripVertical size={16} style={{ opacity: 0.5 }} />
                          </div>

                          <div style={{ flex: 1 }}>
                            <div style={{ marginBottom: '2px' }}>
                              <select
                                value={index}
                                onChange={(e) => handleRoleChange(patrol.id, index, parseInt(e.target.value))}
                                disabled={isSaving}
                                style={{
                                  fontSize: '0.6rem',
                                  color: colors.textMuted,
                                  fontWeight: 800,
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.05em',
                                  background: 'transparent',
                                  border: 'none',
                                  outline: 'none',
                                  cursor: isSaving ? 'wait' : 'pointer',
                                  padding: 0,
                                  appearance: 'none',
                                  MozAppearance: 'none',
                                  WebkitAppearance: 'none'
                                }}
                                title="Clique para trocar função"
                              >
                                {ROLES.map((role, rIdx) => (
                                  <option key={rIdx} value={rIdx}>{role}</option>
                                ))}
                              </select>
                            </div>
                            <div style={{ fontWeight: 700, color: colors.text, fontSize: '0.85rem' }}>
                              {m.rank} {m.name}
                            </div>
                          </div>

                          <button
                            onClick={() => setSelectionMode({ patrolId: patrol.id, slotIndex: index })}
                            className="no-print"
                            style={{
                              background: '#f1f5f9',
                              color: colors.primary,
                              border: `1px solid ${colors.border}`,
                              borderRadius: '10px',
                              padding: '8px',
                              cursor: 'pointer',
                              display: 'flex',
                              transition: transitions
                            }}
                            onMouseOver={e => { e.currentTarget.style.background = colors.primary; e.currentTarget.style.color = 'white'; }}
                            onMouseOut={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = colors.primary; }}
                            title="Substituir integrante"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={`empty-${index}`}
                        onClick={() => setActiveSlot({ patrolId: patrol.id, roleIndex: index })}
                        style={{
                          border: isActiveSlot ? `2px solid ${colors.primary}` : `2px dashed ${colors.accent}`,
                          borderRadius: '12px',
                          padding: '0.75rem 1rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          background: isActiveSlot ? '#f0f7ff' : 'transparent',
                          transition: transitions,
                          minHeight: '60px',
                          position: 'relative',
                          overflow: 'hidden'
                        }}
                        onMouseOver={e => { if (!isActiveSlot) { e.currentTarget.style.borderColor = colors.primary; e.currentTarget.style.background = '#f8fafc'; } }}
                        onMouseOut={e => { if (!isActiveSlot) { e.currentTarget.style.borderColor = colors.accent; e.currentTarget.style.background = 'transparent'; } }}
                      >
                        {isActiveSlot && (
                          <div style={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            bottom: 0,
                            width: '3px',
                            background: colors.primary
                          }} />
                        )}
                        <div>
                          <div style={{
                            fontSize: '0.6rem',
                            color: isActiveSlot ? colors.primary : colors.textMuted,
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                          }}>
                            {roleName}
                          </div>
                          <div style={{
                            fontSize: '0.75rem',
                            color: isActiveSlot ? colors.primary : colors.accent,
                            fontWeight: 600,
                            marginTop: '2px'
                          }}>
                            {isActiveSlot ? 'Aguardando seleção...' : 'Vago'}
                          </div>
                        </div>
                        <div style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '8px',
                          background: isActiveSlot ? colors.primary : '#f1f5f9',
                          color: isActiveSlot ? 'white' : colors.accent,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: transitions,
                          boxShadow: isActiveSlot ? '0 4px 10px rgba(13, 56, 120, 0.3)' : 'none'
                        }}>
                          {isActiveSlot ? <MousePointer2 size={14} style={{ animation: 'bounce 1s infinite' }} /> : <Plus size={14} />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MODAL SELECTION (POOL) */}
      {selectionMode && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          animation: 'fadeIn 0.3s ease-out'
        }}>
          <div style={{
            background: colors.white,
            borderRadius: '24px',
            width: '95%',
            maxWidth: '1000px',
            height: '85vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: shadowLg,
            overflow: 'hidden',
            border: `1px solid ${colors.border}`
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '1.5rem 2rem',
              background: 'linear-gradient(135deg, #0D3878 0%, #1e40af 100%)',
              color: 'white',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  background: 'rgba(255,255,255,0.2)',
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Shield size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Banco de Voluntários</h3>
                  <p style={{ margin: 0, opacity: 0.8, fontSize: '0.85rem', fontWeight: 500 }}>
                    Selecione até {MAX_MEMBERS} militares para compor a guarnição
                  </p>
                </div>
              </div>
              <button
                onClick={closeSelectionModal}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  borderRadius: '12px',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: transitions
                }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Search & Filters */}
            <div style={{
              background: '#f8fafc',
              borderBottom: `1px solid ${colors.border}`,
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              padding: '0.5rem 2rem'
            }}>
              {/* Line 1: Search */}
              <div style={{ position: 'relative', width: '100%' }}>
                <Search size={18} color={colors.textMuted} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Buscar por nome, matricula ou Nº ordem..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.85rem 1rem 0.85rem 3rem',
                    borderRadius: '12px',
                    border: `1px solid ${colors.border}`,
                    outline: 'none',
                    fontSize: '1rem',
                    fontWeight: 500,
                    boxShadow: shadowSm,
                    transition: transitions
                  }}
                  onFocus={e => { e.target.style.borderColor = colors.primary; e.target.style.boxShadow = '0 0 0 3px rgba(13, 56, 120, 0.1)'; }}
                  onBlur={e => { e.target.style.borderColor = colors.border; e.target.style.boxShadow = shadowSm; }}
                />
              </div>

              {/* Line 2: All Filters Grouped */}
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase' }}>Filtro de Dia</label>
                  <select
                    style={{
                      padding: '0.75rem 1rem',
                      borderRadius: '10px',
                      border: `1px solid ${colors.border}`,
                      background: colors.white,
                      color: colors.text,
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      outline: 'none',
                      boxShadow: shadowSm,
                      minWidth: '160px'
                    }}
                    value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                  >
                    {(() => {
                      const currentCycle = months.find(m => m.id_ciclo === selectedCycleId);
                      if (!currentCycle) return null;

                      const startDate = new Date(currentCycle.data_inicio);
                      const endDate = new Date(currentCycle.data_fim);
                      const days = [];
                      let curr = new Date(startDate);
                      while (curr <= endDate) {
                        days.push(new Date(curr));
                        curr.setDate(curr.getDate() + 1);
                      }

                      return days.map(date => {
                        const d = date.getDate();
                        const monthName = date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
                        const monthCap = monthName.charAt(0).toUpperCase() + monthName.slice(1);
                        const wday = date.toLocaleDateString('pt-BR', { weekday: 'short' });
                        const wdayCap = ' (' + wday.charAt(0).toUpperCase() + wday.slice(1) + ')';
                        return <option key={date.getTime()} value={d}>Dia {String(d).padStart(2, '0')}/{monthCap}{wdayCap}</option>
                      });
                    })()}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase' }}>Turno</label>
                  <select
                    style={{
                      padding: '0.75rem 1rem',
                      borderRadius: '10px',
                      border: `1px solid ${colors.border}`,
                      background: colors.white,
                      fontWeight: 600,
                      outline: 'none',
                      cursor: 'pointer',
                      minWidth: '150px',
                      fontSize: '0.9rem',
                      boxShadow: shadowSm
                    }}
                    value={selectedShift}
                    onChange={e => setSelectedShift(e.target.value)}
                  >
                    <option value="Todos">Turno: Todos</option>
                    {SHIFTS.map(s => <option key={s} value={s}>{s.split(' ')[0]}</option>)}
                  </select>
                </div>

                {selectionMode && (
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.7rem', fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase' }}>Duração</label>
                      <select
                        style={{
                          padding: '0.6rem 2.5rem 0.6rem 1rem',
                          borderRadius: '12px',
                          border: `1px solid ${colors.border}`,
                          background: colors.white,
                          fontWeight: 700,
                          outline: 'none',
                          cursor: 'pointer',
                          fontSize: '0.9rem',
                          color: colors.primary,
                          boxShadow: shadowSm
                        }}
                        value={selectionMode.patrolId === 'NEW' ? newPatrolDuration : state.patrols.find(p => p.id === selectionMode.patrolId)?.duration}
                        onChange={e => {
                          if (selectionMode.patrolId === 'NEW') setNewPatrolDuration(e.target.value);
                          else handleDurationChange(selectionMode.patrolId, e.target.value);
                        }}
                      >
                        {['6h', '8h'].map(d => <option key={d} value={d}>Duração: {d === '6h' ? '6 Horas' : '8 Horas'}</option>)}
                      </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.7rem', fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase' }}>Horário</label>
                      <select
                        style={{
                          padding: '0.6rem 2.5rem 0.6rem 1rem',
                          borderRadius: '12px',
                          border: `1px solid ${colors.border}`,
                          background: colors.white,
                          fontWeight: 700,
                          outline: 'none',
                          cursor: 'pointer',
                          fontSize: '0.9rem',
                          color: colors.primary,
                          boxShadow: shadowSm
                        }}
                        value={selectionMode.patrolId === 'NEW' ? newPatrolShift : state.patrols.find(p => p.id === selectionMode.patrolId)?.timeSpan}
                        onChange={e => {
                          if (selectionMode.patrolId === 'NEW') setNewPatrolShift(e.target.value);
                          else handlePatrolSettingChange(selectionMode.patrolId, 'timeSpan', e.target.value);
                        }}
                      >
                        <option value="">Selecione Horário...</option>
                        {getTimeOptions(selectionMode.patrolId === 'NEW' ? newPatrolDuration : state.patrols.find(p => p.id === selectionMode.patrolId)?.duration).map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                <div style={{
                  padding: '0.85rem 1.25rem',
                  borderRadius: '12px',
                  background: '#f0fdf4',
                  color: '#166534',
                  border: '1px solid #bbf7d0',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }}></div>
                  {filteredPool.length} Disponíveis
                </div>
              </div>
            </div>

            {/* Modal Pool Grid */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '2rem',
              background: '#f1f5f9',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '1.25rem',
              alignContent: 'start'
            }}>
              {filteredPool.length === 0 ? (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem', color: colors.textMuted }}>
                  <Users size={48} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
                  <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>Nenhum militar encontrado</p>
                  <p style={{ fontSize: '0.9rem' }}>Tente ajustar os filtros ou a busca</p>
                </div>
              ) : (
                filteredPool.map(p => {
                  const isSelected = selectedMembers.some(m => m.id === p.id);
                  const selectionLimit = selectionMode?.slotIndex !== undefined ? 1 : MAX_MEMBERS;
                  const isDisabled = !isSelected && selectedMembers.length >= selectionLimit;
                  return (
                    <div
                      key={p.id}
                      onClick={() => !isDisabled && toggleMemberSelection(p)}
                      style={{
                        padding: '1.25rem',
                        border: isSelected ? `2px solid ${colors.primary}` : `1px solid ${colors.border}`,
                        borderRadius: '20px',
                        background: isSelected ? '#f0f7ff' : colors.white,
                        cursor: isDisabled ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        opacity: isDisabled && !isSelected ? 0.6 : 1,
                        transition: transitions,
                        boxShadow: isSelected ? '0 10px 15px -3px rgba(13, 56, 120, 0.1)' : shadowSm,
                        position: 'relative'
                      }}
                      onMouseEnter={e => { if (!isDisabled) e.currentTarget.style.transform = 'translateY(-2px)'; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
                    >
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '14px',
                        background: isSelected ? colors.primary : '#f1f5f9',
                        color: isSelected ? 'white' : colors.textMuted,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        {isSelected ? <Check size={24} strokeWidth={3} /> : <UserCircle size={28} />}
                      </div>

                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '4px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 800, color: colors.text, fontSize: '0.95rem' }}>
                            {p.rank} {p.name}
                          </span>
                          {!p.isAvailableToday && (
                            <span style={{
                              fontSize: '0.65rem',
                              background: '#fee2e2',
                              color: '#ef4444',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontWeight: 900,
                              textTransform: 'uppercase'
                            }}>
                              Fora do Turno
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{ fontSize: '0.8rem', color: colors.textMuted, fontWeight: 600 }}>
                            Nº {p.numero_ordem || p.matricula}
                          </span>
                          {(p.motorista === 'Sim' || p.id_funcao === 2) && (
                            <span style={{
                              fontSize: '0.65rem',
                              background: '#10b981',
                              color: 'white',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontWeight: 900
                            }}>
                              MOT
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Service Counter Badge with Color Scale */}
                      <div style={{
                        background: p.service_count >= 8 ? '#fef2f2' :
                          p.service_count >= 6 ? '#fffbeb' : '#f0fdf4',
                        color: p.service_count >= 8 ? '#dc2626' :
                          p.service_count >= 6 ? '#b45309' : '#15803d',
                        padding: '6px 10px',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        border: `1px solid ${p.service_count >= 8 ? '#fee2e2' :
                          p.service_count >= 6 ? '#fef3c7' : '#dcfce7'
                          }`
                      }}>
                        {p.service_count}/8
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '1.5rem 2.5rem',
              borderTop: `1px solid ${colors.border}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: colors.white
            }}>
              <div>
                <span style={{ fontSize: '1.1rem', color: colors.text, fontWeight: 700 }}>
                  {selectedMembers.length} selecionados
                </span>
                <span style={{ marginLeft: '0.5rem', color: colors.textMuted, fontSize: '0.9rem', fontWeight: 500 }}>
                  (limite de {MAX_MEMBERS})
                </span>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  onClick={closeSelectionModal}
                  style={{
                    padding: '0.85rem 2rem',
                    background: '#f1f5f9',
                    color: colors.textMuted,
                    border: 'none',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontWeight: 700,
                    transition: transitions
                  }}
                  onMouseOver={e => e.currentTarget.style.background = '#e2e8f0'}
                  onMouseOut={e => e.currentTarget.style.background = '#f1f5f9'}
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmSelection}
                  disabled={selectedMembers.length === 0}
                  style={{
                    padding: '0.85rem 3rem',
                    background: selectedMembers.length > 0 ? colors.primary : colors.accent,
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: selectedMembers.length > 0 ? 'pointer' : 'not-allowed',
                    fontWeight: 700,
                    boxShadow: selectedMembers.length > 0 ? '0 10px 20px rgba(13, 56, 120, 0.2)' : 'none',
                    transition: transitions
                  }}
                >
                  Confirmar Escala
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global CSS for Animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        select {
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 0.75rem center;
          padding-right: 2.5rem !important;
        }
        @media (max-width: 1024px) {
          .v2-dashboard-container {
            flex-direction: column !important;
            overflow-y: auto !important;
          }
          .v2-sidebar {
            width: 100% !important;
            height: auto !important;
            position: relative !important;
            top: 0 !important;
            border-right: none !important;
            border-bottom: 1px solid ${colors.border} !important;
          }
          .v2-main-content {
            height: auto !important;
            overflow-y: visible !important;
          }
          .hide-mobile {
            display: none !important;
          }
        }
        @media (max-width: 640px) {
          .modal-content {
            width: 100% !important;
            height: 100% !important;
            border-radius: 0 !important;
          }
          .modal-filters {
            flex-direction: column !important;
          }
        }
      `}</style>
    </div>
  );
}
