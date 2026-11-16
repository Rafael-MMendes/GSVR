import { Calendar, Clock, Users, Target, Check, AlertTriangle, Plus, FileText, Sparkles } from 'lucide-react';
import { SHIFTS, buildCycleDayOptions } from '../../utils/scheduleHelpers';
import { dashboardColors as colors, dashboardTransitions as transitions, shadowSm } from './theme';

/**
 * Barra lateral de navegação, filtros de ciclo/data/turno e ações da escala.
 * @param {{
 *   months: import('../../types/gsvr.types').Cycle[],
 *   selectedCycleId: number | string,
 *   onSelectCycle: (newId: string) => void,
 *   selectedDate: string,
 *   onSelectDate: (date: string) => void,
 *   selectedShift: string,
 *   onSelectShift: (shift: string) => void,
 *   showUnavailable: boolean,
 *   onToggleShowUnavailable: () => void,
 *   availableCount: number,
 *   metas: import('../../types/gsvr.types').MetaAlocacao[],
 *   patrolsCount: number,
 *   isSaving: boolean,
 *   onAddPatrol: () => void,
 *   onSaveSchedule: () => void,
 *   onPublish: () => void,
 * }} props
 */
export function ScheduleSidebar({
  months,
  selectedCycleId,
  onSelectCycle,
  selectedDate,
  onSelectDate,
  selectedShift,
  onSelectShift,
  showUnavailable,
  onToggleShowUnavailable,
  availableCount,
  metas,
  patrolsCount,
  isSaving,
  isSuggesting,
  onAddPatrol,
  onSuggestSchedule,
  onSaveSchedule,
  onPublish
}) {
  const currentCycle = months.find(m => String(m.id_ciclo) === String(selectedCycleId));
  const dayOptions = buildCycleDayOptions(currentCycle);

  const metaDoDia = metas.find(m => String(m.data).split('T')[0] === selectedDate);
  const totalPlanejado = metaDoDia?.qtd_equipes_planejadas || 0;
  const isOver = patrolsCount > totalPlanejado && totalPlanejado > 0;
  const isMet = patrolsCount === totalPlanejado && totalPlanejado > 0;

  return (
    <div className="v2-sidebar no-print" style={{
      width: '320px',
      background: colors.white,
      borderRight: `1px solid ${colors.border}`,
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      position: 'sticky',
      top: 0,
      flexShrink: 0,
      zIndex: 100,
      boxShadow: '4px 0 24px rgba(0,0,0,0.02)'
    }}>
      {/* Sidebar Header / Branding */}
      <div style={{
        padding: '2rem',
        borderBottom: `1px solid ${colors.border}`,
        background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{
            background: 'linear-gradient(135deg, #0D3878 0%, #1e40af 100%)',
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            boxShadow: '0 8px 16px rgba(13, 56, 120, 0.25)'
          }}>
            <Calendar size={22} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.25rem', color: colors.primary, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              GSVR Admin
            </h1>
            <p style={{ margin: 0, fontSize: '0.75rem', color: colors.textMuted, fontWeight: 600 }}>Planejamento Pro v2</p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{
            padding: '0.75rem 1rem',
            borderRadius: '12px',
            background: '#f0f9ff',
            color: colors.primary,
            border: '1px solid #bae6fd',
            fontWeight: 700,
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <Clock size={16} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.65rem', opacity: 0.7, textTransform: 'uppercase', marginBottom: '0.2rem' }}>Ciclo Ativo</div>
              <select
                value={selectedCycleId}
                onChange={(e) => onSelectCycle(e.target.value)}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  color: colors.primary,
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  outline: 'none',
                  padding: 0
                }}
              >
                {months.map(m => (
                  <option key={m.id_ciclo} value={m.id_ciclo}>{m.period_name}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{
            padding: '0.75rem 1rem',
            borderRadius: '12px',
            background: '#f8fafc',
            color: '#4f46e5',
            border: '1px solid #e2e8f0',
            fontWeight: 700,
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <Users size={16} />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '0.65rem', opacity: 0.7, textTransform: 'uppercase' }}>Militares</div>
                <button
                  onClick={onToggleShowUnavailable}
                  style={{
                    fontSize: '0.65rem',
                    background: showUnavailable ? '#fee2e2' : '#f1f5f9',
                    border: 'none',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    color: showUnavailable ? '#b91c1c' : '#64748b',
                    cursor: 'pointer',
                    fontWeight: 700
                  }}
                >
                  {showUnavailable ? 'Ocultar' : 'Mostrar Todos'}
                </button>
              </div>
              <div style={{ fontSize: '0.85rem' }}>Disponíveis: {availableCount}</div>
            </div>
          </div>

          {/* CARD DE METAS DO DIA */}
          <div style={{
            padding: '0.75rem 1rem',
            borderRadius: '12px',
            background: isOver ? '#fef2f2' : (isMet ? '#f0fdf4' : '#fff7ed'),
            color: isOver ? '#dc2626' : (isMet ? '#15803d' : '#c2410c'),
            border: `1px solid ${isOver ? '#fecaca' : (isMet ? '#bbf7d0' : '#fed7aa')}`,
            fontWeight: 700,
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            transition: 'all 0.3s ease'
          }}>
            <Target size={16} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.65rem', opacity: 0.7, textTransform: 'uppercase' }}>Meta do Dia</div>
              {patrolsCount} / {totalPlanejado} Equipes
            </div>
            {isMet && <Check size={14} />}
            {isOver && <AlertTriangle size={14} />}
          </div>
        </div>
      </div>

      {/* Sidebar Navigation / Filters */}
      <div style={{ padding: '0.5rem 2rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <label style={{ fontSize: '0.7rem', fontWeight: 800, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Configurações de Visualização
          </label>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <select
              style={{
                width: '100%',
                padding: '0.85rem 1rem',
                borderRadius: '12px',
                border: `1px solid ${colors.border}`,
                background: colors.white,
                color: colors.text,
                fontWeight: 600,
                fontSize: '0.9rem',
                outline: 'none',
                boxShadow: shadowSm
              }}
              value={selectedDate}
              onChange={e => onSelectDate(e.target.value)}
            >
              {dayOptions.map(opt => (
                <option key={opt.key} value={opt.isoDate}>{opt.label}</option>
              ))}
            </select>

            <select
              style={{
                width: '100%',
                padding: '0.85rem 1rem',
                borderRadius: '12px',
                border: `1px solid ${colors.border}`,
                background: colors.white,
                color: colors.text,
                fontWeight: 600,
                fontSize: '0.9rem',
                outline: 'none',
                boxShadow: shadowSm
              }}
              value={selectedShift}
              onChange={e => onSelectShift(e.target.value)}
            >
              <option value="Todos">Turno: Todos</option>
              {SHIFTS.map(s => <option key={s} value={s}>{s.split(' ')[0]}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <label style={{ fontSize: '0.7rem', fontWeight: 800, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Ações de Escala
          </label>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {onSuggestSchedule && (
              <button
                type="button"
                onClick={onSuggestSchedule}
                disabled={isSuggesting || isSaving}
                aria-label="Sugerir escala automática com base em equidade e disponibilidade"
                style={{
                  width: '100%',
                  padding: '0.85rem 1rem',
                  background: isSuggesting ? '#94a3b8' : 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '14px',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: isSuggesting ? 'wait' : 'pointer',
                  transition: transitions,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.6rem',
                  boxShadow: isSuggesting ? 'none' : '0 8px 16px rgba(79, 70, 229, 0.22)'
                }}
              >
                <Sparkles size={18} />
                {isSuggesting ? 'Gerando Sugestão...' : 'Sugerir Escala Automática'}
              </button>
            )}

            <button
              onClick={onAddPatrol}
              style={{
                width: '100%',
                padding: '1rem',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '14px',
                fontWeight: 700,
                fontSize: '0.95rem',
                cursor: 'pointer',
                transition: transitions,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                boxShadow: '0 8px 16px rgba(16, 185, 129, 0.2)'
              }}
              onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <Plus size={20} strokeWidth={3} />
              Nova Guarnição
            </button>

            <button
              onClick={onSaveSchedule}
              disabled={isSaving}
              style={{
                width: '100%',
                padding: '1rem',
                background: isSaving ? '#94a3b8' : 'linear-gradient(135deg, #0D3878 0%, #1e40af 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '14px',
                fontWeight: 700,
                fontSize: '0.95rem',
                cursor: isSaving ? 'wait' : 'pointer',
                transition: transitions,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                boxShadow: isSaving ? 'none' : '0 10px 20px rgba(13, 56, 120, 0.2)'
              }}
              onMouseOver={e => !isSaving && (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseOut={e => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              <Check size={20} strokeWidth={3} />
              {isSaving ? 'Salvando...' : 'Salvar Escala'}
            </button>

            <button
              onClick={onPublish}
              style={{
                width: '100%',
                padding: '0.85rem',
                background: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: transitions,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                marginTop: '0.5rem',
                fontWeight: 700,
                boxShadow: '0 4px 12px rgba(234, 88, 12, 0.35)'
              }}
              onMouseOver={e => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(234, 88, 12, 0.45)';
              }}
              onMouseOut={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(234, 88, 12, 0.35)';
              }}
            >
              <FileText size={18} />
              <span>Publicar Escala</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

