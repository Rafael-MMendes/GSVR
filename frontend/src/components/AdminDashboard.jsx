import { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import { Download, Printer, UserCircle, AlertTriangle, Plus, Trash2, Search, MousePointer2, X, Check, Users, GripVertical } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001') + '/api';

const ROLES = ['Comandante', 'Motorista', 'Patrulheiro'];

const SHIFTS = [
  '07:00 ÀS 13:00',
  '13:00 ÀS 19:00',
  '19:00 ÀS 01:00',
  '01:00 ÀS 07:00',
];

const MAX_MEMBERS = 3; // Máximo de militares por guarnição

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
    const endHour = (i + hours) % 24;
    const end = String(endHour).padStart(2, '0') + ':00';
    options.push(`${start} às ${end}`);
  }
  return options;
};

export function AdminDashboard() {
  const [volunteers, setVolunteers] = useState([]);
  const [months, setMonths] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedDate, setSelectedDate] = useState('1');
  const [selectedShift, setSelectedShift] = useState('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSlot, setActiveSlot] = useState(null);
  const [selectionMode, setSelectionMode] = useState(null); // { patrolId, selectedMembers: [] }
  const [selectedMembers, setSelectedMembers] = useState([]); // Militares selecionados no modal

  const [state, setState] = useState({
    pool: [],
    patrols: Array.from({length: 8}, (_, i) => ({ 
      id: `p${i+1}`, 
      name: 'FORÇA TAREFA', 
      duration: '6h',
      timeSpan: '',
      members: [] 
    }))
  });

  const printRef = useRef();

  useEffect(() => {
    const init = async () => {
      try {
        const monthsRes = await axios.get(`${API_URL}/ciclos`);
        setMonths(monthsRes.data);
        
        if (monthsRes.data.length > 0) {
          const firstMonth = monthsRes.data[0].referencia_mes_ano;
          setSelectedMonth(firstMonth);
          
          const volRes = await axios.get(`${API_URL}/volunteers?month=${firstMonth}`);
          setVolunteers(volRes.data);
          
          const schedRes = await axios.get(`${API_URL}/schedules?date=1&month=${firstMonth}`);
          loadScheduleData(volRes.data, schedRes.data, firstMonth, '1');
        }
      } catch (e) {
        console.error(e);
      }
    };
    init();
  }, []);

  const loadScheduleData = (volunteersData, schedulesData, monthKey, dateVal) => {
    const selectedDateStr = String(dateVal);
    const selectedDateNum = parseInt(dateVal);
    
    console.log('Loading schedule data for:', { monthKey, dateVal, volunteersCount: volunteersData.length });

    const availablePeople = volunteersData.filter(v => {
      if (!v.availability) return false;
      
      // Verificar tanto versão com zero quanto sem zero
      const dayKey1 = String(selectedDateNum);
      const dayKey2 = String(selectedDateNum).padStart(2, '0');
      
      // Busca robusta pela chave do dia (string simples, string com zero, ou número)
      const availabilityForDay = 
        v.availability?.[dayKey1] || 
        v.availability?.[dayKey2] || 
        v.availability?.[parseInt(selectedDateNum)];
        
      return !!availabilityForDay;
    });

    console.log(`[Dashboard] Pool: Total=${volunteersData.length}, Para o dia ${selectedDateNum}=${availablePeople.length}`);

    const patrols = (schedulesData.length > 0 && schedulesData[0].patrols) ? schedulesData[0].patrols : Array.from({length: 8}, (_, i) => ({ 
      id: `p${i+1}`, 
      name: 'FORÇA TAREFA', 
      duration: '6h',
      timeSpan: '',
      members: [] 
    })).map((patrol, index) => ({
      ...patrol,
      name: normalizePatrolName(patrol.name),
      id: patrol.id || `p${index + 1}`,
    }));

    const assignedIds = new Set();
    patrols.forEach(patrol => {
      if (patrol.members && Array.isArray(patrol.members)) {
        patrol.members.forEach(m => {
          if (m && m.id) assignedIds.add(String(m.id));
          if (m && m.id_militar) assignedIds.add(`m${m.id_militar}`);
        });
      }
    });

    const pool = availablePeople.filter(p => {
      const isAssigned = assignedIds.has(String(p.id)) || (p.id_militar && assignedIds.has(`m${p.id_militar}`));
      return !isAssigned;
    });
    setState({ pool, patrols });
  };

  useEffect(() => {
    if (!selectedMonth) return;
    
    const loadData = async () => {
      try {
        console.log('Fetching data for month:', selectedMonth);
        const volRes = await axios.get(`${API_URL}/volunteers?month=${selectedMonth}`);
        console.log('Volunteers fetched:', volRes.data.length);
        setVolunteers(volRes.data);
        
        const schedRes = await axios.get(`${API_URL}/schedules?date=${selectedDate}&month=${selectedMonth}`);
        console.log('Schedules fetched:', schedRes.data);
        loadScheduleData(volRes.data, schedRes.data, selectedMonth, selectedDate);
      } catch (e) {
        console.error('Error loading dashboard data:', e);
      }
    };

    loadData();
  }, [selectedMonth, selectedDate]);

  const saveConfig = async () => {
    try {
      await axios.post(`${API_URL}/schedules`, {
        date: selectedDate,
        month_key: selectedMonth,
        patrols: state.patrols
      });
      alert('Escala salva com sucesso!');
    } catch (error) {
      console.error(error);
      alert('Erro ao salvar escala.');
    }
  };

  // POOL FILTRADO COM useMemo
  const filteredPool = useMemo(() => {
    return state.pool.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           (p.numero_ordem && p.numero_ordem.includes(searchTerm));
      
      if (selectedShift === 'Todos') return matchesSearch;
      
      const targetDaySimple = String(selectedDate);
      const targetDayPadded = String(selectedDate).padStart(2, '0');
      const dayShifts = p.availability?.[targetDaySimple] || p.availability?.[targetDayPadded] || p.availability?.[parseInt(selectedDate)] || [];
      
      // Mapeamento flexível de turnos
      const shiftFragment = selectedShift.includes('(') ? selectedShift.split(' (')[1].split(')')[0].split(' às')[0] : selectedShift.split(' ')[0];
      
      return matchesSearch && dayShifts.some(s => {
        if (!s) return false;
        const dbShift = String(s).toUpperCase();
        const selShift = selectedShift.toUpperCase();
        
        // Verifica por nome (MANHÃ) ou por horário (07:00)
        return dbShift.includes(selShift.split(' ')[0]) || 
               (selShift.includes('07') && dbShift.includes('07:00')) ||
               (selShift.includes('13') && dbShift.includes('13:00')) ||
               (selShift.includes('19') && dbShift.includes('19:00')) ||
               (selShift.includes('01') && dbShift.includes('01:00'));
      });
    });
  }, [state.pool, searchTerm, selectedShift, selectedDate]);

  // FUNÇÃO DE ATRIBUIÇÃO RÁPIDA (Click-to-Assign)
  const assignToActiveSlot = (person) => {
    if (!activeSlot) return;

    setState(prev => {
      const newState = {
        pool: prev.pool.filter(p => p.id !== person.id),
        patrols: prev.patrols.map(p => {
          if (p.id === activeSlot.patrolId) {
            const newMembers = [...p.members];
            if (newMembers[activeSlot.roleIndex]) {
              prev.pool.push(newMembers[activeSlot.roleIndex]);
            }
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
          const removedPerson = newMembers[roleIndex];
          newMembers[roleIndex] = null;
          return { ...p, members: newMembers };
        }
        return p;
      });
      
      const removedPerson = prev.patrols.find(p => p.id === patrolId)?.members[roleIndex];
      const newPool = removedPerson ? [...prev.pool, removedPerson] : prev.pool;
      
      return { pool: newPool, patrols: newPatrols };
    });
  };

  // MODAL DE SELEÇÃO DE MILITARES
  const openSelectionModal = (patrolId) => {
    setSelectionMode({ patrolId, selectedMembers: [] });
    setSelectedMembers([]);
  };

  const toggleMemberSelection = (member) => {
    const isSelected = selectedMembers.some(m => m.id === member.id);
    if (isSelected) {
      setSelectedMembers(prev => prev.filter(m => m.id !== member.id));
    } else if (selectedMembers.length < MAX_MEMBERS) {
      setSelectedMembers(prev => [...prev, member]);
    }
  };

  const confirmSelection = () => {
    if (!selectionMode) return;
    
    setState(prev => {
      const newPatrols = prev.patrols.map(p => {
        if (p.id === selectionMode.patrolId) {
          // Criar array com até 3 posições, preenchendo com null onde não há membro
          const newMembers = [null, null, null];
          selectedMembers.forEach((m, idx) => {
            newMembers[idx] = m;
          });
          return { ...p, members: newMembers };
        }
        return p;
      });
      
      // Remover selecionados do pool
      const selectedIds = selectedMembers.map(m => m.id);
      const newPool = prev.pool.filter(p => !selectedIds.includes(p.id));
      
      return { pool: newPool, patrols: newPatrols };
    });
    
    setSelectionMode(null);
    setSelectedMembers([]);
  };

  const closeSelectionModal = () => {
    setSelectionMode(null);
    setSelectedMembers([]);
  };

  // Mover militar entre posições (drag and drop simples)
  const moveMember = (patrolId, fromIndex, toIndex) => {
    if (fromIndex === toIndex) return;
    
    setState(prev => {
      const newPatrols = prev.patrols.map(p => {
        if (p.id === patrolId) {
          const newMembers = [...p.members];
          const temp = newMembers[fromIndex];
          newMembers[fromIndex] = newMembers[toIndex];
          newMembers[toIndex] = temp;
          return { ...p, members: newMembers };
        }
        return p;
      });
      return { ...prev, patrols: newPatrols };
    });
  };

  const generatePDF = async () => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageW = pdf.internal.pageSize.getWidth();  // 210mm
    const margin = 10;

    // ── 1. Cabeçalho institucional desenhado via jsPDF ──────────────────────
    const headerH = 28;
    // Fundo azul PMAL
    pdf.setFillColor(13, 56, 120);
    pdf.rect(0, 0, pageW, headerH, 'F');
    // Faixa verde
    pdf.setFillColor(0, 156, 59);
    pdf.rect(0, headerH, pageW, 1.5, 'F');
    // Faixa amarela
    pdf.setFillColor(255, 223, 0);
    pdf.rect(0, headerH + 1.5, pageW, 1.5, 'F');

    // Brasões como imagens (carregados a partir de fetch -> base64)
    const toBase64 = async (url) => {
      try {
        const resp = await fetch(url);
        const blob = await resp.blob();
        return await new Promise((res, rej) => {
          const r = new FileReader();
          r.onload = () => res(r.result);
          r.onerror = rej;
          r.readAsDataURL(blob);
        });
      } catch { return null; }
    };

    const [b64Municipio, b64Bpm] = await Promise.all([
      toBase64('/brasao_municipio.png'),
      toBase64('/brasao_9bpm.png'),
    ]);

    const logoSize = 22; // mm
    const logoY = (headerH - logoSize) / 2;
    if (b64Municipio) pdf.addImage(b64Municipio, 'PNG', margin, logoY, logoSize, logoSize);
    if (b64Bpm)       pdf.addImage(b64Bpm,       'PNG', pageW - margin - logoSize, logoY, logoSize, logoSize);

    // Texto centralizado no cabeçalho
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13);
    pdf.text('POLÍCIA MILITAR DE ALAGOAS', pageW / 2, 9, { align: 'center' });
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9.5);
    pdf.text('9º Batalhão de Polícia Militar — Batalhão de Divisas', pageW / 2, 15, { align: 'center' });
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(8.5);
    pdf.setTextColor(200, 220, 255);
    pdf.text(`Escala Operacional da Força Tarefa (Dia ${selectedDate})`, pageW / 2, 21, { align: 'center' });

    // ── 2. Clonar apenas a grade de patrulhas ────────────────────────────────
    const source = printRef.current;
    const clone = source.cloneNode(true);
    clone.style.position = 'fixed';
    clone.style.top = '-9999px';
    clone.style.left = '0';
    clone.style.width = source.offsetWidth + 'px';
    clone.style.background = 'white';
    clone.style.padding = '1rem';
    clone.style.zIndex = '-1';

    // Ocultar o cabeçalho no clone (já desenhamos via jsPDF)
    const cloneHeader = clone.querySelector('.print-header');
    if (cloneHeader) {
      cloneHeader.style.display = 'none';
      cloneHeader.setAttribute('data-pdf-hidden', 'true');
    }

    // Remover guarnições vazias
    clone.querySelectorAll('.patrol-column').forEach(col => {
      const members = col.querySelectorAll('.volunteer-card');
      if (members.length === 0) col.remove();
    });

    // Ocultar configurações e slots vazios
    clone.querySelectorAll('.patrol-settings').forEach(el => el.style.display = 'none');
    clone.querySelectorAll('[style*="dashed"]').forEach(el => el.style.display = 'none');
    // Mostrar texto de horário - mas NÃO o cabeçalho já ocultado
    clone.querySelectorAll('.print-only').forEach(el => {
      if (!el.getAttribute('data-pdf-hidden')) {
        el.style.display = 'block';
      }
    });

    document.body.appendChild(clone);


    try {
      const canvas = await html2canvas(clone, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const topOffset = headerH + 3 + 1.5; // após faixas
      const availH = pdf.internal.pageSize.getHeight() - topOffset - margin;
      const imgW = pageW - margin * 2;
      const imgH = (canvas.height * imgW) / canvas.width;
      pdf.addImage(imgData, 'PNG', margin, topOffset + 2, imgW, Math.min(imgH, availH));
      pdf.save(`Escala_9BPM_Dia_${selectedDate}.pdf`);
    } finally {
      document.body.removeChild(clone);
    }
  };



  const addPatrol = () => {
    setState(prev => {
      return {
        ...prev,
        patrols: [
          ...prev.patrols,
          {
            id: `p${Date.now()}`,
            name: 'FORÇA TAREFA',
            duration: '6h',
            timeSpan: '',
            members: []
          }
        ]
      };
    });
  };

  const removePatrol = (patrolId) => {
    setState(prev => {
      const patrolToRemove = prev.patrols.find(p => p.id === patrolId);
      if (!patrolToRemove) return prev;

      // Retornar militares para o pool
      const updatedPool = [...prev.pool, ...patrolToRemove.members];
      const updatedPatrols = prev.patrols.filter(p => p.id !== patrolId);

      return {
        ...prev,
        pool: updatedPool,
        patrols: updatedPatrols
      };
    });
  };

  const handleDragStart = (e, personId, sourceId) => {
    e.dataTransfer.setData('personId', personId);
    e.dataTransfer.setData('sourceId', sourceId);
  };

  const handleDragOver = (e) => {
    e.preventDefault(); 
  };

  const handleDrop = (e, targetId) => {
    const personId = e.dataTransfer.getData('personId');
    const sourceId = e.dataTransfer.getData('sourceId');

    if (sourceId === targetId) return;

    setState(prev => {
      const newState = {
        pool: [...prev.pool],
        patrols: prev.patrols.map(p => ({ ...p, members: [...p.members] }))
      };
      
      let person;

      if (sourceId === 'pool') {
        const idx = newState.pool.findIndex(p => String(p.id) === String(personId));
        if (idx > -1) {
          person = newState.pool.splice(idx, 1)[0];
        }
      } else {
        const pIdx = newState.patrols.findIndex(p => p.id === sourceId);
        if (pIdx > -1) {
          const mIdx = newState.patrols[pIdx].members.findIndex(m => String(m.id) === String(personId));
          if (mIdx > -1) {
            person = newState.patrols[pIdx].members.splice(mIdx, 1)[0];
          }
        }
      }

      if (!person) return prev;

      if (targetId === 'pool') {
        newState.pool.push(person);
      } else {
        const ptIdx = newState.patrols.findIndex(p => p.id === targetId);
        if (newState.patrols[ptIdx].members.length >= 3) {
           alert("Guarnição cheia (Máximo 3 componentes).");
           if(sourceId === 'pool') newState.pool.push(person);
           else newState.patrols.find(p=>p.id===sourceId).members.push(person);
           return newState;
        }
        newState.patrols[ptIdx].members.push(person);
      }

      return newState;
    });
  };

  const handlePatrolSettingChange = (patrolId, field, value) => {
    setState(prev => ({
      ...prev,
      patrols: prev.patrols.map(p => 
        p.id === patrolId ? { ...p, [field]: value } : p
      )
    }));
  };

  // Se trocar a carga horária, reseta o horário escolhido
  const handleDurationChange = (patrolId, duration) => {
    setState(prev => ({
      ...prev,
      patrols: prev.patrols.map(p => 
        p.id === patrolId ? { ...p, duration: duration, timeSpan: '' } : p
      )
    }));
  };

  return (
    <div className="container" style={{ paddingTop: '1rem', maxWidth: '100%' }}>
      <div className="dashboard-grid" style={{ gap: '1rem' }}>
        <div className="glass-panel" style={{ padding: '0', background: 'transparent', border: 'none', boxShadow: 'none' }}>
          <div ref={printRef} style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', minHeight: '100%' }}>
            <div className="print-only print-header" style={{ 
              backgroundColor: '#0D3878', 
              color: '#ffffff', 
              padding: '12px 24px', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              position: 'relative',
              marginBottom: '2rem',
              overflow: 'hidden'
            }}>
              <div style={{ position: 'absolute', bottom: '3px', left: 0, right: 0, height: '3px', backgroundColor: '#009C3B' }}></div>
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px', backgroundColor: '#FFDF00' }}></div>
              <img src="/brasao_municipio.png" alt="Brasão Alagoas" style={{ height: '60px', zIndex: 10, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }} />
              <div style={{ textAlign: 'center', zIndex: 10, flex: 1, padding: '0 10px' }}>
                <h2 style={{ margin: 0, fontSize: '1.15rem', color: '#ffffff', fontWeight: 'bold' }}>POLÍCIA MILITAR DE ALAGOAS</h2>
                <h3 style={{ margin: '4px 0 0 0', fontSize: '0.9rem', color: '#ffffff', fontWeight: 'normal' }}>9º Batalhão de Polícia Militar - Batalhão de Divisas</h3>
                <h4 style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#c8dcff', fontStyle: 'italic', fontWeight: 'normal' }}>Escala Operacional da Força Tarefa (Dia {selectedDate})</h4>
              </div>
              <img src="/brasao_9bpm.png" alt="9º BPM" style={{ height: '60px', zIndex: 10, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }} />
            </div>

            <div className="schedules-area">
              {state.patrols.map(patrol => (
                <div 
                  key={patrol.id} 
                  className="patrol-column"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, patrol.id)}
                >
                  <div className="patrol-header" style={{ justifyContent: 'center', position: 'relative' }}>
                    <input 
                      type="text" 
                      value={normalizePatrolName(patrol.name)} 
                      onChange={e => handlePatrolSettingChange(patrol.id, 'name', normalizePatrolName(e.target.value))} 
                      style={{ border: 'none', background: 'transparent', fontSize: '1.125rem', fontWeight: 600, color: 'var(--primary)', width: 'auto', flex: 1, outline: 'none', textAlign: 'center' }} 
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span className="patrol-count">{patrol.members.length}/3</span>
                      <button 
                        onClick={() => removePatrol(patrol.id)}
                        className="no-print"
                        style={{ 
                          marginLeft: '8px',
                          padding: '4px',
                          color: '#ef4444',
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                        title="Remover Guarnição"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="patrol-settings">
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <label style={{ fontWeight: 600, width: '60px' }}>Carga:</label>
                      <select 
                        value={patrol.duration} 
                        onChange={e => handleDurationChange(patrol.id, e.target.value)}
                        style={{ cursor: 'pointer' }}
                      >
                        <option value="6h">6 Horas</option>
                        <option value="8h">8 Horas</option>
                      </select>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <label style={{ fontWeight: 600, width: '60px' }}>Horário:</label>
                      <select 
                        value={patrol.timeSpan}
                        onChange={e => handlePatrolSettingChange(patrol.id, 'timeSpan', e.target.value)}
                        style={{ flex: 1, cursor: 'pointer' }}
                      >
                        <option value="">Selecione o Horário...</option>
                        {getTimeOptions(patrol.duration).map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="print-only" style={{ marginBottom: '1rem', padding: '0.2rem 0', fontSize: '0.9rem', textAlign: 'center', fontWeight: 'bold', borderBottom: '1px solid #e2e8f0' }}>
                    {patrol.timeSpan ? `Horário: ${patrol.timeSpan} (${patrol.duration})` : `Carga: ${patrol.duration}`}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                    {Array.from({ length: 3 }).map((_, index) => {
                      const m = patrol.members[index];
                      const roleName = ROLES[index];
                      const isActive = activeSlot?.patrolId === patrol.id && activeSlot?.roleIndex === index;

                      if (m) {
                        return (
                          <div
                            key={m.id}
                            className="volunteer-card"
                            draggable
                            onDragStart={(e) => handleDragStart(e, m.id, patrol.id)}
                            style={{
                              padding: '0.5rem',
                              minHeight: '72px',
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '0.75rem'
                            }}
                          >
                            <div style={{ fontWeight: 'bold', color: 'var(--primary)', fontSize: '0.8rem', width: '94px', flexShrink: 0 }}>{roleName}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flex: 1, minWidth: 0 }}>
                              <span style={{ fontSize: '0.7rem', background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', flexShrink: 0 }}>Nº {m.numero_ordem}</span>
                              <div style={{ fontWeight: 500, fontSize: '0.85rem', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.rank} {m.name}</div>
                            </div>
                            <button onClick={() => removeFromSlot(patrol.id, index)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0 }} title="Remover">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={`empty-${index}`}
                          onClick={() => setActiveSlot({ patrolId: patrol.id, roleIndex: index })}
                          style={{
                            border: isActive ? '2px solid #0D3878' : '1px dashed var(--border-color)',
                            borderRadius: '8px',
                            minHeight: '72px',
                            padding: '0.5rem',
                            display: 'flex',
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '0.75rem',
                            cursor: 'pointer',
                            background: isActive ? '#f0f7ff' : 'transparent',
                            color: 'var(--text-muted)',
                            textAlign: 'left'
                          }}
                        >
                          <div style={{ fontWeight: 'bold', fontSize: '0.8rem', color: 'var(--primary)', width: '94px', flexShrink: 0 }}>{roleName}</div>
                          <div style={{ flex: 1, fontStyle: 'italic', opacity: isActive ? 1 : 0.6, fontSize: '0.75rem' }}>
                            {isActive ? <span style={{ color: '#0D3878', display: 'flex', alignItems: 'center', gap: '4px' }}><MousePointer2 size={14} /> Clique</span> : 'Vazio'}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button 
                    onClick={() => openSelectionModal(patrol.id)}
                    style={{
                      marginTop: '0.75rem',
                      padding: '0.5rem',
                      background: '#0D3878',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      fontWeight: 600,
                      width: '100%',
                      gridColumn: '1 / -1'
                    }}
                  >
                    <Users size={16} /> Adicionar Militares
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Painel Lateral Planejamento */}
        <aside style={{ width: '260px', background: 'white', borderRadius: '12px', padding: '1rem', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '1rem', height: 'fit-content', position: 'sticky', top: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0D3878', borderBottom: '2px solid #0D3878', paddingBottom: '0.5rem' }}>
            <Users size={20} />
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Planejamento</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <button onClick={saveConfig} style={{ padding: '0.5rem 0.75rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <Check size={18} /> Salvar
            </button>
            <button onClick={addPatrol} style={{ padding: '0.5rem 0.75rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <Plus size={18} /> Nova Guarnição
            </button>
            <button onClick={generatePDF} style={{ padding: '0.5rem 0.75rem', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <Printer size={18} /> Imprimir
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <label style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Mês</label>
              <select className="form-control" style={{ margin: 0 }} value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
                {months.map(m => <option key={m.id_ciclo} value={m.referencia_mes_ano}>{m.referencia_mes_ano}</option>)}
              </select>
            </div>
            <div>
              <label style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Dia</label>
              <select className="form-control" style={{ margin: 0 }} value={selectedDate} onChange={e => setSelectedDate(e.target.value)}>
                {Array.from({length: 31}, (_, i) => i+1).map(d => <option key={d} value={d}>Dia {d}</option>)}
              </select>
            </div>
            <div>
              <label style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Turno</label>
              <select className="form-control" style={{ margin: 0 }} value={selectedShift} onChange={e => setSelectedShift(e.target.value)}>
                <option value="Todos">Todos</option>
                {SHIFTS.map(s => <option key={s} value={s}>{s.split(' ')[0]}</option>)}
              </select>
            </div>
          </div>

          <div style={{ marginTop: 'auto', padding: '0.75rem', background: '#f8fafc', borderRadius: '8px', fontSize: '0.8rem', color: '#64748b' }}>
            <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Disponíveis</div>
            <div>{filteredPool.length} militares</div>
          </div>
        </aside>
      </div>
      {/* MODAL DE SELEÇÃO DE MILITARES */}
      {selectionMode && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            width: '90%',
            maxWidth: '800px',
            maxHeight: '90vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Header do Modal */}
            <div style={{
              padding: '1.5rem',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#0D3878',
              color: 'white'
            }}>
              <div>
                <h3 style={{ margin: 0 }}>Selecionar Militares</h3>
                <p style={{ margin: '0.25rem 0 0 0', opacity: 0.8, fontSize: '0.9rem' }}>
                  Selecione até {MAX_MEMBERS} militares para esta guarnição
                </p>
              </div>
              <button onClick={closeSelectionModal} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
                <X size={24} />
              </button>
            </div>

            {/* Lista de seleção */}
            <div style={{ flex: 1, overflow: 'auto', padding: '1rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <input 
                  type="text" 
                  placeholder="Buscar por nome ou Nº..." 
                  className="form-control"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                {filteredPool
                  .filter(p => {
                    // Filtrar também por turno se necessário
                    if (selectedShift === 'Todos') return true;
                    const targetDaySimple = String(selectedDate);
                    const targetDayPadded = String(selectedDate).padStart(2, '0');
                    const dayShifts = p.availability?.[targetDaySimple] || p.availability?.[targetDayPadded] || p.availability?.[parseInt(selectedDate)] || [];
                    
                    return dayShifts.some(s => {
                      if (!s) return false;
                      const dbShift = String(s).toUpperCase();
                      const selShift = selectedShift.toUpperCase();
                      return dbShift.includes(selShift.split(' ')[0]) || 
                             (selShift.includes('07') && dbShift.includes('07:00')) ||
                             (selShift.includes('13') && dbShift.includes('13:00')) ||
                             (selShift.includes('19') && dbShift.includes('19:00')) ||
                             (selShift.includes('01') && dbShift.includes('01:00'));
                    });
                  })
                  .sort((a, b) => {
                    // Ordenação: Posto/Grad depois Nome
                    const rankOrder = { 'CEL PM': 1, 'TC PM': 2, 'MAJ PM': 3, 'CAP PM': 4, '1º TEN PM': 5, '2º TEN PM': 6, 'SUB PM': 7, '1º SGT PM': 8, '2º SGT PM': 9, '3º SGT PM': 10, 'CB PM': 11, 'SD PM': 12 };
                    const rankA = rankOrder[a.rank] || 99;
                    const rankB = rankOrder[b.rank] || 99;
                    if (rankA !== rankB) return rankA - rankB;
                    return a.name.localeCompare(b.name);
                  })
                  .map(p => {
                    const isSelected = selectedMembers.some(m => m.id === p.id);
                    const isDisabled = !isSelected && selectedMembers.length >= MAX_MEMBERS;
                    
                    return (
                      <div 
                        key={p.id}
                        onClick={() => !isDisabled && toggleMemberSelection(p)}
                        style={{
                          padding: '1rem',
                          border: isSelected ? '2px solid #0D3878' : isDisabled ? '1px solid #e2e8f0' : '1px solid #cbd5e1',
                          borderRadius: '8px',
                          background: isSelected ? '#f0f7ff' : isDisabled ? '#f8fafc' : 'white',
                          cursor: isDisabled ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '1rem',
                          opacity: isDisabled && !isSelected ? 0.5 : 1,
                          transition: 'all 0.2s'
                        }}
                      >
                        <div style={{
                          width: '24px', height: '24px',
                          borderRadius: '50%',
                          border: isSelected ? '2px solid #0D3878' : '2px solid #cbd5e1',
                          background: isSelected ? '#0D3878' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          {isSelected && <Check size={14} color="white" />}
                        </div>
                        
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, color: '#1e293b' }}>
                            {p.rank} {p.name}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                            Nº {p.numero_ordem}
                          </div>
                        </div>
                        
                        <div style={{
                          background: p.service_count >= 8 ? '#fecaca' : p.service_count >= 6 ? '#ffedd5' : '#dcfce7',
                          color: p.service_count >= 8 ? '#991b1b' : p.service_count >= 6 ? '#9a3412' : '#166534',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '12px',
                          fontSize: '0.7rem',
                          fontWeight: 700
                        }}>
                          {p.service_count}/8
                        </div>
                        
                        {p.motorista === 'Sim' && (
                          <div style={{ background: '#10b981', color: 'white', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' }}>
                            MOT
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Footer com ações */}
            <div style={{
              padding: '1.5rem',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8fafc'
            }}>
              <div style={{ fontSize: '0.9rem', color: '#64748b' }}>
                <strong>{selectedMembers.length}</strong> / {MAX_MEMBERS} selecionados
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button 
                  onClick={closeSelectionModal}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: 'white',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmSelection}
                  disabled={selectedMembers.length === 0}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: selectedMembers.length > 0 ? '#0D3878' : '#94a3b8',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: selectedMembers.length > 0 ? 'pointer' : 'not-allowed',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <Check size={18} /> Confirmar {selectedMembers.length > 0 && `(${selectedMembers.length})`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
