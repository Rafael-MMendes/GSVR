import { useState, useEffect, useMemo, Fragment } from 'react';
import axios from 'axios';
import {
  ClipboardCheck, Search, Filter, ChevronDown, Calendar, Users, CheckCircle,
  XCircle, Zap, Clock, BarChart3, TrendingUp, Eye, List, Grid3X3,
  AlertTriangle, ArrowUpRight, ArrowDownRight, Minus, ChevronRight
} from 'lucide-react';
import { compareByRank, normalizeOpm } from '../utils/formatters';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001') + '/api';

const STATUS_CONFIG = {
  OK:     { label: 'Conforme',  color: '#10b981', bg: '#f0fdf4', border: '#bbf7d0', icon: CheckCircle  },
  Falta:  { label: 'Falta',     color: '#ef4444', bg: '#fef2f2', border: '#fecaca', icon: XCircle      },
  Extra:  { label: 'Extra',     color: '#8b5cf6', bg: '#faf5ff', border: '#ddd6fe', icon: Zap          },
  Futuro: { label: 'Agendado',  color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe', icon: Clock        }
};

const formatDateDisplay = (dateValue) => {
  if (!dateValue) return '---';
  try {
    const dateStr = String(dateValue).split('T')[0];
    const [ano, mes, dia] = dateStr.split('-');
    return `${dia}/${mes}/${ano}`;
  } catch { return '---'; }
};

export function ConferenciaOperacional() {
  const [data, setData] = useState(null);
  const [ciclos, setCiclos] = useState([]);
  const [selectedCiclo, setSelectedCiclo] = useState('');
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDate, setFilterDate] = useState('all');
  const [filterOpm, setFilterOpm] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeView, setActiveView] = useState('calendario'); // 'tabela' | 'calendario' | 'militar'
  const [expandedMilitar, setExpandedMilitar] = useState(null);
  const [collapsedGroups, setCollapsedGroups] = useState({});

  const toggleGroup = (groupName) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  // Fetch cycles on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`${API_URL}/ciclos`);
        setCiclos(res.data);
        const active = res.data.find(c => c.status === 'Aberto');
        if (active) setSelectedCiclo(active.id_ciclo);
        else if (res.data.length > 0) setSelectedCiclo(res.data[0].id_ciclo);
      } catch (e) {
        console.error('Erro ao carregar ciclos:', e);
      }
    })();
  }, []);

  // Fetch conferencia data when cycle changes
  useEffect(() => {
    if (!selectedCiclo) return;
    (async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${API_URL}/reports/conferencia?ciclo_id=${selectedCiclo}`);
        setData(res.data);
      } catch (e) {
        console.error('Erro ao carregar conferência:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedCiclo]);

  // Available dates for filter
  const availableDates = useMemo(() => {
    if (!data?.registros) return [];
    const dates = [...new Set(data.registros.map(r => r.data).filter(Boolean))];
    return dates.sort();
  }, [data]);

  // Available OPMs for filter (Normalizadas e sem duplicatas sintáticas)
  const availableOpms = useMemo(() => {
    if (!data?.registros) return [];
    const opms = [...new Set(data.registros.map(r => normalizeOpm(r.opm)).filter(Boolean))];
    return opms.sort();
  }, [data]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    if (!data?.registros) return [];
    return data.registros.filter(r => {
      if (filterStatus !== 'all' && r.status_conferencia !== filterStatus) return false;
      if (filterDate !== 'all' && r.data !== filterDate) return false;
      if (filterOpm !== 'all') {
        const itemOpmNorm = normalizeOpm(r.opm) || 'Sem OPM';
        if (itemOpmNorm !== filterOpm) return false;
      }
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const nome = (r.nome_planejado || r.nome_executado || '').toLowerCase();
        const mat = (r.mat_planejada || r.mat_executada || '').toLowerCase();
        const guarnicao = (r.guarnicao_planejada || r.guarnicao_executada || '').toLowerCase();
        const opmStr = (normalizeOpm(r.opm) || '').toLowerCase();
        if (!nome.includes(search) && !mat.includes(search) && !guarnicao.includes(search) && !opmStr.includes(search)) return false;
      }
      return true;
    });
  }, [data, filterStatus, filterDate, filterOpm, searchTerm]);

  // Grouped rows by Data (Date) -> Guarnição Executada
  const groupedRows = useMemo(() => {
    const hierarchy = {};
    filteredRows.forEach(r => {
      const dateKey = r.data || 'Sem Data';
      const guarnicaoName = r.guarnicao_executada || 'Sem Guarnição Executada';
      
      if (!hierarchy[dateKey]) {
        hierarchy[dateKey] = {};
      }
      if (!hierarchy[dateKey][guarnicaoName]) {
        hierarchy[dateKey][guarnicaoName] = [];
      }
      hierarchy[dateKey][guarnicaoName].push(r);
    });
    return hierarchy;
  }, [filteredRows]);

  // Sorted militares
  const sortedMilitares = useMemo(() => {
    if (!data?.porMilitar) return [];
    return [...data.porMilitar].sort((a, b) => compareByRank(a.grad, b.grad) || b.planejados - a.planejados);
  }, [data]);

  // Calendar data
  const calendarData = useMemo(() => {
    if (!data?.porDia) return {};
    return data.porDia;
  }, [data]);

  const calendarDays = useMemo(() => {
    return Object.keys(calendarData).sort();
  }, [calendarData]);

  // Quantidade de equipes planejadas para cada dia
  const plannedTeamsPerDay = useMemo(() => {
    if (!data?.registros) return {};
    const map = {};
    data.registros.forEach(r => {
      if (r.id_escala && r.guarnicao_planejada && r.guarnicao_planejada.trim()) {
        const day = r.data;
        if (!map[day]) {
          map[day] = new Set();
        }
        map[day].add(r.guarnicao_planejada.trim());
      }
    });

    const counts = {};
    Object.keys(map).forEach(day => {
      counts[day] = map[day].size;
    });
    return counts;
  }, [data]);

  // Quantidade de equipes executadas para cada dia
  const executedTeamsPerDay = useMemo(() => {
    if (!data?.registros) return {};
    const map = {};
    data.registros.forEach(r => {
      if (r.id_execucao && r.guarnicao_executada && r.guarnicao_executada.trim()) {
        const day = r.data;
        if (!map[day]) {
          map[day] = new Set();
        }
        map[day].add(r.guarnicao_executada.trim());
      }
    });

    const counts = {};
    Object.keys(map).forEach(day => {
      counts[day] = map[day].size;
    });
    return counts;
  }, [data]);

  // Quantidade total de equipes planejadas no ciclo
  const totalPlannedTeamsCycle = useMemo(() => {
    return Object.values(plannedTeamsPerDay).reduce((acc, count) => acc + count, 0);
  }, [plannedTeamsPerDay]);

  // Quantidade total de equipes executadas no ciclo
  const totalExecutedTeamsCycle = useMemo(() => {
    return Object.values(executedTeamsPerDay).reduce((acc, count) => acc + count, 0);
  }, [executedTeamsPerDay]);

  // Status badge
  const StatusBadge = ({ status }) => {
    const cfg = STATUS_CONFIG[status] || { label: status, color: '#64748b', bg: '#f8fafc', border: '#e2e8f0', icon: Minus };
    const Icon = cfg.icon;
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        padding: '4px 12px', borderRadius: '20px',
        background: cfg.bg, border: `1px solid ${cfg.border}`,
        color: cfg.color, fontWeight: 700, fontSize: '0.78rem',
        whiteSpace: 'nowrap'
      }}>
        <Icon size={13} />
        {cfg.label}
      </span>
    );
  };

  // KPI Card
  const KPICard = ({ icon: Icon, label, value, color, bgGradient, subtitle }) => (
    <div style={{
      background: bgGradient || '#fff',
      borderRadius: '16px',
      padding: '1.25rem 1.5rem',
      border: '1px solid #e2e8f0',
      flex: '1 1 180px',
      minWidth: '180px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      transition: 'transform 0.2s, box-shadow 0.2s',
      cursor: 'default'
    }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.08)'; }}
    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'; }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <div style={{
          width: 36, height: 36, borderRadius: '10px',
          background: `${color}15`,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <Icon size={18} color={color} />
        </div>
        <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ fontSize: '1.8rem', fontWeight: 800, color, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
        {value}
      </div>
      {subtitle && <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '4px' }}>{subtitle}</div>}
    </div>
  );

  // Day status for calendar
  const getDayStatus = (dayData) => {
    if (!dayData) return 'empty';
    if (dayData.falta > 0) return 'falta';
    if (dayData.extra > 0 && dayData.ok > 0) return 'mixed';
    if (dayData.futuro > 0 && dayData.ok === 0 && dayData.falta === 0) return 'futuro';
    if (dayData.ok > 0) return 'ok';
    return 'extra';
  };

  const dayStatusColors = {
    ok:     { bg: '#dcfce7', border: '#86efac', color: '#166534' },
    falta:  { bg: '#fee2e2', border: '#fca5a5', color: '#991b1b' },
    extra:  { bg: '#ede9fe', border: '#c4b5fd', color: '#5b21b6' },
    mixed:  { bg: '#fef9c3', border: '#fde047', color: '#854d0e' },
    futuro: { bg: '#dbeafe', border: '#93c5fd', color: '#1e40af' },
    empty:  { bg: '#f8fafc', border: '#e2e8f0', color: '#94a3b8' }
  };

  if (loading && !data) {
    return (
      <div style={{ padding: '2rem', fontFamily: "'Inter', sans-serif", background: '#f8fafc', minHeight: '100vh' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
          <ClipboardCheck size={28} color="#0D3878" />
          <h1 style={{ margin: 0, fontSize: '1.8rem', color: '#0f172a' }}>Conferência Operacional</h1>
        </div>
        <div style={{ textAlign: 'center', padding: '5rem', color: '#64748b' }}>
          <Clock size={40} color="#0D3878" style={{ opacity: 0.5, marginBottom: '1rem', animation: 'spin 2s linear infinite' }} />
          <div>Processando dados de conferência...</div>
        </div>
      </div>
    );
  }

  const resumo = data?.resumo || {};

  return (
    <div style={{ padding: '2rem', fontFamily: "'Inter', sans-serif", background: '#f8fafc', minHeight: '100vh' }}>

      {/* ====== HEADER ====== */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.8rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ClipboardCheck size={28} color="#0D3878" />
            Conferência Operacional
          </h1>
          <p style={{ margin: '0.5rem 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>
            Cruzamento entre serviços planejados e executados por equipe
          </p>
        </div>

        {/* Cycle selector */}
        <div style={{ position: 'relative' }}>
          <Filter size={16} color="#64748b" style={{ position: 'absolute', top: '12px', left: '12px', zIndex: 1 }} />
          <select
            value={selectedCiclo}
            onChange={e => setSelectedCiclo(e.target.value)}
            style={{
              padding: '0.65rem 2.5rem 0.65rem 2.5rem', borderRadius: '12px',
              border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.9rem',
              outline: 'none', minWidth: '240px', appearance: 'none', cursor: 'pointer'
            }}
          >
            {ciclos.map(c => (
              <option key={c.id_ciclo} value={c.id_ciclo}>
                {c.period_name || c.periodo_ciclo || `Ciclo ${c.id_ciclo}`}
              </option>
            ))}
          </select>
          <ChevronDown size={16} color="#64748b" style={{ position: 'absolute', top: '12px', right: '12px', pointerEvents: 'none' }} />
        </div>
      </div>

      {/* ====== KPI CARDS ====== */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <KPICard icon={BarChart3} label="Planejados" value={resumo.totalPlanejados || 0}
          color="#0D3878" subtitle="Serviços na escala" />
        <KPICard icon={Users} label="Equipes Planejadas" value={totalPlannedTeamsCycle}
          color="#0D3878" subtitle="Total de guarnições no ciclo" />
        <KPICard icon={CheckCircle} label="Equipes Executadas" value={totalExecutedTeamsCycle}
          color="#10b981" subtitle="Total de guarnições executadas" />
        <KPICard icon={CheckCircle} label="Conformes" value={resumo.totalOK || 0}
          color="#10b981" subtitle="Planejado = Executado" />
        <KPICard icon={XCircle} label="Faltas" value={resumo.totalFaltas || 0}
          color="#ef4444" subtitle="Planejado mas não executado" />
        <KPICard icon={Zap} label="Extras" value={resumo.totalExtras || 0}
          color="#8b5cf6" subtitle="Executado sem planejamento" />
        <KPICard icon={TrendingUp} label="Aderência" value={`${resumo.taxaAderencia || 0}%`}
          color={resumo.taxaAderencia >= 80 ? '#10b981' : resumo.taxaAderencia >= 50 ? '#f59e0b' : '#ef4444'}
          subtitle="Conformes / (Conformes + Faltas)"
          bgGradient={resumo.taxaAderencia >= 80
            ? 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)'
            : resumo.taxaAderencia >= 50
              ? 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)'
              : 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)'
          }
        />
      </div>

      {/* ====== VIEW TABS & FILTERS ====== */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap'
      }}>
        {/* Tabs */}
        <div style={{ display: 'flex', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          {[
            { key: 'tabela', icon: List, label: 'Tabela' },
            { key: 'calendario', icon: Grid3X3, label: 'Calendário' },
            { key: 'militar', icon: Users, label: 'Por Militar' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveView(tab.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '0.6rem 1.2rem', border: 'none', cursor: 'pointer',
                background: activeView === tab.key ? '#0D3878' : 'transparent',
                color: activeView === tab.key ? '#fff' : '#64748b',
                fontWeight: 600, fontSize: '0.85rem', fontFamily: 'Inter, sans-serif',
                transition: 'all 0.2s'
              }}
            >
              <tab.icon size={16} /> {tab.label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Status filter */}
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            style={{
              padding: '0.55rem 0.75rem', borderRadius: '10px',
              border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.85rem',
              outline: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif'
            }}
          >
            <option value="all">Todos os Status</option>
            <option value="OK">✅ Conformes</option>
            <option value="Falta">❌ Faltas</option>
            <option value="Extra">⚡ Extras</option>
            <option value="Futuro">🕐 Agendados</option>
          </select>

          {/* Date filter */}
          <select
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
            style={{
              padding: '0.55rem 0.75rem', borderRadius: '10px',
              border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.85rem',
              outline: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif'
            }}
          >
            <option value="all">Todas as Datas</option>
            {availableDates.map(d => (
              <option key={d} value={d}>{formatDateDisplay(d)}</option>
            ))}
          </select>

          {/* OPM filter */}
          <select
            value={filterOpm}
            onChange={e => setFilterOpm(e.target.value)}
            style={{
              padding: '0.55rem 0.75rem', borderRadius: '10px',
              border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.85rem',
              outline: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif'
            }}
          >
            <option value="all">Todas as OPMs</option>
            {availableOpms.map(o => (
              <option key={o} value={o}>{o}</option>
            ))}
            {data?.registros?.some(r => !r.opm) && (
              <option value="Sem OPM">Sem OPM</option>
            )}
          </select>

          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', top: '10px', left: '10px' }} />
            <input
              type="text"
              placeholder="Buscar nome, matrícula..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                padding: '0.55rem 0.75rem 0.55rem 2.2rem', borderRadius: '10px',
                border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.85rem',
                outline: 'none', width: '220px', fontFamily: 'Inter, sans-serif'
              }}
            />
          </div>
        </div>
      </div>

      {/* ====== TABLE VIEW ====== */}
      {activeView === 'tabela' && (
        <div style={{
          background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0',
          overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#0D3878' }}>
                  {['Data', 'Guarnição Plan.', 'Militar', 'Grad.', 'Função', 'Horário', 'Presença', 'Guarnição Exec.', 'Status'].map(h => (
                    <th key={h} style={{
                      padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 700,
                      color: '#fff', textTransform: 'uppercase', letterSpacing: '0.03em',
                      whiteSpace: 'nowrap', textAlign: 'left'
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8' }}>
                      <Eye size={40} color="#e2e8f0" style={{ marginBottom: '0.75rem' }} />
                      <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#64748b' }}>Nenhum registro encontrado</div>
                      <div style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>Ajuste os filtros ou selecione outro ciclo</div>
                    </td>
                  </tr>
                ) : (
                  Object.keys(groupedRows)
                    .sort((a, b) => a.localeCompare(b))
                    .map((dateKey) => {
                      const guarnicoesObj = groupedRows[dateKey];
                      const isDateCollapsed = !!collapsedGroups[dateKey];
                      
                      // Count total records in this Date
                      let dateCount = 0;
                      Object.values(guarnicoesObj).forEach(list => dateCount += list.length);
                      
                      return (
                        <Fragment key={dateKey}>
                          {/* Date Group Header */}
                          <tr
                            onClick={() => toggleGroup(dateKey)}
                            style={{
                              background: '#cbd5e1',
                              borderBottom: '1px solid #94a3b8',
                              cursor: 'pointer',
                              userSelect: 'none',
                              color: '#1e293b',
                              transition: 'background 0.15s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = '#b8c5d6'}
                            onMouseLeave={e => e.currentTarget.style.background = '#cbd5e1'}
                          >
                            <td colSpan={9} style={{ padding: '0.65rem 1rem', fontWeight: 700 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                {isDateCollapsed ? <ChevronRight size={15} color="#475569" /> : <ChevronDown size={15} color="#475569" />}
                                <Calendar size={15} color="#475569" />
                                <span>{formatDateDisplay(dateKey)}</span>
                                <span style={{
                                  fontSize: '0.7rem',
                                  fontWeight: 600,
                                  color: '#fff',
                                  background: '#475569',
                                  padding: '2px 8px',
                                  borderRadius: '12px'
                                }}>
                                  {dateCount} {dateCount === 1 ? 'registro' : 'registros'}
                                </span>
                                {(() => {
                                  // Calcula o número de guarnições executadas únicas no dia considerando as linhas filtradas atuais
                                  const executedSet = new Set();
                                  Object.keys(guarnicoesObj).forEach(gName => {
                                    if (gName !== 'Sem Guarnição Executada') {
                                      const hasExecution = guarnicoesObj[gName].some(row => row.id_execucao);
                                      if (hasExecution) executedSet.add(gName);
                                    }
                                  });
                                  const countExec = executedSet.size;
                                  return (
                                    <span style={{
                                      fontSize: '0.7rem',
                                      fontWeight: 700,
                                      color: '#15803d',
                                      background: '#dcfce7',
                                      border: '1px solid #86efac',
                                      padding: '2px 10px',
                                      borderRadius: '12px',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px'
                                    }}>
                                      <CheckCircle size={12} color="#166534" />
                                      {countExec} {countExec === 1 ? 'guarnição executada' : 'guarnições executadas'}
                                    </span>
                                  );
                                })()}
                              </div>
                            </td>
                          </tr>
                          
                          {!isDateCollapsed && Object.keys(guarnicoesObj)
                            .sort((a, b) => {
                              if (a === 'Sem Guarnição Executada') return 1;
                              if (b === 'Sem Guarnição Executada') return -1;
                              return a.localeCompare(b);
                            })
                            .map((guarnicaoName) => {
                              const rows = guarnicoesObj[guarnicaoName];
                              const guarnicaoCollapseKey = `${dateKey}|${guarnicaoName}`;
                              const isGuarnicaoCollapsed = !!collapsedGroups[guarnicaoCollapseKey];
                              
                              return (
                                <Fragment key={guarnicaoName}>
                                  {/* Guarnição Group Header */}
                                  <tr
                                    onClick={() => toggleGroup(guarnicaoCollapseKey)}
                                    style={{
                                      background: '#f1f5f9',
                                      borderBottom: '1px solid #cbd5e1',
                                      cursor: 'pointer',
                                      userSelect: 'none',
                                      color: '#334155',
                                      transition: 'background 0.15s'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'}
                                    onMouseLeave={e => e.currentTarget.style.background = '#f1f5f9'}
                                  >
                                    <td colSpan={9} style={{ padding: '0.55rem 1.5rem', fontWeight: 700 }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        {isGuarnicaoCollapsed ? <ChevronRight size={14} color="#64748b" /> : <ChevronDown size={14} color="#64748b" />}
                                        <List size={14} color="#64748b" />
                                        <span>{guarnicaoName}</span>
                                        <span style={{
                                          fontSize: '0.65rem',
                                          fontWeight: 600,
                                          color: '#64748b',
                                          background: '#cbd5e1',
                                          padding: '2px 6px',
                                          borderRadius: '10px'
                                        }}>
                                          {rows.length} {rows.length === 1 ? 'registro' : 'registros'}
                                        </span>
                                      </div>
                                    </td>
                                  </tr>
                                  
                                  {!isGuarnicaoCollapsed && rows.map((r, rIdx) => {
                                    const cfg = STATUS_CONFIG[r.status_conferencia] || {};
                                    return (
                                      <tr key={rIdx} style={{
                                        background: rIdx % 2 === 0 ? '#fff' : '#fafbfc',
                                        borderLeft: `3px solid ${cfg.color || '#e2e8f0'}`,
                                        transition: 'background 0.15s'
                                      }}
                                      onMouseEnter={e => e.currentTarget.style.background = cfg.bg || '#f8fafc'}
                                      onMouseLeave={e => e.currentTarget.style.background = rIdx % 2 === 0 ? '#fff' : '#fafbfc'}
                                      >
                                        <td style={{ padding: '0.75rem 1rem 0.75rem 2rem', fontWeight: 600, color: '#334155', whiteSpace: 'nowrap' }}>
                                          {r.data_formatada || '---'}
                                        </td>
                                        <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>
                                          {r.guarnicao_planejada || <span style={{ color: '#cbd5e1' }}>—</span>}
                                        </td>
                                        <td style={{ padding: '0.75rem 1rem' }}>
                                          <div style={{ fontWeight: 600, color: '#1e293b' }}>
                                            {r.nome_planejado || r.nome_executado || '—'}
                                          </div>
                                          <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                                            Mat. {r.mat_planejada || r.mat_executada || '—'}
                                          </div>
                                        </td>
                                        <td style={{ padding: '0.75rem 1rem', color: '#475569', fontSize: '0.8rem' }}>
                                          {r.grad_planejada || r.grad_executada || '—'}
                                        </td>
                                        <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>
                                          {r.funcao || <span style={{ color: '#cbd5e1' }}>—</span>}
                                        </td>
                                        <td style={{ padding: '0.75rem 1rem', color: '#475569', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                                          {r.horario_servico || <span style={{ color: '#cbd5e1' }}>—</span>}
                                        </td>
                                        <td style={{ padding: '0.75rem 1rem' }}>
                                          {r.status_presenca ? (
                                            <span style={{
                                              padding: '2px 8px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600,
                                              background: r.status_presenca === 'Presente' ? '#f0fdf4' : '#fef2f2',
                                              color: r.status_presenca === 'Presente' ? '#16a34a' : '#dc2626'
                                            }}>
                                              {r.status_presenca}
                                            </span>
                                          ) : <span style={{ color: '#cbd5e1' }}>—</span>}
                                        </td>
                                        <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>
                                          {r.guarnicao_executada || <span style={{ color: '#cbd5e1' }}>—</span>}
                                        </td>
                                        <td style={{ padding: '0.75rem 1rem' }}>
                                          <StatusBadge status={r.status_conferencia} />
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </Fragment>
                              );
                            })
                          }
                        </Fragment>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>
          {filteredRows.length > 0 && (
            <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid #f1f5f9', color: '#94a3b8', fontSize: '0.8rem', textAlign: 'right' }}>
              Exibindo {filteredRows.length} registro{filteredRows.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      )}

      {/* ====== CALENDAR VIEW ====== */}
      {activeView === 'calendario' && (
        <div style={{
          background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0',
          padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}>
          <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={20} color="#0D3878" />
            Visão Calendário do Ciclo
          </h3>

          {/* Legend */}
          <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            {Object.entries({ ok: 'Tudo Conforme', falta: 'Com Faltas', extra: 'Apenas Extras', mixed: 'Misto', futuro: 'Futuro' }).map(([key, label]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#475569' }}>
                <div style={{
                  width: 14, height: 14, borderRadius: '4px',
                  background: dayStatusColors[key].bg, border: `1px solid ${dayStatusColors[key].border}`
                }} />
                {label}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
            gap: '0.75rem'
          }}>
            {calendarDays.map(day => {
              const dayData = calendarData[day];
              const status = getDayStatus(dayData);
              const colors = dayStatusColors[status];
              const [, , dd] = day.split('-');
              return (
                <div
                  key={day}
                  onClick={() => { setFilterDate(day); setActiveView('tabela'); }}
                  style={{
                    background: colors.bg,
                    border: `2px solid ${colors.border}`,
                    borderRadius: '12px',
                    padding: '0.75rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    textAlign: 'center'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: colors.color, marginBottom: '4px' }}>
                    {parseInt(dd)}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: '#64748b', marginBottom: '6px' }}>
                    {formatDateDisplay(day)}
                  </div>
                  <div style={{ 
                    fontSize: '0.72rem', 
                    color: colors.color, 
                    marginBottom: '6px', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    gap: '2px' 
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 600 }}>
                      <Users size={11} color={colors.color} />
                      <span>{plannedTeamsPerDay[day] || 0} plan.</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 600 }}>
                      <CheckCircle size={11} color={colors.color} />
                      <span>{executedTeamsPerDay[day] || 0} exec.</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', flexWrap: 'wrap' }}>
                    {dayData.ok > 0 && (
                      <span style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: 700 }}>✓{dayData.ok}</span>
                    )}
                    {dayData.falta > 0 && (
                      <span style={{ fontSize: '0.65rem', color: '#ef4444', fontWeight: 700 }}>✗{dayData.falta}</span>
                    )}
                    {dayData.extra > 0 && (
                      <span style={{ fontSize: '0.65rem', color: '#8b5cf6', fontWeight: 700 }}>⚡{dayData.extra}</span>
                    )}
                    {dayData.futuro > 0 && (
                      <span style={{ fontSize: '0.65rem', color: '#3b82f6', fontWeight: 700 }}>◷{dayData.futuro}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {calendarDays.length === 0 && (
            <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>
              <Calendar size={48} color="#e2e8f0" style={{ marginBottom: '0.75rem' }} />
              <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>Nenhum dado para o ciclo selecionado</div>
            </div>
          )}
        </div>
      )}

      {/* ====== MILITARY VIEW ====== */}
      {activeView === 'militar' && (
        <div style={{
          background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0',
          overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={20} color="#0D3878" />
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>Resumo por Militar</h3>
            <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#94a3b8' }}>
              {sortedMilitares.length} militar{sortedMilitares.length !== 1 ? 'es' : ''}
            </span>
          </div>

          {sortedMilitares.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>
              <Users size={48} color="#e2e8f0" style={{ marginBottom: '0.75rem' }} />
              <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>Nenhum militar no ciclo</div>
            </div>
          ) : (
            <div>
              {sortedMilitares.map((m) => {
                const aderencia = (m.ok + m.falta) > 0 ? Math.round((m.ok / (m.ok + m.falta)) * 100) : (m.planejados === 0 && m.executados > 0 ? 0 : 100);
                const isExpanded = expandedMilitar === m.id;
                return (
                  <div key={m.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <div
                      onClick={() => setExpandedMilitar(isExpanded ? null : m.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '1rem',
                        padding: '1rem 1.5rem', cursor: 'pointer',
                        transition: 'background 0.15s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#fafbfc'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <ChevronRight size={16} color="#94a3b8" style={{
                        transition: 'transform 0.2s',
                        transform: isExpanded ? 'rotate(90deg)' : 'none'
                      }} />

                      {/* Name */}
                      <div style={{ minWidth: '200px' }}>
                        <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9rem' }}>
                          {m.grad} {m.nome}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                          Mat. {m.matricula}
                        </div>
                      </div>

                      {/* Stats */}
                      <div style={{ display: 'flex', gap: '1rem', flex: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
                        <div style={{ textAlign: 'center', minWidth: '65px' }}>
                          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0D3878' }}>{m.planejados}</div>
                          <div style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase' }}>Plan.</div>
                        </div>
                        <div style={{ textAlign: 'center', minWidth: '65px' }}>
                          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#10b981' }}>{m.ok}</div>
                          <div style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase' }}>OK</div>
                        </div>
                        <div style={{ textAlign: 'center', minWidth: '65px' }}>
                          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ef4444' }}>{m.falta}</div>
                          <div style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase' }}>Faltas</div>
                        </div>
                        <div style={{ textAlign: 'center', minWidth: '65px' }}>
                          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#8b5cf6' }}>{m.extra}</div>
                          <div style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase' }}>Extras</div>
                        </div>
                      </div>

                      {/* Adherence bar */}
                      <div style={{ minWidth: '120px', textAlign: 'right' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: aderencia >= 80 ? '#10b981' : aderencia >= 50 ? '#f59e0b' : '#ef4444', marginBottom: '4px' }}>
                          {aderencia}% aderência
                        </div>
                        <div style={{ height: '6px', borderRadius: '3px', background: '#f1f5f9', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', borderRadius: '3px',
                            width: `${aderencia}%`,
                            background: aderencia >= 80 ? '#10b981' : aderencia >= 50 ? '#f59e0b' : '#ef4444',
                            transition: 'width 0.5s ease-out'
                          }} />
                        </div>
                      </div>
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div style={{ padding: '0 1.5rem 1rem 3.5rem', animation: 'fadeIn 0.2s ease-out' }}>
                        <div style={{
                          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                          gap: '0.75rem', padding: '1rem',
                          background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0'
                        }}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Planejados</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0D3878' }}>{m.planejados}</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Executados</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981' }}>{m.executados}</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Conformes</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#059669' }}>{m.ok}</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Faltas</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ef4444' }}>{m.falta}</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Extras</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#8b5cf6' }}>{m.extra}</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Agendados</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#3b82f6' }}>{m.futuro}</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
