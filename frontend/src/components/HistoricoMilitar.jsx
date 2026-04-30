import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Calendar, Search, Shield, Filter, Clock, ChevronDown, User, CheckCircle, AlertTriangle, XCircle, Info, BarChart3, ExternalLink, CalendarCheck } from 'lucide-react';
import { RelatorioIndividual } from './RelatorioIndividual';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001') + '/api';

export function HistoricoMilitar() {
  const [data, setData] = useState([]);
  const [ciclos, setCiclos] = useState([]);
  const [selectedCiclo, setSelectedCiclo] = useState('all');
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [relatorioMilitar, setRelatorioMilitar] = useState(null); // { id_militar, ciclo_id }

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ciclosRes, reportsRes] = await Promise.all([
        axios.get(`${API_URL}/ciclos`),
        axios.get(`${API_URL}/reports/operacional-detalhado?ciclo_id=${selectedCiclo}`)
      ]);

      const allCiclos = ciclosRes.data;
      setCiclos(allCiclos);
      setData(reportsRes.data);

      // Se for o primeiro carregamento (all), tenta setar o ciclo ativo
      if (selectedCiclo === 'all') {
        const active = allCiclos.find(c => c.status === 'Aberto');
        if (active) {
          setSelectedCiclo(active.id_ciclo);
        }
      }
    } catch (err) {
      console.error('Erro ao buscar dados:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedCiclo]);

  // Agrega os dados por militar
  const aggregatedData = useMemo(() => {
    const militaryMap = new Map();

    data.forEach(item => {
      const id = item.id_militar;
      if (!militaryMap.has(id)) {
        militaryMap.set(id, {
          id_militar: id,
          matricula: item.matricula,
          nome_guerra: item.nome_guerra,
          posto_graduacao: item.posto_graduacao,
          executados: 0,
          planejados: 0,
          planejado_executado: 0,
          planejado_nao_executado: 0,
          executado_nao_planejado: 0,
          desistencia: 0,
          dias_disponiveis: parseInt(item.dias_disponiveis) || 0
        });
      }

      const m = militaryMap.get(id);

      // Lógica de Contagem
      if (item.status_op === 'Planejado e Executado') {
        m.executados++;
        m.planejados++;
        m.planejado_executado++;
      } else if (item.status_op === 'Planejado') {
        m.planejados++;
      } else if (item.status_op === 'Planejado e não Executado') {
        m.planejados++;
        m.planejado_nao_executado++;
      } else if (item.status_op === 'Executado e não Planejado') {
        m.executados++;
        m.executado_nao_planejado++;
      } else if (item.status_op === 'Desistência de Requerimento') {
        m.desistencia++;
      }
    });

    return Array.from(militaryMap.values()).filter(m => {
      const search = filter.toLowerCase();
      return (m.nome_guerra || '').toLowerCase().includes(search) ||
        (m.matricula || '').includes(search) ||
        (m.posto_graduacao || '').toLowerCase().includes(search);
    }).sort((a, b) => b.executados - a.executados); // Ordena por quem mais trabalhou
  }, [data, filter]);

  const ColumnHeader = ({ label, icon, color }) => (
    <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 800, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.025em' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
        <span style={{ color }}>{icon}</span>
        {label}
      </div>
    </th>
  );

  // Navegação para relatório individual
  if (relatorioMilitar) {
    return (
      <RelatorioIndividual
        idMilitar={relatorioMilitar.id_militar}
        cicloId={relatorioMilitar.ciclo_id}
        onBack={() => setRelatorioMilitar(null)}
      />
    );
  }

  return (
    <div style={{ padding: '2rem', fontFamily: "'Inter', sans-serif", background: '#f8fafc', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.8rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <BarChart3 size={28} color="#2563eb" /> Histórico de Execução de SVR por Ciclo.
          </h1>
          <p style={{ margin: '0.5rem 0 0 0', color: '#64748b' }}>Demonstrativo analítico de produtividade por ciclo</p>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Filter size={16} color="#64748b" style={{ position: 'absolute', top: '12px', left: '12px', zIndex: 1 }} />
            <select
              value={selectedCiclo}
              onChange={(e) => setSelectedCiclo(e.target.value)}
              style={{ padding: '0.65rem 1rem 0.65rem 2.5rem', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.9rem', outline: 'none', minWidth: '240px', appearance: 'none', cursor: 'pointer' }}
            >
              <option value="all">Todos os Ciclos</option>
              {ciclos.map(c => <option key={c.id_ciclo} value={c.id_ciclo}>{c.period_name || c.periodo_ciclo}</option>)}
            </select>
            <ChevronDown size={16} color="#64748b" style={{ position: 'absolute', top: '12px', right: '12px', pointerEvents: 'none' }} />
          </div>

        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <div className="search-container search-container-fixed">
          <input
            type="text"
            className="search-input"
            placeholder="Buscar por nome ou matrícula..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <Search size={18} className="search-icon" />
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '5rem', color: '#64748b' }}>
          <Clock size={40} color="#2563eb" style={{ opacity: 0.5, marginBottom: '1rem' }} />
          <div>Processando estatísticas militares...</div>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
            <thead>
              <tr style={{ background: '#0D3878', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '1rem', fontSize: '0.85rem', fontWeight: 700, color: '#ffffff', textAlign: 'left' }}>Nome</th>
                <ColumnHeader label="Dias Disponíveis" icon={<CalendarCheck size={14} />} color="#0891b2" />
                <ColumnHeader label="Executados" icon={<CheckCircle size={14} />} color="#059669" />
                <ColumnHeader label="Planejados" icon={<Shield size={14} />} color="#2563eb" />
                <ColumnHeader label="Planejado e Executado" icon={<BarChart3 size={14} />} color="#0D3878" />
                <ColumnHeader label="Faltas" icon={<XCircle size={14} />} color="#dc2626" />
                <ColumnHeader label="Executado não Planejado" icon={<Info size={14} />} color="#7c3aed" />
                <ColumnHeader label="Desistência" icon={<AlertTriangle size={14} />} color="#d97706" />
                <th style={{ padding: '1rem', width: '56px' }} />
              </tr>
            </thead>
            <tbody>
              {aggregatedData.map((m, idx) => (
                <tr key={m.id_militar} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#fff' : '#fafafa', transition: 'background 0.2s' }}>
                  <td style={{ padding: '1rem', textAlign: 'left' }}>
                    <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.9rem' }}>{m.posto_graduacao} {m.nome_guerra}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Mat. {m.matricula}</div>
                  </td>

                  {/* Células de Dados */}
                  <td style={{ padding: '1rem' }}>
                    <span style={{ padding: '4px 12px', borderRadius: '12px', background: m.dias_disponiveis > 0 ? '#ecfeff' : '#f8fafc', color: m.dias_disponiveis > 0 ? '#0891b2' : '#94a3b8', fontWeight: 700 }}>
                      {m.dias_disponiveis}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ padding: '4px 12px', borderRadius: '12px', background: m.executados > 0 ? '#f0fdf4' : '#f8fafc', color: m.executados > 0 ? '#16a34a' : '#94a3b8', fontWeight: 700 }}>
                      {m.executados}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ fontWeight: 600, color: '#1e293b' }}>{m.planejados}</span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ color: '#0D3878', fontWeight: 700 }}>{m.planejado_executado}</span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ padding: '4px 10px', borderRadius: '12px', background: m.planejado_nao_executado > 0 ? '#fef2f2' : 'transparent', color: m.planejado_nao_executado > 0 ? '#dc2626' : '#cbd5e1', fontWeight: 700 }}>
                      {m.planejado_nao_executado}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ color: '#7c3aed', fontWeight: 600 }}>{m.executado_nao_planejado}</span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ padding: '4px 10px', borderRadius: '12px', background: m.desistencia > 0 ? '#fffbeb' : 'transparent', color: m.desistencia > 0 ? '#d97706' : '#cbd5e1', fontWeight: 700 }}>
                      {m.desistencia}
                    </span>
                  </td>
                  {/* Ícone de Relatório Individual */}
                  <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                    <button
                      title="Ver relatório individual"
                      onClick={() => setRelatorioMilitar({ id_militar: m.id_militar, ciclo_id: selectedCiclo })}
                      style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 34, height: 34, borderRadius: '10px',
                        border: '1px solid #e2e8f0', background: '#fff',
                        color: '#2563eb', cursor: 'pointer', transition: 'all 0.2s'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.borderColor = '#2563eb'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                    >
                      <ExternalLink size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {aggregatedData.length === 0 && (
            <div style={{ textAlign: 'center', padding: '5rem', color: '#94a3b8' }}>
              <User size={48} color="#e2e8f0" style={{ marginBottom: '1rem' }} />
              <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>Nenhum militar encontrado</div>
              <p>Tente ajustar os filtros ou o ciclo selecionado.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
