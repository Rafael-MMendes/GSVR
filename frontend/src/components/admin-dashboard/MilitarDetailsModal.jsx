import { UserCircle, X, Calendar, CalendarCheck, Check, Clock } from 'lucide-react';
import { SHIFTS, getCycleDays } from '../../utils/scheduleHelpers';
import { dashboardColors as colors, dashboardTransitions as transitions, shadowSm, shadowLg } from './theme';

/**
 * Modal de detalhes do militar com grade completa de disponibilidade e histórico no ciclo.
 * @param {{
 *   detailedMilitar: import('../../types/gsvr.types').Volunteer | null,
 *   onClose: () => void,
 *   currentCycle: import('../../types/gsvr.types').Cycle | undefined,
 *   selectedCycleId: number | string,
 *   militarGridDisp: import('../../types/gsvr.types').MilitarGridCell[],
 *   loadingMilitarGrid: boolean,
 *   militarSchedules: import('../../types/gsvr.types').MilitarScheduleItem[],
 * }} props
 */
export function MilitarDetailsModal({
  detailedMilitar,
  onClose,
  currentCycle,
  selectedCycleId,
  militarGridDisp,
  loadingMilitarGrid,
  militarSchedules
}) {
  if (!detailedMilitar) return null;

  const setDetailedMilitar = (val) => {
    if (val === null) onClose();
  };

  return (
    <>
{detailedMilitar && (() => {
  const cycleDays = getCycleDays(currentCycle?.data_inicio, currentCycle?.data_fim);
  const byDay = {};
  militarGridDisp.forEach(r => {
    if (!byDay[r.dia_mes]) byDay[r.dia_mes] = {};
    byDay[r.dia_mes][r.horario_turno] = r;
  });

  const getCfg = (cell) => {
    if (!cell || (cell.ativo !== true && cell.ativo !== false && !cell.teve_execucao)) return null;
    if (cell.teve_execucao) {
      return { bg: '#059669', border: '#047857', xColor: '#fff', title: 'Serviço Executado' };
    }
    if (cell.ativo === true) {
      return { bg: '#2563eb', border: '#1d4ed8', xColor: '#fff', title: 'Disponível' };
    }
    if (cell.ativo === false) {
      return { bg: '#dc2626', border: '#b91c1c', xColor: '#fff', title: 'Desistência' };
    }
    return null;
  };

  const uniqueDays = new Set(
    militarGridDisp
      .filter(r => r.ativo === true || r.teve_execucao)
      .map(r => r.dia_mes)
  );
  const diasDisponiveis = uniqueDays.size;
  const turnosDisponiveis = militarGridDisp.filter(r => r.ativo === true).length;
  const turnosExecutados = militarGridDisp.filter(r => r.teve_execucao).length;

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1100, animation: 'fadeIn 0.3s ease-out'
    }}>
      <div className="modal-responsive-detail" style={{
        background: colors.white,
        borderRadius: '24px',
        width: '96%',
        maxWidth: '1380px',
        maxHeight: '94vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: shadowLg,
        overflow: 'hidden',
        border: `1px solid ${colors.border}`
      }}>
        {/* Header */}
        <div className="modal-detail-header-responsive" style={{
          padding: '1.25rem 2rem',
          background: 'linear-gradient(135deg, #0D3878 0%, #1e40af 100%)',
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              background: 'rgba(255,255,255,0.2)',
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(4px)'
            }}>
              <UserCircle size={28} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.01em', textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
                  {detailedMilitar.rank} {detailedMilitar.name}
                </h3>
                {(detailedMilitar.nome_completo || detailedMilitar.nome) &&
                 (detailedMilitar.nome_completo || detailedMilitar.nome).toUpperCase() !== (detailedMilitar.name || '').toUpperCase() && (
                  <span style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    color: '#ffffff',
                    padding: '3px 10px',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    letterSpacing: '0.01em',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    backdropFilter: 'blur(4px)'
                  }}>
                    {detailedMilitar.nome_completo || detailedMilitar.nome}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginTop: '4px', fontSize: '0.82rem', color: '#e2e8f0' }}>
                <span style={{ fontWeight: 700, color: '#ffffff' }}>Nº {detailedMilitar.numero_ordem || detailedMilitar.matricula}</span>
                <span style={{ opacity: 0.6 }}>•</span>
                <span>Ciclo: <strong style={{ color: '#ffffff' }}>{currentCycle?.periodo_ciclo || currentCycle?.period_name || `Ciclo ${selectedCycleId}`}</strong></span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setDetailedMilitar(null)}
            style={{
              background: 'rgba(255,255,255,0.12)',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              borderRadius: '10px',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: transitions
            }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
            onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
            title="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-detail-body-responsive" style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1.5rem 2rem',
          background: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem'
        }}>
          {/* 1. Grade de Disponibilidade */}
          <div style={{
            background: '#ffffff',
            borderRadius: '18px',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            boxShadow: shadowSm
          }}>
            {/* Top Bar da Grade */}
            <div className="grade-topbar-responsive" style={{
              padding: '1.25rem 1.75rem',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
              background: '#ffffff'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: '10px',
                  background: '#eff6ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <CalendarCheck size={20} color="#2563eb" />
                </div>
                <div>
                  <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '1.1rem' }}>
                    Grade de Disponibilidade
                  </span>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                    Mapeamento dos turnos e dias com requerimentos ativos de <strong style={{ color: colors.primary }}>{detailedMilitar.rank} {detailedMilitar.name}</strong>
                    {(detailedMilitar.nome_completo || detailedMilitar.nome) && (detailedMilitar.nome_completo || detailedMilitar.nome).toUpperCase() !== (detailedMilitar.name || '').toUpperCase() ? ` (${detailedMilitar.nome_completo || detailedMilitar.nome})` : ''}
                  </div>
                </div>
              </div>

              {/* Legenda Visual */}
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

            {/* Resumo Rápido da Disponibilidade no Ciclo */}
            <div className="grade-summary-responsive" style={{
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
              <span>Dias com Disponibilidade: <strong style={{ color: '#0f172a' }}>{diasDisponiveis} dias</strong></span>
              <span>•</span>
              <span>Turnos com Requerimento Ativo: <strong style={{ color: '#2563eb' }}>{turnosDisponiveis} turnos</strong></span>
              <span>•</span>
              <span>Turnos Executados no Ciclo: <strong style={{ color: '#059669' }}>{turnosExecutados} turnos</strong></span>
            </div>

            {/* Tabela da Grade */}
            <div style={{ padding: '1.25rem 1.5rem' }}>
              {loadingMilitarGrid ? (
                <div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#64748b' }}>
                  <div style={{
                    width: '32px', height: '32px', margin: '0 auto 0.75rem auto',
                    border: '3px solid #e2e8f0', borderTopColor: '#2563eb',
                    borderRadius: '50%', animation: 'spin 0.8s linear infinite'
                  }} />
                  <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem' }}>Carregando grade de disponibilidade...</p>
                </div>
              ) : militarGridDisp.length === 0 ? (
                <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: '#94a3b8' }}>
                  <Calendar size={40} color="#cbd5e1" style={{ margin: '0 auto 0.75rem auto', display: 'block' }} />
                  <div style={{ fontWeight: 700, color: '#475569', fontSize: '1rem', marginBottom: '0.25rem' }}>
                    Nenhum requerimento de disponibilidade registrado para este ciclo
                  </div>
                  <div style={{ fontSize: '0.84rem' }}>
                    O militar não cadastrou requerimentos ou não há registros de disponibilidade cadastrados no ciclo ativo.
                  </div>
                </div>
              ) : (
                <div
                  className="modal-custom-scrollbar grade-table-scroll"
                  style={{
                    overflowX: 'auto',
                    overflowY: 'auto',
                    maxHeight: '280px',
                    paddingBottom: '0.6rem',
                    scrollbarWidth: 'thin',
                    scrollbarColor: '#cbd5e1 #f1f5f9'
                  }}
                >
                  <table style={{
                    borderCollapse: 'separate',
                    borderSpacing: '2px',
                    width: 'max-content',
                    minWidth: '100%',
                    tableLayout: 'fixed'
                  }}>
                    <thead>
                      <tr>
                        <th style={{
                          width: '120px',
                          minWidth: '120px',
                          padding: '0.35rem 0.6rem 0.35rem 0',
                          fontSize: '0.72rem',
                          color: '#64748b',
                          fontWeight: 800,
                          textAlign: 'left',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          position: 'sticky',
                          left: 0,
                          top: 0,
                          background: '#ffffff',
                          zIndex: 6,
                          borderRight: '1px solid #f1f5f9',
                          boxShadow: '2px 0 4px -2px rgba(0,0,0,0.08)'
                        }}>
                          Turno
                        </th>
                        {cycleDays.map((dayObj, idx) => {
                          const showMonth = idx === 0 || cycleDays[idx - 1].month !== dayObj.month;
                          return (
                            <th
                              key={`${dayObj.year}-${dayObj.month}-${dayObj.day}`}
                              style={{
                                width: '36px',
                                minWidth: '36px',
                                padding: '0.2rem 0',
                                fontSize: '0.7rem',
                                color: '#475569',
                                fontWeight: 800,
                                textAlign: 'center',
                                lineHeight: 1.15,
                                position: 'sticky',
                                top: 0,
                                background: '#ffffff',
                                zIndex: 5
                              }}
                            >
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
                            width: '120px',
                            minWidth: '120px',
                            padding: '0.35rem 0.6rem 0.35rem 0',
                            fontSize: '0.75rem',
                            color: '#1e293b',
                            fontWeight: 800,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            position: 'sticky',
                            left: 0,
                            background: '#ffffff',
                            zIndex: 4,
                            borderRight: '1px solid #f1f5f9',
                            boxShadow: '2px 0 4px -2px rgba(0,0,0,0.08)'
                          }}>
                            {turno}
                          </td>
                          {cycleDays.map(dayObj => {
                            const dateKey = `${dayObj.year}-${String(dayObj.month).padStart(2, '0')}-${String(dayObj.day).padStart(2, '0')}`;
                            const dayStr = String(dayObj.day);
                            const cell = byDay[dateKey]?.[turno] || byDay[dayStr]?.[turno];
                            const cfg = getCfg(cell);
                            const dateFormatted = `${String(dayObj.day).padStart(2, '0')}/${String(dayObj.month).padStart(2, '0')}/${dayObj.year}`;
                            return (
                              <td
                                key={`${dayObj.year}-${dayObj.month}-${dayObj.day}`}
                                style={{
                                  width: '36px',
                                  minWidth: '36px',
                                  padding: 0,
                                  textAlign: 'center'
                                }}
                              >
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

          {/* 2. Histórico de Escalas no Ciclo */}
          <div style={{
            background: '#ffffff',
            borderRadius: '18px',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            boxShadow: shadowSm
          }}>
            <div className="escalas-topbar-responsive" style={{
              padding: '1.25rem 1.75rem',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: '10px',
                  background: '#f0fdf4',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Calendar size={20} color="#16a34a" />
                </div>
                <div>
                  <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '1.1rem' }}>
                    Escalas no Ciclo
                  </span>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                    Histórico de escalas planejadas e serviços executados
                  </div>
                </div>
              </div>
              <span style={{
                background: '#f8fafc',
                color: '#475569',
                borderRadius: '8px',
                padding: '4px 10px',
                fontSize: '0.78rem',
                fontWeight: 700,
                border: '1px solid #e2e8f0'
              }}>
                {militarSchedules.length} registro{militarSchedules.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div
              className="modal-custom-scrollbar escalas-grid-responsive"
              style={{
                padding: '1.25rem 1.5rem',
                maxHeight: '250px',
                overflowY: 'auto',
                scrollbarWidth: 'thin',
                scrollbarColor: '#cbd5e1 #f1f5f9'
              }}
            >
              {militarSchedules.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2.5rem', background: '#f8fafc', borderRadius: '12px', color: colors.textMuted }}>
                  <Calendar size={32} style={{ opacity: 0.25, margin: '0 auto 0.5rem auto' }} />
                  <p style={{ fontSize: '0.88rem', fontWeight: 600, margin: 0 }}>Nenhuma escala encontrada neste ciclo para este militar</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
                  {militarSchedules.map((s, idx) => (
                    <div key={idx} style={{
                      background: '#ffffff',
                      padding: '0.85rem 1rem',
                      borderRadius: '12px',
                      border: `1px solid ${colors.border}`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      boxShadow: shadowSm
                    }}>
                      <div>
                        <div style={{ fontWeight: 800, color: colors.text, fontSize: '0.88rem' }}>{s.data_formatada}</div>
                        <div style={{ fontSize: '0.78rem', color: colors.textMuted, fontWeight: 600, marginTop: '2px' }}>
                          {s.recurso_planejado || s.recurso_executado || 'SVR'}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{
                          fontSize: '0.65rem',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          background: colors.primary + '12',
                          color: colors.primary,
                          padding: '3px 8px',
                          borderRadius: '6px'
                        }}>
                          {s.funcao_planejada || 'Patrulheiro'}
                        </span>
                        <div style={{
                          fontSize: '0.7rem',
                          color: s.id_execucao ? '#059669' : '#2563eb',
                          fontWeight: 800,
                          marginTop: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                          justifyContent: 'flex-end'
                        }}>
                          {s.id_execucao ? <Check size={11} strokeWidth={3} /> : <Clock size={11} strokeWidth={3} />}
                          {s.id_execucao ? 'EXECUTADO' : 'PLANEJADO'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-detail-footer-responsive" style={{
          padding: '1rem 2rem',
          background: colors.white,
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={() => setDetailedMilitar(null)}
            style={{
              padding: '0.65rem 2rem',
              background: colors.primary,
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '0.9rem',
              transition: transitions,
              boxShadow: '0 4px 12px rgba(13, 56, 120, 0.2)'
            }}
            onMouseOver={e => e.currentTarget.style.transform = 'translateY(-1px)'}
            onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
})()}

    </>
  );
}
