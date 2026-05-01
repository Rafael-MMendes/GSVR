import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  ArrowLeft, User, Shield, CheckCircle, XCircle, AlertTriangle,
  Info, BarChart3, Calendar, Clock, FileText, TrendingUp, Award,
  ChevronDown, Filter, Printer, CalendarCheck, Download
} from 'lucide-react';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001') + '/api';

// Gera array de dias a partir do intervalo data_inicio..data_fim do ciclo
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  'Planejado e Executado': { color: '#059669', bg: '#f0fdf4', border: '#bbf7d0', icon: <CheckCircle size={14} />, label: 'Planejado e Executado' },
  'Planejado': { color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', icon: <Calendar size={14} />, label: 'Planejado' },
  'Planejado e não Executado': { color: '#dc2626', bg: '#fef2f2', border: '#fecaca', icon: <XCircle size={14} />, label: 'Planejado e Não Executado' },
  'Executado e não Planejado': { color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', icon: <Info size={14} />, label: 'Executado e Não Planejado' },
  'Desistência de Requerimento': { color: '#d97706', bg: '#fffbeb', border: '#fde68a', icon: <AlertTriangle size={14} />, label: 'Desistência de Requerimento' },
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
  const [gridDisp, setGridDisp] = useState([]);
  const contentRef = useRef(null);

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

        const allCiclos = ciclosRes.data;
        setCiclos(allCiclos);

        // Se o ciclo selecionado for 'all', tenta setar automaticamente o ciclo 'Aberto'
        if (selectedCiclo === 'all' || !selectedCiclo) {
          const active = allCiclos.find(c => c.status === 'Aberto');
          if (active) {
            setSelectedCiclo(String(active.id_ciclo));
            return; // O useEffect disparará novamente com o novo id
          }
        }

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
    data.forEach(item => {
      if (item.status_op === 'Planejado e Executado') { result.executados++; result.planejados++; result.match++; }
      else if (item.status_op === 'Planejado') { result.planejados++; }
      else if (item.status_op === 'Planejado e não Executado') { result.planejados++; result.falta++; }
      else if (item.status_op === 'Executado e não Planejado') { result.executados++; result.extra++; }
      else if (item.status_op === 'Desistência de Requerimento') { result.desistencia++; }
    });

    // Conta dias únicos na grade de disponibilidade onde o militar se colocou disponível
    const uniqueDays = new Set(
      gridDisp
        .filter(r => r.ativo === true || r.teve_execucao)
        .map(r => r.dia_mes)
    );
    result.dias_disponiveis = uniqueDays.size;

    return result;
  }, [data, gridDisp]);

  // Timeline filtrada e ordenada por data
  const timeline = useMemo(() => {
    return data
      .sort((a, b) => {
        const da = a.data_ref ? new Date(a.data_ref) : 0;
        const db = b.data_ref ? new Date(b.data_ref) : 0;
        return db - da;
      });
  }, [data]);

  // Eficiência (total executados / total planejados)
  const eficiencia = kpis.planejados > 0 ? Math.round((kpis.executados / kpis.planejados) * 100) : (kpis.executados > 0 ? 100 : 0);

  // Iniciais do avatar
  const initials = (militar?.nome_guerra || 'M').substring(0, 2).toUpperCase();

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{
      padding: '2.5rem 3rem',
      fontFamily: "'Inter', sans-serif",
      background: '#f8fafc',
      minHeight: '100vh',
      color: '#1e293b'
    }}>
      <style>
        {`
          @media print {
            @page {
              size: A4 portrait;
              margin: 10mm;
            }
            body {
              background: white !important;
              padding: 0 !important;
              margin: 0 !important;
              width: 100% !important;
              font-size: 10pt !important;
            }
            .navbar, .volunteers-list, .btn, .no-print {
              display: none !important;
            }
            .print-only {
              display: block !important;
            }
            /* Forçar cores */
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              box-sizing: border-box !important;
            }
            /* Layout Container */
            div[style*="padding: 2.5rem"] {
              padding: 0 !important;
              background: white !important;
              width: 100% !important;
            }
            /* Cards e Seções */
            .print-card {
              break-inside: avoid;
              box-shadow: none !important;
              border: 1px solid #cbd5e1 !important;
              margin-bottom: 1.5rem !important;
              width: 100% !important;
              border-radius: 8px !important;
            }
            /* Tabela e Grades */
            table {
              width: 100% !important;
              border-collapse: collapse !important;
            }
            /* Ajuste específico para a Grade de Disponibilidade */
            div[style*="overflow-x: auto"] {
              overflow: visible !important;
              width: 100% !important;
            }
            table[style*="min-width: max-content"] {
              min-width: 0 !important;
              width: 100% !important;
              zoom: 0.6; /* Ajustado para retrato */
            }
            /* Ajuste dos KPIs na impressão */
            .kpi-grid-print {
              display: grid !important;
              grid-template-columns: repeat(4, 1fr) !important;
              gap: 0.5rem !important;
            }
          }
          .print-only {
            display: none;
          }
          .custom-scrollbar::-webkit-scrollbar {
            height: 8px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: #f1f5f9;
            border-radius: 10px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 10px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
          }
        `}
      </style>

      {/* ── Topo (Header & Toolbar) ── */}
      <div className="no-print" style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <button
              onClick={onBack}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.6rem 1.2rem', borderRadius: '12px',
                border: '1px solid #e2e8f0', background: '#fff',
                color: '#475569', fontWeight: 600, cursor: 'pointer',
                fontSize: '0.9rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#f8fafc'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#fff'; }}
            >
              <ArrowLeft size={18} /> Voltar
            </button>

            <div>
              <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <FileText size={28} color="#2563eb" />
                Relatório Individual
              </h1>
              <p style={{ margin: '0.1rem 0 0', color: '#64748b', fontSize: '0.95rem', fontWeight: 500 }}>
                Histórico detalhado do militar
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Filtro Ciclo */}
            <div style={{ position: 'relative' }}>
              <Filter size={14} color="#64748b" style={{ position: 'absolute', top: 13, left: 12, zIndex: 1 }} />
              <select
                value={selectedCiclo}
                onChange={e => setSelectedCiclo(e.target.value)}
                style={{ padding: '0.65rem 2.5rem 0.65rem 2.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fff', fontSize: '0.9rem', fontWeight: 500, color: '#334155', outline: 'none', minWidth: '220px', appearance: 'none', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
              >
                <option value="all">Todos os Ciclos</option>
                {ciclos.map(c => <option key={c.id_ciclo} value={c.id_ciclo}>{c.period_name || c.periodo_ciclo}</option>)}
              </select>
              <ChevronDown size={14} color="#64748b" style={{ position: 'absolute', top: 13, right: 12, pointerEvents: 'none' }} />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', background: '#fff', padding: '4px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <button
                onClick={() => window.print()}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.5rem', borderRadius: '10px', border: 'none', background: '#2563eb', color: '#fff', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, transition: 'all 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#1d4ed8'}
                onMouseLeave={e => e.currentTarget.style.background = '#2563eb'}
              >
                <Printer size={16} /> Imprimir Relatório
              </button>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '5rem', color: '#64748b' }}>
          <Clock size={40} color="#2563eb" style={{ opacity: 0.5, marginBottom: '1rem' }} />
          <div>Carregando histórico...</div>
        </div>
      ) : (
        <div ref={contentRef} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Header exclusivo de impressão e PDF */}
          <div className="print-only" style={{ marginBottom: '2rem', textAlign: 'center', borderBottom: '2px solid #2563eb', paddingBottom: '1rem' }}>
            <h1 style={{ margin: 0, fontSize: '1.8rem', color: '#0f172a', fontWeight: 800 }}>Relatório Individual</h1>
            <p style={{ margin: '0.5rem 0', color: '#475569', fontWeight: 600, fontSize: '1.1rem' }}>GSVR - Gestão de Serviço Voluntario Remunerado</p>
            <div style={{ fontSize: '0.9rem', color: '#64748b', marginTop: '0.5rem' }}>
              Emitido em: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}
            </div>
          </div>

          <>
            {/* ── Card do Militar ── */}
            <div className="print-card" style={{
              background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)',
              borderRadius: '20px', padding: '2rem 2.5rem',
              display: 'flex', alignItems: 'center', gap: '2rem',
              color: 'white', position: 'relative', overflow: 'hidden',
              boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.15)'
            }}>
              {/* Círculo decorativo */}
              <div style={{ position: 'absolute', right: '-50px', top: '-50px', width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />

              <div style={{
                width: 80, height: 80, borderRadius: '24px',
                background: 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(10px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.8rem', fontWeight: 900, flexShrink: 0,
                border: '1px solid rgba(255,255,255,0.3)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}>
                {initials}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '1.8rem', fontWeight: 900, letterSpacing: '-0.02em' }}>
                  {militar?.posto_graduacao} {militar?.nome_guerra}
                </div>
                <div style={{ display: 'flex', gap: '2rem', marginTop: '0.5rem', opacity: 0.9, fontSize: '1rem', fontWeight: 500 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Shield size={16} /> Mat. {militar?.matricula || '—'}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Award size={16} /> Prontidão Ativa
                  </span>
                </div>
              </div>
            </div>

            {/* ── KPIs ── */}
            <div className="kpi-grid-print" style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
              <div className="print-card" style={{ flex: '1 1 200px' }}><KPICard label="Dias Disponíveis" value={kpis.dias_disponiveis} icon={<CalendarCheck size={24} />} color="#0891b2" bg="#ecfeff" subtitle="Requerimentos ativos" /></div>
              <div className="print-card" style={{ flex: '1 1 200px' }}><KPICard label="Executados" value={kpis.executados} icon={<CheckCircle size={24} />} color="#059669" bg="#f0fdf4" subtitle="Serviços realizados" /></div>
              <div className="print-card" style={{ flex: '1 1 200px' }}><KPICard label="Planejados" value={kpis.planejados} icon={<Shield size={24} />} color="#2563eb" bg="#eff6ff" subtitle="Escalas previstas" /></div>
              <div className="print-card" style={{ flex: '1 1 200px' }}><KPICard label="Planejados e Executados" value={kpis.match} icon={<BarChart3 size={24} />} color="#0D3878" bg="#e0f2fe" subtitle="Conformidade total Planejados(escalado) e Executados" /></div>
              <div className="print-card" style={{ flex: '1 1 200px' }}><KPICard label="Planejados e não Executados" value={kpis.falta} icon={<XCircle size={24} />} color="#dc2626" bg="#fef2f2" subtitle="foi escalado porem outro militar executou o serviço" /></div>
              <div className="print-card" style={{ flex: '1 1 200px' }}><KPICard label="Executados e não Planejados" value={kpis.extra} icon={<TrendingUp size={24} />} color="#7c3aed" bg="#f5f3ff" subtitle="Executou o serviço que não Planejado(escalado)" /></div>
              <div className="print-card" style={{ flex: '1 1 200px' }}><KPICard label="Desistências" value={kpis.desistencia} icon={<AlertTriangle size={24} />} color="#d97706" bg="#fffbeb" subtitle="Cancelamentos" /></div>
            </div>


            {gridDisp.length > 0 && (() => {
              // Agrupa por dia_mes
              const byDay = {};
              const SHIFTS = [
                "07:00 ÀS 13:00",
                "13:00 ÀS 19:00",
                "19:00 ÀS 01:00",
                "01:00 ÀS 07:00"
              ];

              gridDisp.forEach(r => {
                if (!byDay[r.dia_mes]) byDay[r.dia_mes] = {};
                byDay[r.dia_mes][r.horario_turno] = r;
              });

              const turnos = SHIFTS;

              // Dias dinâmicos baseados no intervalo do ciclo selecionado
              const cicloDadosAtual = ciclos.find(c => String(c.id_ciclo) === String(selectedCiclo));
              const cycleDays = getCycleDays(cicloDadosAtual?.data_inicio, cicloDadosAtual?.data_fim);

              // Configuração visual dos quadrados
              const getCfg = (cell) => {
                if (!cell || (cell.ativo !== true && cell.ativo !== false && !cell.teve_execucao)) return null;
                if (cell.teve_execucao)
                  return { bg: '#059669', border: '#047857', xColor: '#fff', title: 'Serviço executado' };
                if (cell.ativo === true)
                  return { bg: '#2563eb', border: '#1d4ed8', xColor: '#fff', title: 'Disponível' };
                if (cell.ativo === false)
                  return { bg: '#dc2626', border: '#b91c1c', xColor: '#fff', title: 'Desistência' };
                return null;
              };

              return (
                <div className="print-card" style={{ background: '#fff', borderRadius: '18px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                  <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: 36, height: 36, borderRadius: '10px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CalendarCheck size={20} color="#2563eb" />
                      </div>
                      <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '1.1rem' }}>Grade de Disponibilidade</span>
                    </div>
                    <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>
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

                  <div style={{ padding: '1.25rem 1.5rem', overflow: 'hidden' }}>
                    <table style={{ borderCollapse: 'separate', borderSpacing: '2px', width: '100%', tableLayout: 'fixed' }}>
                      <thead>
                        <tr>
                          <th style={{ width: '80px', padding: '0.25rem 0.5rem 0.25rem 0', fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Turno</th>
                          {cycleDays.map((dayObj, idx) => {
                            const showMonth = idx === 0 || cycleDays[idx - 1].month !== dayObj.month;
                            return (
                              <th key={`${dayObj.year}-${dayObj.month}-${dayObj.day}`} style={{ padding: '0.15rem 0', fontSize: '0.65rem', color: '#475569', fontWeight: 800, textAlign: 'center', lineHeight: 1.1 }}>
                                {showMonth && (
                                  <div style={{ fontSize: '0.55rem', color: '#94a3b8', fontWeight: 600, letterSpacing: '0.03em' }}>{dayObj.monthShort}</div>
                                )}
                                <div>{dayObj.day}</div>
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {turnos.map(turno => (
                          <tr key={turno}>
                            <td style={{ padding: '0.25rem 0.5rem 0.25rem 0', fontSize: '0.75rem', color: '#1e293b', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {turno}
                            </td>
                            {cycleDays.map(dayObj => {
                              const cell = byDay[dayObj.day]?.[turno];
                              const cfg = getCfg(cell);
                              return (
                                <td key={`${dayObj.year}-${dayObj.month}-${dayObj.day}`} style={{ padding: 0, textAlign: 'center' }}>
                                  {cfg ? (
                                    <div
                                      title={cfg.title}
                                      style={{
                                        width: '100%', aspectRatio: '1/1', maxWidth: '24px', borderRadius: '4px',
                                        background: cfg.bg,
                                        border: `1px solid ${cfg.border}`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        margin: 'auto', transition: 'transform 0.2s', cursor: 'help'
                                      }}
                                    >
                                      <span style={{ color: cfg.xColor, fontWeight: 900, fontSize: '0.65rem' }}>✕</span>
                                    </div>
                                  ) : (
                                    <div style={{ width: '100%', aspectRatio: '1/1', maxWidth: '24px', borderRadius: '4px', background: '#f8fafc', margin: 'auto', border: '1px dashed #e2e8f0' }} />
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
            <div className="print-card" style={{ background: '#fff', borderRadius: '18px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', marginBottom: '3rem' }}>
              <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '10px', background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Calendar size={20} color="#7c3aed" />
                  </div>
                  <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '1.1rem' }}>Registros Detalhados</span>
                </div>
                <span className="no-print" style={{ background: '#f8fafc', color: '#64748b', borderRadius: '10px', padding: '6px 14px', fontSize: '0.85rem', fontWeight: 700, border: '1px solid #e2e8f0' }}>
                  {timeline.length} registro{timeline.length !== 1 ? 's' : ''}
                </span>
              </div>

              {timeline.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '6rem 2rem', color: '#94a3b8' }}>
                  <User size={64} color="#f1f5f9" style={{ marginBottom: '1.5rem' }} />
                  <div style={{ fontWeight: 700, fontSize: '1.2rem', color: '#cbd5e1' }}>Histórico Vazio</div>
                  <p style={{ margin: '0.5rem 0 0', fontSize: '0.95rem' }}>Não foram encontrados registros para os filtros selecionados.</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Data e Período</th>
                        <th style={{ padding: '1rem 1.5rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status Operacional</th>
                        <th className="no-print" style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recurso Planejado</th>
                        <th className="no-print" style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recurso Executado</th>
                        <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Observações</th>
                        <th style={{ padding: '1rem 1.5rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ciclo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {timeline.map((item, idx) => {
                        const cfg = STATUS_CONFIG[item.status_op] || {};
                        return (
                          <tr
                            key={idx}
                            style={{
                              borderBottom: '1px solid #f1f5f9',
                              background: idx % 2 === 0 ? '#fff' : '#fafafa',
                              transition: 'background 0.2s'
                            }}
                          >
                            <td style={{ padding: '1.1rem 1.5rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ width: 10, height: 10, borderRadius: '3px', background: cfg.color || '#94a3b8', boxShadow: `0 0 0 3px ${cfg.bg || '#f8fafc'}` }} />
                                <span style={{ fontWeight: 700, color: '#334155', fontSize: '0.95rem' }}>
                                  {item.data_formatada || '—'}
                                </span>
                              </div>
                            </td>
                            <td style={{ padding: '1.1rem 1.5rem', textAlign: 'center' }}>
                              <StatusBadge status={item.status_op} />
                            </td>
                            <td className="no-print" style={{ padding: '1.1rem 1.5rem', fontSize: '0.9rem', color: '#475569', fontWeight: 500 }}>
                              {item.recurso_planejado || <span style={{ color: '#cbd5e1' }}>—</span>}
                            </td>
                            <td className="no-print" style={{ padding: '1.1rem 1.5rem', fontSize: '0.9rem', color: '#475569', fontWeight: 500 }}>
                              {item.recurso_executado || <span style={{ color: '#cbd5e1' }}>—</span>}
                            </td>
                            <td style={{ padding: '1.1rem 1.5rem', fontSize: '0.85rem', color: '#64748b', fontStyle: 'italic' }}>
                              {item.observacoes || <span style={{ color: '#cbd5e1' }}>—</span>}
                            </td>
                            <td style={{ padding: '1.1rem 1.5rem', textAlign: 'right', fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
                              {item.periodo_ciclo || '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        </div>
      )}
    </div>
  );
}
