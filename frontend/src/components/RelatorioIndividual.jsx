import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  ArrowLeft, User, Shield, CheckCircle, XCircle, AlertTriangle,
  Info, BarChart3, Calendar, Clock, FileText, TrendingUp, Award,
  ChevronDown, Filter, Printer, CalendarCheck
} from 'lucide-react';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001') + '/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  'Planejado e Executado': { color: '#059669', bg: '#f0fdf4', border: '#bbf7d0', icon: <CheckCircle size={14} />, label: 'Planejado e Executado' },
  'Planejado e não Executado': { color: '#dc2626', bg: '#fef2f2', border: '#fecaca', icon: <XCircle size={14} />, label: 'Falta (P e não E)' },
  'Executado e não Planejado': { color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', icon: <Info size={14} />, label: 'Extra (E e não P)' },
  'Desistência de Requerimento': { color: '#d97706', bg: '#fffbeb', border: '#fde68a', icon: <AlertTriangle size={14} />, label: 'Desistência' },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { color: '#64748b', bg: '#f8fafc', border: '#e2e8f0', icon: <Info size={14} />, label: status };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
      padding: '3px 10px', borderRadius: '20px',
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
      fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap'
    }}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

function KPICard({ label, value, icon, color, bg, subtitle }) {
  return (
    <div style={{
      background: '#fff', borderRadius: '14px', padding: '1.25rem 1.5rem',
      border: `1px solid #e2e8f0`, display: 'flex', alignItems: 'center', gap: '1rem',
      boxShadow: '0 1px 8px rgba(0,0,0,0.04)', flex: '1 1 160px', minWidth: '160px'
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: '12px', background: bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color, flexShrink: 0
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginTop: '0.25rem' }}>{label}</div>
        {subtitle && <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{subtitle}</div>}
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export function RelatorioIndividual({ idMilitar, cicloId, onBack }) {
  const [data, setData] = useState([]);
  const [ciclos, setCiclos] = useState([]);
  const [selectedCiclo, setSelectedCiclo] = useState(cicloId || 'all');
  const [militar, setMilitar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [gridDisp, setGridDisp] = useState([]);

  // Busca dados
  useEffect(() => {
    if (!idMilitar) return;
    const load = async () => {
      setLoading(true);
      try {
        const [ciclosRes, reportRes] = await Promise.all([
          axios.get(`${API_URL}/ciclos`),
          axios.get(`${API_URL}/reports/operacional-detalhado?ciclo_id=${selectedCiclo}`),
        ]);
        setCiclos(ciclosRes.data);

        const registros = reportRes.data.filter(r => String(r.id_militar) === String(idMilitar));

        if (registros.length > 0) {
          setMilitar({
            id_militar: registros[0].id_militar,
            nome_guerra: registros[0].nome_guerra,
            matricula: registros[0].matricula,
            posto_graduacao: registros[0].posto_graduacao,
          });
        } else {
          // Tenta buscar do efetivo diretamente se não há registros no período
          try {
            const efRes = await axios.get(`${API_URL}/efetivo/${idMilitar}`);
            setMilitar(efRes.data);
          } catch (_) { }
        }

        setData(registros);

        // Busca grade de disponibilidade (só quando ciclo específico selecionado)
        if (selectedCiclo && selectedCiclo !== 'all') {
          try {
            const gridRes = await axios.get(
              `${API_URL}/reports/disponibilidade-grid?id_militar=${idMilitar}&ciclo_id=${selectedCiclo}`
            );
            setGridDisp(gridRes.data);
          } catch (_) {
            setGridDisp([]);
          }
        } else {
          setGridDisp([]);
        }
      } catch (err) {
        console.error('Erro ao carregar relatório individual:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [idMilitar, selectedCiclo]);

  // KPIs agregados
  const kpis = useMemo(() => {
    const result = { executados: 0, planejados: 0, match: 0, falta: 0, extra: 0, desistencia: 0, dias_disponiveis: 0 };
    let diasCapturado = false;
    data.forEach(item => {
      // Captura dias_disponiveis apenas uma vez (mesmo valor para todas as linhas)
      if (!diasCapturado && item.dias_disponiveis != null) {
        result.dias_disponiveis = parseInt(item.dias_disponiveis) || 0;
        diasCapturado = true;
      }
      if (item.status_op === 'Planejado e Executado') { result.executados++; result.planejados++; result.match++; }
      else if (item.status_op === 'Planejado e não Executado') { result.planejados++; result.falta++; }
      else if (item.status_op === 'Executado e não Planejado') { result.executados++; result.extra++; }
      else if (item.status_op === 'Desistência de Requerimento') { result.desistencia++; }
    });
    return result;
  }, [data]);

  // Timeline filtrada e ordenada por data
  const timeline = useMemo(() => {
    return data
      .filter(item => filterStatus === 'all' || item.status_op === filterStatus)
      .sort((a, b) => {
        const da = a.data_ref ? new Date(a.data_ref) : 0;
        const db = b.data_ref ? new Date(b.data_ref) : 0;
        return db - da;
      });
  }, [data, filterStatus]);

  // Eficiência (match / total planejados)
  const eficiencia = kpis.planejados > 0 ? Math.round((kpis.match / kpis.planejados) * 100) : 0;

  // Iniciais do avatar
  const initials = (militar?.nome_guerra || 'M').substring(0, 2).toUpperCase();

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '2rem', fontFamily: "'Inter', sans-serif", background: '#f8fafc', minHeight: '100vh' }}>
      <style>
        {`
          @media print {
            @page {
              size: A4;
              margin: 10mm;
            }
            body {
              background: white !important;
              padding: 0 !important;
              margin: 0 !important;
            }
            .no-print {
              display: none !important;
            }
            .print-only {
              display: block !important;
            }
            /* Garantir que as cores de fundo sejam impressas */
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            /* Ajustes no layout */
            div[style*="padding: 2rem"] {
              padding: 0 !important;
              background: white !important;
            }
            /* Evitar quebras de página no meio de cards ou seções importantes */
            .print-card {
              break-inside: avoid;
              box-shadow: none !important;
              border: 1px solid #e2e8f0 !important;
            }
            table {
              width: 100% !important;
              table-layout: auto !important;
            }
            /* Forçar a grade de disponibilidade a caber na largura da página se possível */
            div[style*="overflow-x: auto"] {
              overflow: visible !important;
            }
          }
          .print-only {
            display: none;
          }
        `}
      </style>

      {/* ── Topo ── */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={onBack}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.5rem 1rem', borderRadius: '10px',
              border: '1px solid #e2e8f0', background: '#fff',
              color: '#475569', fontWeight: 600, cursor: 'pointer',
              fontSize: '0.9rem', transition: 'all 0.2s'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
          >
            <ArrowLeft size={16} /> Voltar
          </button>

          <div>
            <h1 style={{ margin: 0, fontSize: '1.6rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <FileText size={24} color="#2563eb" />
              Relatório Individual
            </h1>
            <p style={{ margin: '0.25rem 0 0', color: '#64748b', fontSize: '0.9rem' }}>
              Histórico operacional detalhado do militar
            </p>
          </div>
        </div>

        {/* Filtros */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Ciclo */}
          <div style={{ position: 'relative' }}>
            <Filter size={14} color="#64748b" style={{ position: 'absolute', top: 11, left: 10, zIndex: 1 }} />
            <select
              value={selectedCiclo}
              onChange={e => setSelectedCiclo(e.target.value)}
              style={{ padding: '0.55rem 1rem 0.55rem 2.2rem', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.85rem', outline: 'none', minWidth: '200px', appearance: 'none', cursor: 'pointer' }}
            >
              <option value="all">Todos os Ciclos</option>
              {ciclos.map(c => <option key={c.id_ciclo} value={c.id_ciclo}>{c.period_name || c.periodo_ciclo}</option>)}
            </select>
            <ChevronDown size={14} color="#64748b" style={{ position: 'absolute', top: 11, right: 10, pointerEvents: 'none' }} />
          </div>

          {/* Status */}
          <div style={{ position: 'relative' }}>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              style={{ padding: '0.55rem 1rem 0.55rem 1rem', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.85rem', outline: 'none', minWidth: '200px', appearance: 'none', cursor: 'pointer' }}
            >
              <option value="all">Todos os Status</option>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <ChevronDown size={14} color="#64748b" style={{ position: 'absolute', top: 11, right: 10, pointerEvents: 'none' }} />
          </div>

          <button
            onClick={() => window.print()}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1rem', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fff', color: '#475569', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
          >
            <Printer size={14} /> Imprimir
          </button>
        </div>
      </div>

      {/* Header exclusivo de impressão (opcional) */}
      <div className="print-only" style={{ marginBottom: '2rem', textAlign: 'center', borderBottom: '2px solid #2563eb', paddingBottom: '1rem' }}>
        <h1 style={{ margin: 0, fontSize: '2rem', color: '#0f172a' }}>Relatório Operacional Individual</h1>
        <p style={{ margin: '0.5rem 0', color: '#475569' }}>GSVR - Gerenciamento de Serviços e Voluntários</p>
        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Emitido em: {new Date().toLocaleString('pt-BR')}</div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '5rem', color: '#64748b' }}>
          <Clock size={40} color="#2563eb" style={{ opacity: 0.5, marginBottom: '1rem' }} />
          <div>Carregando histórico...</div>
        </div>
      ) : (
        <>
          {/* ── Card do Militar ── */}
          <div className="print-card" style={{
            background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)',
            borderRadius: '16px', padding: '1.5rem 2rem',
            display: 'flex', alignItems: 'center', gap: '1.5rem',
            marginBottom: '1.5rem', color: 'white', flexWrap: 'wrap'
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.4rem', fontWeight: 800, flexShrink: 0, border: '2px solid rgba(255,255,255,0.4)'
            }}>
              {initials}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>
                {militar?.posto_graduacao} {militar?.nome_guerra}
              </div>
              <div style={{ opacity: 0.8, fontSize: '0.9rem', marginTop: '0.2rem' }}>
                <span style={{ marginRight: '1.5rem' }}><Shield size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />Mat. {militar?.matricula || '—'}</span>
              </div>
            </div>
            {/* Eficiência */}
            <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.15)', borderRadius: '12px', padding: '0.75rem 1.5rem' }}>
              <div style={{ fontSize: '2rem', fontWeight: 800 }}>{eficiencia}%</div>
              <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Eficiência</div>
            </div>
          </div>

          {/* ── KPIs ── */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
            <div className="print-card" style={{ flex: '1 1 160px' }}><KPICard label="Dias Disponíveis" value={kpis.dias_disponiveis} icon={<CalendarCheck size={22} />} color="#0891b2" bg="#ecfeff" subtitle="Dias únicos no requerimento" /></div>
            <div className="print-card" style={{ flex: '1 1 160px' }}><KPICard label="Executados" value={kpis.executados} icon={<CheckCircle size={22} />} color="#059669" bg="#f0fdf4" /></div>
            <div className="print-card" style={{ flex: '1 1 160px' }}><KPICard label="Planejados" value={kpis.planejados} icon={<Shield size={22} />} color="#2563eb" bg="#eff6ff" /></div>
            <div className="print-card" style={{ flex: '1 1 160px' }}><KPICard label="Match (P+E)" value={kpis.match} icon={<BarChart3 size={22} />} color="#0D3878" bg="#e0f2fe" subtitle="Planejado e executado" /></div>
            <div className="print-card" style={{ flex: '1 1 160px' }}><KPICard label="Faltas" value={kpis.falta} icon={<XCircle size={22} />} color="#dc2626" bg="#fef2f2" subtitle="Planejado e não executado" /></div>
            <div className="print-card" style={{ flex: '1 1 160px' }}><KPICard label="Extras" value={kpis.extra} icon={<TrendingUp size={22} />} color="#7c3aed" bg="#f5f3ff" subtitle="Executado e não planejado" /></div>
            <div className="print-card" style={{ flex: '1 1 160px' }}><KPICard label="Desistências" value={kpis.desistencia} icon={<AlertTriangle size={22} />} color="#d97706" bg="#fffbeb" /></div>
          </div>

          {/* ── Barra de progresso ── */}
          {kpis.planejados > 0 && (
            <div className="print-card" style={{ background: '#fff', borderRadius: '14px', padding: '1.25rem 1.5rem', marginBottom: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>Taxa de Cumprimento</span>
                <span style={{ fontWeight: 800, color: eficiencia >= 80 ? '#059669' : eficiencia >= 50 ? '#d97706' : '#dc2626' }}>{eficiencia}%</span>
              </div>
              <div style={{ height: 10, background: '#f1f5f9', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${eficiencia}%`,
                  background: eficiencia >= 80 ? '#059669' : eficiencia >= 50 ? '#d97706' : '#dc2626',
                  borderRadius: 999, transition: 'width 0.6s ease'
                }} />
              </div>
            </div>
          )}

          {/* ── Grade de Disponibilidade ── */}
          {gridDisp.length > 0 && (() => {
            // Agrupa por dia_mes
            const byDay = {};
            const turnos = [];
            gridDisp.forEach(r => {
              if (!byDay[r.dia_mes]) byDay[r.dia_mes] = {};
              byDay[r.dia_mes][r.horario_turno] = r;
              if (!turnos.includes(r.horario_turno)) turnos.push(r.horario_turno);
            });
            turnos.sort();
            const dias = Object.keys(byDay).map(Number).sort((a, b) => a - b);

            // Configuração visual dos quadrados
            const getCfg = (cell) => {
              if (!cell) return null;
              if (cell.teve_execucao)
                return { bg: '#16a34a', border: '#15803d', xColor: '#000', title: 'Serviço executado' };
              if (cell.ativo)
                return { bg: '#2563eb', border: '#1d4ed8', xColor: '#fff', title: 'Disponível (ativo)' };
              return { bg: '#dc2626', border: '#b91c1c', xColor: '#fff', title: 'Indisponível (inativo)' };
            };

            return (
              <div className="print-card" style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 8px rgba(0,0,0,0.04)', marginBottom: '1.5rem' }}>
                <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <CalendarCheck size={18} color="#2563eb" />
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>Grade de Disponibilidade</span>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: '1rem', fontSize: '0.75rem', flexWrap: 'wrap' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <span style={{ width: 14, height: 14, borderRadius: 3, background: '#16a34a', display: 'inline-block' }} /> Serviço executado
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <span style={{ width: 14, height: 14, borderRadius: 3, background: '#2563eb', display: 'inline-block' }} /> Disponível
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <span style={{ width: 14, height: 14, borderRadius: 3, background: '#dc2626', display: 'inline-block' }} /> Indisponível
                    </span>
                  </div>
                </div>

                <div style={{ padding: '1.25rem 1.5rem', overflowX: 'auto' }}>
                  <table style={{ borderCollapse: 'separate', borderSpacing: '4px', minWidth: 'max-content' }}>
                    <thead>
                      <tr>
                        <th style={{ padding: '0.4rem 0.6rem', fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, textAlign: 'left', whiteSpace: 'nowrap' }}>Turno \ Dia</th>
                        {dias.map(d => (
                          <th key={d} style={{ padding: '0.4rem', fontSize: '0.7rem', color: '#475569', fontWeight: 700, textAlign: 'center', width: 36 }}>{d}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {turnos.map(turno => (
                        <tr key={turno}>
                          <td style={{ padding: '0.4rem 0.6rem', fontSize: '0.7rem', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap', paddingRight: '1rem' }}>
                            {turno}
                          </td>
                          {dias.map(d => {
                            const cell = byDay[d]?.[turno];
                            const cfg = getCfg(cell);
                            return (
                              <td key={d} style={{ padding: 2, textAlign: 'center' }}>
                                {cfg ? (
                                  <div
                                    title={cfg.title}
                                    style={{
                                      width: 32, height: 32, borderRadius: 6,
                                      background: cfg.bg,
                                      border: `2px solid ${cfg.border}`,
                                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      margin: 'auto', cursor: 'default',
                                      boxShadow: '0 1px 3px rgba(0,0,0,0.15)'
                                    }}
                                  >
                                    <span style={{ color: cfg.xColor, fontWeight: 900, fontSize: '0.85rem', lineHeight: 1, userSelect: 'none' }}>
                                      ✕
                                    </span>
                                  </div>
                                ) : (
                                  <div style={{ width: 32, height: 32, borderRadius: 6, background: '#f1f5f9', margin: 'auto', border: '1px solid #e2e8f0' }} />
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

          {/* ── Timeline ── */}
          <div className="print-card" style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar size={18} color="#2563eb" />
              <span style={{ fontWeight: 700, color: '#0f172a' }}>Registros Detalhados</span>
              <span className="no-print" style={{ marginLeft: 'auto', background: '#f1f5f9', color: '#64748b', borderRadius: '20px', padding: '2px 10px', fontSize: '0.8rem', fontWeight: 600 }}>
                {timeline.length} registro{timeline.length !== 1 ? 's' : ''}
              </span>
            </div>

            {timeline.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>
                <User size={48} color="#e2e8f0" style={{ marginBottom: '1rem' }} />
                <div style={{ fontWeight: 600 }}>Nenhum registro encontrado</div>
                <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem' }}>Ajuste os filtros acima para visualizar outros períodos.</p>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th style={{ padding: '0.75rem 1.25rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Data</th>
                    <th style={{ padding: '0.75rem 1.25rem', textAlign: 'center', fontSize: '0.72rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Status</th>
                    <th style={{ padding: '0.75rem 1.25rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Recurso Planejado</th>
                    <th style={{ padding: '0.75rem 1.25rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Recurso Executado</th>
                    <th style={{ padding: '0.75rem 1.25rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Ciclo</th>
                  </tr>
                </thead>
                <tbody>
                  {timeline.map((item, idx) => {
                    const cfg = STATUS_CONFIG[item.status_op] || {};
                    return (
                      <tr
                        key={idx}
                        style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#fff' : '#fafafa' }}
                      >
                        <td style={{ padding: '0.85rem 1.25rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.color || '#94a3b8', flexShrink: 0 }} />
                            <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9rem' }}>
                              {item.data_formatada || '—'}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '0.85rem 1.25rem', textAlign: 'center' }}>
                          <StatusBadge status={item.status_op} />
                        </td>
                        <td style={{ padding: '0.85rem 1.25rem', fontSize: '0.85rem', color: '#475569' }}>
                          {item.recurso_planejado || <span style={{ color: '#cbd5e1' }}>—</span>}
                        </td>
                        <td style={{ padding: '0.85rem 1.25rem', fontSize: '0.85rem', color: '#475569' }}>
                          {item.recurso_executado || <span style={{ color: '#cbd5e1' }}>—</span>}
                        </td>
                        <td style={{ padding: '0.85rem 1.25rem', fontSize: '0.8rem', color: '#64748b' }}>
                          {item.periodo_ciclo || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
