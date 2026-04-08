import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Download, Printer, UserCircle, AlertTriangle, Plus, Trash2 } from 'lucide-react';
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

  
  const [state, setState] = useState({
    pool: [],
    patrols: Array.from({length: 8}, (_, i) => ({ 
      id: `p${i+1}`, 
      name: `Guarnição ${i+1}`, 
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
      // DEBUG: Se precisar debugar um militar específico descomente:
      // if (v.numero_ordem === 'SEU_NUMERO') console.log('DEBUG Availability:', v.name, v.availability);
      
      if (!v.availability) return false;
      
      const keys = Object.keys(v.availability).map(k => String(k).replace(/^0+/, ''));
      const targetStr = String(selectedDateNum);
      const targetPadded = String(selectedDateNum).padStart(2, '0');
      
      const hasDay = keys.includes(targetStr) || keys.includes(targetPadded);
      return hasDay;
    });

    console.log(`[Dashboard] Pool: Total=${volunteersData.length}, Para o dia ${selectedDateNum}=${availablePeople.length}`);

    const patrols = (schedulesData.length > 0 && schedulesData[0].patrols) ? schedulesData[0].patrols : Array.from({length: 8}, (_, i) => ({ 
      id: `p${i+1}`, 
      name: `Guarnição ${i+1}`, 
      duration: '6h',
      timeSpan: '',
      members: [] 
    }));

    const assignedIds = new Set();
    patrols.forEach(patrol => {
      if (patrol.members) {
        patrol.members.forEach(m => {
          if (m.id) assignedIds.add(String(m.id));
          if (m.id_militar) assignedIds.add(`m${m.id_militar}`);
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
      const nextNum = prev.patrols.length + 1;
      return {
        ...prev,
        patrols: [
          ...prev.patrols,
          {
            id: `p${Date.now()}`,
            name: `Guarnição ${nextNum}`,
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
      <div className="admin-controls-header" style={{ 
          display: 'flex', 
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'space-between', 
          alignItems: 'center',
          gap: '1rem',
          marginBottom: '1.5rem', 
          background: 'white', 
          padding: '1rem', 
          borderRadius: '12px', 
          border: '1px solid var(--border-color)', 
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Mês:</label>
            <select 
              className="form-control" 
              style={{ width: '130px', margin: 0, padding: '0.4rem' }}
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
            >
              {months.map(m => (
                <option key={m.id_ciclo} value={m.referencia_mes_ano}>{m.referencia_mes_ano}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Dia:</label>
            <select 
              className="form-control" 
              style={{ width: '90px', margin: 0, padding: '0.4rem' }}
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
            >
              {Array.from({length: 31}, (_, i) => i+1).map(d => (
                <option key={d} value={d}>Dia {d}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Turno:</label>
            <select
              className="form-control"
              style={{ width: '160px', margin: 0, padding: '0.4rem' }}
              value={selectedShift}
              onChange={e => setSelectedShift(e.target.value)}
            >
              <option value="Todos">Todos</option>
              {SHIFTS.map(s => <option key={s} value={s}>{s.split(' ')[0]}</option>)}
            </select>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '0.75rem', marginLeft: 'auto' }}>
          <button className="btn btn-outline" onClick={saveConfig} style={{ padding: '0.4rem 1rem' }}>
            Salvar
          </button>
          <button className="btn btn-primary" onClick={generatePDF} style={{ padding: '0.4rem 1rem' }}>
            <Printer size={18} />
            PDF
          </button>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Pool Column */}
        <div className="glass-panel" 
             onDragOver={handleDragOver} 
             onDrop={(e) => handleDrop(e, 'pool')}
        >
          <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
            Militares Disponíveis ({(() => {
              const base = state.pool;
              return base.filter(p => {
                if (selectedShift === 'Todos') return true;
                if (!p.availability) return false;
                
                const targetDayKey = String(selectedDateNum);
                const targetDayPadded = targetDayKey.padStart(2, '0');
                
                const dayShifts = p.availability[targetDayKey] || p.availability[targetDayPadded] || [];
                if (!Array.isArray(dayShifts)) return false;
                
                return dayShifts.some(s => 
                  String(s).toLowerCase().trim().includes(selectedShift.toLowerCase().trim())
                );
              }).length;
            })()})
          </h3>
          <div className="volunteers-list">
            {state.pool
              .filter(p => {
                if (selectedShift === 'Todos') return true;
                if (!p.availability) return false;

                const targetDayKey = String(selectedDateNum);
                const targetDayPadded = targetDayKey.padStart(2, '0');
                
                const dayShifts = p.availability[targetDayKey] || p.availability[targetDayPadded] || [];
                if (!Array.isArray(dayShifts)) return false;

                return dayShifts.some(s => 
                  String(s).toLowerCase().trim().includes(selectedShift.toLowerCase().trim())
                );
              })
              .map(p => {
              const dateKey = String(selectedDate);
              const dateNum = parseInt(selectedDate);
              const paddedKey = dateKey.padStart(2, '0');
              const prefShifts = (p.availability && (p.availability[dateKey] || p.availability[dateNum] || p.availability[paddedKey])) || [];
              return (
                <div 
                  key={p.id} 
                  className="volunteer-card"
                  draggable
                  onDragStart={(e) => handleDragStart(e, p.id, 'pool')}
                >
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ background: '#f1f5f9', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--primary)', border: '1px solid #e2e8f0' }}>Nº {p.numero_ordem}</div>
                    <div style={{ fontWeight: 600 }}>{p.rank} {p.name}</div>
                    
                    {/* Contador de Serviços */}
                    <div style={{ 
                      background: p.service_count >= 8 ? '#fecaca' : (p.service_count >= 6 ? '#ffedd5' : '#dcfce7'), 
                      color: p.service_count >= 8 ? '#991b1b' : (p.service_count >= 6 ? '#9a3412' : '#166534'), 
                      padding: '0.1rem 0.6rem', 
                      borderRadius: '12px', 
                      fontSize: '0.7rem', 
                      fontWeight: '800',
                      border: `1px solid ${p.service_count >= 8 ? '#f87171' : (p.service_count >= 6 ? '#fb923c' : '#4ade80')}`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      SERV. {p.service_count}/8
                      {p.service_count >= 8 && <AlertTriangle size={10} />}
                    </div>

                    {p.motorista === 'Sim' && (
                      <div style={{ background: '#10b981', color: 'white', padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' }}>MOTORISTA</div>
                    )}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    <span style={{ fontWeight: 600 }}>Turnos marcados:</span> {prefShifts.length > 0 ? prefShifts.join(' | ') : 'Qualquer'}
                  </div>
                </div>
              );
            })}
            {state.pool.length === 0 && <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '2rem' }}>Nenhum militar pendente.</p>}
          </div>
        </div>

        {/* Patrols Column (The printable area) */}
        <div className="glass-panel" style={{ padding: '0', background: 'transparent', border: 'none', boxShadow: 'none' }}>
          
          <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', padding: '0 1.5rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>Planejamento de Escala</h2>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                onClick={addPatrol}
                className="glass-button secondary"
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem',
                  padding: '0.5rem 1rem'
                }}
              >
                <Plus size={18} /> Adicionar Guarnição
              </button>
              <button onClick={generatePDF} className="glass-button primary">
                <Printer size={18} /> Imprimir Escala
              </button>
            </div>
          </div>

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
            
            <div className="schedules-area" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
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
                      value={patrol.name} 
                      onChange={e => handlePatrolSettingChange(patrol.id, 'name', e.target.value)} 
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
                  
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {Array.from({length: 3}).map((_, index) => {
                      const m = patrol.members[index];
                      const roleName = ROLES[index];
                      
                      if (m) {
                        return (
                          <div 
                            key={m.id} 
                            className="volunteer-card"
                            style={{ padding: '0.5rem 0.75rem', flexDirection: 'row', alignItems: 'center' }}
                            draggable
                            onDragStart={(e) => handleDragStart(e, m.id, patrol.id)}
                          >
                            <div style={{ fontWeight: 'bold', color: 'var(--primary)', width: '90px', fontSize: '0.8rem' }}>
                              {roleName}:
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              <span style={{ fontSize: '0.7rem', background: '#e2e8f0', padding: '1px 4px', borderRadius: '3px' }}>Nº {m.numero_ordem}</span>
                              <div style={{ fontWeight: 500, fontSize: '0.85rem' }}>{m.rank} {m.name}</div>
                            </div>
                          </div>
                        );
                      } else {
                        return (
                          <div key={`empty-${index}`} style={{ 
                            border: '1px dashed var(--border-color)', 
                            padding: '0.5rem', 
                            borderRadius: '8px', 
                            color: 'var(--text-muted)', 
                            fontSize: '0.8rem',
                            display: 'flex',
                            alignItems: 'center'
                          }}>
                            <div style={{ width: '90px', fontWeight: 'bold' }}>{roleName}:</div>
                            <div style={{ fontStyle: 'italic', opacity: 0.5 }}>Vazio...</div>
                          </div>
                        );
                      }
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
