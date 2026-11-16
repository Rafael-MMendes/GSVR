import { useState, useEffect, useCallback } from 'react';
import { ArrowLeftRight, CheckCircle2, XCircle, Clock, RefreshCw } from 'lucide-react';
import { myScheduleApi } from '../../services/api';
import { useToast } from './ToastProvider';

/**
 * Painel gerencial para análise e aprovação/rejeição de solicitações de permuta (M15).
 * @param {{ cicloId?: number|string, efetivo?: Array<{ id_militar: number, posto_graduacao: string, nome_guerra: string }> }} props
 */
export function PermutasPanel({ cicloId, efetivo = [] }) {
  const toast = useToast();
  const [permutas, setPermutas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('PENDENTE');
  const [subOverrides, setSubOverrides] = useState({});
  const [processingId, setProcessingId] = useState(null);

  const loadPermutas = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await myScheduleApi.listPermutas({
        scope: 'all',
        ciclo_id: cicloId || undefined,
        status: statusFilter || undefined
      });
      setPermutas(Array.isArray(rows) ? rows : []);
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Erro ao carregar solicitações de permuta.');
    } finally {
      setLoading(false);
    }
  }, [cicloId, statusFilter]);

  useEffect(() => {
    loadPermutas();
  }, [loadPermutas]);

  const handleResponder = async (p, status) => {
    const chosenSub = subOverrides[p.id_permuta] || p.id_militar_substituto;
    if (status === 'APROVADA' && !chosenSub) {
      toast.error('Selecione um militar substituto antes de aprovar a permuta.');
      return;
    }
    setProcessingId(p.id_permuta);
    try {
      await myScheduleApi.responderPermuta(p.id_permuta, {
        status,
        id_militar_substituto: chosenSub ? Number(chosenSub) : undefined
      });
      toast.success(status === 'APROVADA' ? 'Permuta aprovada e escala atualizada!' : 'Permuta rejeitada.');
      loadPermutas();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Erro ao processar permuta.');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1.25rem', marginTop: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ArrowLeftRight size={20} color="#0D3878" />
          <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a' }}>Solicitações de Permuta / Substituição</h3>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <select
            aria-label="Filtrar status das permutas"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: '0.4rem 0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
          >
            <option value="PENDENTE">Pendentes</option>
            <option value="APROVADA">Aprovadas</option>
            <option value="REJEITADA">Rejeitadas</option>
            <option value="">Todas</option>
          </select>
          <button
            type="button"
            onClick={loadPermutas}
            aria-label="Atualizar lista de permutas"
            style={{ padding: '0.4rem 0.7rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <RefreshCw size={15} /> Atualizar
          </button>
        </div>
      </div>

      {loading ? (
        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Carregando permutas...</p>
      ) : permutas.length === 0 ? (
        <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>Nenhuma solicitação encontrada para este filtro.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {permutas.map(p => (
            <div key={p.id_permuta} style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.85rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', background: '#f8fafc' }}>
              <div style={{ flex: 1, minWidth: '240px' }}>
                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.92rem' }}>
                  {p.solicitante_posto} {p.solicitante_nome} — {p.data_servico} ({p.nome_recurso} • {p.horario_servico})
                </div>
                <div style={{ fontSize: '0.84rem', color: '#475569', marginTop: '0.2rem' }}>
                  <strong>Motivo:</strong> {p.motivo}
                </div>
                {p.substituto_nome && (
                  <div style={{ fontSize: '0.82rem', color: '#0369a1', marginTop: '0.15rem' }}>
                    Substituto indicado: {p.substituto_posto} {p.substituto_nome}
                  </div>
                )}
              </div>

              {p.status === 'PENDENTE' ? (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  {efetivo.length > 0 && (
                    <select
                      aria-label={`Selecionar substituto para permuta ${p.id_permuta}`}
                      value={subOverrides[p.id_permuta] ?? (p.id_militar_substituto || '')}
                      onChange={(e) => setSubOverrides(prev => ({ ...prev, [p.id_permuta]: e.target.value }))}
                      style={{ padding: '0.4rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', maxWidth: '210px' }}
                    >
                      <option value="">-- Selecionar substituto --</option>
                      {efetivo.map(m => (
                        <option key={m.id_militar} value={m.id_militar}>
                          {m.posto_graduacao} {m.nome_guerra}
                        </option>
                      ))}
                    </select>
                  )}
                  <button
                    type="button"
                    disabled={processingId === p.id_permuta}
                    onClick={() => handleResponder(p, 'APROVADA')}
                    style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.45rem 0.75rem', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.82rem' }}
                  >
                    <CheckCircle2 size={15} /> Aprovar
                  </button>
                  <button
                    type="button"
                    disabled={processingId === p.id_permuta}
                    onClick={() => handleResponder(p, 'REJEITADA')}
                    style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.45rem 0.75rem', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.82rem' }}
                  >
                    <XCircle size={15} /> Rejeitar
                  </button>
                </div>
              ) : (
                <span style={{
                  padding: '0.3rem 0.7rem',
                  borderRadius: '999px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  background: p.status === 'APROVADA' ? '#dcfce7' : '#fee2e2',
                  color: p.status === 'APROVADA' ? '#166534' : '#991b1b',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem'
                }}>
                  <Clock size={13} /> {p.status}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

