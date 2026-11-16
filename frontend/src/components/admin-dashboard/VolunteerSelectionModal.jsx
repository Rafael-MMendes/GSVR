import { Shield, X, Search, Check, Users, UserCircle } from 'lucide-react';
import { SHIFTS, MAX_MEMBERS, getTimeOptions } from '../../utils/scheduleHelpers';
import { dashboardColors as colors, dashboardTransitions as transitions, shadowSm, shadowLg } from './theme';

/**
 * Modal de seleção de voluntários do pool para composição de guarnição.
 * @param {{
 *   selectionMode: { patrolId: string, slotIndex?: number, selectedMembers?: any[] } | null,
 *   searchTerm: string,
 *   setSearchTerm: (v: string) => void,
 *   selectedDate: string,
 *   setSelectedDate: (v: string) => void,
 *   months: import('../../types/gsvr.types').Cycle[],
 *   selectedCycleId: number | string,
 *   selectedShift: string,
 *   setSelectedShift: (v: string) => void,
 *   showUnavailable: boolean,
 *   setShowUnavailable: (v: boolean) => void,
 *   newPatrolName: string,
 *   setNewPatrolName: (v: string) => void,
 *   newPatrolDuration: string,
 *   setNewPatrolDuration: (v: string) => void,
 *   newPatrolShift: string,
 *   setNewPatrolShift: (v: string) => void,
 *   state: { pool: import('../../types/gsvr.types').Volunteer[], patrols: import('../../types/gsvr.types').Patrol[] },
 *   filteredPool: import('../../types/gsvr.types').Volunteer[],
 *   selectedMembers: import('../../types/gsvr.types').Volunteer[],
 *   toggleMemberSelection: (member: any) => void,
 *   handleShowDetails: (militar: any) => void,
 *   confirmSelection: () => void,
 *   closeSelectionModal: () => void,
 *   isSaving: boolean,
 * }} props
 */
export function VolunteerSelectionModal({
  selectionMode,
  searchTerm,
  setSearchTerm,
  selectedDate,
  setSelectedDate,
  months,
  selectedCycleId,
  selectedShift,
  setSelectedShift,
  showUnavailable,
  setShowUnavailable,
  newPatrolName,
  setNewPatrolName,
  newPatrolDuration,
  setNewPatrolDuration,
  newPatrolShift,
  setNewPatrolShift,
  state,
  filteredPool,
  selectedMembers,
  toggleMemberSelection,
  handleShowDetails,
  confirmSelection,
  closeSelectionModal,
  isSaving
}) {
  if (!selectionMode) return null;

  return (
    <>
{selectionMode && (
  <div style={{
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(15, 23, 42, 0.6)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    animation: 'fadeIn 0.3s ease-out'
  }}>
    <div className="modal-responsive-pool" style={{
      background: colors.white,
      borderRadius: '20px',
      width: '96%',
      maxWidth: '1440px',
      height: '92vh',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: shadowLg,
      overflow: 'hidden',
      border: `1px solid ${colors.border}`
    }}>
      {/* Modal Header */}
      <div className="pool-header-responsive" style={{
        padding: '0.85rem 1.75rem',
        background: 'linear-gradient(135deg, #0D3878 0%, #1e40af 100%)',
        color: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 8px rgba(13, 56, 120, 0.25)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            background: 'rgba(255,255,255,0.2)',
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(4px)'
          }}>
            <Shield size={20} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.01em' }}>
              Banco de Voluntários
            </h3>
            <p style={{ margin: 0, opacity: 0.85, fontSize: '0.78rem', fontWeight: 500 }}>
              {selectionMode?.slotIndex !== undefined
                ? 'Selecione 1 militar para o posto selecionado'
                : `Selecione até ${MAX_MEMBERS} militares para compor a guarnição`}
            </p>
          </div>
        </div>
        <button
          onClick={closeSelectionModal}
          style={{
            background: 'rgba(255,255,255,0.12)',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            borderRadius: '10px',
            width: '34px',
            height: '34px',
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

      {/* Modal Search & Filters */}
      <div className="pool-filters-responsive" style={{
        background: '#f8fafc',
        borderBottom: `1px solid ${colors.border}`,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        padding: '0.65rem 1.5rem'
      }}>
        {/* Row 1: Search & Primary Filters */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Search Input with quick clear */}
          <div className="search-container" style={{ flex: '1 1 240px', minWidth: '220px', position: 'relative' }}>
            <input
              type="text"
              className="search-input"
              placeholder="Buscar por nome, posto, matrícula ou Nº ordem..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ height: '38px', paddingRight: searchTerm ? '34px' : '1rem' }}
            />
            <Search size={16} className="search-icon" />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: colors.textMuted,
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="Limpar busca"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Day Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Dia:</span>
            <select
              style={{
                height: '38px',
                padding: '0 0.85rem',
                borderRadius: '10px',
                border: `1px solid ${colors.border}`,
                background: colors.white,
                color: colors.text,
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer',
                outline: 'none',
                boxShadow: shadowSm,
                minWidth: '150px'
              }}
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
            >
              {(() => {
                const currentCycle = months.find(m => String(m.id_ciclo) === String(selectedCycleId));
                if (!currentCycle) return null;

                const startDate = new Date(String(currentCycle.data_inicio).split('T')[0] + 'T12:00:00');
                const endDate = new Date(String(currentCycle.data_fim).split('T')[0] + 'T12:00:00');

                const days = [];
                let curr = new Date(startDate);
                while (curr <= endDate) {
                  days.push(new Date(curr));
                  curr.setDate(curr.getDate() + 1);
                }

                return days.map(date => {
                  const d = date.getDate();
                  const yyyy = date.getFullYear();
                  const mm = String(date.getMonth() + 1).padStart(2, '0');
                  const dd = String(d).padStart(2, '0');
                  const isoDate = `${yyyy}-${mm}-${dd}`;
                  const monthName = date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
                  const monthCap = monthName.charAt(0).toUpperCase() + monthName.slice(1);
                  const wday = date.toLocaleDateString('pt-BR', { weekday: 'short' });
                  const wdayCap = ' (' + wday.charAt(0).toUpperCase() + wday.slice(1) + ')';
                  return <option key={date.getTime()} value={isoDate}>Dia {dd}/{monthCap}{wdayCap}</option>;
                });
              })()}
            </select>
          </div>

          {/* Shift Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Turno:</span>
            <select
              style={{
                height: '38px',
                padding: '0 0.85rem',
                borderRadius: '10px',
                border: `1px solid ${colors.border}`,
                background: colors.white,
                fontWeight: 700,
                outline: 'none',
                cursor: 'pointer',
                minWidth: '130px',
                fontSize: '0.82rem',
                boxShadow: shadowSm
              }}
              value={selectedShift}
              onChange={e => setSelectedShift(e.target.value)}
            >
              <option value="Todos">Turno: Todos</option>
              {SHIFTS?.map(s => <option key={s} value={s}>{s.split(' ')[0]}</option>)}
            </select>
          </div>

          {/* Availability Badge & Toggle */}
          <div style={{
            height: '38px',
            padding: '0 0.85rem',
            borderRadius: '10px',
            background: showUnavailable ? '#fee2e2' : '#f0fdf4',
            color: showUnavailable ? '#b91c1c' : '#166534',
            border: showUnavailable ? '1px solid #fecaca' : '1px solid #bbf7d0',
            fontWeight: 700,
            fontSize: '0.82rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            marginLeft: 'auto',
            flexShrink: 0,
            whiteSpace: 'nowrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap' }}>
              <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: showUnavailable ? '#ef4444' : '#22c55e' }}></div>
              <span>{filteredPool.length} {showUnavailable ? 'Encontrados' : 'Disponíveis'}</span>
            </div>
            <button
              onClick={() => setShowUnavailable(!showUnavailable)}
              style={{
                background: 'white',
                border: 'none',
                padding: '3px 8px',
                borderRadius: '6px',
                fontSize: '0.68rem',
                cursor: 'pointer',
                color: showUnavailable ? '#b91c1c' : '#166534',
                fontWeight: 800,
                boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                whiteSpace: 'nowrap'
              }}
            >
              {showUnavailable ? 'Ver Disponíveis' : 'Mostrar Todos'}
            </button>
          </div>
        </div>

        {/* Row 2: Patrol Configuration (Compact Strip) */}
        {selectionMode && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            flexWrap: 'wrap',
            padding: '0.35rem 0.75rem',
            background: '#f1f5f9',
            borderRadius: '10px',
            border: `1px solid ${colors.border}`
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: colors.primary, fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase' }}>
              <Shield size={14} />
              <span>Guarnição:</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 600, color: colors.textMuted }}>Nome:</span>
              <input
                type="text"
                placeholder="Ex: GSVR, Força Tarefa..."
                style={{
                  height: '30px',
                  padding: '0 0.65rem',
                  borderRadius: '8px',
                  border: `1px solid ${colors.border}`,
                  background: colors.white,
                  fontWeight: 700,
                  outline: 'none',
                  fontSize: '0.8rem',
                  color: colors.primary,
                  boxShadow: shadowSm,
                  width: '140px'
                }}
                value={selectionMode.patrolId === 'NEW' ? newPatrolName : (state.patrols?.find(p => p.id === selectionMode.patrolId)?.name || '')}
                onChange={e => {
                  if (selectionMode.patrolId === 'NEW') setNewPatrolName(e.target.value);
                  else handlePatrolSettingChange(selectionMode.patrolId, 'name', e.target.value);
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 600, color: colors.textMuted }}>Duração:</span>
              <select
                style={{
                  height: '30px',
                  padding: '0 0.5rem',
                  borderRadius: '8px',
                  border: `1px solid ${colors.border}`,
                  background: colors.white,
                  fontWeight: 700,
                  outline: 'none',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  color: colors.primary,
                  boxShadow: shadowSm
                }}
                value={selectionMode.patrolId === 'NEW' ? newPatrolDuration : state.patrols?.find(p => p.id === selectionMode.patrolId)?.duration}
                onChange={e => {
                  const dur = e.target.value;
                  if (selectionMode.patrolId === 'NEW') {
                    setNewPatrolDuration(dur);
                    const opts = getTimeOptions(dur);
                    if (opts.length > 0 && !opts.includes(newPatrolShift)) {
                      setNewPatrolShift(opts[7] || opts[0]);
                    }
                  } else {
                    handleDurationChange(selectionMode.patrolId, dur);
                  }
                }}
              >
                {['6h', '8h'].map(d => <option key={d} value={d}>{d === '6h' ? '6 Horas' : '8 Horas'}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 600, color: colors.textMuted }}>Horário:</span>
              <select
                style={{
                  height: '30px',
                  padding: '0 0.5rem',
                  borderRadius: '8px',
                  border: `1px solid ${colors.border}`,
                  background: colors.white,
                  fontWeight: 700,
                  outline: 'none',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  color: colors.primary,
                  boxShadow: shadowSm
                }}
                value={selectionMode.patrolId === 'NEW' ? newPatrolShift : state.patrols?.find(p => p.id === selectionMode.patrolId)?.timeSpan}
                onChange={e => {
                  if (selectionMode.patrolId === 'NEW') setNewPatrolShift(e.target.value);
                  else handlePatrolSettingChange(selectionMode.patrolId, 'timeSpan', e.target.value);
                }}
              >
                <option value="">Selecione Horário...</option>
                {getTimeOptions(selectionMode.patrolId === 'NEW' ? newPatrolDuration : state.patrols?.find(p => p.id === selectionMode.patrolId)?.duration)?.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Modal Pool Grid */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '0.75rem 1.5rem',
        background: '#f1f5f9',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(285px, 1fr))',
        gap: '0.55rem',
        alignContent: 'start'
      }}>
        {filteredPool.length === 0 ? (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', color: colors.textMuted }}>
            <Users size={40} style={{ margin: '0 auto 0.75rem', opacity: 0.2 }} />
            <p style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 0.25rem' }}>Nenhum militar disponível hoje</p>
            <p style={{ fontSize: '0.85rem', maxWidth: '320px', margin: '0 auto' }}>
              Tente clicar em <strong>"Mostrar Todos"</strong> no topo para ver voluntários que não marcaram este dia.
            </p>
          </div>
        ) : (
          filteredPool.map(p => {
            const isSelected = selectedMembers.some(m => m.id === p.id);
            const selectionLimit = selectionMode?.slotIndex !== undefined ? 1 : MAX_MEMBERS;
            const isDisabled = !isSelected && selectedMembers.length >= selectionLimit;

            // Identifica se é motorista para o turno
            const targetShift = selectionMode?.patrolId === 'NEW' ? newPatrolShift : state.patrols?.find(pat => pat.id === selectionMode?.patrolId)?.timeSpan;
            const todayShifts = p.availability_completa?.[selectedDate] || [];
            const specificShiftData = todayShifts.find(s => s.turno === targetShift);
            const isDriverForShift = specificShiftData ? specificShiftData.motorista : false;
            const isMotorista = isDriverForShift || p.motorista === 'Sim' || p.motorista_req === true || p.id_funcao === 2;

            return (
              <div
                key={p.id}
                onClick={() => !isDisabled && toggleMemberSelection(p)}
                title={isDisabled && !isSelected ? `Limite de ${selectionLimit} militares atingido` : `${p.rank} ${p.name}`}
                style={{
                  padding: '0.45rem 0.65rem',
                  minHeight: '54px',
                  border: isSelected ? `2px solid ${colors.primary}` : `1px solid ${colors.border}`,
                  borderRadius: '12px',
                  background: isSelected ? '#eff6ff' : colors.white,
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  opacity: isDisabled && !isSelected ? 0.5 : 1,
                  transition: transitions,
                  boxShadow: isSelected ? '0 4px 12px rgba(13, 56, 120, 0.12)' : shadowSm,
                  position: 'relative'
                }}
                onMouseEnter={e => { if (!isDisabled) e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                {/* Avatar / Check Indicator */}
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: isSelected ? colors.primary : '#f1f5f9',
                  color: isSelected ? 'white' : colors.textMuted,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {isSelected ? <Check size={16} strokeWidth={3} /> : <UserCircle size={20} />}
                </div>

                {/* Info Militar (Nome, Posto, Matrícula, Badges) */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontWeight: 700,
                    color: colors.text,
                    fontSize: '0.82rem',
                    lineHeight: 1.25,
                    wordBreak: 'break-word'
                  }}>
                    {p.rank} {p.name}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '2px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.7rem', color: colors.textMuted, fontWeight: 600, whiteSpace: 'nowrap' }}>
                      Nº {p.numero_ordem || p.matricula}
                    </span>
                    {isMotorista && (
                      <span style={{
                        fontSize: '0.58rem',
                        background: '#10b981',
                        color: 'white',
                        padding: '1px 4px',
                        borderRadius: '4px',
                        fontWeight: 800,
                        lineHeight: 1
                      }}>
                        MOT
                      </span>
                    )}
                    {!p.isAvailableToday && (
                      <span style={{
                        fontSize: '0.56rem',
                        background: '#fee2e2',
                        color: '#ef4444',
                        padding: '1px 4px',
                        borderRadius: '4px',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        lineHeight: 1
                      }}>
                        Fora
                      </span>
                    )}
                  </div>
                </div>

                {/* Right Counters & Detail Button */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {/* PLAN Badge */}
                    <div
                      title={`Serviços Planejados: ${p.service_count}/8`}
                      style={{
                        background: p.service_count >= 8 ? '#fef2f2' : p.service_count >= 6 ? '#fffbeb' : '#f0fdf4',
                        color: p.service_count >= 8 ? '#dc2626' : p.service_count >= 6 ? '#b45309' : '#15803d',
                        padding: '1px 4px',
                        borderRadius: '5px',
                        fontSize: '0.62rem',
                        fontWeight: 800,
                        border: `1px solid ${p.service_count >= 8 ? '#fee2e2' : p.service_count >= 6 ? '#fef3c7' : '#dcfce7'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: '38px',
                        lineHeight: 1.1
                      }}
                    >
                      <span style={{ fontSize: '0.5rem', opacity: 0.7, marginRight: '2px' }}>P</span>
                      {p.service_count}/8
                    </div>

                    {/* EXEC Badge */}
                    <div
                      title={`Serviços Executados: ${p.executed_count}/8`}
                      style={{
                        background: p.executed_count >= 8 ? '#ecfdf5' : p.executed_count >= 6 ? '#f0fdf4' : '#eff6ff',
                        color: p.executed_count >= 8 ? '#059669' : p.executed_count >= 6 ? '#16a34a' : '#1e40af',
                        padding: '1px 4px',
                        borderRadius: '5px',
                        fontSize: '0.62rem',
                        fontWeight: 800,
                        border: `1px solid ${p.executed_count >= 8 ? '#a7f3d0' : p.executed_count >= 6 ? '#bbf7d0' : '#dbeafe'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: '38px',
                        lineHeight: 1.1
                      }}
                    >
                      <span style={{ fontSize: '0.5rem', opacity: 0.7, marginRight: '2px' }}>E</span>
                      {p.executed_count}/8
                    </div>
                  </div>

                  {/* Search / Info Button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleShowDetails(p); }}
                    style={{
                      background: 'rgba(30, 58, 120, 0.05)',
                      border: 'none',
                      borderRadius: '7px',
                      width: '26px',
                      height: '26px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: colors.primary,
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={e => { e.currentTarget.style.background = colors.primary; e.currentTarget.style.color = 'white'; }}
                    onMouseOut={e => { e.currentTarget.style.background = 'rgba(30, 58, 120, 0.05)'; e.currentTarget.style.color = colors.primary; }}
                    title="Ver histórico de escalas do militar"
                  >
                    <Search size={13} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Footer */}
      <div className="pool-footer-responsive" style={{
        padding: '0.85rem 1.75rem',
        borderTop: `1px solid ${colors.border}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: colors.white,
        gap: '1rem',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.95rem', color: colors.text, fontWeight: 700 }}>
              {selectedMembers.length} selecionado{selectedMembers.length !== 1 ? 's' : ''}
            </span>
            <span style={{ color: colors.textMuted, fontSize: '0.82rem', fontWeight: 500 }}>
              (limite de {selectionMode?.slotIndex !== undefined ? 1 : MAX_MEMBERS})
            </span>
          </div>

          {/* Selected members chips */}
          {selectedMembers.length > 0 ? (
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
              {selectedMembers.map((m, idx) => (
                <span
                  key={m.id || idx}
                  style={{
                    background: '#eff6ff',
                    color: colors.primary,
                    border: '1px solid #bfdbfe',
                    borderRadius: '16px',
                    padding: '2px 8px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  {m.rank} {m.name}
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleMemberSelection(m); }}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: colors.primary,
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    title="Remover militar da seleção"
                  >
                    <X size={12} strokeWidth={3} />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <div style={{ color: '#d97706', fontSize: '0.78rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>ℹ️ Clique nos militares acima para selecioná-los para a guarnição</span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={closeSelectionModal}
            style={{
              padding: '0.65rem 1.5rem',
              background: '#f1f5f9',
              color: colors.textMuted,
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.88rem',
              transition: transitions
            }}
            onMouseOver={e => e.currentTarget.style.background = '#e2e8f0'}
            onMouseOut={e => e.currentTarget.style.background = '#f1f5f9'}
          >
            Cancelar
          </button>
          <button
            onClick={confirmSelection}
            disabled={isSaving}
            title={selectedMembers.length === 0 ? "Selecione ao menos 1 militar nos cartões acima para salvar" : "Salvar escala"}
            style={{
              padding: '0.65rem 2.25rem',
              background: selectedMembers.length > 0 && !isSaving ? colors.primary : '#94a3b8',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              cursor: isSaving ? 'wait' : (selectedMembers.length > 0 ? 'pointer' : 'not-allowed'),
              fontWeight: 700,
              fontSize: '0.88rem',
              boxShadow: selectedMembers.length > 0 && !isSaving ? '0 4px 14px rgba(13, 56, 120, 0.25)' : 'none',
              transition: transitions,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <Check size={16} strokeWidth={3} />
            {isSaving ? 'Salvando...' : 'Salvar Escala'}
          </button>
        </div>
      </div>
    </div>
  </div>
)}

    </>
  );
}
