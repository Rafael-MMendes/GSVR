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

const getCycleDays = (dataInicio, dataFim) => {
  if (!dataInicio || !dataFim) {
    return Array.from({ length: 31 }, (_, i) => ({ day: i + 1, month: null, monthShort: null, year: null }));
  }
  const start = new Date(String(dataInicio).split('T')[0] + 'T12:00:00');
  const end = new Date(String(dataFim).split('T')[0] + 'T12:00:00');
  const days = [];
  const cur = new Date(start);
  while (cur <= end) {
    days.push({
      day: cur.getDate(),
      month: cur.getMonth() + 1,
      year: cur.getFullYear(),
      monthShort: cur.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase()
    });
    cur.setDate(cur.getDate() + 1);
  }
  return days;
};

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

  // Grade de Disponibilidade (Modulo Historico Militar / Relatorio Individual)
  const [ciclos, setCiclos] = useState([]);
  const [selectedCiclo, setSelectedCiclo] = useState(null);
  const [gridDisp, setGridDisp] = useState([]);
  const [gridLoading, setGridLoading] = useState(false);

  // Carrega ciclos disponíveis
  useEffect(() => {
    const fetchCiclos = async () => {
      try {
        const res = await axios.get(`${API_URL}/ciclos`);
        if (Array.isArray(res.data)) {
          setCiclos(res.data);
          const active = res.data.find(c => c.status === 'Aberto') || res.data[0];
          if (active && !selectedCiclo) {
            setSelectedCiclo(active.id_ciclo);
          }
        }
      } catch (e) {
        console.error('Erro ao carregar ciclos:', e);
      }
    };
    fetchCiclos();
  }, []);

  // Sincroniza ciclo selecionado com o ciclo ativo da resposta de escalas
  useEffect(() => {
    if (data.summary?.id_ciclo_atual && !selectedCiclo) {
      setSelectedCiclo(data.summary.id_ciclo_atual);
    }
  }, [data.summary?.id_ciclo_atual]);

  // Carrega a Grade de Disponibilidade para o militar autenticado e ciclo selecionado
  useEffect(() => {
    const militarId = data.military?.id_militar;
    if (!militarId || !selectedCiclo) return;

    const fetchGrid = async () => {
      setGridLoading(true);
      try {
        const res = await axios.get(
          `${API_URL}/reports/disponibilidade-grid?id_militar=${militarId}&ciclo_id=${selectedCiclo}`
        );
        setGridDisp(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error('Erro ao carregar grade de disponibilidade:', err);
        setGridDisp([]);
      } finally {
        setGridLoading(false);
      }
    };

    fetchGrid();
  }, [data.military?.id_militar, selectedCiclo]);

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
      const res = await axios.get(`${API_URL}/my-schedules`);
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
  }, []);

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


  const SHIFTS = [
    "07:00 ÀS 13:00",
    "13:00 ÀS 19:00",
    "19:00 ÀS 01:00",
    "01:00 ÀS 07:00"
  ];

  const cicloDadosAtual = useMemo(() => {
    if (!selectedCiclo || !ciclos.length) return null;
    return ciclos.find(c => String(c.id_ciclo) === String(selectedCiclo)) || null;
  }, [selectedCiclo, ciclos]);

  const cycleDays = useMemo(() => {
    return getCycleDays(cicloDadosAtual?.data_inicio, cicloDadosAtual?.data_fim);
  }, [cicloDadosAtual]);

  const byDayGrid = useMemo(() => {
    const byDay = {};
    gridDisp.forEach(r => {
      if (!byDay[r.dia_mes]) byDay[r.dia_mes] = {};
      byDay[r.dia_mes][r.horario_turno] = r;
    });
    return byDay;
  }, [gridDisp]);

  const getCellCfg = (cell) => {
    if (!cell || (cell.ativo !== true && cell.ativo !== false && !cell.teve_execucao)) return null;
    if (cell.teve_execucao)
      return { bg: '#059669', border: '#047857', xColor: '#fff', label: 'Executado', title: 'Serviço executado' };
    if (cell.ativo === true)
      return { bg: '#2563eb', border: '#1d4ed8', xColor: '#fff', label: 'Disponível', title: 'Disponível' };
    if (cell.ativo === false)
      return { bg: '#dc2626', border: '#b91c1c', xColor: '#fff', label: 'Desistência', title: 'Desistência' };
    return null;
  };

  const gridKPIs = useMemo(() => {
    const uniqueDays = new Set(
      gridDisp
        .filter(r => r.ativo === true || r.teve_execucao)
        .map(r => r.dia_mes)
    );
    const executadosCount = gridDisp.filter(r => r.teve_execucao).length;
    const disponiveisCount = gridDisp.filter(r => r.ativo === true).length;
    return {
      diasDisponiveis: uniqueDays.size,
      turnosExecutados: executadosCount,
      turnosDisponiveis: disponiveisCount
    };
  }, [gridDisp]);

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
              <CalendarCheck size={26} color="#fefeffff" />
            </div>
            <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff' }}>
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
          grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr);
          gap: 1.25rem;
          margin-bottom: 1.75rem;
          align-items: stretch;
          width: 100%;
          box-sizing: border-box;
        }
        .me-kpi-panel {
          display: flex;
          flex-direction: column;
          gap: 1.15rem;
          min-width: 0;
          width: 100%;
          box-sizing: border-box;
          justify-content: space-between;
        }
        .me-cycle-stats-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 0.85rem;
          margin-top: 0.85rem;
        }
        .me-hero-details-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 0.75rem;
          margin-top: 1.15rem;
        }
        @media (max-width: 1024px) {
          .me-hero-container {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 640px) {
          .me-cycle-stats-grid {
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
                <span>local de embarque; 30 minutos de antecedência na sede do 9º BPM.</span>
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
        {/* Painel Lateral: Indicadores do Ciclo (Unificado) & Guarnição */}
        {/* ============================================================ */}
        <div className="me-kpi-panel">
          {/* Card 1: Indicadores do Ciclo (Unifica: Escalas Futuras, Serviços Executados no Ciclo e Total no Ciclo) */}
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '1.25rem 1.4rem',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minWidth: 0,
            boxSizing: 'border-box'
          }}>
            {/* Top Bar do Card de Indicadores */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', minWidth: 0 }}>
                <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800, color: '#334155' }}>
                  Indicadores do Ciclo
                </span>
                {data.summary?.periodo_ciclo && (
                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    color: '#2563eb',
                    background: '#eff6ff',
                    padding: '0.12rem 0.45rem',
                    borderRadius: '6px',
                    border: '1px solid #bfdbfe',
                    whiteSpace: 'nowrap'
                  }}>
                    {data.summary.periodo_ciclo}
                  </span>
                )}
              </div>
              <div style={{ background: '#eff6ff', padding: '0.4rem', borderRadius: '10px', flexShrink: 0 }}>
                <CalendarCheck size={18} color="#2563eb" />
              </div>
            </div>

            {/* Grid com as 3 Métricas Unificadas */}
            <div className="me-cycle-stats-grid">
              {/* Métrica 1: Escalas Futuras */}
              <div style={{
                background: '#f8fafc',
                borderRadius: '12px',
                padding: '0.85rem 0.95rem',
                border: '1px solid #f1f5f9',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minWidth: 0
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.35rem' }}>
                  <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700, color: '#64748b' }}>
                    Escalas Futuras
                  </span>
                  <div style={{ background: '#ecfdf5', padding: '0.35rem', borderRadius: '8px', flexShrink: 0 }}>
                    <CalendarDays size={15} color="#059669" />
                  </div>
                </div>
                <div style={{ marginTop: '0.45rem' }}>
                  <div style={{ fontSize: '1.65rem', fontWeight: 900, color: '#065f46', lineHeight: 1.1 }}>
                    {data.summary?.total_futuras || 0}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.2rem' }}>
                    Confirmadas à frente
                  </div>
                </div>
              </div>

              {/* Métrica 2: Serviços Executados no Ciclo */}
              <div style={{
                background: '#f8fafc',
                borderRadius: '12px',
                padding: '0.85rem 0.95rem',
                border: '1px solid #f1f5f9',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minWidth: 0
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.35rem' }}>
                  <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700, color: '#64748b' }}>
                    Executados no Ciclo
                  </span>
                  <div style={{ background: '#f1f5f9', padding: '0.35rem', borderRadius: '8px', flexShrink: 0 }}>
                    <History size={15} color="#475569" />
                  </div>
                </div>
                <div style={{ marginTop: '0.45rem' }}>
                  <div style={{ fontSize: '1.65rem', fontWeight: 900, color: '#0f172a', lineHeight: 1.1 }}>
                    {data.summary?.total_executadas_ciclo ?? data.summary?.total_realizadas_mes ?? 0}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.2rem' }}>
                    Serviços cumpridos
                  </div>
                </div>
              </div>

              {/* Métrica 3: Total no Ciclo */}
              <div style={{
                background: '#f8fafc',
                borderRadius: '12px',
                padding: '0.85rem 0.95rem',
                border: '1px solid #f1f5f9',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minWidth: 0
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.35rem' }}>
                  <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700, color: '#64748b' }}>
                    Total no Ciclo
                  </span>
                  <div style={{ background: '#eff6ff', padding: '0.35rem', borderRadius: '8px', flexShrink: 0 }}>
                    <Calendar size={15} color="#2563eb" />
                  </div>
                </div>
                <div style={{ marginTop: '0.45rem' }}>
                  <div style={{ fontSize: '1.65rem', fontWeight: 900, color: '#1e3a8a', lineHeight: 1.1 }}>
                    {data.summary?.total_escalas_ciclo ?? data.summary?.total_mes_atual ?? 0}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.2rem' }}>
                    Escalas atribuídas
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Composição da Guarnição do Próximo Serviço de Força Tarefa */}
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '1.25rem 1.4rem',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minWidth: 0,
            boxSizing: 'border-box',
            flex: 1
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', minWidth: 0 }}>
                <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800, color: '#334155' }}>
                  Composição da Guarnição
                </span>
                {proxima?.nome_recurso && (
                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    color: '#1d4ed8',
                    background: '#eff6ff',
                    padding: '0.12rem 0.45rem',
                    borderRadius: '6px',
                    border: '1px solid #bfdbfe',
                    whiteSpace: 'nowrap'
                  }}>
                    {proxima.nome_recurso}
                  </span>
                )}
              </div>
              <div style={{ background: '#eff6ff', padding: '0.4rem', borderRadius: '10px', flexShrink: 0 }}>
                <Users size={18} color="#2563eb" />
              </div>
            </div>

            <div style={{ marginTop: '0.65rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              {proxima ? (
                proxima.guarnicao && proxima.guarnicao.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    {proxima.guarnicao.map((m, idx) => {
                      const funcaoLower = (m.funcao || '').toLowerCase();
                      const isCmd = funcaoLower.includes('comandante');
                      const isMot = funcaoLower.includes('motorista');
                      const badgeBg = isCmd ? '#fef3c7' : isMot ? '#dcfce7' : '#f1f5f9';
                      const badgeColor = isCmd ? '#92400e' : isMot ? '#166534' : '#475569';

                      return (
                        <div
                          key={m.id_escala || idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.35rem 0.65rem',
                            borderRadius: '8px',
                            background: m.is_current_user ? '#eff6ff' : '#f8fafc',
                            border: m.is_current_user ? '1px solid #bfdbfe' : '1px solid #f1f5f9',
                            gap: '0.5rem',
                            minWidth: 0
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', minWidth: 0, flex: 1 }}>
                            <span style={{
                              fontSize: '0.67rem',
                              fontWeight: 800,
                              textTransform: 'uppercase',
                              padding: '0.15rem 0.45rem',
                              borderRadius: '5px',
                              background: badgeBg,
                              color: badgeColor,
                              flexShrink: 0,
                              letterSpacing: '0.02em'
                            }}>
                              {m.funcao || 'Membro'}
                            </span>
                            <span
                              style={{
                                fontSize: '0.82rem',
                                fontWeight: m.is_current_user ? 800 : 600,
                                color: m.is_current_user ? '#1e3a8a' : '#1e293b',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                minWidth: 0
                              }}
                              title={`${m.posto_graduacao || ''} ${m.nome_guerra || ''}`}
                            >
                              {m.posto_graduacao} {m.nome_guerra}
                            </span>
                          </div>
                          {m.is_current_user && (
                            <span style={{
                              fontSize: '0.65rem',
                              fontWeight: 800,
                              background: '#2563eb',
                              color: '#ffffff',
                              padding: '0.12rem 0.45rem',
                              borderRadius: '4px',
                              textTransform: 'uppercase',
                              letterSpacing: '0.03em',
                              flexShrink: 0
                            }}>
                              Você
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ padding: '0.35rem 0' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e3a8a' }}>
                      {proxima.funcao || 'Escalado'}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.15rem' }}>
                      {militarInfo.posto_graduacao} {militarInfo.nome_guerra} (Você)
                    </div>
                  </div>
                )
              ) : (
                <div style={{ textAlign: 'center', padding: '0.5rem 0', color: '#94a3b8' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>Sem guarnição agendada</div>
                  <div style={{ fontSize: '0.76rem', color: '#94a3b8', marginTop: '0.15rem' }}>Aguardando próxima escala</div>
                </div>
              )}
            </div>

            {proxima && (
              <div style={{
                fontSize: '0.74rem',
                color: '#64748b',
                marginTop: '0.55rem',
                paddingTop: '0.45rem',
                borderTop: '1px solid #f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                minWidth: 0
              }}>
                <span style={{ fontWeight: 600, color: '#475569' }}>
                  Próximo Serviço Agendado
                </span>
                <span style={{ fontWeight: 700, color: '#2563eb' }}>
                  {proxima.data_formatada} ({proxima.dia_semana_extenso?.split('-')[0] || ''})
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3.3 GRADE DE DISPONIBILIDADE DO MILITAR (MODULO HISTORICO)   */}
      {/* ============================================================ */}
      <div style={{
        background: '#ffffff',
        borderRadius: '18px',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        boxShadow: '0 4px 15px rgba(0,0,0,0.04)',
        marginBottom: '2rem'
      }}>
        {/* Cabeçalho da Grade de Disponibilidade */}
        <div style={{
          padding: '1.25rem 1.75rem',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          background: '#ffffff'
        }}>
          {/* Lado Esquerdo: Título & Badge de Ciclo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(37, 99, 235, 0.15)'
            }}>
              <CalendarCheck size={22} color="#1d4ed8" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '1.15rem' }}>
                  Grade de Disponibilidade
                </span>
                {cicloDadosAtual?.periodo_ciclo && (
                  <span style={{
                    background: '#eff6ff',
                    color: '#1d4ed8',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.6rem',
                    borderRadius: '8px',
                    border: '1px solid #bfdbfe'
                  }}>
                    {cicloDadosAtual.periodo_ciclo}
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.15rem' }}>
                Mapa de turnos e dias com requerimentos ativos e serviços cumpridos no ciclo
              </div>
            </div>
          </div>

          {/* Lado Direito: Seletor de Ciclo & Legenda Visual */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
            {/* Seletor de Ciclo */}
            {ciclos.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Ciclo:</label>
                <select
                  value={selectedCiclo || ''}
                  onChange={(e) => setSelectedCiclo(parseInt(e.target.value, 10))}
                  style={{
                    padding: '0.4rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    color: '#1e293b',
                    background: '#ffffff',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {ciclos.map(c => (
                    <option key={c.id_ciclo} value={c.id_ciclo}>
                      Ciclo {c.id_ciclo} ({c.periodo_ciclo || c.period_name}) {c.status === 'Aberto' ? '— Ativo' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Legenda Visual */}
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ width: 12, height: 12, borderRadius: '3px', background: '#059669' }} /> Executado
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ width: 12, height: 12, borderRadius: '3px', background: '#2563eb' }} /> Disponível
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ width: 12, height: 12, borderRadius: '3px', background: '#dc2626' }} /> Desistência
              </span>
            </div>
          </div>
        </div>

        {/* Resumo Rápido da Disponibilidade no Ciclo */}
        <div style={{
          padding: '0.75rem 1.75rem',
          background: '#f8fafc',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          gap: '1.5rem',
          flexWrap: 'wrap',
          fontSize: '0.82rem',
          color: '#475569'
        }}>
          <span>Dias com Disponibilidade: <strong style={{ color: '#0f172a' }}>{gridKPIs.diasDisponiveis} dias</strong></span>
          <span>•</span>
          <span>Turnos com Requerimento Ativo: <strong style={{ color: '#2563eb' }}>{gridKPIs.turnosDisponiveis} turnos</strong></span>
          <span>•</span>
          <span>Turnos Executados no Ciclo: <strong style={{ color: '#059669' }}>{gridKPIs.turnosExecutados} turnos</strong></span>
        </div>

        {/* Conteúdo da Tabela da Grade */}
        <div style={{ padding: '1.25rem 1.5rem' }}>
          {gridLoading ? (
            <div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#64748b' }}>
              <div style={{
                width: '36px', height: '36px', margin: '0 auto 0.75rem auto',
                border: '3px solid #e2e8f0', borderTopColor: '#2563eb',
                borderRadius: '50%', animation: 'spin 0.8s linear infinite'
              }} />
              <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem' }}>Carregando grade de disponibilidade...</p>
            </div>
          ) : gridDisp.length === 0 ? (
            <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: '#94a3b8' }}>
              <Calendar size={40} color="#cbd5e1" style={{ margin: '0 auto 0.75rem auto', display: 'block' }} />
              <div style={{ fontWeight: 700, color: '#475569', fontSize: '1rem', marginBottom: '0.25rem' }}>
                Nenhum requerimento de disponibilidade registrado para este ciclo
              </div>
              <div style={{ fontSize: '0.84rem' }}>
                Você não cadastrou requerimentos de voluntariado ou não há registros de disponibilidade cadastrados no ciclo selecionado.
              </div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto', paddingBottom: '0.5rem' }}>
              <table style={{ borderCollapse: 'separate', borderSpacing: '2px', width: '100%', tableLayout: 'fixed', minWidth: '780px' }}>
                <thead>
                  <tr>
                    <th style={{
                      width: '110px',
                      padding: '0.35rem 0.5rem 0.35rem 0',
                      fontSize: '0.72rem',
                      color: '#64748b',
                      fontWeight: 800,
                      textAlign: 'left',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      position: 'sticky',
                      left: 0,
                      background: '#ffffff',
                      zIndex: 2
                    }}>
                      Turno
                    </th>
                    {cycleDays.map((dayObj, idx) => {
                      const showMonth = idx === 0 || cycleDays[idx - 1].month !== dayObj.month;
                      return (
                        <th key={`${dayObj.year}-${dayObj.month}-${dayObj.day}`} style={{ padding: '0.2rem 0', fontSize: '0.7rem', color: '#475569', fontWeight: 800, textAlign: 'center', lineHeight: 1.15 }}>
                          {showMonth && (
                            <div style={{ fontSize: '0.58rem', color: '#2563eb', fontWeight: 800, letterSpacing: '0.03em' }}>{dayObj.monthShort}</div>
                          )}
                          <div style={{ fontSize: '0.75rem', color: '#0f172a' }}>{dayObj.day}</div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {SHIFTS.map(turno => (
                    <tr key={turno}>
                      <td style={{
                        padding: '0.35rem 0.5rem 0.35rem 0',
                        fontSize: '0.75rem',
                        color: '#1e293b',
                        fontWeight: 800,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        position: 'sticky',
                        left: 0,
                        background: '#ffffff',
                        zIndex: 2
                      }}>
                        {turno}
                      </td>
                      {cycleDays.map(dayObj => {
                        const dateKey = `${dayObj.year}-${String(dayObj.month).padStart(2, '0')}-${String(dayObj.day).padStart(2, '0')}`;
                        const dayStr = String(dayObj.day);
                        const cell = byDayGrid[dateKey]?.[turno] || byDayGrid[dayStr]?.[turno];
                        const cfg = getCellCfg(cell);
                        const dateFormatted = `${String(dayObj.day).padStart(2, '0')}/${String(dayObj.month).padStart(2, '0')}/${dayObj.year}`;
                        return (
                          <td key={`${dayObj.year}-${dayObj.month}-${dayObj.day}`} style={{ padding: 0, textAlign: 'center' }}>
                            {cfg ? (
                              <div
                                title={`${dateFormatted} — ${turno} — ${cfg.title}`}
                                style={{
                                  width: '100%',
                                  aspectRatio: '1/1',
                                  maxWidth: '24px',
                                  borderRadius: '5px',
                                  background: cfg.bg,
                                  border: `1px solid ${cfg.border}`,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  margin: 'auto',
                                  transition: 'transform 0.15s ease',
                                  cursor: 'help',
                                  boxShadow: '0 1px 2px rgba(0,0,0,0.06)'
                                }}
                              >
                                <span style={{ color: cfg.xColor, fontWeight: 900, fontSize: '0.65rem' }}>✕</span>
                              </div>
                            ) : (
                              <div
                                title={`${dateFormatted} — ${turno} — Não informado`}
                                style={{
                                  width: '100%',
                                  aspectRatio: '1/1',
                                  maxWidth: '24px',
                                  borderRadius: '5px',
                                  background: '#f8fafc',
                                  margin: 'auto',
                                  border: '1px dashed #e2e8f0'
                                }}
                              />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
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
