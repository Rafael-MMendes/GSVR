import { CalendarCheck } from 'lucide-react';

const DEFAULT_SHIFTS = [
  '07:00 ÀS 13:00',
  '13:00 ÀS 19:00',
  '19:00 ÀS 01:00',
  '01:00 ÀS 07:00'
];

/**
 * Grade de Disponibilidade compartilhada entre RelatorioIndividual e RequerimentosAdmin
 * (Visualizar, Editar/Novo e Cancelar Disponibilidade).
 *
 * @param {{
 *   gridDisp?: Array<{
 *     dia_mes: string,
 *     horario_turno: string,
 *     marcado_disponivel?: boolean,
 *     marcado_servico_ordinario?: boolean,
 *     ativo?: boolean,
 *     teve_execucao?: boolean
 *   }>,
 *   cycleDays: Array<{ day: number, month: number, year: number, monthShort: string }>,
 *   turnos?: string[],
 *   compact?: boolean,
 *   title?: string,
 *   getCellOverride?: (ctx: { dateKey: string, dayStr: string, turno: string, cell: any }) => ({
 *     bg: string, border: string, color: string, symbol: string, title?: string, opacity?: number, hasObs?: boolean, clickable?: boolean
 *   } | null),
 *   onCellClick?: (dateKey: string, turno: string, cell: any) => void,
 *   onCellContextMenu?: (e: React.MouseEvent, dateKey: string, turno: string) => void
 * }} props
 */
export function AvailabilityGridCard({
  gridDisp = [],
  cycleDays = [],
  turnos = DEFAULT_SHIFTS,
  compact = false,
  title = 'Grade de Disponibilidade',
  getCellOverride,
  onCellClick,
  onCellContextMenu
}) {
  const byDay = {};
  gridDisp.forEach(r => {
    const dayKey = String(r.dia_mes || '').split('T')[0];
    if (!byDay[dayKey]) byDay[dayKey] = {};
    byDay[dayKey][r.horario_turno] = r;
  });

  const getDefaultCfg = (cell) => {
    if (!cell || (cell.ativo !== true && cell.ativo !== false && !cell.teve_execucao && !cell.marcado_servico_ordinario)) {
      return null;
    }
    if (cell.teve_execucao) {
      return { bg: '#059669', border: '#047857', color: '#fff', symbol: '✕', title: 'Serviço executado' };
    }
    if (cell.marcado_servico_ordinario === true) {
      return { bg: '#f97316', border: '#ea580c', color: '#fff', symbol: 'S', title: 'Serviço Ordinário (S)' };
    }
    if (cell.ativo === true && cell.marcado_disponivel !== false) {
      return { bg: '#2563eb', border: '#1d4ed8', color: '#fff', symbol: '✕', title: 'Disponível' };
    }
    if (cell.ativo === false) {
      return { bg: '#dc2626', border: '#b91c1c', color: '#fff', symbol: '✕', title: 'Desistência' };
    }
    return null;
  };

  return (
    <div className="print-card" style={{ background: '#fff', borderRadius: '18px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
      <div style={{ padding: compact ? '1rem 1.25rem' : '1.5rem 2rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: 36, height: 36, borderRadius: '10px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CalendarCheck size={20} color="#2563eb" />
          </div>
          <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '1.1rem' }}>{title}</span>
        </div>
        <div style={{ display: 'flex', gap: '1.1rem', fontSize: '0.8rem', fontWeight: 600, color: '#64748b', flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ width: 12, height: 12, borderRadius: '3px', background: '#059669' }} /> Executado
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ width: 12, height: 12, borderRadius: '3px', background: '#2563eb' }} /> Disponível
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ width: 12, height: 12, borderRadius: '3px', background: '#f97316' }} /> Serviço Ordinário (S)
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ width: 12, height: 12, borderRadius: '3px', background: '#dc2626' }} /> Desistência
          </span>
        </div>
      </div>

      <div style={{ padding: compact ? '1rem' : '1.25rem 1.5rem', overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'separate', borderSpacing: '2px', width: '100%', minWidth: '680px', tableLayout: 'fixed' }}>
          <thead>
            <tr>
              <th style={{ width: '92px', padding: '0.25rem 0.5rem 0.25rem 0', fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Turno</th>
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
                <td style={{ padding: '0.25rem 0.5rem 0.25rem 0', fontSize: '0.73rem', color: '#1e293b', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {turno}
                </td>
                {cycleDays.map(dayObj => {
                  const dateKey = `${dayObj.year}-${String(dayObj.month).padStart(2, '0')}-${String(dayObj.day).padStart(2, '0')}`;
                  const dayStr = String(dayObj.day);
                  const cell = byDay[dateKey]?.[turno] || byDay[dayStr]?.[turno];
                  const cfg = getCellOverride
                    ? getCellOverride({ dateKey, dayStr, turno, cell })
                    : getDefaultCfg(cell);

                  const isClickable = cfg?.clickable ?? Boolean(onCellClick);

                  return (
                    <td
                      key={`${dayObj.year}-${dayObj.month}-${dayObj.day}`}
                      style={{ padding: 0, textAlign: 'center' }}
                      onClick={() => isClickable && onCellClick?.(dateKey, turno, cell)}
                      onContextMenu={(e) => onCellContextMenu?.(e, dateKey, turno)}
                    >
                      {cfg ? (
                        <div
                          title={cfg.title || ''}
                          style={{
                            width: '100%', aspectRatio: '1/1', maxWidth: '24px', borderRadius: '4px',
                            background: cfg.bg,
                            border: `1px solid ${cfg.border}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: 'auto', transition: 'transform 0.15s',
                            cursor: isClickable ? 'pointer' : 'help',
                            position: 'relative',
                            opacity: cfg.opacity ?? 1
                          }}
                        >
                          <span style={{ color: cfg.color, fontWeight: 900, fontSize: '0.65rem' }}>{cfg.symbol}</span>
                          {cfg.hasObs && (
                            <span style={{ position: 'absolute', top: '1px', right: '1px', width: '5px', height: '5px', background: '#fbbf24', borderRadius: '50%' }} />
                          )}
                        </div>
                      ) : (
                        <div
                          title={onCellClick ? 'Clique para selecionar' : ''}
                          style={{
                            width: '100%', aspectRatio: '1/1', maxWidth: '24px', borderRadius: '4px',
                            background: '#f8fafc', margin: 'auto', border: '1px dashed #e2e8f0',
                            cursor: isClickable ? 'pointer' : 'default'
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
    </div>
  );
}
