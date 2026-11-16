with open('frontend/src/components/AdminDashboardV2.jsx', encoding='utf-8') as f:
    lines = f.readlines()

modal1_body = ''.join(lines[1450:2112])
modal2_body = ''.join(lines[2113:2649])

# Unindent 6 spaces
def unindent(text, spaces=6):
    out = []
    prefix = ' ' * spaces
    for line in text.splitlines(True):
        if line.startswith(prefix):
            out.append(line[spaces:])
        else:
            out.append(line)
    return ''.join(out)

modal1_header = """import { Shield, X, Search, Calendar, Clock, Eye, EyeOff, Check, Users, AlertTriangle, MousePointer2 } from 'lucide-react';
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
"""

modal1_footer = """    </>
  );
}
"""

modal2_header = """import { UserCircle, X, Calendar, CheckCircle2, Clock } from 'lucide-react';
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
"""

modal2_footer = """    </>
  );
}
"""

with open('frontend/src/components/admin-dashboard/VolunteerSelectionModal.jsx', 'w', encoding='utf-8') as f:
    f.write(modal1_header + unindent(modal1_body) + modal1_footer)

with open('frontend/src/components/admin-dashboard/MilitarDetailsModal.jsx', 'w', encoding='utf-8') as f:
    f.write(modal2_header + unindent(modal2_body) + modal2_footer)

print("Extracted modals successfully.")

