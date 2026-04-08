import { useState, useEffect } from 'react';
import axios from 'axios';
import { RefreshCw, TrendingUp, Clock, AlertTriangle, Wallet } from 'lucide-react';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001') + '/api';
const MAX_SERVICES = 8;
const VALOR_FT_6H = 192.03;
const VALOR_FT_8H = 250.00;
const ORCAMENTO_MENSAL = 85000;

export function AnalyticsDashboard() {
  const [loading, setLoading] = useState(true);
  const [efetivo, setEfetivo] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [ciclos, setCiclos] = useState([]);
  const [selectedCiclo, setSelectedCiclo] = useState('');
  const [stats, setStats] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (ciclos.length > 0 && !selectedCiclo) {
      setSelectedCiclo(ciclos[0].id_ciclo);
    }
  }, [ciclos]);

  useEffect(() => {
    if (selectedCiclo) {
      filterByCiclo();
    }
  }, [selectedCiclo, efetivo, servicos]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [efetivoRes, servicosRes, ciclosRes] = await Promise.all([
        axios.get(`${API_URL}/efetivo`),
        axios.get(`${API_URL}/servicos`),
        axios.get(`${API_URL}/ciclos`),
      ]);
      setEfetivo(efetivoRes.data);
      setServicos(servicosRes.data);
      setCiclos(ciclosRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filterByCiclo = () => {
    const servicosCiclo = servicos.filter(s => s.id_ciclo === parseInt(selectedCiclo));
    buildStats(efetivo, servicosCiclo);
  };

  const buildStats = (efetivoData, servicosData) => {
    const map = {};
    
    efetivoData.forEach(e => {
      map[e.id_militar] = {
        id: e.id_militar,
        numero_ordem: e.matricula,
        rank: e.posto_graduacao,
        name: e.nome_guerra,
        motorista: e.motorista,
        count6h: 0,
        count8h: 0,
      };
    });

    servicosData.forEach(s => {
      if (map[s.id_militar]) {
        if (s.carga_horaria === 8) {
          map[s.id_militar].count8h += 1;
        } else {
          map[s.id_militar].count6h += 1;
        }
      }
    });

    const result = Object.values(map).map(item => ({
      ...item,
      total: item.count6h + item.count8h,
      remaining: Math.max(0, MAX_SERVICES - (item.count6h + item.count8h)),
      valorTotal: (item.count6h * VALOR_FT_6H) + (item.count8h * VALOR_FT_8H),
    }));

    result.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
    setStats(result);
  };

  const totalServicos = stats.reduce((acc, s) => acc + s.total, 0);
  const totalHoras6 = stats.reduce((acc, s) => acc + s.count6h, 0);
  const totalHoras8 = stats.reduce((acc, s) => acc + s.count8h, 0);
  const recursoUtilizado = stats.reduce((acc, s) => acc + s.valorTotal, 0);
  const recursoRestante = ORCAMENTO_MENSAL - recursoUtilizado;

  const formatarValor = (valor) => {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const getStatusColor = (total) => {
    const pct = total / MAX_SERVICES;
    if (pct >= 1) return '#ef4444';    // vermelho - lotado
    if (pct >= 0.75) return '#f59e0b'; // amarelo - quase no limite
    if (pct >= 0.25) return '#10b981'; // verde - normal
    return '#94a3b8';                  // cinza - poucos serviços
  };

  const getStatusLabel = (total) => {
    const pct = total / MAX_SERVICES;
    if (pct >= 1) return { text: 'Limite atingido', color: '#ef4444' };
    if (pct >= 0.75) return { text: 'Quase no limite', color: '#f59e0b' };
    if (pct > 0) return { text: 'Em dia', color: '#10b981' };
    return { text: 'Sem serviços', color: '#94a3b8' };
  };

  return (
    <div className="container" style={{ maxWidth: '1200px' }}>
      {/* Cabeçalho */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ margin: 0 }}>Analítico FT — Serviços do Mês</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem', fontSize: '0.9rem' }}>
            Contagem de serviços por militar · Limite mensal: {MAX_SERVICES} serviços
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {ciclos.length > 0 && (
            <select 
              value={selectedCiclo} 
              onChange={e => setSelectedCiclo(e.target.value)}
              className="form-control"
              style={{ minWidth: '150px' }}
            >
              {ciclos.map(c => (
                <option key={c.id_ciclo} value={c.id_ciclo}>
                  {c.referencia_mes_ano}
                </option>
              ))}
            </select>
          )}
          <button className="btn btn-outline" onClick={loadData} disabled={loading}>
            <RefreshCw size={16} />
            {loading ? 'Carregando...' : 'Atualizar'}
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
        {[
          { icon: <TrendingUp size={22} color="#0D3878" />, label: 'Recurso Utilizado', value: formatarValor(recursoUtilizado), color: '#0D3878' },
          { icon: <Clock size={22} color="#10b981" />, label: 'FT de 6 Horas', value: totalHoras6, color: '#10b981' },
          { icon: <Clock size={22} color="#f59e0b" />, label: 'FT de 8 Horas', value: totalHoras8, color: '#f59e0b' },
          { icon: <Wallet size={22} color="#059669" />, label: 'Recurso Restante', value: formatarValor(recursoRestante), color: '#059669' },
        ].map(kpi => (
          <div key={kpi.label} className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem 1.5rem' }}>
            <div style={{ background: `${kpi.color}15`, padding: '0.75rem', borderRadius: '10px' }}>{kpi.icon}</div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{kpi.label}</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: kpi.color, lineHeight: 1.2 }}>{kpi.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabela */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>Carregando dados...</div>
      ) : stats.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem' }}>
          <AlertTriangle size={48} color="#f59e0b" style={{ marginBottom: '1rem' }} />
          <p style={{ color: 'var(--text-muted)' }}>Nenhum dado encontrado. Salve escalas no Painel Admin primeiro.</p>
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: 'var(--primary)', color: 'white' }}>
                {['#', 'N° Ordem', 'Posto / Nome', 'Motorista', 'FT 6h', 'FT 8h', 'Total FTs', 'Restantes', 'Valor Total', 'Situação', 'Progresso'].map(h => (
                  <th key={h} style={{ padding: '0.85rem 1rem', textAlign: 'left', fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.3px', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stats.map((s, idx) => {
                const status = getStatusLabel(s.total);
                const pct = Math.min(100, (s.total / MAX_SERVICES) * 100);
                return (
                  <tr key={s.id} style={{ background: idx % 2 === 0 ? 'white' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>{idx + 1}</td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span style={{ background: '#e8eef7', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)' }}>
                        {s.numero_ordem}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ fontWeight: 600 }}>{s.rank} {s.name}</div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      {s.motorista === 'Sim'
                        ? <span style={{ background: '#10b981', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>SIM</span>
                        : <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Não</span>
                      }
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                      <span style={{ fontWeight: 700, color: '#10b981', fontSize: '1rem' }}>{s.count6h}</span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                      <span style={{ fontWeight: 700, color: '#f59e0b', fontSize: '1rem' }}>{s.count8h}</span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                      <span style={{ fontWeight: 800, color: getStatusColor(s.total), fontSize: '1.1rem' }}>{s.total}</span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                      <span style={{ fontWeight: 700, color: s.remaining === 0 ? '#ef4444' : '#0D3878' }}>{s.remaining}</span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                      <span style={{ fontWeight: 700, color: '#059669', fontSize: '0.95rem' }}>{formatarValor(s.valorTotal)}</span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span style={{ background: `${status.color}18`, color: status.color, padding: '3px 10px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 600, whiteSpace: 'nowrap', border: `1px solid ${status.color}40` }}>
                        {status.text}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', minWidth: '120px' }}>
                      <div style={{ background: '#e2e8f0', borderRadius: '999px', height: '8px', overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', borderRadius: '999px', background: getStatusColor(s.total), transition: 'width 0.4s ease' }} />
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '3px', textAlign: 'right' }}>{s.total}/{MAX_SERVICES}</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Nota de rodapé */}
      <p style={{ textAlign: 'right', marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        * Contagem baseada nas escalas salvas no Painel Admin. Limite: {MAX_SERVICES} serviços/mês por militar.
      </p>
    </div>
  );
}
