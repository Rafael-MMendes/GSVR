import { useState, useEffect } from 'react';
import { Wallet, Scale, TrendingUp } from 'lucide-react';
import { reportApi } from '../../services/api';

const formatBRL = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/**
 * Painel executivo de Equidade de Escalas & Previsão Orçamentária do Ciclo (M17).
 * @param {{ cicloId?: number|string }} props
 */
export function EquidadeOrcamentoPanel({ cicloId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    reportApi.getEquidadeOrcamento(cicloId)
      .then(res => { if (active) setData(res); })
      .catch(() => { if (active) setData(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [cicloId]);

  if (loading) return <div style={{ padding: '1rem', color: '#64748b' }}>Calculando indicadores de equidade e orçamento...</div>;
  if (!data) return null;

  const { orcamento, equidade } = data;
  const faixas = equidade?.faixas_distribuicao || {};

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem', marginTop: '1.25rem' }}>
      {/* Card Orçamentário */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
          <Wallet size={20} color="#0D3878" />
          <h3 style={{ margin: 0, fontSize: '1rem', color: '#0f172a' }}>Previsão Orçamentária do Ciclo</h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.86rem' }}>
          <div><span style={{ color: '#64748b' }}>Teto Previsto:</span><br /><strong>{formatBRL(orcamento.teto_previsto)}</strong></div>
          <div><span style={{ color: '#64748b' }}>Executado:</span><br /><strong style={{ color: '#0D3878' }}>{formatBRL(orcamento.gasto_executado)}</strong> ({orcamento.percentual_consumido}%)</div>
          <div><span style={{ color: '#64748b' }}>Planejado Futuro:</span><br /><strong>{formatBRL(orcamento.projecao_futura_planejada)}</strong></div>
          <div><span style={{ color: '#64748b' }}>Saldo Projetado:</span><br /><strong style={{ color: orcamento.saldo_projetado >= 0 ? '#10b981' : '#ef4444' }}>{formatBRL(orcamento.saldo_projetado)}</strong></div>
        </div>
        <div style={{ marginTop: '0.9rem', background: '#e2e8f0', borderRadius: '999px', height: '10px', overflow: 'hidden' }}>
          <div style={{
            width: `${Math.min(100, orcamento.percentual_projetado || 0)}%`,
            height: '100%',
            background: (orcamento.percentual_projetado || 0) > 100 ? '#ef4444' : '#0D3878',
            transition: 'width 0.3s ease'
          }} />
        </div>
        <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <TrendingUp size={13} /> Comprometimento projetado: {orcamento.percentual_projetado}% ({formatBRL(orcamento.total_projetado)})
        </div>
      </div>

      {/* Card Equidade */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
          <Scale size={20} color="#0D3878" />
          <h3 style={{ margin: 0, fontSize: '1rem', color: '#0f172a' }}>Equidade de Distribuição ({equidade.militares_com_servico}/{equidade.total_efetivo_ativo} ativos)</h3>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.82rem' }}>
          <span style={{ padding: '0.35rem 0.65rem', borderRadius: '8px', background: '#f1f5f9' }}>0 sv: <strong>{faixas.zero ?? 0}</strong></span>
          <span style={{ padding: '0.35rem 0.65rem', borderRadius: '8px', background: '#e0f2fe', color: '#0369a1' }}>1-3 sv: <strong>{faixas.de_1_a_3 ?? 0}</strong></span>
          <span style={{ padding: '0.35rem 0.65rem', borderRadius: '8px', background: '#dcfce7', color: '#166534' }}>4-6 sv: <strong>{faixas.de_4_a_6 ?? 0}</strong></span>
          <span style={{ padding: '0.35rem 0.65rem', borderRadius: '8px', background: '#fef3c7', color: '#92400e' }}>7-8 sv: <strong>{faixas.de_7_a_8 ?? 0}</strong></span>
          <span style={{ padding: '0.35rem 0.65rem', borderRadius: '8px', background: '#fee2e2', color: '#991b1b' }}>&gt;8 sv: <strong>{faixas.acima_8 ?? 0}</strong></span>
        </div>
      </div>
    </div>
  );
}

