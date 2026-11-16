export type CycleStatus = 'Aberto' | 'Fechado';

export interface Cycle {
  id_ciclo: number;
  data_inicio: string;
  data_fim: string;
  status: CycleStatus;
  ativo: boolean;
  period_name?: string;
  periodo_ciclo?: string;
  opm_sigla?: string;
}

export interface CycleDayInfo {
  day: number;
  month: number | null;
  monthShort: string | null;
  year: number | null;
}

export interface CycleDayOption {
  isoDate: string;
  label: string;
  key: number;
}

export interface AvailabilityEntry {
  shift?: string;
  turno?: string;
  motorista?: boolean;
}

export interface PatrolMember {
  id: number | string;
  id_militar: number;
  name: string;
  rank: string;
  nome_completo?: string;
  numero_ordem?: string;
  phone?: string;
  motorista?: string | boolean;
  service_count?: number;
}

export interface Volunteer extends PatrolMember {
  motorista_req?: boolean;
  id_funcao?: number;
  availability?: Record<string, AvailabilityEntry[]>;
  availability_completa?: Record<string, AvailabilityEntry[]>;
  isAvailableToday?: boolean;
  todayShifts?: AvailabilityEntry[];
  planned_count?: number;
  total_servicos?: number;
  servicos_planejados?: number;
}

export interface Patrol {
  id: string;
  baseId?: string;
  name: string;
  duration: string;
  timeSpan: string;
  publicado?: boolean;
  horario_embarque?: string;
  members: Array<PatrolMember | null>;
}

export interface ScheduleDayResponse {
  id: number;
  date: string;
  id_ciclo: number | string;
  patrols: Patrol[];
}

export interface MetaAlocacao {
  id_meta?: number;
  id_ciclo: number;
  data: string;
  qtd_equipes_planejadas: number;
}

export interface MilitarGridCell {
  dia_mes: string;
  horario_turno: string;
  ativo: boolean;
  teve_execucao?: boolean;
}

export interface MilitarScheduleItem {
  id_escala?: number;
  id_militar: number;
  data_servico: string;
  horario_servico: string;
  funcao: string;
  nome_recurso: string;
  nome_completo?: string;
  posto_graduacao?: string;
  nome_guerra?: string;
}

export interface ServicoExecutado {
  id_execucao: number;
  id_ciclo: number;
  id_militar: number;
  id_escala?: number | null;
  data_execucao: string;
  carga_horaria: number;
  status_presenca: 'Presente' | 'Ausente' | 'Justificado' | 'Atestado';
  eh_feriado?: boolean;
  valor_remuneracao: number | string;
  nome_guerra?: string;
  matricula?: string;
  posto_graduacao?: string;
  guarnicao?: string;
  opm_origem?: string;
  periodo_ciclo?: string;
}

export interface Opm {
  id_opm: number;
  sigla: string;
  nome: string;
  ativo?: boolean;
}

export interface TipoServico {
  id_tipo_servico: number;
  descricao?: string;
  carga_horaria: number;
  valor_remuneracao: number | string;
  ativo?: boolean;
}

