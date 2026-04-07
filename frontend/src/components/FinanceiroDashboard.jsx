import { useState, useEffect } from 'react';
import axios from 'axios';
import { DollarSign, TrendingUp, TrendingDown, PieChart, Calendar, Users, Wallet, AlertTriangle, Activity } from 'lucide-react';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001') + '/api';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const formatPercent = (value) => {
  return new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 1 }).format(value / 100);
};

export function FinanceiroDashboard() {
  const [resumo, setResumo] = useState(null);
  const [detalhado, setDetalhado] = useState(null);
  const [months, setMonths] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('visao geral');

  useEffect(() => {
    const loadMonths = async () => {
      try {
        const monthsRes = await axios.get(`${API_URL}/ciclos`);
        setMonths(monthsRes.data);
        if (monthsRes.data.length > 0) {
          setSelectedMonth(monthsRes.data[0].referencia_mes_ano);
        }
      } catch (e) {
        console.error('Erro ao carregar meses:', e);
      }
    };
    loadMonths();
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const params = selectedMonth ? { month: selectedMonth } : {};
        const [resumoRes, detalhadoRes] = await Promise.all([
          axios.get(`${API_URL}/financeiro/resumo`, { params }),
          axios.get(`${API_URL}/financeiro/detalhado`, { params })
        ]);
        setResumo(resumoRes.data);
        setDetalhado(detalhadoRes.data);
      } catch (e) {
        console.error('Erro ao carregar dados financeiros:', e);
      } finally {
        setLoading(false);
      }
    };
    if (selectedMonth !== '') {
      loadData();
    }
  }, [selectedMonth]);

  if (loading || !resumo) {
    return (
      <div className="container" style={{ paddingTop: '2rem', textAlign: 'center' }}>
        <div className="spinner"></div>
        <p>Carregando dados financeiros...</p>
      </div>
    );
  }

  const getProgressColor = (percent) => {
    if (percent < 50) return '#10b981';
    if (percent < 80) return '#f59e0b';
    return '#ef4444';
  };

  const getProgressBgColor = (percent) => {
    if (percent < 50) return '#d1fae5';
    if (percent < 80) return '#fef3c7';
    return '#fee2e2';
  };

  return (
    <div className="container" style={{ paddingTop: '1rem', maxWidth: '1400px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ margin: 0, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Wallet size={28} />
            Módulo Financeiro - Força Tarefa
          </h2>
          <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Análise e gestão de verbas por ciclo • Verba disponível: {formatCurrency(resumo.verba_ciclo)}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <label style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Ciclo/Mês:</label>
          <select
            className="form-control"
            style={{ width: '200px', margin: 0 }}
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
          >
            <option value="">Todos os Ciclos</option>
            {months.map(m => (
              <option key={m.id_ciclo} value={m.referencia_mes_ano}>{m.referencia_mes_ano} - {m.opm_sigla}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', background: 'var(--card-bg)', padding: '0.5rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
        <button
          className={`btn ${activeTab === 'visao geral' ? 'btn-primary' : 'btn-outline'}`}
          style={{ flex: 1 }}
          onClick={() => setActiveTab('visao geral')}
        >
          <Activity size={16} style={{ marginRight: '6px' }} />
          Visão Geral
        </button>
        <button
          className={`btn ${activeTab === 'detalhado' ? 'btn-primary' : 'btn-outline'}`}
          style={{ flex: 1 }}
          onClick={() => setActiveTab('detalhado')}
        >
          <Calendar size={16} style={{ marginRight: '6px' }} />
          Detalhado
        </button>
        <button
          className={`btn ${activeTab === 'militares' ? 'btn-primary' : 'btn-outline'}`}
          style={{ flex: 1 }}
          onClick={() => setActiveTab('militares')}
        >
          <Users size={16} style={{ marginRight: '6px' }} />
          Militares
        </button>
      </div>

      {activeTab === 'visao geral' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="glass-panel" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ background: '#10b981', borderRadius: '8px', padding: '0.5rem', color: 'white' }}>
                  <Wallet size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Verba do Ciclo</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary)' }}>{formatCurrency(resumo.verba_ciclo)}</div>
                </div>
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#0d3878' }}>{formatCurrency(resumo.verba_ciclo)}</div>
            </div>

            <div className="glass-panel" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ background: '#ef4444', borderRadius: '8px', padding: '0.5rem', color: 'white' }}>
                  <TrendingUp size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Total Gasto</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary)' }}>No período selecionado</div>
                </div>
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#ef4444' }}>{formatCurrency(resumo.total_gasto)}</div>
            </div>

            <div className="glass-panel" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ background: '#10b981', borderRadius: '8px', padding: '0.5rem', color: 'white' }}>
                  <TrendingDown size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Saldo Restante</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary)' }}>Disponível</div>
                </div>
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#10b981' }}>{formatCurrency(resumo.saldo_restante)}</div>
            </div>

            <div className="glass-panel" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ background: '#f59e0b', borderRadius: '8px', padding: '0.5rem', color: 'white' }}>
                  <PieChart size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Utilizado</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary)' }}>Percentual</div>
                </div>
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: getProgressColor(resumo.percentual_utilizado) }}>
                {formatPercent(resumo.percentual_utilizado)}
              </div>
            </div>
          </div>

          <div className="glass-panel" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={20} />
              Progresso de Utilização da Verba
            </h3>
            <div style={{ position: 'relative', height: '40px', background: '#e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  height: '100%',
                  width: `${Math.min(resumo.percentual_utilizado, 100)}%`,
                  background: getProgressColor(resumo.percentual_utilizado),
                  transition: 'width 0.5s ease'
                }}
              />
              <div style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: 'white', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                {formatPercent(resumo.percentual_utilizado)}
              </div>
            </div>
            {resumo.percentual_utilizado > 90 && (
              <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#dc2626' }}>
                <AlertTriangle size={18} />
                <strong>Atenção:</strong> A verba está quase esgotada ({formatPercent(resumo.percentual_utilizado)} utilizada). Considere revisar os serviços programados.
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
            <div className="glass-panel" style={{ padding: '1.25rem' }}>
              <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-muted)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Serviços 6h</h4>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--primary)' }}>{resumo.total_servicos_6h}</span>
                <span style={{ color: 'var(--text-muted)' }}>serviços</span>
              </div>
              <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#10b981', fontWeight: 600 }}>
                {formatCurrency(resumo.total_servicos_6h * resumo.valor_6h)}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Valor unitário: {formatCurrency(resumo.valor_6h)}
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '1.25rem' }}>
              <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-muted)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Serviços 8h</h4>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--primary)' }}>{resumo.total_servicos_8h}</span>
                <span style={{ color: 'var(--text-muted)' }}>serviços</span>
              </div>
              <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#10b981', fontWeight: 600 }}>
                {formatCurrency(resumo.total_servicos_8h * resumo.valor_8h)}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Valor unitário: {formatCurrency(resumo.valor_8h)}
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '1.25rem' }}>
              <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-muted)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Serviços</h4>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--primary)' }}>{resumo.total_militar_servicos}</span>
                <span style={{ color: 'var(--text-muted)' }}>militar/serviço</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                {resumo.total_militares_unicos} militares distintos executaram serviço
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '1.25rem' }}>
              <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-muted)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Média por Militar</h4>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--primary)' }}>
                  {resumo.total_militares_unicos > 0 ? (resumo.total_militar_servicos / resumo.total_militares_unicos).toFixed(1) : 0}
                </span>
                <span style={{ color: 'var(--text-muted)' }}>serviços/militar</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                Média de serviços por militar no período
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'detalhado' && detalhado && (
        <div className="glass-panel">
          <h3 style={{ margin: '0 0 1rem 0', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={20} />
            Evolução Diária de Gastos
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--text-muted)' }}>Data</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', color: 'var(--text-muted)' }}>Serviços</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--text-muted)' }}>Gasto do Dia</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--text-muted)' }}>Acumulado</th>
                </tr>
              </thead>
              <tbody>
                {detalhado.detalhes_diarios.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      Nenhum serviço registrado no período selecionado.
                    </td>
                  </tr>
                ) : (
                  detalhado.detalhes_diarios.map((dia, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.75rem', fontWeight: 500 }}>{dia.data}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <span style={{ background: '#e0f2fe', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 600, color: '#0369a1' }}>
                          {dia.servicos}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', color: '#ef4444', fontWeight: 500 }}>
                        {formatCurrency(dia.gasto)}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600, color: 'var(--primary)' }}>
                        {formatCurrency(dia.acumulado)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'militares' && detalhado && (
        <div className="glass-panel">
          <h3 style={{ margin: '0 0 1rem 0', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={20} />
            Top Militares por Serviços Executados
          </h3>
          {detalhado.top_militares.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
              Nenhum militar registrou serviços no período selecionado.
            </p>
          ) : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {detalhado.top_militares.map((militar, idx) => (
                <div
                  key={militar.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '1rem',
                    background: idx < 3 ? '#fefce8' : '#f8fafc',
                    borderRadius: '8px',
                    border: idx < 3 ? '1px solid #fef08a' : '1px solid #e2e8f0'
                  }}
                >
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: idx === 0 ? '#f59e0b' : idx === 1 ? '#94a3b8' : idx === 2 ? '#b45309' : '#e2e8f0',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.9rem'
                  }}>
                    {idx + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: 'var(--primary)' }}>{militar.name}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>ID: {militar.id}</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>{militar.servicos}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>serviços</div>
                  </div>
                  <div style={{ textAlign: 'right', minWidth: '120px' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#10b981' }}>{formatCurrency(militar.gasto)}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>recebido</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}