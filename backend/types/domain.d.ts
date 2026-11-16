export interface CycleBounds {
  inicio: string;
  fim: string;
}

export interface ShiftAvailability {
  shift: string;
  motorista: boolean;
}

export interface CycleFragmentResult {
  anterior: Record<string, ShiftAvailability[]>;
  corrente: Record<string, ShiftAvailability[]>;
  ignorados: number[];
}

export interface PdfExtractedRequirement {
  numero_requerimento: string | null;
  month_key: string | null;
  numero_ordem: string | null;
  cpf: string | null;
  rank: string | null;
  name: string | null;
  motorist: 'Sim' | 'Nao';
  availability: Record<string, ShiftAvailability[]>;
}

export interface PatrolMemberPayload {
  id: number | string;
  id_militar: number;
  name: string;
  rank: string;
  phone?: string;
  motorista?: string | boolean;
  numero_ordem?: string;
  service_count?: number;
}

export interface PatrolPayload {
  id: string;
  baseId?: string;
  name: string;
  duration: string;
  timeSpan: string;
  publicado: boolean;
  members: Array<PatrolMemberPayload | null>;
}

