import { useState, useEffect } from 'react';
import axios from 'axios';
import { RefreshCw, TrendingUp, Clock, AlertTriangle, Wallet, Search } from 'lucide-react';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001') + '/api';
const MAX_SERVICES = 8;
const VALOR_FT_6H = 192.03;
const VALOR_FT_8H = 250.00;
const ORCAMENTO_MENSAL = 85000;

export function AnalyticsDashboard() {
  const [loading, setLoading] = useState(true);
  const [efetivo, setEfetivo] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [ciclos, setCiclos] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [selectedCiclo, setSelectedCiclo] = useState('');
  const [activeTab, setActiveTab] = useState('geral');
  const [stats, setStats] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'total', direction: 'desc' });
  const [searchTerm, setSearchTerm] = useState('');

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const filteredStats = stats.filter(s =>
    s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(s.numero_ordem).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedStats = [...filteredStats].sort((a, b) => {
    let aValue = a[sortConfig.key];
    let bValue = b[sortConfig.key];

    if (['count6h', 'count8h', 'total', 'remaining', 'valorTotal', 'numero_ordem'].includes(sortConfig.key)) {
      aValue = parseFloat(aValue) || 0;
      bValue = parseFloat(bValue) || 0;
    }

    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedCiclo) {
      fetchCycleData(selectedCiclo);
    }
  }, [selectedCiclo]);

  useEffect(() => {
    if (selectedCiclo && (volunteers.length >= 0 || servicos.length >= 0)) {
      filterByCiclo();
    }
  }, [selectedCiclo, volunteers, servicos, efetivo, activeTab]);

  useEffect(() => {
    if (ciclos.length > 0 && !selectedCiclo) {
      const activeOrFirst = ciclos.find(c => c.status === 'Aberto') || ciclos[0];
      setSelectedCiclo(activeOrFirst.id_ciclo);
    }
  }, [ciclos, selectedCiclo]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [efetivoRes, ciclosRes] = await Promise.all([
        axios.get(`${API_URL}/efetivo`),
        axios.get(`${API_URL}/ciclos`),
      ]);
      setEfetivo(efetivoRes.data);
      setCiclos(ciclosRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchCycleData = async (cicloId) => {
    if (!cicloId) return;
    setIsRefreshing(true);
    try {
      let volReq, servReq;
      if (cicloId === 'all') {
        volReq = axios.get(`${API_URL}/volunteers`);
        servReq = axios.get(`${API_URL}/servicos`);
      } else {
        volReq = axios.get(`${API_URL}/volunteers?id_ciclo=${cicloId}`);
        servReq = axios.get(`${API_URL}/servicos?ciclo_id=${cicloId}`);
      }
      const [volRes, servRes] = await Promise.all([volReq, servReq]);
      setVolunteers(volRes.data);
      setServicos(servRes.data);
    } catch (e) {
      console.error('Erro ao buscar dados do ciclo:', e);
    } finally {
      setTimeout(() => setIsRefreshing(false), 400);
    }
  };

  const filterByCiclo = () => {
    // Agora os dados já vem filtrados do backend, 
    // então apenas repassamos para a construção das estatísticas.
    // Lidar com arrays vazios para não quebrar o UI.
    buildStats(volunteers || [], servicos || [], efetivo || []);
  };

  const buildStats = (volunteersData, servicosData, fullEfetivo = []) => {
    const targetOpm = matchingCycle?.opm_sigla;

    const map = {};

    // 1. Iniciar com todos os voluntários para garantir que o militar esteja no mapa
    volunteersData.forEach(v => {
      const id = v.id_militar || v.militar_id || v.id;
      if (!id) return;
      
      const idKey = String(id);
      const mil = fullEfetivo.find(e => String(e.id_militar) === idKey || String(e.id) === idKey);
      
      // Definição da OPM de exibição baseada na aba
      let displayOPM = 'OPM Indefinida';
      if (activeTab === 'cpm') displayOPM = 'CPM/I-Faz';
      else if (activeTab === 'unidade') displayOPM = targetOpm || 'OPM Unidade';
      else displayOPM = 'Geral'; // No Geral, consolidamos tudo do militar
      
      // Quando na aba geral, usamos apenas o idKey para somar tudo do militar em uma linha só
      const uniqueKey = activeTab === 'geral' ? idKey : `${idKey}_${displayOPM}`;
      
      if (!map[uniqueKey]) {
        map[uniqueKey] = {
          id: uniqueKey,
          militar_id: idKey,
          numero_ordem: v.numero_ordem || v.matricula || idKey,
          rank: v.rank || v.posto_graduacao || '',
          name: mil?.nome_guerra || v.name || v.nome_guerra || v.nome_completo || 'Militar Indefinido',
          opm: displayOPM,
          home_opm: mil?.opm || v.opm || 'OPM Base',
          motorista: v.motorista_req !== undefined ? v.motorista_req : v.motorista,
          count6h: 0,
          count8h: 0,
        };
      }
    });

    // 2. Adicionar/Contabilizar quem executou serviços
    servicosData.forEach(s => {
      const sId = s.id_militar || s.militar_id;
      if (!sId) return;

      const idKey = String(sId);
      const opmExec = s.opm_origem || 'OPM Indefinida';

      // Filtro de OPM por Aba
      if (activeTab === 'unidade' && opmExec !== targetOpm) return;
      if (activeTab === 'cpm' && opmExec !== 'CPM/I-Faz') return;
      // Na aba Geral, pegamos tanto a unidade quanto o CPM
      if (activeTab === 'geral' && (opmExec !== targetOpm && opmExec !== 'CPM/I-Faz')) return;

      const displayOPM = activeTab === 'geral' ? 'Geral' : opmExec;
      const uniqueKey = activeTab === 'geral' ? idKey : `${idKey}_${displayOPM}`;

      if (!map[uniqueKey]) {
        const mil = fullEfetivo.find(e => String(e.id_militar) === idKey || String(e.id) === idKey);
        map[uniqueKey] = {
            id: uniqueKey,
            militar_id: idKey,
            numero_ordem: mil?.matricula || s.matricula || idKey,
            rank: mil?.posto_graduacao || s.posto_graduacao || '',
            name: mil?.nome_guerra || s.nome_guerra || mil?.nome_completo || 'Desconhecido',
            opm: displayOPM,
            home_opm: mil?.opm || 'OPM Base',
            motorista: mil?.motorista || false,
            count6h: 0,
            count8h: 0,
        };
      }

      if (map[uniqueKey]) {
        if (Number(s.carga_horaria) === 8) {
          map[uniqueKey].count8h += 1;
        } else {
          map[uniqueKey].count6h += 1;
        }
      }
    });

    const result = Object.values(map)
      .map(item => ({
        ...item,
        total: item.count6h + item.count8h,
        remaining: Math.max(0, MAX_SERVICES - (item.count6h + item.count8h)),
        valorTotal: (item.count6h * VALOR_FT_6H) + (item.count8h * VALOR_FT_8H),
      }))
      // Exibir apenas quem efetivamente possui serviços executados (total > 0)
      .filter(item => item && item.name && item.total > 0);

    result.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
    setStats(result);
  };

  const totalServicos = stats.reduce((acc, s) => acc + s.total, 0);
  const totalHoras6 = stats.reduce((acc, s) => acc + s.count6h, 0);
  const totalHoras8 = stats.reduce((acc, s) => acc + s.count8h, 0);
  const recursoUtilizado = stats.reduce((acc, s) => acc + s.valorTotal, 0);
  const recursoRestante = ORCAMENTO_MENSAL - recursoUtilizado;

  const formatarValor = (valor) => {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const getStatusColor = (total) => {
    const pct = total / MAX_SERVICES;
    if (pct >= 1) return '#ef4444';    // vermelho - lotado
    if (pct >= 0.75) return '#f59e0b'; // amarelo - quase no limite
    if (pct >= 0.25) return '#10b981'; // verde - normal
    return '#94a3b8';                  // cinza - poucos serviços
  };

  const getStatusLabel = (total) => {
    const pct = total / MAX_SERVICES;
    if (pct >= 1) return { text: 'Limite atingido', color: '#ef4444' };
    if (pct >= 0.75) return { text: 'Quase no limite', color: '#f59e0b' };
    if (pct > 0) return { text: 'Em dia', color: '#10b981' };
    return { text: 'Sem serviços', color: '#94a3b8' };
  };

  // Identificar a OPM alvo do ciclo selecionado para uso no JSX
  const matchingCycle = ciclos.find(c => String(c.id_ciclo) === String(selectedCiclo));

  return (
    <div className="container analytics-container" style={{ maxWidth: '1350px' }}>
      <style>{`
        .analytics-container {
          padding: 1rem;
          animation: fadeIn 0.5s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          gap: 1.5rem;
        }
        .tab-bar {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 0px;
          overflow-x: auto;
          scrollbar-width: none;
        }
        .tab-bar::-webkit-scrollbar { display: none; }
        
        .tab-button {
          padding: 0.75rem 2rem;
          border: none;
          background: transparent;
          color: var(--text-muted);
          cursor: pointer;
          font-weight: 600;
          font-size: 0.95rem;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          white-space: nowrap;
        }
        .tab-button.active {
          color: var(--primary);
        }
        .tab-button.active::after {
          content: '';
          position: absolute;
          bottom: -1px;
          left: 0;
          width: 100%;
          height: 3px;
          background: var(--primary);
          border-radius: 3px 3px 0 0;
          box-shadow: 0 -2px 10px rgba(13, 56, 120, 0.3);
        }
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1.5rem;
          margin-bottom: 2rem;
        }
        
        @media (max-width: 1200px) {
          .kpi-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 768px) {
          .dashboard-header { flex-direction: column; align-items: stretch; }
          .header-controls { flex-direction: column; }
          .kpi-grid { grid-template-columns: 1fr; }
          .search-box { width: 100% !important; }
          .cycle-selector { width: 100% !important; min-width: unset !important; }
        }
      `}</style>
      {/* Cabeçalho */}
      <div className="dashboard-header">
        <div>
          <h2 style={{ margin: 0, fontSize: 'clamp(1.25rem, 4vw, 1.75rem)' }}>
            Analítico SVR - Ciclo Ativo:{' '}
            <span
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              style={{
                color: 'var(--primary)',
                cursor: 'pointer',
                borderBottom: '2px dashed var(--primary)',
                paddingBottom: '2px',
                transition: 'all 0.2s',
              }}
            >
              {selectedCiclo === 'all'
                ? 'Todos os Ciclos'
                : (ciclos.find(c => String(c.id_ciclo) === String(selectedCiclo))?.period_name ||
                  ciclos.find(c => String(c.id_ciclo) === String(selectedCiclo))?.periodo_ciclo ||
                  'Selecione o Ciclo')}
            </span>
          </h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem', fontSize: '0.9rem' }}>
            Contagem de serviços por militar · Limite mensal: {MAX_SERVICES} serviços
          </p>
        </div>
        <div className="header-controls" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ position: 'relative' }} className="search-box">
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Buscar militar..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="form-control"
              style={{ paddingLeft: '2.5rem', width: '280px', borderRadius: '8px' }}
            />
          </div>

          {/* Dropdown de Ciclos Glassmorphism */}
          <div style={{ position: 'relative' }} className="cycle-selector">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="glass-panel"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.65rem 1.25rem',
                cursor: 'pointer',
                border: '1px solid var(--primary)',
                background: 'white',
                borderRadius: '8px',
                color: 'var(--primary)',
                fontWeight: 600,
                fontSize: '0.9rem',
                minWidth: '220px',
                justifyContent: 'space-between',
                boxShadow: '0 4px 12px rgba(13, 56, 120, 0.1)',
              }}
            >
              <span>
                {selectedCiclo === 'all'
                  ? 'Todos os Ciclos'
                  : (ciclos.find(c => String(c.id_ciclo) === String(selectedCiclo))?.period_name ||
                    ciclos.find(c => String(c.id_ciclo) === String(selectedCiclo))?.periodo_ciclo ||
                    'Selecione o Ciclo')}
              </span>
              <RefreshCw size={16} className={loading ? 'spin' : ''} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            </button>

            {isDropdownOpen && (
              <>
                <div
                  onClick={() => setIsDropdownOpen(false)}
                  style={{ position: 'fixed', inset: 0, zIndex: 998 }}
                />
                <div
                  className="glass-panel"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    width: '100%',
                    zIndex: 999,
                    padding: '0.5rem',
                    background: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid var(--border-color)',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                    animation: 'slideUp 0.2s ease-out'
                  }}
                >
                  <div
                    onClick={() => {
                      setSelectedCiclo('all');
                      setIsDropdownOpen(false);
                    }}
                    style={{
                      padding: '0.75rem 1rem',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      background: selectedCiclo === 'all' ? 'var(--primary)' : 'transparent',
                      color: selectedCiclo === 'all' ? 'white' : 'var(--text-main)',
                      fontWeight: selectedCiclo === 'all' ? 700 : 500,
                      transition: 'all 0.2s ease',
                      borderBottom: '1px solid #f1f5f9',
                      marginBottom: '4px'
                    }}
                    onMouseEnter={(e) => {
                      if (selectedCiclo !== 'all') e.currentTarget.style.background = '#f1f5f9';
                    }}
                    onMouseLeave={(e) => {
                      if (selectedCiclo !== 'all') e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    Todos os Ciclos (Consolidado)
                  </div>

                  {ciclos.map(ciclo => (
                    <div
                      key={ciclo.id_ciclo}
                      onClick={() => {
                        setSelectedCiclo(ciclo.id_ciclo);
                        setIsDropdownOpen(false);
                      }}
                      style={{
                        padding: '0.75rem 1rem',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        background: String(selectedCiclo) === String(ciclo.id_ciclo) ? 'var(--primary)' : 'transparent',
                        color: String(selectedCiclo) === String(ciclo.id_ciclo) ? 'white' : 'var(--text-main)',
                        fontWeight: String(selectedCiclo) === String(ciclo.id_ciclo) ? 700 : 500,
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (String(selectedCiclo) !== String(ciclo.id_ciclo)) {
                          e.currentTarget.style.background = '#f1f5f9';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (String(selectedCiclo) !== String(ciclo.id_ciclo)) {
                          e.currentTarget.style.background = 'transparent';
                        }
                      }}
                    >
                      {ciclo.period_name || ciclo.periodo_ciclo || `Ciclo ${ciclo.id_ciclo}`}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Abas de Navegação */}
      <div className="tab-bar">
        <button
          onClick={() => setActiveTab('geral')}
          className={`tab-button ${activeTab === 'geral' ? 'active' : ''}`}
        >
          Geral (Total)
        </button>
        <button
          onClick={() => setActiveTab('unidade')}
          className={`tab-button ${activeTab === 'unidade' ? 'active' : ''}`}
        >
          Unidade: {matchingCycle?.opm_sigla || '...'}
        </button>
        <button
          onClick={() => setActiveTab('cpm')}
          className={`tab-button ${activeTab === 'cpm' ? 'active' : ''}`}
        >
          CPM/I-Faz
        </button>
      </div>

      {/* KPIs */}
      <div className="kpi-grid" style={{
        opacity: isRefreshing ? 0.6 : 1,
        transform: isRefreshing ? 'scale(0.995)' : 'scale(1)',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
      }}>
        {[
          { icon: <TrendingUp size={22} color="#0D3878" />, label: 'Recurso Utilizado', value: formatarValor(recursoUtilizado), color: '#0D3878' },
          { icon: <Clock size={22} color="#10b981" />, label: 'SVR de 6 Horas', value: totalHoras6, color: '#10b981' },
          { icon: <Clock size={22} color="#f59e0b" />, label: 'SVR de 8 Horas', value: totalHoras8, color: '#f59e0b' },
          { icon: <Wallet size={22} color="#059669" />, label: 'Recurso Restante', value: formatarValor(recursoRestante), color: '#059669' },
        ].map(kpi => (
          <div key={kpi.label} className="glass-panel" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            padding: '1.25rem 1.5rem',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {isRefreshing && (
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(255,255,255,0.2)',
                backdropFilter: 'blur(2px)',
                zIndex: 1
              }} />
            )}
            <div style={{ background: `${kpi.color}15`, padding: '0.75rem', borderRadius: '10px' }}>{kpi.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{kpi.label}</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: kpi.color, lineHeight: 1.2 }}>{kpi.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabela de Dados */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '10rem' }}>
          <RefreshCw size={48} className="spin" style={{ color: 'var(--primary)', opacity: 0.5 }} />
          <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Sincronizando dados...</p>
        </div>
      ) : (
        <div style={{ opacity: isRefreshing ? 0.5 : 1, transition: 'opacity 0.3s' }}>
          {stats.length === 0 ? (
            <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem' }}>
              <AlertTriangle size={48} color="#f59e0b" style={{ marginBottom: '1rem' }} />
              <p style={{ color: 'var(--text-muted)' }}>Nenhum dado encontrado para este ciclo.</p>
            </div>
          ) : (
            <div className="glass-panel" style={{ padding: 0, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: 'var(--primary)', color: 'white' }}>
                    <th style={{ padding: '0.85rem 0.75rem', textAlign: 'left', fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.3px', whiteSpace: 'nowrap' }}>#</th>
                    <th onClick={() => requestSort('numero_ordem')} style={{ padding: '0.85rem 0.75rem', textAlign: 'left', fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.3px', whiteSpace: 'nowrap', cursor: 'pointer' }}>
                      N° Ordem {sortConfig.key === 'numero_ordem' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th onClick={() => requestSort('name')} style={{ padding: '0.85rem 0.75rem', textAlign: 'left', fontSize: '0.78rem', fontWeight: '600', letterSpacing: '0.3px', whiteSpace: 'nowrap', cursor: 'pointer' }}>
                      Posto / Nome {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th style={{ padding: '0.85rem 0.75rem', textAlign: 'left', fontSize: '0.78rem', fontWeight: '600', letterSpacing: '0.3px', whiteSpace: 'nowrap' }}>OPM</th>
                    <th style={{ padding: '0.85rem 0.75rem', textAlign: 'left', fontSize: '0.78rem', fontWeight: '600', letterSpacing: '0.3px', whiteSpace: 'nowrap' }}>Motorista</th>
                    <th onClick={() => requestSort('count6h')} style={{ padding: '0.85rem 0.75rem', textAlign: 'left', fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.3px', whiteSpace: 'nowrap', cursor: 'pointer' }}>
                      SVR 6h {sortConfig.key === 'count6h' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th onClick={() => requestSort('count8h')} style={{ padding: '0.85rem 0.75rem', textAlign: 'left', fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.3px', whiteSpace: 'nowrap', cursor: 'pointer' }}>
                      SVR 8h {sortConfig.key === 'count8h' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th onClick={() => requestSort('total')} style={{ padding: '0.85rem 0.75rem', textAlign: 'left', fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.3px', whiteSpace: 'nowrap', cursor: 'pointer' }}>
                      Total SVRs {sortConfig.key === 'total' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th onClick={() => requestSort('remaining')} style={{ padding: '0.85rem 0.75rem', textAlign: 'left', fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.3px', whiteSpace: 'nowrap', cursor: 'pointer' }}>
                      Restantes {sortConfig.key === 'remaining' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th onClick={() => requestSort('valorTotal')} style={{ padding: '0.85rem 0.75rem', textAlign: 'left', fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.3px', whiteSpace: 'nowrap', cursor: 'pointer' }}>
                      Valor Total {sortConfig.key === 'valorTotal' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th style={{ padding: '0.85rem 0.75rem', textAlign: 'left', fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.3px', whiteSpace: 'nowrap' }}>Situação</th>
                    <th style={{ padding: '0.85rem 1.5rem', textAlign: 'center', fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.3px', whiteSpace: 'nowrap' }}>Progresso</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedStats.map((s, idx) => {
                    const status = getStatusLabel(s.total);
                    const pct = Math.min(100, (s.total / MAX_SERVICES) * 100);
                    return (
                      <tr key={s.id} style={{ background: idx % 2 === 0 ? 'white' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '0.85rem 0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{idx + 1}</td>
                        <td style={{ padding: '0.85rem 0.75rem' }}>
                          <span style={{ background: '#e8eef7', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)' }}>
                            {s.numero_ordem}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 0.75rem' }}>
                          <div style={{ fontWeight: 600 }}>{s.rank} {s.name}</div>
                        </td>
                        <td style={{ padding: '0.85rem 0.75rem' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{s.opm}</span>
                        </td>
                        <td style={{ padding: '0.85rem 0.75rem' }}>
                          {(s.motorista === 'Sim' || s.motorista === true)
                            ? <span style={{ background: '#10b981', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>SIM</span>
                            : <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Não</span>
                          }
                        </td>
                        <td style={{ padding: '0.85rem 0.75rem', textAlign: 'center' }}>
                          <span style={{ fontWeight: 700, color: '#10b981', fontSize: '1rem' }}>{s.count6h}</span>
                        </td>
                        <td style={{ padding: '0.85rem 0.75rem', textAlign: 'center' }}>
                          <span style={{ fontWeight: 700, color: '#f59e0b', fontSize: '1rem' }}>{s.count8h}</span>
                        </td>
                        <td style={{ padding: '0.85rem 0.75rem', textAlign: 'center' }}>
                          <span style={{ fontWeight: 800, color: getStatusColor(s.total), fontSize: '1.1rem' }}>{s.total}</span>
                        </td>
                        <td style={{ padding: '0.85rem 0.75rem', textAlign: 'center' }}>
                          <span style={{ fontWeight: 700, color: s.remaining === 0 ? '#ef4444' : '#0D3878' }}>{s.remaining}</span>
                        </td>
                        <td style={{ padding: '0.85rem 0.75rem', textAlign: 'center' }}>
                          <span style={{ fontWeight: 700, color: '#059669', fontSize: '0.95rem' }}>{formatarValor(s.valorTotal)}</span>
                        </td>
                        <td style={{ padding: '0.85rem 0.75rem' }}>
                          <span style={{ background: `${status.color}18`, color: status.color, padding: '3px 10px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 600, whiteSpace: 'nowrap', border: `1px solid ${status.color}40` }}>
                            {status.text}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 1.5rem', minWidth: '160px' }}>
                          <div style={{ background: '#e2e8f0', borderRadius: '999px', height: '10px', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
                            <div style={{ width: `${pct}%`, height: '100%', borderRadius: '999px', background: getStatusColor(s.total), transition: 'width 0.4s ease' }} />
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '5px', textAlign: 'center', fontWeight: 600 }}>{s.total} / {MAX_SERVICES}</div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Nota de rodapé */}
      <p style={{ textAlign: 'right', marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        * Contagem baseada nas escalas salvas no Painel Admin. Limite: {MAX_SERVICES} serviços/mês por militar.
      </p>
    </div>
  );
}
