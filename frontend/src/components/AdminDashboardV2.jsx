import { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { EscalaPublicacaoOficial } from './EscalaPublicacaoOficial';
import { compareByRank } from '../utils/formatters';
import { API_URL } from '../utils/apiConfig';
import { ROLES, MAX_MEMBERS, normalizePatrolName, getTimeOptions } from '../utils/scheduleHelpers';
import { dashboardColors as colors } from './admin-dashboard/theme';
import { ScheduleSidebar } from './admin-dashboard/ScheduleSidebar';
import { PatrolCard } from './admin-dashboard/PatrolCard';
import { VolunteerSelectionModal } from './admin-dashboard/VolunteerSelectionModal';
import { MilitarDetailsModal } from './admin-dashboard/MilitarDetailsModal';
import { useToast } from './common/ToastProvider';
import { scheduleApi } from '../services/api';

export function AdminDashboardV2() {
  const toast = useToast();
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [volunteers, setVolunteers] = useState([]);
  const [months, setMonths] = useState([]);
  const [selectedCycleId, setSelectedCycleId] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  });
  const [selectedShift, setSelectedShift] = useState('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSlot, setActiveSlot] = useState(null);
  const [selectionMode, setSelectionMode] = useState(null);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [loadingVolunteers, setLoadingVolunteers] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savingPatrolId, setSavingPatrolId] = useState(null);
  const [newPatrolName, setNewPatrolName] = useState('GSVR');
  const [newPatrolDuration, setNewPatrolDuration] = useState('6h');
  const [newPatrolShift, setNewPatrolShift] = useState('07:00 às 13:00');
  const [detailedMilitar, setDetailedMilitar] = useState(null);
  const [militarSchedules, setMilitarSchedules] = useState([]);
  const [militarGridDisp, setMilitarGridDisp] = useState([]);
  const [loadingMilitarGrid, setLoadingMilitarGrid] = useState(false);
  const [showPublicacao, setShowPublicacao] = useState(false);
  const [metas, setMetas] = useState([]);
  const [showUnavailable, setShowUnavailable] = useState(false);

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
        const activeCycle = monthsRes.data.find(c => c.status === 'Aberto') || monthsRes.data[0];
        if (activeCycle) {
          setSelectedCycleId(activeCycle.id_ciclo);

          // Sincroniza a data selecionada: se hoje estiver fora do ciclo, usa o início do ciclo
          const today = new Date().toISOString().split('T')[0];
          const start = String(activeCycle.data_inicio).split('T')[0];
          const end = String(activeCycle.data_fim).split('T')[0];

          if (today < start || today > end) {
            setSelectedDate(start);
          }
        }
      } catch (e) {
        console.error('[Init] Erro ao carregar ciclos:', e);
      }
    };
    init();
  }, []);

  const loadScheduleData = (volunteersData, schedulesData, monthKey, dateVal) => {
    if (!volunteersData) return;
    // dateVal can be 'YYYY-MM-DD' or a plain day number — extract the day correctly
    const selectedDateNum = (typeof dateVal === 'string' && dateVal.includes('-'))
      ? parseInt(dateVal.split('-')[2], 10)
      : parseInt(dateVal);
    const dayKey1 = String(selectedDateNum);
    const dayKey2 = String(selectedDateNum).padStart(2, '0');

    const processedVolunteers = volunteersData.map(v => {
      const availabilityForDay =
        (v.availability && typeof dateVal === 'string' && v.availability[dateVal]) ||
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

    const seenPatrolIds = new Set();
    patrols = patrols.map((p, idx) => {
      let uniqueId = p.id || `p_${idx}`;
      if (seenPatrolIds.has(uniqueId)) {
        uniqueId = `${uniqueId}_${idx}`;
      }
      seenPatrolIds.add(uniqueId);
      return { ...p, id: uniqueId, name: normalizePatrolName(p.name) };
    });

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
        // Primário: disponíveis hoje primeiro
        if (a.isAvailableToday && !b.isAvailableToday) return -1;
        if (!a.isAvailableToday && b.isAvailableToday) return 1;
        // Secundário: ordenar por hierarquia (maior posto primeiro)
        return compareByRank(a.rank, b.rank);
      });

    setState(prev => ({ ...prev, pool, patrols }));
  };

  useEffect(() => {
    if (!selectedCycleId) return;
    const loadVolunteers = async () => {
      try {
        setLoadingVolunteers(true);
        const [volRes, metasRes] = await Promise.all([
          axios.get(`${API_URL}/volunteers?id_ciclo=${selectedCycleId}`),
          axios.get(`${API_URL}/ciclos/${selectedCycleId}/metas`)
        ]);
        volunteersRef.current = volRes.data;
        setVolunteers(volRes.data);
        setMetas(metasRes.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingVolunteers(false);
      }
    };
    loadVolunteers();
  }, [selectedCycleId]);

  const loadSchedule = async () => {
    if (!selectedCycleId) return;
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

  const saveSchedule = async (overridePatrols = null, overrideDate = null) => {
    try {
      // Defesa: se for chamado por um evento de clique, overridePatrols será o objeto de evento.
      // Nesse caso, ignoramos e usamos o state.patrols.
      const patrolsToSave = Array.isArray(overridePatrols) ? overridePatrols : state.patrols;
      const targetDate = (typeof overrideDate === 'string' && overrideDate) ? overrideDate : selectedDate;

      if (!patrolsToSave || patrolsToSave.length === 0) return;

      setIsSaving(true);

      // Saneamento do payload: Envia apenas os atributos necessários para persistência no banco.
      // Remove árvores pesadas de disponibilidade (availability_json, turnos_completos, etc.),
      // prevenindo o erro HTTP 413 (Payload Too Large).
      const seenSaveIds = new Set();
      const sanitizedPatrols = patrolsToSave.map((patrol, idx) => {
        let pId = patrol.id;
        if (!pId || seenSaveIds.has(pId)) {
          pId = `p_${Date.now()}_${idx}`;
        }
        seenSaveIds.add(pId);
        return {
          id: pId,
          name: patrol.name,
          duration: patrol.duration,
          timeSpan: patrol.timeSpan,
          publicado: patrol.publicado !== false,
          members: Array.isArray(patrol.members)
            ? patrol.members.map(member => {
              if (!member) return null;
              return {
                id: member.id,
                id_militar: member.id_militar,
                name: member.name,
                rank: member.rank,
                nome_completo: member.nome_completo,
                numero_ordem: member.numero_ordem
              };
            })
            : []
        };
      });

      await axios.post(`${API_URL}/schedules`, {
        date: targetDate,
        id_ciclo: selectedCycleId,
        patrols: sanitizedPatrols
      });

      // Recarregar do banco após o salvamento para garantir sincronia total
      await loadSchedule();
    } catch (error) {
      console.error('Erro ao salvar escala:', error);
      alert('Erro ao sincronizar com o banco: ' + (error.response?.data?.error || error.message));
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const saveConfig = saveSchedule; // compatibilidade com possíveis referências antigas

  const filteredPool = useMemo(() => {
    return state.pool.filter(p => {
      // Regra: Exibir apenas militares com até 7 serviços executados (limite de 8 atingido oculta do pool)
      if (p.executed_count >= 8) return false;

      const trimmedSearch = (searchTerm || '').trim().toLowerCase();
      const isSearchActive = trimmedSearch.length > 0;
      const matchesSearch = isSearchActive
        ? ((p.name || '').toLowerCase().includes(trimmedSearch) ||
           (p.rank || '').toLowerCase().includes(trimmedSearch) ||
           (p.numero_ordem && String(p.numero_ordem).toLowerCase().includes(trimmedSearch)) ||
           (p.matricula && String(p.matricula).toLowerCase().includes(trimmedSearch)))
        : true;

      if (!matchesSearch) return false;

      if (selectedShift !== 'Todos') {
        if (!p.isAvailableToday && !showUnavailable) return false;
        if (!p.isAvailableToday && showUnavailable) return true; // Mostra todos se showUnavailable estiver on
        return p.todayShifts.some(s => {
          if (!s) return false;
          const shiftStr = typeof s === 'object' ? s.turno : s;
          return String(shiftStr).toUpperCase().trim() === selectedShift.toUpperCase().trim();
        });
      }

      if (!isSearchActive && !p.isAvailableToday && !showUnavailable) return false;

      return true;
    });
  }, [state.pool, searchTerm, selectedShift, selectedDate, showUnavailable]);

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

  const openSelectionModal = (patrolId) => {
    const existing = state.patrols?.find(p => p.id === patrolId);
    setSelectionMode({ patrolId, selectedMembers: [] });
    setSelectedMembers([]);
    if (existing) {
      setNewPatrolName(existing.name || 'GSVR');
      setNewPatrolDuration(existing.duration || '6h');
      setNewPatrolShift(existing.timeSpan || '07:00 às 13:00');
    }
  };
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
    if (selectedMembers.length === 0) {
      alert('Atenção: Selecione ao menos 1 militar nos cartões abaixo para compor a guarnição antes de salvar.');
      return;
    }
    const { patrolId, slotIndex } = selectionMode;

    const currentPatrols = Array.isArray(state.patrols) ? [...state.patrols] : [];
    let newPatrols = [];

    if (slotIndex !== undefined) {
      // MODO SUBSTITUIÇÃO DE SLOT ÚNICO
      newPatrols = currentPatrols.map(p => {
        if (p.id === patrolId) {
          const newMembers = [...p.members];
          if (selectedMembers.length > 0) newMembers[slotIndex] = selectedMembers[0];
          return { ...p, members: newMembers };
        }
        return p;
      });
    } else {
      // MODO CRIAÇÃO/EDIÇÃO DE GUARNIÇÃO COMPLETA
      const newMembers = [null, null, null];
      selectedMembers.forEach((m, idx) => { if (idx < 3) newMembers[idx] = m; });

      if (patrolId === 'NEW') {
        const finalName = (newPatrolName || '').trim() || 'GSVR';
        const finalShift = newPatrolShift || getTimeOptions(newPatrolDuration)[7] || '07:00 às 13:00';
        newPatrols = [
          ...currentPatrols,
          {
            id: `p${Date.now()}`,
            name: finalName,
            duration: newPatrolDuration,
            timeSpan: finalShift,
            members: newMembers
          }
        ];
      } else {
        newPatrols = currentPatrols.map(p => {
          if (p.id === patrolId) {
            const finalName = (newPatrolName || '').trim() || p.name || 'GSVR';
            const finalShift = newPatrolShift || p.timeSpan || '07:00 às 13:00';
            const finalDuration = newPatrolDuration || p.duration || '6h';
            return {
              ...p,
              name: finalName,
              duration: finalDuration,
              timeSpan: finalShift,
              members: newMembers
            };
          }
          return p;
        });
      }
    }

    // Atualiza estado local imediatamente
    setState(prev => ({ ...prev, patrols: newPatrols }));

    // Persiste no banco de dados imediatamente e fecha o modal ao concluir
    setIsSaving(true);
    try {
      await saveSchedule(newPatrols, selectedDate);
      closeSelectionModal();
    } catch (err) {
      console.error('Erro ao persistir escala da guarnição:', err);
      // Mantém o modal aberto para não perder as seleções caso haja falha
    } finally {
      setIsSaving(false);
    }
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

  const handleShowDetails = async (militar) => {
    const militarId = militar.id_militar || militar.id;
    const volObj = (volunteersRef.current || []).find(v => String(v.id_militar) === String(militarId) || String(v.id) === String(militarId));
    const initialMilitar = {
      ...militar,
      nome_completo: militar.nome_completo || volObj?.nome_completo || militar.name
    };
    setDetailedMilitar(initialMilitar);
    setMilitarSchedules([]);
    setMilitarGridDisp([]);
    setLoadingMilitarGrid(true);

    try {
      const [schedRes, gridRes] = await Promise.all([
        axios.get(`${API_URL}/reports/operacional-detalhado?ciclo_id=${selectedCycleId}`),
        axios.get(`${API_URL}/reports/disponibilidade-grid?id_militar=${militarId}&ciclo_id=${selectedCycleId}`)
      ]);
      const filtered = (schedRes.data || []).filter(item => String(item.id_militar) === String(militarId));
      setMilitarSchedules(filtered);
      setMilitarGridDisp(Array.isArray(gridRes.data) ? gridRes.data : []);

      if (filtered.length > 0 && filtered[0].nome_completo) {
        setDetailedMilitar(prev => ({
          ...prev,
          nome_completo: prev?.nome_completo || filtered[0].nome_completo,
          rank: prev?.rank || filtered[0].posto_graduacao,
          name: prev?.name || filtered[0].nome_guerra
        }));
      }
    } catch (err) {
      console.error('Erro ao buscar detalhes e grade de disponibilidade do militar:', err);
    } finally {
      setLoadingMilitarGrid(false);
    }
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
    setNewPatrolName('GSVR');
    setNewPatrolDuration('6h');
    setNewPatrolShift('07:00 às 13:00');
  };
  const removePatrol = async (patrolId) => {
    const patrolToRemove = state.patrols.find(p => p.id === patrolId);
    if (!patrolToRemove) return;

    const patrolName = patrolToRemove.name || patrolId;

    if (!window.confirm(`Deseja realmente excluir a guarnição "${patrolName}"? Esta ação removerá os registros planejados do banco de dados.`)) return;

    // Verifica se a guarnição é local (criada via "Nova Guarnição" mas nunca salva no banco)
    // Patrulhas locais têm IDs no formato 'p' + timestamp (ex: p1720352800000)
    // Patrulhas do DB têm IDs no formato 'nome_N' (ex: GSVR_0, p_0, Força Tarefa_1)
    const isLocalOnly = /^p\d{10,}$/.test(patrolId);

    // Função para remover a guarnição do estado local e devolver membros ao pool
    const removeFromLocalState = () => {
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
    };

    // Se a guarnição nunca foi salva no banco, remove apenas localmente
    if (isLocalOnly) {
      removeFromLocalState();
      return;
    }

    try {
      // Extrai os ids dos militares presentes na guarnição
      const memberIds = (patrolToRemove.members || [])
        .filter(m => m && m.id_militar)
        .map(m => m.id_militar)
        .join(',');

      // Chama API para exclusão física no banco, incluindo horario_servico e membros para precisão
      await axios.delete(`${API_URL}/schedules/patrol`, {
        params: {
          nome_recurso: patrolName,
          data_servico: selectedDate,
          id_ciclo: selectedCycleId,
          horario_servico: patrolToRemove.timeSpan || '',
          membros: memberIds
        }
      });

      // Remove do estado local
      removeFromLocalState();

      // Recarrega a escala do banco para garantir sincronia total
      await loadSchedule();

    } catch (error) {
      console.error('Erro ao excluir guarnição:', error);
      const errorData = error.response?.data;

      // Se o backend retornou 404 ou não encontrou registros, pode ser que a guarnição já não exista no banco
      if (error.response?.status === 404 || (errorData && errorData.code === 'NOT_FOUND')) {
        // Remove apenas localmente, pois a guarnição já não existe no banco
        removeFromLocalState();
        return;
      }

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
    const [yyyy, mm, dd] = selectedDate.split('-');
    const dateForPdf = dd && mm && yyyy
      ? new Date(`${yyyy}-${mm}-${dd}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
      : selectedDate;
    pdf.text(`Escala Operacional do GSVR (${dateForPdf})`, pageW / 2, 21, { align: 'center' });

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

  const currentCycle = months.find(c => String(c.id_ciclo) === String(selectedCycleId));

  const handleSelectCycle = (newId) => {
    setSelectedCycleId(newId);
    const cycle = months.find(c => String(c.id_ciclo) === String(newId));
    if (cycle) {
      const start = String(cycle.data_inicio).split('T')[0];
      const end = String(cycle.data_fim).split('T')[0];
      const today = new Date().toISOString().split('T')[0];
      if (today < start || today > end) {
        setSelectedDate(start);
      } else {
        setSelectedDate(today);
      }
    }
  };

  if (showPublicacao) {
    return (
      <EscalaPublicacaoOficial
        patrols={state.patrols}
        date={selectedDate}
        cycle={currentCycle}
        onBack={() => setShowPublicacao(false)}
      />
    );
  }

  const handleSuggestSchedule = async () => {
    if (!selectedCycleId || !selectedDate) {
      toast.error('Selecione um ciclo e uma data para gerar a sugestão automática.');
      return;
    }
    setIsSuggesting(true);
    try {
      const shiftArg = selectedShift && selectedShift !== 'Todos' ? selectedShift : newPatrolShift;
      const res = await scheduleApi.suggest({
        id_ciclo: Number(selectedCycleId),
        data_servico: selectedDate,
        horario_servico: shiftArg
      });
      const suggested = res?.suggestedPatrols || [];
      if (suggested.length === 0) {
        toast.info(res?.message || 'Nenhum voluntário elegível disponível para sugestão nesta data.');
        return;
      }

      const assignedIds = new Set();
      const mappedPatrols = suggested.map((p, idx) => {
        const members = (p.members || []).map((m, mIdx) => {
          assignedIds.add(String(m.id_militar));
          return {
            ...m,
            id: m.id_militar,
            role: m.funcao || (mIdx === 0 ? 'Comandante' : mIdx === 1 ? 'Motorista' : 'Patrulheiro'),
            slotIndex: mIdx
          };
        });
        return {
          id: `suggest-${Date.now()}-${idx}`,
          name: p.nome_recurso || `GSVR ${String(idx + 1).padStart(2, '0')}`,
          duration: newPatrolDuration,
          timeSpan: p.horario_servico || shiftArg,
          embarque: '',
          publicado: true,
          members
        };
      });

      setState(prev => ({
        pool: prev.pool.filter(v => !assignedIds.has(String(v.id_militar))),
        patrols: [...prev.patrols, ...mappedPatrols]
      }));
      toast.success(`${mappedPatrols.length} guarnição(ões) sugerida(s) por equidade! Revise e clique em Salvar Escala.`);
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Erro ao gerar sugestão automática de escala.');
    } finally {
      setIsSuggesting(false);
    }
  };

  return (
    <div className="v2-dashboard-container" style={{
      fontFamily: "'Outfit', 'Inter', sans-serif",
      background: '#f1f5f9',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'row',
      overflow: 'hidden'
    }}>
      <ScheduleSidebar
        months={months}
        selectedCycleId={selectedCycleId}
        onSelectCycle={handleSelectCycle}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        selectedShift={selectedShift}
        onSelectShift={setSelectedShift}
        showUnavailable={showUnavailable}
        onToggleShowUnavailable={() => setShowUnavailable(!showUnavailable)}
        availableCount={filteredPool.length}
        metas={metas}
        patrolsCount={state.patrols.length}
        isSaving={isSaving}
        isSuggesting={isSuggesting}
        onAddPatrol={addPatrol}
        onSuggestSchedule={handleSuggestSchedule}
        onSaveSchedule={() => saveSchedule()}
        onPublish={() => setShowPublicacao(true)}
      />

      {/* MAIN CONTENT AREA */}
      <div className="v2-main-content" style={{
        flex: 1,
        padding: '2rem',
        overflowY: 'scroll',
        scrollbarGutter: 'stable',
        height: '100vh'
      }}>
        <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: colors.primary }}>
              Escala de Serviço
            </h2>
            <p style={{ margin: 0, color: colors.textMuted, fontSize: '0.9rem' }}>
              Gerencie as guarnições para o dia selecionado
            </p>
          </div>
        </div>

        <div style={{ flex: 1, padding: '0.5rem' }} ref={printRef}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))',
            gap: '1.5rem',
            paddingBottom: '4rem'
          }}>
            {state.patrols.map(patrol => (
              <PatrolCard
                key={patrol.id}
                patrol={patrol}
                savingPatrolId={savingPatrolId}
                activeSlot={activeSlot}
                isSaving={isSaving}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onDragStart={handleDragStart}
                onSettingChange={handlePatrolSettingChange}
                onRemovePatrol={removePatrol}
                onRoleChange={handleRoleChange}
                onOpenSlotModal={(patrolId, slotIndex) => setSelectionMode({ patrolId, slotIndex })}
                onSelectActiveSlot={(patrolId, roleIndex) => setActiveSlot({ patrolId, roleIndex })}
              />
            ))}
          </div>
        </div>
      </div>

      <VolunteerSelectionModal
        selectionMode={selectionMode}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        months={months}
        selectedCycleId={selectedCycleId}
        selectedShift={selectedShift}
        setSelectedShift={setSelectedShift}
        showUnavailable={showUnavailable}
        setShowUnavailable={setShowUnavailable}
        newPatrolName={newPatrolName}
        setNewPatrolName={setNewPatrolName}
        newPatrolDuration={newPatrolDuration}
        setNewPatrolDuration={setNewPatrolDuration}
        newPatrolShift={newPatrolShift}
        setNewPatrolShift={setNewPatrolShift}
        state={state}
        filteredPool={filteredPool}
        selectedMembers={selectedMembers}
        toggleMemberSelection={toggleMemberSelection}
        handleShowDetails={handleShowDetails}
        confirmSelection={confirmSelection}
        closeSelectionModal={closeSelectionModal}
        isSaving={isSaving}
      />

      <MilitarDetailsModal
        detailedMilitar={detailedMilitar}
        onClose={() => setDetailedMilitar(null)}
        currentCycle={currentCycle}
        selectedCycleId={selectedCycleId}
        militarGridDisp={militarGridDisp}
        loadingMilitarGrid={loadingMilitarGrid}
        militarSchedules={militarSchedules}
      />

      {/* Global CSS for Animations */}
      <style>{`
        .modal-custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .modal-custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 6px;
        }
        .modal-custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 6px;
          border: 2px solid #f1f5f9;
        }
        .modal-custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .v2-main-content {
          scrollbar-gutter: stable;
          overflow-y: scroll !important;
        }
        .patrol-card-hover {
          transition: transform 0.2s ease, box-shadow 0.2s ease !important;
          will-change: transform, box-shadow;
        }
        .patrol-card-hover:hover {
          transform: translateY(-4px) !important;
          box-shadow: 0 16px 24px -4px rgba(0, 0, 0, 0.1), 0 8px 8px -4px rgba(0, 0, 0, 0.04) !important;
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
            height: auto !important;
            min-height: 100vh !important;
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
            padding: 1.25rem !important;
          }
          .modal-responsive-pool {
            width: 98% !important;
            height: 95vh !important;
            border-radius: 16px !important;
          }
          .modal-responsive-detail {
            width: 98% !important;
            max-height: 94vh !important;
            border-radius: 18px !important;
          }
          .hide-mobile {
            display: none !important;
          }
        }
        @media (max-width: 768px) {
          .v2-main-content {
            padding: 1rem 0.75rem !important;
          }
          .modal-responsive-pool {
            width: 100% !important;
            height: 100% !important;
            max-height: 100vh !important;
            border-radius: 0 !important;
          }
          .modal-responsive-detail {
            width: 100% !important;
            height: 100% !important;
            max-height: 100vh !important;
            border-radius: 0 !important;
          }
          .modal-detail-header-responsive {
            padding: 0.85rem 1rem !important;
          }
          .modal-detail-body-responsive {
            padding: 0.85rem 0.75rem !important;
            gap: 1rem !important;
          }
          .grade-topbar-responsive {
            padding: 0.85rem 1rem !important;
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 0.75rem !important;
          }
          .grade-summary-responsive {
            padding: 0.65rem 1rem !important;
            gap: 0.75rem !important;
            font-size: 0.76rem !important;
          }
          .modal-detail-footer-responsive {
            padding: 0.75rem 1rem !important;
          }
          .modal-detail-footer-responsive button {
            width: 100% !important;
          }
          .pool-header-responsive {
            padding: 0.75rem 1rem !important;
          }
          .pool-filters-responsive {
            padding: 0.65rem 0.85rem !important;
          }
          .pool-tray-responsive {
            flex-direction: column !important;
            align-items: stretch !important;
          }
          .pool-footer-responsive {
            flex-direction: column !important;
            padding: 0.75rem 1rem !important;
          }
          .pool-footer-responsive button {
            width: 100% !important;
          }
        }
        @media (max-width: 480px) {
          .v2-sidebar {
            padding: 1rem 0.75rem !important;
          }
          .modal-detail-header-responsive h3 {
            font-size: 1.05rem !important;
          }
          .modal-detail-body-responsive {
            padding: 0.65rem 0.5rem !important;
          }
        }
      `}</style>
    </div>
  );
}
