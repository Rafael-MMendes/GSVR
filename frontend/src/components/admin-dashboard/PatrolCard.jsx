import { Shield, Eye, EyeOff, Trash2, Check, X, GripVertical, MousePointer2, Plus } from 'lucide-react';
import { ROLES, normalizePatrolName } from '../../utils/scheduleHelpers';
import { dashboardColors as colors, dashboardTransitions as transitions, shadowSm, shadowMd } from './theme';

/**
 * Card de guarnição com edição de nome, publicação, local de embarque e slots com drag-and-drop.
 * @param {{
 *   patrol: import('../../types/gsvr.types').Patrol,
 *   savingPatrolId: string | null,
 *   activeSlot: { patrolId: string, roleIndex: number } | null,
 *   isSaving: boolean,
 *   onDragOver: (e: React.DragEvent) => void,
 *   onDrop: (e: React.DragEvent, patrolId: string) => void,
 *   onDragStart: (e: React.DragEvent, personId: string | number, patrolId: string) => void,
 *   onSettingChange: (patrolId: string, field: string, value: any) => void,
 *   onRemovePatrol: (patrolId: string) => void,
 *   onRoleChange: (patrolId: string, sourceIdx: number, targetIdx: number) => void,
 *   onOpenSlotModal: (patrolId: string, slotIndex: number) => void,
 *   onSelectActiveSlot: (patrolId: string, roleIndex: number) => void,
 * }} props
 */
export function PatrolCard({
  patrol,
  savingPatrolId,
  activeSlot,
  isSaving,
  onDragOver,
  onDrop,
  onDragStart,
  onSettingChange,
  onRemovePatrol,
  onRoleChange,
  onOpenSlotModal,
  onSelectActiveSlot
}) {
  return (
    <div
      className="patrol-card-hover"
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, patrol.id)}
      style={{
        background: colors.white,
        borderRadius: '20px',
        border: patrol.publicado === false ? '1px dashed #ef4444' : `1px solid ${colors.border}`,
        boxShadow: shadowMd,
        opacity: patrol.publicado === false ? 0.85 : 1,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        animation: 'fadeIn 0.5s ease-out'
      }}
    >
      {/* Card Header (Patrol) */}
      <div style={{
        background: colors.primaryGradient,
        padding: '0.75rem 1.25rem',
        color: 'white',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {savingPatrolId === patrol.id && (
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(255,255,255,0.2)',
            backdropFilter: 'blur(2px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 20
          }}>
            <MousePointer2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 1 }}>
            <Shield size={18} style={{ opacity: 0.8 }} />
            <input
              type="text"
              value={normalizePatrolName(patrol.name)}
              onChange={e => onSettingChange(patrol.id, 'name', normalizePatrolName(e.target.value))}
              style={{
                border: 'none',
                background: 'transparent',
                fontSize: '1rem',
                fontWeight: 800,
                color: 'white',
                width: '100%',
                outline: 'none',
                letterSpacing: '-0.01em'
              }}
              placeholder="Nome da Guarnição"
            />
          </div>
          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
            <button
              type="button"
              aria-label={patrol.publicado !== false ? `Ocultar guarnição ${patrol.name}` : `Publicar guarnição ${patrol.name}`}
              onClick={() => onSettingChange(patrol.id, 'publicado', patrol.publicado === false ? true : false)}
              className="no-print"
              style={{
                background: patrol.publicado !== false ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)',
                backdropFilter: 'blur(8px)',
                border: `1px solid ${patrol.publicado !== false ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                color: 'white',
                cursor: 'pointer',
                borderRadius: '12px',
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
              }}
              title={patrol.publicado !== false ? "Esta guarnição será publicada na escala oficial (Clique para ocultar)" : "Esta guarnição está oculta e não será publicada (Clique para exibir)"}
            >
              {patrol.publicado !== false ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>

            <button
              type="button"
              aria-label={`Remover guarnição ${patrol.name}`}
              onClick={() => onRemovePatrol(patrol.id)}
              className="no-print"
              style={{
                background: 'rgba(255, 255, 255, 0.12)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: 'white',
                cursor: 'pointer',
                borderRadius: '12px',
                padding: '8px',
                display: 'flex',
                transition: transitions,
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
              }}
              onMouseOver={e => { e.currentTarget.style.background = colors.danger; e.currentTarget.style.borderColor = colors.danger; }}
              onMouseOut={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'; e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'; }}
              title="Remover Guarnição"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* Status Pills inside header */}
        <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.6rem', flexWrap: 'wrap' }}>
          <div style={{
            fontSize: '0.8rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            background: 'rgba(255,255,255,0.15)',
            padding: '2px 8px',
            borderRadius: '20px',
            backdropFilter: 'blur(4px)'
          }}>
            {patrol.duration}
          </div>
          {patrol.timeSpan && (
            <div style={{
              fontSize: '0.8rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              background: 'rgba(255,255,255,0.15)',
              padding: '2px 8px',
              borderRadius: '20px',
              backdropFilter: 'blur(4px)'
            }}>
              {patrol.timeSpan}
            </div>
          )}
          <div style={{
            fontSize: '0.8rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            background: patrol.publicado !== false ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)',
            color: 'white',
            padding: '2px 8px',
            borderRadius: '20px',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            {patrol.publicado !== false ? <Check size={12} strokeWidth={3} /> : <X size={12} strokeWidth={3} />}
            {patrol.publicado !== false ? 'Publicada' : 'Não Publicada'}
          </div>
        </div>

        {/* Input Local de Embarque */}
        <div style={{ marginTop: '0.8rem' }}>
          <input
            type="text"
            value={patrol.horario_embarque === undefined ? 'local de embarque; 30 minutos de antecedência na sede do 9º BPM' : patrol.horario_embarque}
            onChange={e => onSettingChange(patrol.id, 'horario_embarque', e.target.value)}
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.3)',
              color: 'white',
              padding: '6px 10px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              outline: 'none',
              transition: 'all 0.2s',
            }}
            onFocus={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
            onBlur={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
            placeholder="Local de embarque"
          />
        </div>
      </div>

      {/* Slots Container */}
      <div style={{
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        flex: 1,
        background: 'linear-gradient(180deg, #ffffff 0%, #f9fafb 100%)'
      }}>
        {Array.from({ length: 3 }).map((_, index) => {
          const m = patrol.members[index];
          const roleName = ROLES[index];
          const isActiveSlot = activeSlot?.patrolId === patrol.id && activeSlot?.roleIndex === index;

          if (m) {
            return (
              <div
                key={m.id}
                draggable
                onDragStart={(e) => onDragStart(e, m.id, patrol.id)}
                style={{
                  background: colors.white,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '12px',
                  padding: '0.65rem 0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  position: 'relative',
                  cursor: 'grab',
                  boxShadow: shadowSm,
                  transition: transitions
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = colors.primary; e.currentTarget.style.boxShadow = shadowMd; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = colors.border; e.currentTarget.style.boxShadow = shadowSm; }}
              >
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  background: '#f0f9ff',
                  color: colors.primary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <GripVertical size={16} style={{ opacity: 0.5 }} />
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ marginBottom: '2px' }}>
                    <select
                      value={index}
                      onChange={(e) => onRoleChange(patrol.id, index, parseInt(e.target.value, 10))}
                      disabled={isSaving}
                      style={{
                        fontSize: '0.6rem',
                        color: colors.textMuted,
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        cursor: isSaving ? 'wait' : 'pointer',
                        padding: 0,
                        appearance: 'none',
                        MozAppearance: 'none',
                        WebkitAppearance: 'none'
                      }}
                      title="Clique para trocar função"
                    >
                      {ROLES.map((role, rIdx) => (
                        <option key={rIdx} value={rIdx}>{role}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ fontWeight: 700, color: colors.text, fontSize: '0.85rem' }}>
                    {m.rank} {m.name}
                  </div>
                </div>

                <button
                  onClick={() => onOpenSlotModal(patrol.id, index)}
                  className="no-print"
                  style={{
                    background: '#f1f5f9',
                    color: colors.primary,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '10px',
                    padding: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    transition: transitions
                  }}
                  onMouseOver={e => { e.currentTarget.style.background = colors.primary; e.currentTarget.style.color = 'white'; }}
                  onMouseOut={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = colors.primary; }}
                  title="Substituir integrante"
                >
                  <X size={16} />
                </button>
              </div>
            );
          }

          return (
            <div
              key={`empty-${index}`}
              onClick={() => onSelectActiveSlot(patrol.id, index)}
              style={{
                border: isActiveSlot ? `2px solid ${colors.primary}` : `2px dashed ${colors.accent}`,
                borderRadius: '12px',
                padding: '0.75rem 1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                background: isActiveSlot ? '#f0f7ff' : 'transparent',
                transition: transitions,
                minHeight: '60px',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseOver={e => { if (!isActiveSlot) { e.currentTarget.style.borderColor = colors.primary; e.currentTarget.style.background = '#f8fafc'; } }}
              onMouseOut={e => { if (!isActiveSlot) { e.currentTarget.style.borderColor = colors.accent; e.currentTarget.style.background = 'transparent'; } }}
            >
              {isActiveSlot && (
                <div style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: '3px',
                  background: colors.primary
                }} />
              )}
              <div>
                <div style={{
                  fontSize: '0.6rem',
                  color: isActiveSlot ? colors.primary : colors.textMuted,
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  {roleName}
                </div>
                <div style={{
                  fontSize: '0.75rem',
                  color: isActiveSlot ? colors.primary : colors.accent,
                  fontWeight: 600,
                  marginTop: '2px'
                }}>
                  {isActiveSlot ? 'Aguardando seleção...' : 'Vago'}
                </div>
              </div>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                background: isActiveSlot ? colors.primary : '#f1f5f9',
                color: isActiveSlot ? 'white' : colors.accent,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: transitions,
                boxShadow: isActiveSlot ? '0 4px 10px rgba(13, 56, 120, 0.3)' : 'none'
              }}>
                {isActiveSlot ? <MousePointer2 size={14} style={{ animation: 'bounce 1s infinite' }} /> : <Plus size={14} />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

