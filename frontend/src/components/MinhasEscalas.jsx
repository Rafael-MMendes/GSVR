import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  Calendar, Clock, MapPin, Shield, User, AlertCircle,
  Search, Filter, RotateCcw, ChevronRight, X, CheckCircle2,
  CalendarDays, Award, Briefcase, Eye, ChevronLeft,
  CalendarCheck, History, Sparkles, Building, AlertTriangle,
  Info, Users, DollarSign, ArrowUpRight
} from 'lucide-react';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001') + '/api';

export function MinhasEscalas({ user }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState({
    military: null,
    summary: {
      total_futuras: 0,
      total_escalas_ciclo: 0,
      total_executadas_ciclo: 0,
      periodo_ciclo: '',
      id_ciclo_atual: null,
      total_mes_atual: 0,
      total_realizadas_mes: 0,
      total_geral: 0,
      proxima_escala: null
    },
    schedules: []
  });

  // Filtros de busca
  const [search, setSearch] = useState('');
  const [situacaoFilter, setSituacaoFilter] = useState('todas');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('todos');
  const [selectedYear, setSelectedYear] = useState('todos');

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Modal de Detalhamento
  const [selectedEscalaId, setSelectedEscalaId] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailEscala, setDetailEscala] = useState(null);
  const [detailError, setDetailError] = useState(null);

  // Carregar dados da API
  const fetchMySchedules = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (selectedMonth !== 'todos') params.month = selectedMonth;
      if (selectedYear !== 'todos') params.year = selectedYear;
      if (situacaoFilter !== 'todas') params.situacao = situacaoFilter;
      if (search.trim()) params.search = search.trim();

      const res = await axios.get(`${API_URL}/my-schedules`, { params });
      if (res.data && res.data.success) {
        setData(res.data);
      } else {
        throw new Error(res.data?.error?.message || 'Falha ao carregar escalas.');
      }
    } catch (err) {
      console.error('Erro ao buscar minhas escalas:', err);
      const msg = err.response?.data?.error?.message || err.message || 'Erro de comunicação com o servidor.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMySchedules();
  }, [situacaoFilter, selectedMonth, selectedYear]);

  // Handler para busca manual por texto ou datas
  const handleApplyFilters = (e) => {
    if (e) e.preventDefault();
    setCurrentPage(1);
    fetchMySchedules();
  };

  const handleResetFilters = () => {
    setSearch('');
    setSituacaoFilter('todas');
    setStartDate('');
    setEndDate('');
    setSelectedMonth('todos');
    setSelectedYear('todos');
    setCurrentPage(1);
    // Recarrega sem filtros
    setTimeout(() => {
      fetchMySchedules();
    }, 10);
  };

  // Abrir Modal de Detalhamento
  const handleOpenDetail = async (id_escala) => {
    setSelectedEscalaId(id_escala);
    setDetailModalOpen(true);
    setDetailLoading(true);
    setDetailError(null);
    setDetailEscala(null);

    try {
      const res = await axios.get(`${API_URL}/my-schedules/${id_escala}`);
      if (res.data && res.data.success) {
        setDetailEscala(res.data.data);
      } else {
        throw new Error(res.data?.error?.message || 'Não foi possível carregar os detalhes desta escala.');
      }
    } catch (err) {
      console.error('Erro ao buscar detalhes da escala:', err);
      const msg = err.response?.data?.error?.message || 'Acesso negado ou escala não encontrada.';
      setDetailError(msg);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCloseDetail = () => {
    setDetailModalOpen(false);
    setSelectedEscalaId(null);
    setDetailEscala(null);
    setDetailError(null);
  };

  // Filtragem local rápida (caso haja busca digitada sem submeter formulário)
  const filteredSchedules = useMemo(() => {
    if (!data.schedules) return [];
    return data.schedules.filter(item => {
      if (!search.trim()) return true;
      const term = search.toLowerCase();
      const recursoMatch = item.nome_recurso?.toLowerCase().includes(term);
      const tipoMatch = item.tipo_servico?.toLowerCase().includes(term);
      const funcaoMatch = item.funcao?.toLowerCase().includes(term);
      const horarioMatch = item.horario_servico?.toLowerCase().includes(term);
      const dataMatch = item.data_formatada?.includes(term);
      return recursoMatch || tipoMatch || funcaoMatch || horarioMatch || dataMatch;
    });
  }, [data.schedules, search]);

  // Paginação
  const totalPages = Math.ceil(filteredSchedules.length / itemsPerPage) || 1;
  const paginatedSchedules = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredSchedules.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredSchedules, currentPage, itemsPerPage]);

  // Helper para badge de situação
  const renderSituacaoBadge = (situacao) => {
    switch (situacao) {
      case 'Hoje':
        return (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
            background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a',
            padding: '0.25rem 0.65rem', borderRadius: '9999px',
            fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em'
          }}>
            <Sparkles size={12} color="#b45309" /> Serviço de Força Tarefa de Hoje
          </span>
        );
      case 'Confirmada':
        return (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
            background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0',
            padding: '0.25rem 0.65rem', borderRadius: '9999px',
            fontSize: '0.78rem', fontWeight: 700
          }}>
            <CheckCircle2 size={12} color="#059669" /> Confirmada
          </span>
        );
      case 'Realizada':
        return (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
            background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0',
            padding: '0.25rem 0.65rem', borderRadius: '9999px',
            fontSize: '0.78rem', fontWeight: 600
          }}>
            <History size={12} color="#64748b" /> Realizada
          </span>
        );
      default:
        return (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
            background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0',
            padding: '0.25rem 0.65rem', borderRadius: '9999px',
            fontSize: '0.78rem', fontWeight: 600
          }}>
            {situacao || 'Programada'}
          </span>
        );
    }
  };

  const militarInfo = data.military || {
    posto_graduacao: user?.rank || 'Militar',
    nome_guerra: user?.nome_guerra || user?.nome_completo || 'Policial',
    matricula: user?.numero_ordem || '---',
    opm: user?.opm_sigla || '9º BPM'
  };

  const proxima = data.summary?.proxima_escala;

  // Cálculo de proximidade/dias até o próximo serviço agendado
  const daysUntilProxima = useMemo(() => {
    if (!proxima?.data_iso) return null;
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const target = new Date(proxima.data_iso + 'T00:00:00');
      const diffTime = target.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays === 0) return 'Hoje';
      if (diffDays === 1) return 'Amanhã';
      if (diffDays > 1) return `Em ${diffDays} dias`;
      if (diffDays < 0) return 'Concluído';
      return null;
    } catch {
      return null;
    }
  }, [proxima]);

  // Cálculo de progresso e cumprimento no ciclo operacional ativo
  const progressoCiclo = useMemo(() => {
    const total = Number(data.summary?.total_escalas_ciclo) || 0;
    const exec = Number(data.summary?.total_executadas_ciclo) || 0;
    if (total <= 0) return { percent: 0, text: 'Nenhuma escala no ciclo' };
    const pct = Math.min(100, Math.round((exec / total) * 100));
    return {
      percent: pct,
      text: `${exec} de ${total} serviços cumpridos`
    };
  }, [data.summary]);

  const formatCurrency = (val) => {
    if (!val) return 'R$ 192,03';
    const num = typeof val === 'number' ? val : parseFloat(val);
    if (isNaN(num)) return 'R$ 192,03';
    return 'R$ ' + num.toFixed(2).replace('.', ',');
  };

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '1.5rem 1rem' }}>

      {/* ============================================================ */}
      {/* 3.1 CABEÇALHO DA PÁGINA */}
      {/* ============================================================ */}
      <div style={{
        background: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)',
        borderRadius: '20px',
        padding: '1.75rem 2rem',
        color: '#ffffff',
        boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.25)',
        marginBottom: '1.75rem',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1.25rem'
      }}>
        <div style={{ maxWidth: '700px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.5rem' }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.15)',
              padding: '0.5rem',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <CalendarCheck size={26} color="#60a5fa" />
            </div>
            <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
              Minhas Escalas
            </h1>
          </div>
          <p style={{ margin: 0, color: '#cbd5e1', fontSize: '0.95rem', lineHeight: '1.45' }}>
            Consulte suas escalas de serviço e os detalhes dos seus próximos serviços de força tarefa.
          </p>
        </div>

        {/* Badge do Usuário Autenticado */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.16)',
          borderRadius: '14px',
          padding: '0.85rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '1rem',
            color: '#ffffff',
            boxShadow: '0 4px 10px rgba(37, 99, 235, 0.35)',
            flexShrink: 0
          }}>
            <Shield size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#93c5fd', fontWeight: 700, letterSpacing: '0.05em' }}>
              Policial Militar Autenticado
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff' }}>
              {militarInfo.posto_graduacao} {militarInfo.nome_guerra}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'flex', gap: '0.65rem', marginTop: '0.15rem' }}>
              <span>Matrícula: <strong>{militarInfo.matricula}</strong></span>
              <span>•</span>
              <span>OPM: <strong>{militarInfo.opm || '9º BPM'}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Alerta de erro caso ocorra */}
      {error && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626',
          padding: '1rem 1.25rem', borderRadius: '12px', marginBottom: '1.5rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <AlertCircle size={20} />
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{error}</span>
          </div>
          <button
            onClick={fetchMySchedules}
            style={{
              background: '#dc2626', color: '#ffffff', border: 'none',
              padding: '0.4rem 0.85rem', borderRadius: '8px', cursor: 'pointer',
              fontSize: '0.82rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem'
            }}
          >
            <RotateCcw size={14} /> Tentar Novamente
          </button>
        </div>
      )}

      {/* ============================================================ */}
      {/* 3.2 INDICADORES RESUMIDOS & HERO CARD EXPANDIDO */}
      {/* ============================================================ */}
      <style>{`
        .me-hero-container {
          display: grid;
          grid-template-columns: minmax(0, 1.28fr) minmax(0, 1fr);
          gap: 1.25rem;
          margin-bottom: 1.75rem;
          align-items: stretch;
        }
        .me-kpi-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
        .me-hero-details-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 0.75rem;
          margin-top: 1.15rem;
        }
        @media (max-width: 1024px) {
          .me-hero-container {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 580px) {
          .me-kpi-grid {
            grid-template-columns: 1fr;
          }
          .me-hero-details-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="me-hero-container">
        {/* Card Azul: Próximo Serviço de Força Tarefa Agendado (Expandido com Detalhes Operacionais) */}
        <div style={{
          background: proxima
            ? 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 55%, #1e40af 100%)'
            : 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
          color: '#ffffff',
          borderRadius: '18px',
          padding: '1.5rem 1.65rem',
          boxShadow: '0 8px 24px rgba(30, 64, 175, 0.22)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          {/* Brilho decorativo no topo */}
          <div style={{
            position: 'absolute',
            top: '-50px',
            right: '-50px',
            width: '180px',
            height: '180px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 70%)',
            pointerEvents: 'none'
          }} />

          <div>
            {/* Top Bar do Card Azul */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{
                  fontSize: '0.76rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  fontWeight: 800,
                  color: '#bfdbfe',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}>
                  <Sparkles size={14} color="#93c5fd" /> Próximo Serviço de Força Tarefa Agendado
                </span>
                {proxima && (
                  <span style={{
                    background: 'rgba(16, 185, 129, 0.25)',
                    border: '1px solid rgba(110, 231, 183, 0.4)',
                    color: '#a7f3d0',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '0.18rem 0.55rem',
                    borderRadius: '999px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem'
                  }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34d399', display: 'inline-block' }} />
                    Confirmado
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {daysUntilProxima && (
                  <span style={{
                    background: daysUntilProxima === 'Hoje' ? '#ef4444' : 'rgba(255,255,255,0.18)',
                    color: '#ffffff',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    padding: '0.2rem 0.65rem',
                    borderRadius: '8px',
                    letterSpacing: '0.02em',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                  }}>
                    {daysUntilProxima}
                  </span>
                )}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.18)',
                  padding: '0.45rem',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Clock size={18} color="#ffffff" />
                </div>
              </div>
            </div>

            {proxima ? (
              <>
                {/* Data Principal em Grande Destaque */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.65rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '1.95rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.02em' }}>
                    {proxima.data_formatada}
                  </span>
                  <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#93c5fd' }}>
                    ({proxima.dia_semana_extenso})
                  </span>
                </div>

                {/* Grid Rico de Informações Detalhadas do Serviço */}
                <div className="me-hero-details-grid">
                  {/* Item: Horário & Turno */}
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.11)',
                    backdropFilter: 'blur(6px)',
                    border: '1px solid rgba(255, 255, 255, 0.16)',
                    borderRadius: '12px',
                    padding: '0.75rem 0.85rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#bfdbfe', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                      <Clock size={13} color="#93c5fd" /> Horário do Turno
                    </div>
                    <div style={{ fontSize: '0.96rem', fontWeight: 800, color: '#ffffff' }}>
                      {proxima.horario_servico}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#cbd5e1', marginTop: '0.15rem' }}>
                      {proxima.carga_horaria ? `${proxima.carga_horaria} horas de serviço` : 'Turno escalado'}
                    </div>
                  </div>

                  {/* Item: Viatura / Guarnição */}
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.11)',
                    backdropFilter: 'blur(6px)',
                    border: '1px solid rgba(255, 255, 255, 0.16)',
                    borderRadius: '12px',
                    padding: '0.75rem 0.85rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#bfdbfe', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                      <MapPin size={13} color="#93c5fd" /> Viatura / Posto
                    </div>
                    <div style={{ fontSize: '0.96rem', fontWeight: 800, color: '#ffffff' }}>
                      {proxima.nome_recurso || 'A Definir'}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#cbd5e1', marginTop: '0.15rem' }}>
                      Guarnição escalada
                    </div>
                  </div>

                  {/* Item: Função Desempenhada */}
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.11)',
                    backdropFilter: 'blur(6px)',
                    border: '1px solid rgba(255, 255, 255, 0.16)',
                    borderRadius: '12px',
                    padding: '0.75rem 0.85rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#bfdbfe', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                      <Award size={13} color="#93c5fd" /> Função Operacional
                    </div>
                    <div style={{ fontSize: '0.96rem', fontWeight: 800, color: '#ffffff' }}>
                      {proxima.funcao || 'Patrulheiro'}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#cbd5e1', marginTop: '0.15rem' }}>
                      Designação na equipe
                    </div>
                  </div>

                  {/* Item: Remuneração Prevista */}
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.11)',
                    backdropFilter: 'blur(6px)',
                    border: '1px solid rgba(255, 255, 255, 0.16)',
                    borderRadius: '12px',
                    padding: '0.75rem 0.85rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#bfdbfe', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                      <DollarSign size={13} color="#fbbf24" /> Remuneração Prevista
                    </div>
                    <div style={{ fontSize: '0.96rem', fontWeight: 800, color: '#fef08a' }}>
                      {formatCurrency(proxima.valor_remuneracao)}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#cbd5e1', marginTop: '0.15rem' }}>
                      Indenização prevista
                    </div>
                  </div>

                  {/* Item: OPM / Unidade */}
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.11)',
                    backdropFilter: 'blur(6px)',
                    border: '1px solid rgba(255, 255, 255, 0.16)',
                    borderRadius: '12px',
                    padding: '0.75rem 0.85rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#bfdbfe', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                      <Building size={13} color="#93c5fd" /> OPM Responsável
                    </div>
                    <div style={{ fontSize: '0.96rem', fontWeight: 800, color: '#ffffff' }}>
                      {proxima.opm_sigla || '9º BPM'}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#cbd5e1', marginTop: '0.15rem' }}>
                      Batalhão da escala
                    </div>
                  </div>

                  {/* Item: Horário de Embarque / Apresentação */}
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.11)',
                    backdropFilter: 'blur(6px)',
                    border: '1px solid rgba(255, 255, 255, 0.16)',
                    borderRadius: '12px',
                    padding: '0.75rem 0.85rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#bfdbfe', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                      <Shield size={13} color="#93c5fd" /> Apresentação / Embarque
                    </div>
                    <div style={{ fontSize: '0.96rem', fontWeight: 800, color: '#ffffff' }}>
                      {proxima.horario_embarque || proxima.horario_servico?.split(' ')[0] || 'Conforme escala'}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#cbd5e1', marginTop: '0.15rem' }}>
                      Apresentar fardado
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#94a3b8' }}>
                <CalendarCheck size={44} color="#64748b" style={{ margin: '0 auto 0.75rem auto', display: 'block' }} />
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.35rem' }}>
                  Nenhum serviço futuro agendado
                </div>
                <div style={{ fontSize: '0.88rem', color: '#cbd5e1', maxWidth: '400px', margin: '0 auto' }}>
                  Você não possui novas escalas de força tarefa programadas para os próximos dias no sistema.
                </div>
              </div>
            )}
          </div>

          {/* Rodapé e Ação do Card Azul */}
          {proxima && (
            <div style={{
              marginTop: '1.25rem',
              paddingTop: '1rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.14)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem'
            }}>
              <div style={{ fontSize: '0.76rem', color: '#bfdbfe', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Shield size={14} color="#93c5fd" />
                <span>Apresentação regulamentar no posto designado.</span>
              </div>

              <button
                onClick={() => handleOpenDetail(proxima.id_escala)}
                style={{
                  background: '#ffffff',
                  color: '#1e3a8a',
                  border: 'none',
                  padding: '0.55rem 1.15rem',
                  borderRadius: '10px',
                  fontWeight: 800,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
                  transition: 'all 0.2s ease'
                }}
              >
                Ver Detalhes do Serviço de Força Tarefa <ArrowUpRight size={15} />
              </button>
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/* Painel Lateral: 4 Cards de Indicadores do Ciclo & Métricas */}
        {/* ============================================================ */}
        <div className="me-kpi-grid">
          {/* Card 1: Escalas Futuras */}
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '1.25rem 1.4rem',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, color: '#64748b' }}>
                Escalas Futuras
              </span>
              <div style={{ background: '#ecfdf5', padding: '0.45rem', borderRadius: '10px' }}>
                <CalendarDays size={18} color="#059669" />
              </div>
            </div>
            <div style={{ marginTop: '0.75rem' }}>
              <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#065f46' }}>
                {data.summary?.total_futuras || 0}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem' }}>
                Serviços de força tarefa confirmados pela frente
              </div>
            </div>
          </div>

          {/* Card 2: Total no Ciclo */}
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '1.25rem 1.4rem',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, color: '#64748b' }}>
                Total no Ciclo
              </span>
              <div style={{ background: '#eff6ff', padding: '0.45rem', borderRadius: '10px' }}>
                <Calendar size={18} color="#2563eb" />
              </div>
            </div>
            <div style={{ marginTop: '0.75rem' }}>
              <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#1e3a8a' }}>
                {data.summary?.total_escalas_ciclo ?? data.summary?.total_mes_atual ?? 0}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem' }}>
                {data.summary?.periodo_ciclo ? `Escalas no ciclo (${data.summary.periodo_ciclo})` : 'Escalas atribuídas no ciclo atual'}
              </div>
            </div>
          </div>

          {/* Card 3: Serviços Executados no Ciclo (Realocado com sucesso ao lado dos demais indicadores) */}
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '1.25rem 1.4rem',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, color: '#64748b' }}>
                Serviços Executados no Ciclo
              </span>
              <div style={{ background: '#f1f5f9', padding: '0.45rem', borderRadius: '10px' }}>
                <History size={18} color="#475569" />
              </div>
            </div>
            <div style={{ marginTop: '0.75rem' }}>
              <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#0f172a' }}>
                {data.summary?.total_executadas_ciclo ?? data.summary?.total_realizadas_mes ?? 0}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem' }}>
                Serviços cumpridos no ciclo atual
              </div>
            </div>
          </div>

          {/* Card 4: Progresso do Ciclo */}
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '1.25rem 1.4rem',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, color: '#64748b' }}>
                Progresso no Ciclo
              </span>
              <div style={{ background: '#ecfdf5', padding: '0.45rem', borderRadius: '10px' }}>
                <CheckCircle2 size={18} color="#059669" />
              </div>
            </div>
            <div style={{ marginTop: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#065f46' }}>
                  {progressoCiclo.percent}%
                </div>
                <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#059669', background: '#ecfdf5', padding: '0.2rem 0.5rem', borderRadius: '6px' }}>
                  Ciclo Ativo
                </div>
              </div>
              {/* Barra de Progresso Visual */}
              <div style={{
                width: '100%',
                height: '6px',
                background: '#f1f5f9',
                borderRadius: '999px',
                marginTop: '0.5rem',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${progressoCiclo.percent}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
                  borderRadius: '999px',
                  transition: 'width 0.4s ease'
                }} />
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.35rem' }}>
                {progressoCiclo.text}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3.4 FILTROS E PESQUISA */}
      {/* ============================================================ */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        padding: '1.25rem 1.5rem',
        border: '1px solid #e2e8f0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        marginBottom: '1.5rem'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1rem',
          flexWrap: 'wrap',
          gap: '0.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={18} color="#1e3a5f" />
            <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: '#1e293b' }}>
              Filtros de Pesquisa
            </h3>
          </div>

          {(search || situacaoFilter !== 'todas' || startDate || endDate || selectedMonth !== 'todos' || selectedYear !== 'todos') && (
            <button
              onClick={handleResetFilters}
              style={{
                background: 'none',
                border: 'none',
                color: '#dc2626',
                cursor: 'pointer',
                fontSize: '0.82rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                padding: '0.25rem 0.5rem'
              }}
            >
              <RotateCcw size={13} /> Limpar Todos os Filtros
            </button>
          )}
        </div>

        <form onSubmit={handleApplyFilters} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          {/* Campo de Pesquisa Geral */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.35rem' }}>
              Pesquisar por Local ou Serviço
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Ex: Piranhas, 6h, Patrulheiro..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.75rem 0.65rem 2.2rem',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.88rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
            </div>
          </div>

          {/* Filtro: Situação */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.35rem' }}>
              Situação da Escala
            </label>
            <select
              value={situacaoFilter}
              onChange={(e) => setSituacaoFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.75rem',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                fontSize: '0.88rem',
                background: '#ffffff',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            >
              <option value="todas">Todas as Situações</option>
              <option value="futuras">Futuras / Confirmadas</option>
              <option value="hoje">Serviço de Força Tarefa de Hoje</option>
              <option value="realizadas">Já Realizadas</option>
            </select>
          </div>

          {/* Filtro: Período Inicial */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.35rem' }}>
              Data Inicial
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{
                width: '100%',
                padding: '0.6rem 0.75rem',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                fontSize: '0.88rem',
                background: '#ffffff',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Filtro: Período Final */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.35rem' }}>
              Data Final
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{
                width: '100%',
                padding: '0.6rem 0.75rem',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                fontSize: '0.88rem',
                background: '#ffffff',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Botão de Filtrar */}
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button
              type="submit"
              style={{
                width: '100%',
                background: '#1e3a5f',
                color: '#ffffff',
                border: 'none',
                padding: '0.68rem 1rem',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.45rem',
                transition: 'background 0.2s'
              }}
            >
              <Search size={16} /> Aplicar Filtros
            </button>
          </div>
        </form>
      </div>

      {/* ============================================================ */}
      {/* 3.3 LISTAGEM DE ESCALAS & 3.6 ESTADOS DA INTERFACE */}
      {/* ============================================================ */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
        overflow: 'hidden'
      }}>
        {/* Barra de Status da Tabela */}
        <div style={{
          padding: '1rem 1.5rem',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          <div>
            <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#1e293b' }}>
              Escalas Pessoais Registradas
            </span>
            <span style={{ fontSize: '0.82rem', color: '#64748b', marginLeft: '0.5rem' }}>
              ({filteredSchedules.length} {filteredSchedules.length === 1 ? 'registro encontrado' : 'registros encontrados'})
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <label style={{ fontSize: '0.8rem', color: '#64748b' }}>Exibir:</label>
            <select
              value={itemsPerPage}
              onChange={(e) => { setItemsPerPage(parseInt(e.target.value, 10)); setCurrentPage(1); }}
              style={{
                padding: '0.35rem 0.65rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.82rem',
                background: '#ffffff',
                outline: 'none'
              }}
            >
              <option value={5}>5 por página</option>
              <option value={10}>10 por página</option>
              <option value={20}>20 por página</option>
              <option value={50}>50 por página</option>
            </select>
          </div>
        </div>

        {/* ESTADO: CARREGANDO */}
        {loading ? (
          <div style={{ padding: '3.5rem 1rem', textAlign: 'center', color: '#64748b' }}>
            <div style={{
              width: '42px', height: '42px', margin: '0 auto 1rem auto',
              border: '3px solid #e2e8f0', borderTopColor: '#1e3a5f',
              borderRadius: '50%', animation: 'spin 0.8s linear infinite'
            }} />
            <p style={{ margin: 0, fontWeight: 600, fontSize: '0.95rem' }}>Carregando suas escalas...</p>
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          </div>

        /* ESTADO: SEM ESCALAS CADASTRADAS (Usuário não possui escalas) */
        ) : data.schedules.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#64748b' }}>
            <div style={{
              width: '64px', height: '64px', margin: '0 auto 1.25rem auto',
              borderRadius: '50%', background: '#f8fafc',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <CalendarCheck size={32} color="#94a3b8" />
            </div>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.15rem', color: '#1e293b', fontWeight: 700 }}>
              Você ainda não possui escalas cadastradas
            </h3>
            <p style={{ margin: '0 auto', maxWidth: '460px', fontSize: '0.9rem', lineHeight: '1.5', color: '#64748b' }}>
              Quando a seção de planejamento publicar uma escala de serviço com sua escalação, ela aparecerá automaticamente nesta página.
            </p>
          </div>

        /* ESTADO: FILTRO SEM RESULTADOS */
        ) : filteredSchedules.length === 0 ? (
          <div style={{ padding: '3.5rem 2rem', textAlign: 'center', color: '#64748b' }}>
            <div style={{
              width: '56px', height: '56px', margin: '0 auto 1rem auto',
              borderRadius: '50%', background: '#fffbeb',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <AlertTriangle size={28} color="#d97706" />
            </div>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.05rem', color: '#1e293b', fontWeight: 700 }}>
              Nenhuma escala encontrada com os filtros selecionados
            </h3>
            <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.88rem', color: '#64748b' }}>
              Tente alterar os termos de busca ou o período selecionado.
            </p>
            <button
              onClick={handleResetFilters}
              style={{
                background: '#1e3a5f', color: '#ffffff', border: 'none',
                padding: '0.5rem 1.1rem', borderRadius: '8px', fontWeight: 700,
                fontSize: '0.85rem', cursor: 'pointer'
              }}
            >
              Limpar Filtros de Busca
            </button>
          </div>

        /* TABELA DE RESULTADOS */
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '0.9rem 1.25rem' }}>Data & Dia</th>
                  <th style={{ padding: '0.9rem 1rem' }}>Horário do Turno</th>
                  <th style={{ padding: '0.9rem 1rem' }}>Local / Recurso</th>
                  <th style={{ padding: '0.9rem 1rem' }}>Função</th>
                  <th style={{ padding: '0.9rem 1rem' }}>Tipo de Serviço</th>
                  <th style={{ padding: '0.9rem 1rem' }}>Situação</th>
                  <th style={{ padding: '0.9rem 1.25rem', textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {paginatedSchedules.map((escala, idx) => (
                  <tr
                    key={escala.id_escala || idx}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      transition: 'background 0.15s',
                      background: escala.situacao === 'Hoje' ? '#fffbeb' : '#ffffff',
                      cursor: 'pointer'
                    }}
                    onClick={() => handleOpenDetail(escala.id_escala)}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = escala.situacao === 'Hoje' ? '#fef3c7' : '#f8fafc'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = escala.situacao === 'Hoje' ? '#fffbeb' : '#ffffff'}
                  >
                    {/* Data e Dia da Semana */}
                    <td style={{ padding: '1rem 1.25rem', whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.92rem' }}>
                        {escala.data_formatada}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                        {escala.dia_semana_extenso}
                      </div>
                    </td>

                    {/* Horário */}
                    <td style={{ padding: '1rem', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#1e293b', fontWeight: 600 }}>
                        <Clock size={14} color="#64748b" />
                        <span>{escala.horario_servico}</span>
                      </div>
                      {escala.horario_embarque && (
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.15rem' }}>
                          Embarque: {escala.horario_embarque}
                        </div>
                      )}
                    </td>

                    {/* Local / Recurso */}
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, color: '#1e3a5f' }}>
                        <MapPin size={14} color="#2563eb" style={{ flexShrink: 0 }} />
                        <span>{escala.nome_recurso || 'Não especificado'}</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        OPM: {escala.opm_sigla || '9º BPM'}
                      </div>
                    </td>

                    {/* Função */}
                    <td style={{ padding: '1rem', whiteSpace: 'nowrap' }}>
                      <span style={{
                        display: 'inline-block',
                        background: '#f1f5f9',
                        color: '#1e293b',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '6px',
                        fontSize: '0.82rem',
                        fontWeight: 700
                      }}>
                        {escala.funcao || 'Patrulheiro'}
                      </span>
                    </td>

                    {/* Tipo de Serviço */}
                    <td style={{ padding: '1rem', whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: 600, color: '#334155' }}>
                        {escala.tipo_servico || `${escala.carga_horaria || 6}h`}
                      </div>
                      {escala.valor_remuneracao && (
                        <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 700 }}>
                          R$ {parseFloat(escala.valor_remuneracao).toFixed(2).replace('.', ',')}
                        </div>
                      )}
                    </td>

                    {/* Situação */}
                    <td style={{ padding: '1rem', whiteSpace: 'nowrap' }}>
                      {renderSituacaoBadge(escala.situacao)}
                    </td>

                    {/* Ação: Botão Detalhes */}
                    <td style={{ padding: '1rem 1.25rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDetail(escala.id_escala);
                        }}
                        style={{
                          background: '#f1f5f9',
                          color: '#1e3a5f',
                          border: 'none',
                          padding: '0.45rem 0.85rem',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          transition: 'all 0.15s'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#1e3a5f'; e.currentTarget.style.color = '#ffffff'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#1e3a5f'; }}
                      >
                        <Eye size={14} /> Detalhes
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Controles de Paginação */}
        {filteredSchedules.length > itemsPerPage && (
          <div style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
              Mostrando {Math.min((currentPage - 1) * itemsPerPage + 1, filteredSchedules.length)} a {Math.min(currentPage * itemsPerPage, filteredSchedules.length)} de {filteredSchedules.length} escalas
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{
                  background: currentPage === 1 ? '#f8fafc' : '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: currentPage === 1 ? '#94a3b8' : '#1e293b',
                  padding: '0.4rem 0.75rem',
                  borderRadius: '8px',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  fontSize: '0.82rem',
                  fontWeight: 600
                }}
              >
                <ChevronLeft size={14} /> Anterior
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', margin: '0 0.35rem' }}>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pNum = i + 1;
                  if (totalPages > 5 && currentPage > 3) {
                    pNum = currentPage - 2 + i;
                    if (pNum > totalPages) pNum = totalPages - (4 - i);
                  }
                  return (
                    <button
                      key={pNum}
                      onClick={() => setCurrentPage(pNum)}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        border: pNum === currentPage ? 'none' : '1px solid #e2e8f0',
                        background: pNum === currentPage ? '#1e3a5f' : '#ffffff',
                        color: pNum === currentPage ? '#ffffff' : '#1e293b',
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        cursor: 'pointer'
                      }}
                    >
                      {pNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                style={{
                  background: currentPage === totalPages ? '#f8fafc' : '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: currentPage === totalPages ? '#94a3b8' : '#1e293b',
                  padding: '0.4rem 0.75rem',
                  borderRadius: '8px',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  fontSize: '0.82rem',
                  fontWeight: 600
                }}
              >
                Próxima <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* 3.5 MODAL DE DETALHAMENTO DA ESCALA (AUTORIZADO NO BACKEND) */}
      {/* ============================================================ */}
      {detailModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}
        onClick={handleCloseDetail}
        >
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            maxWidth: '640px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid #e2e8f0',
            position: 'relative'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            {/* Header do Modal */}
            <div style={{
              padding: '1.25rem 1.75rem',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#f8fafc',
              borderTopLeftRadius: '20px',
              borderTopRightRadius: '20px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ background: '#eff6ff', padding: '0.45rem', borderRadius: '10px' }}>
                  <CalendarCheck size={20} color="#2563eb" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#1e293b' }}>
                    Detalhes da Escala de Serviço
                  </h3>
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    ID da Escala: #{selectedEscalaId}
                  </div>
                </div>
              </div>

              <button
                onClick={handleCloseDetail}
                style={{
                  background: 'none', border: 'none', color: '#64748b',
                  cursor: 'pointer', padding: '0.4rem', borderRadius: '8px'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Conteúdo do Modal */}
            <div style={{ padding: '1.75rem' }}>
              {detailLoading ? (
                <div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#64748b' }}>
                  <div style={{
                    width: '36px', height: '36px', margin: '0 auto 1rem auto',
                    border: '3px solid #e2e8f0', borderTopColor: '#1e3a5f',
                    borderRadius: '50%', animation: 'spin 0.8s linear infinite'
                  }} />
                  <p style={{ margin: 0, fontWeight: 600 }}>Validando e consultando detalhes autorizados...</p>
                </div>
              ) : detailError ? (
                <div style={{
                  background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626',
                  padding: '1.25rem', borderRadius: '12px', textAlign: 'center'
                }}>
                  <AlertCircle size={32} style={{ margin: '0 auto 0.5rem auto' }} />
                  <h4 style={{ margin: '0 0 0.35rem 0', fontWeight: 800 }}>Acesso Restrito ou Não Localizado</h4>
                  <p style={{ margin: 0, fontSize: '0.88rem' }}>{detailError}</p>
                </div>
              ) : detailEscala ? (
                <div>
                  {/* Banner de Destaque da Escala */}
                  <div style={{
                    background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                    borderRadius: '14px',
                    padding: '1.25rem',
                    marginBottom: '1.5rem',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '1rem'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                        Data do Serviço de Força Tarefa
                      </div>
                      <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#0f172a' }}>
                        {detailEscala.data_formatada}
                      </div>
                      <div style={{ fontSize: '0.88rem', color: '#2563eb', fontWeight: 700 }}>
                        {detailEscala.dia_semana_extenso}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ marginBottom: '0.35rem' }}>
                        {renderSituacaoBadge(detailEscala.situacao)}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        Ciclo: <strong>{detailEscala.periodo_ciclo || 'Ativo'}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Grid de Informações Chave */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ background: '#ffffff', border: '1px solid #f1f5f9', borderRadius: '12px', padding: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#64748b', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                        <Clock size={15} color="#2563eb" /> HORÁRIO DE SERVIÇO
                      </div>
                      <div style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b' }}>
                        {detailEscala.horario_servico}
                      </div>
                      {detailEscala.horario_embarque && (
                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem' }}>
                          Horário de Embarque: <strong>{detailEscala.horario_embarque}</strong>
                        </div>
                      )}
                    </div>

                    <div style={{ background: '#ffffff', border: '1px solid #f1f5f9', borderRadius: '12px', padding: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#64748b', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                        <MapPin size={15} color="#dc2626" /> LOCAL / POSTO DE SERVIÇO
                      </div>
                      <div style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b' }}>
                        {detailEscala.nome_recurso}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem' }}>
                        OPM Responsável: <strong>{detailEscala.opm_sigla || '9º BPM'}</strong>
                      </div>
                    </div>

                    <div style={{ background: '#ffffff', border: '1px solid #f1f5f9', borderRadius: '12px', padding: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#64748b', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                        <Briefcase size={15} color="#059669" /> FUNÇÃO DO POLICIAL
                      </div>
                      <div style={{ fontSize: '1rem', fontWeight: 800, color: '#065f46' }}>
                        {detailEscala.funcao || 'Patrulheiro'}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem' }}>
                        Atribuído: <strong>{militarInfo.posto_graduacao} {militarInfo.nome_guerra}</strong>
                      </div>
                    </div>

                    <div style={{ background: '#ffffff', border: '1px solid #f1f5f9', borderRadius: '12px', padding: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#64748b', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                        <DollarSign size={15} color="#d97706" /> MODALIDADE & REMUNERAÇÃO
                      </div>
                      <div style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b' }}>
                        {detailEscala.tipo_servico || `${detailEscala.carga_horaria || 6} Horas`}
                      </div>
                      {detailEscala.valor_remuneracao && (
                        <div style={{ fontSize: '0.82rem', color: '#059669', fontWeight: 700, marginTop: '0.2rem' }}>
                          Previsto: R$ {parseFloat(detailEscala.valor_remuneracao).toFixed(2).replace('.', ',')}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Observações da Escala */}
                  {detailEscala.observacoes && (
                    <div style={{
                      background: '#fffbeb', border: '1px solid #fef3c7',
                      borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#92400e', fontWeight: 700, fontSize: '0.82rem', marginBottom: '0.35rem' }}>
                        <Info size={16} /> OBSERVAÇÕES E INSTRUÇÕES
                      </div>
                      <div style={{ fontSize: '0.88rem', color: '#78350f', lineHeight: '1.45' }}>
                        {detailEscala.observacoes}
                      </div>
                    </div>
                  )}

                  {/* Equipe / Companheiros de Guarnição (Apenas Posto e Nome de Guerra) */}
                  {detailEscala.equipe && detailEscala.equipe.length > 0 && (
                    <div style={{ marginTop: '1.5rem', borderTop: '1px solid #f1f5f9', paddingTop: '1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.75rem' }}>
                        <Users size={16} color="#1e3a5f" />
                        <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#1e293b' }}>
                          Composição da Guarnição
                        </h4>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {detailEscala.equipe.map((membro, mIdx) => (
                          <div
                            key={mIdx}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '0.65rem 0.85rem',
                              borderRadius: '8px',
                              background: membro.is_current_user ? '#eff6ff' : '#f8fafc',
                              border: membro.is_current_user ? '1px solid #bfdbfe' : '1px solid #e2e8f0'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                              <div style={{
                                width: '28px', height: '28px', borderRadius: '50%',
                                background: membro.is_current_user ? '#2563eb' : '#94a3b8',
                                color: '#ffffff', display: 'flex', alignItems: 'center',
                                justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800
                              }}>
                                {membro.nome_guerra ? membro.nome_guerra.substring(0, 2).toUpperCase() : 'PM'}
                              </div>
                              <div>
                                <span style={{ fontWeight: 800, color: '#1e293b', fontSize: '0.88rem' }}>
                                  {membro.posto_graduacao} {membro.nome_guerra}
                                </span>
                                {membro.is_current_user && (
                                  <span style={{ marginLeft: '0.5rem', fontSize: '0.72rem', background: '#2563eb', color: '#ffffff', padding: '0.15rem 0.45rem', borderRadius: '999px', fontWeight: 700 }}>
                                    Você
                                  </span>
                                )}
                              </div>
                            </div>
                            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569' }}>
                              {membro.funcao}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {/* Rodapé do Modal */}
            <div style={{
              padding: '1rem 1.75rem',
              borderTop: '1px solid #f1f5f9',
              display: 'flex',
              justifyContent: 'flex-end',
              background: '#f8fafc',
              borderBottomLeftRadius: '20px',
              borderBottomRightRadius: '20px'
            }}>
              <button
                onClick={handleCloseDetail}
                style={{
                  background: '#1e3a5f',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.55rem 1.25rem',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: 'pointer'
                }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
export default MinhasEscalas;
