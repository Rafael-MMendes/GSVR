import axios from 'axios';
import { API_URL } from '../utils/apiConfig';

/**
 * @typedef {import('../types/gsvr.types').EscalaPlanejada} EscalaPlanejada
 * @typedef {import('../types/gsvr.types').ServicoExecutado} ServicoExecutado
 */

export const scheduleApi = {
  /**
   * M13: Gera sugestão automática de escala baseada em disponibilidade, teto de 8 serviços e equidade.
   * @param {{ id_ciclo: number, data_servico: string, horario_servico?: string, nome_recurso?: string, qtd_patrulheiros?: number }} payload
   */
  suggest: (payload) => axios.post(`${API_URL}/schedules/suggest`, payload).then(r => r.data),
};

export const myScheduleApi = {
  /** @param {number} idEscala */
  confirmarCiente: (idEscala) => axios.post(`${API_URL}/my-schedules/${idEscala}/ciente`).then(r => r.data),

  /**
   * @param {number} idEscala
   * @param {{ id_militar_substituto?: number|null, motivo: string }} payload
   */
  solicitarPermuta: (idEscala, payload) => axios.post(`${API_URL}/my-schedules/${idEscala}/permuta`, payload).then(r => r.data),

  /** @param {{ scope?: string, ciclo_id?: number, status?: string }} [params] */
  listPermutas: (params = {}) => axios.get(`${API_URL}/permutas`, { params }).then(r => r.data),

  /**
   * @param {number} idPermuta
   * @param {{ status: 'APROVADA'|'REJEITADA', observacao_aprovador?: string, id_militar_substituto?: number }} payload
   */
  responderPermuta: (idPermuta, payload) => axios.put(`${API_URL}/permutas/${idPermuta}/responder`, payload).then(r => r.data),
};

export const servicoApi = {
  /** @param {{ items: Array<{ id_escala: number, status_presenca: string }> }} payload */
  conferenciaDigital: (payload) => axios.post(`${API_URL}/servicos/conferencia-digital`, payload).then(r => r.data),
};

export const reportApi = {
  /** @param {number|string} [cicloId] */
  getEquidadeOrcamento: (cicloId) => axios.get(`${API_URL}/reports/equidade-orcamento`, {
    params: cicloId ? { ciclo_id: cicloId } : {}
  }).then(r => r.data),
};

