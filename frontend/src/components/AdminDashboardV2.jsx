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
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedDate, setSelectedDate] = useState('1');
  const [selectedShift, setSelectedShift] = useState('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSlot, setActiveSlot] = useState(null);
  const [selectionMode, setSelectionMode] = useState(null);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [loadingVolunteers, setLoadingVolunteers] = useState(false);

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
          setSelectedMonth(activeCycle.referencia_mes_ano);
        } else if (monthsRes.data.length > 0) {
          setSelectedMonth(monthsRes.data[0].referencia_mes_ano);
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
    if (!selectedMonth) return;
    const loadVolunteers = async () => {
      try {
        setLoadingVolunteers(true);
        const volRes = await axios.get(`${API_URL}/volunteers?month=${selectedMonth}`);
        volunteersRef.current = volRes.data;
        setVolunteers(volRes.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingVolunteers(false);
      }
    };
    loadVolunteers();
  }, [selectedMonth]);

  useEffect(() => {
    if (!selectedMonth || volunteersRef.current.length === 0) return;
    const loadSchedule = async () => {
      try {
        const schedRes = await axios.get(`${API_URL}/schedules?date=${selectedDate}&month=${selectedMonth}`);
        loadScheduleData(volunteersRef.current, schedRes.data, selectedMonth, selectedDate);
      } catch (e) {
        loadScheduleData(volunteersRef.current, [], selectedMonth, selectedDate);
      }
    };
    loadSchedule();
  }, [selectedDate, volunteers]);

  const saveConfig = async () => {
    try {
      await axios.post(`${API_URL}/schedules`, { date: selectedDate, month_key: selectedMonth, patrols: state.patrols });
      alert('Escala salva com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar escala:', error);
      alert('Erro ao salvar escala: ' + (error.response?.data?.error || error.message));
    }
  };

  const filteredPool = useMemo(() => {
    return state.pool.filter(p => {
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
    if (isSelected) setSelectedMembers(prev => prev.filter(m => m.id !== member.id));
    else if (selectedMembers.length < MAX_MEMBERS) setSelectedMembers(prev => [...prev, member]);
  };

  const confirmSelection = () => {
    if (!selectionMode) return;
    setState(prev => {
      let newPatrols = [...prev.patrols];
      const newMembers = [null, null, null];
      selectedMembers.forEach((m, idx) => { newMembers[idx] = m; });

      if (selectionMode.patrolId === 'NEW') {
        newPatrols.push({
          id: `p${Date.now()}`,
          name: 'FORÇA TAREFA',
          duration: '6h',
          timeSpan: '',
          members: newMembers
        });
      } else {
        newPatrols = newPatrols.map(p => {
          if (p.id === selectionMode.patrolId) {
            return { ...p, members: newMembers };
          }
          return p;
        });
      }
      
      const selectedIds = selectedMembers.map(m => m.id);
      return { pool: prev.pool.filter(p => !selectedIds.includes(p.id)), patrols: newPatrols };
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
    setState(prev => ({ ...prev, patrols: prev.patrols.map(p => p.id === patrolId ? { ...p, [field]: value } : p) }));
  };
  const handleDurationChange = (patrolId, duration) => {
    setState(prev => ({ ...prev, patrols: prev.patrols.map(p => p.id === patrolId ? { ...p, duration, timeSpan: '' } : p) }));
  };
  const addPatrol = () => {
    setSelectionMode({ patrolId: 'NEW', selectedMembers: [] });
    setSelectedMembers([]);
  };
  const removePatrol = (patrolId) => {
    setState(prev => {
      const patrolToRemove = prev.patrols.find(p => p.id === patrolId);
      if (!patrolToRemove) return prev;
      return { ...prev, pool: [...prev.pool, ...patrolToRemove.members], patrols: prev.patrols.filter(p => p.id !== patrolId) };
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

  return (
    <div style={{ padding: '1rem 2rem', fontFamily: "'Inter', sans-serif", background: '#f4f7fb', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* V2 HEADER */}
      <div className="v2-header no-print" style={{ 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
        background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(12px)',
        padding: '1rem 2rem', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
        marginBottom: '1.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#0D3878', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar size={24} /> Planejamento de Escala
            </h1>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Design Avançado (V2)</p>
          </div>
          
          <div style={{ height: '30px', width: '1px', background: '#e2e8f0' }}></div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ padding: '0.5rem 1rem', borderRadius: '8px', background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', fontWeight: 600, display: 'flex', alignItems: 'center', boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.5)' }}>
              Ciclo: {selectedMonth || 'Nenhum ciclo aberto'}
            </div>
            <select style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', outline: 'none', fontWeight: 500 }} value={selectedDate} onChange={e => setSelectedDate(e.target.value)}>
              {(() => {
                const [yearStr, monthStr] = selectedMonth ? selectedMonth.split('-') : [new Date().getFullYear(), new Date().getMonth() + 1];
                const year = parseInt(yearStr);
                const month = parseInt(monthStr);
                const daysInMonth = selectedMonth ? new Date(year, month, 0).getDate() : 31;
                
                return Array.from({length: daysInMonth}, (_, i) => i+1).map(d => {
                  let wdayCap = '';
                  if (selectedMonth) {
                    const date = new Date(year, month - 1, d);
                    const wday = date.toLocaleDateString('pt-BR', { weekday: 'long' });
                    wdayCap = ' - ' + wday.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('-');
                  }
                  return <option key={d} value={d}>Dia {d}{wdayCap}</option>
                });
              })()}
            </select>

            <div style={{ padding: '0.5rem 1rem', borderRadius: '8px', background: '#f8fafc', color: '#0D3878', border: '1px solid #e2e8f0', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
               <Users size={18} color="#0D3878" />
               <span style={{ fontSize: '0.9rem' }}>Disponíveis:</span>
               <span style={{ background: '#0D3878', color: 'white', padding: '2px 8px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 700 }}>{filteredPool.length}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button onClick={addPatrol} style={{ padding: '0.6rem 1rem', background: '#fff', color: '#0D3878', border: '1px solid #0D3878', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: '0.2s' }}>
            <Plus size={18} /> Adicionar Guarnição
          </button>
          <button onClick={generatePDF} style={{ padding: '0.6rem 1rem', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: '0.2s' }}>
            <Printer size={18} /> Imprimir (PDF)
          </button>
          <button onClick={saveConfig} style={{ padding: '0.6rem 1.5rem', background: 'linear-gradient(135deg, #0D3878 0%, #1e40af 100%)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 10px rgba(13, 56, 120, 0.3)', transition: 'transform 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
            <Check size={18} /> Salvar Alterações
          </button>
        </div>
      </div>

      {/* ÁREA DE PLANEJAMENTO (GRID) */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }} ref={printRef}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem', paddingBottom: '2rem' }}>
            {state.patrols.map(patrol => (
              <div 
                key={patrol.id}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, patrol.id)}
                style={{
                  background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.03)', overflow: 'hidden',
                  display: 'flex', flexDirection: 'column'
                }}
              >
                {/* Patrol Header */}
                <div style={{ 
                  background: 'linear-gradient(90deg, #0D3878 0%, #1e40af 100%)', 
                  padding: '1rem', color: '#fff', position: 'relative'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <input 
                      type="text" value={normalizePatrolName(patrol.name)} 
                      onChange={e => handlePatrolSettingChange(patrol.id, 'name', normalizePatrolName(e.target.value))} 
                      style={{ border: 'none', background: 'transparent', fontSize: '1.1rem', fontWeight: 700, color: '#fff', width: '100%', outline: 'none' }} 
                    />
                    <button onClick={() => removePatrol(patrol.id)} className="no-print" style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '4px', padding: '4px', display: 'flex' }} title="Remover Guarnição">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Patrol Config */}
                <div className="no-print" style={{ padding: '0.75rem 1rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '0.5rem' }}>
                  <select value={patrol.duration} onChange={e => handleDurationChange(patrol.id, e.target.value)} style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', outline: 'none' }}>
                    <option value="6h">6H</option>
                    <option value="8h">8H</option>
                  </select>
                  <select value={patrol.timeSpan} onChange={e => handlePatrolSettingChange(patrol.id, 'timeSpan', e.target.value)} style={{ flex: 1, padding: '0.4rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', outline: 'none' }}>
                    <option value="">Selecione...</option>
                    {getTimeOptions(patrol.duration).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>

                {/* Print Title Only */}
                <div className="print-only" style={{ display: 'none', padding: '0.5rem', textAlign: 'center', fontWeight: 'bold', fontSize: '0.9rem', color: '#475569', background: '#f1f5f9' }}>
                  {patrol.timeSpan ? `Horário: ${patrol.timeSpan} (${patrol.duration})` : `Carga: ${patrol.duration}`}
                </div>

                {/* Members Slots */}
                <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
                  {Array.from({ length: 3 }).map((_, index) => {
                    const m = patrol.members[index];
                    const roleName = ROLES[index];
                    const isActiveSlot = activeSlot?.patrolId === patrol.id && activeSlot?.roleIndex === index;

                    if (m) {
                      return (
                        <div key={m.id} draggable onDragStart={(e) => handleDragStart(e, m.id, patrol.id)} style={{
                          background: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.75rem',
                          display: 'flex', alignItems: 'center', gap: '0.75rem', position: 'relative', cursor: 'grab',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                        }}>
                          <div style={{ width: '4px', height: '100%', position: 'absolute', left: 0, top: 0, bottom: 0, background: '#0D3878', borderRadius: '8px 0 0 8px' }}></div>
                          <div style={{ flex: 1, paddingLeft: '0.5rem' }}>
                            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px' }}>{roleName}</div>
                            <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9rem' }}>{m.rank} {m.name}</div>
                          </div>
                          <button onClick={() => removeFromSlot(patrol.id, index)} className="no-print" style={{ background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '6px', padding: '6px', cursor: 'pointer', display: 'flex' }}>
                            <X size={16} />
                          </button>
                        </div>
                      );
                    }

                    return (
                      <div key={`empty-${index}`} onClick={() => setActiveSlot({ patrolId: patrol.id, roleIndex: index })} style={{
                        border: isActiveSlot ? '2px dashed #0D3878' : '2px dashed #e2e8f0', borderRadius: '8px', padding: '0.75rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer',
                        background: isActiveSlot ? '#f0f7ff' : '#f8fafc', transition: 'all 0.2s', minHeight: '66px'
                      }}>
                        <div style={{ paddingLeft: '0.5rem' }}>
                          <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>{roleName}</div>
                          <div style={{ fontSize: '0.85rem', color: isActiveSlot ? '#0D3878' : '#cbd5e1', fontWeight: 500 }}>
                            {isActiveSlot ? 'Clique em um militar...' : 'Espaço Vazio'}
                          </div>
                        </div>
                        {isActiveSlot && <MousePointer2 size={18} color="#0D3878" style={{ animation: 'bounce 1s infinite' }} />}
                      </div>
                    );
                  })}
                </div>


              </div>
            ))}
          </div>
        </div>

      {/* Modal Selection (reaproveitando estilo original do AdminDashboard com leves melhorias) */}
      {selectionMode && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000}}>
          <div style={{ background: 'white', borderRadius: '16px', width: '90%', maxWidth: '800px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0D3878', color: 'white' }}>
              <div>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Shield size={20}/> Selecionar Militares</h3>
                <p style={{ margin: '0.25rem 0 0 0', opacity: 0.8, fontSize: '0.9rem' }}>Selecione até {MAX_MEMBERS} militares</p>
              </div>
              <button onClick={closeSelectionModal} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', cursor: 'pointer', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={20} /></button>
            </div>
            
            <div style={{ flex: 1, overflow: 'auto', padding: '1.5rem', background: '#f8fafc' }}>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ flex: 2, position: 'relative' }}>
                  <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                  <input type="text" placeholder="Buscar por nome ou Nº..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '1rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', boxSizing: 'border-box' }} />
                </div>
                
                <select style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', outline: 'none', fontWeight: 500 }} value={selectedDate} onChange={e => setSelectedDate(e.target.value)}>
                  {(() => {
                    const [yearStr, monthStr] = selectedMonth ? selectedMonth.split('-') : [new Date().getFullYear(), new Date().getMonth() + 1];
                    const daysInMonth = selectedMonth ? new Date(parseInt(yearStr), parseInt(monthStr), 0).getDate() : 31;
                    return Array.from({length: daysInMonth}, (_, i) => i+1).map(d => <option key={d} value={d}>Dia {d}</option>);
                  })()}
                </select>

                <div style={{ padding: '0.5rem 1rem', borderRadius: '8px', background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                   <Users size={18} color="#0369a1" />
                   <span style={{ fontSize: '0.9rem' }}>Disponíveis:</span>
                   <span style={{ background: '#0369a1', color: 'white', padding: '2px 8px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 700 }}>{filteredPool.length}</span>
                </div>

                <select style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', outline: 'none', fontWeight: 500 }} value={selectedShift} onChange={e => setSelectedShift(e.target.value)}>
                  <option value="Todos">Turno: Todos</option>
                  {SHIFTS.map(s => <option key={s} value={s}>{s.split(' ')[0]}</option>)}
                </select>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                {filteredPool.map(p => {
                  const isSelected = selectedMembers.some(m => m.id === p.id);
                  const isDisabled = !isSelected && selectedMembers.length >= MAX_MEMBERS;
                  return (
                    <div key={p.id} onClick={() => !isDisabled && toggleMemberSelection(p)} style={{
                      padding: '1rem', border: isSelected ? '2px solid #0D3878' : '1px solid #cbd5e1', borderRadius: '12px', background: isSelected ? '#f0f7ff' : '#fff',
                      cursor: isDisabled ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '1rem', opacity: isDisabled && !isSelected ? 0.5 : 1, transition: 'all 0.2s', boxShadow: isSelected ? '0 4px 6px -1px rgba(13,56,120,0.1)' : 'none'
                    }}>
                      <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: isSelected ? 'none' : '2px solid #cbd5e1', background: isSelected ? '#009C3B' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {isSelected && <Check size={14} color="white" />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>{p.rank} {p.name}</div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Nº {p.numero_ordem || p.matricula}</div>
                      </div>
                      <div style={{ background: p.service_count >= 8 ? '#fecaca' : '#e0f2fe', color: p.service_count >= 8 ? '#991b1b' : '#0369a1', padding: '0.25rem 0.5rem', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 700 }}>{p.service_count}/8</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff' }}>
              <div style={{ fontSize: '0.95rem', color: '#475569' }}><strong>{selectedMembers.length}</strong> de {MAX_MEMBERS} selecionados</div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button onClick={closeSelectionModal} style={{ padding: '0.75rem 1.5rem', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Cancelar</button>
                <button onClick={confirmSelection} style={{ padding: '0.75rem 2rem', background: '#0D3878', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, boxShadow: '0 4px 6px -1px rgba(13,56,120,0.2)' }}>
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
