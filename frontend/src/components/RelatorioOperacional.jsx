import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FileText, Calendar, Building, DollarSign, Activity, ChevronDown, ChevronRight, User } from 'lucide-react';

const formatDateDisplay = (dateValue) => {
  if (!dateValue) return '---';
  try {
    const dateStr = String(dateValue).split('T')[0]; 
    const [ano, mes, dia] = dateStr.split('-');
    return `${dia}/${mes}/${ano}`;
  } catch (e) {
    return '---';
  }
};

export const RelatorioOperacional = () => {
  const [agregado, setAgregado] = useState([]);
  const [hierarquia, setHierarquia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedRow, setExpandedRow] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'periodo_ciclo', direction: 'desc' });

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedAgregado = [...agregado].sort((a, b) => {
    let aValue = a[sortConfig.key];
    let bValue = b[sortConfig.key];

    if (['qtd_escalas', 'qtd_servicos_executados', 'total_carga_horaria_executada', 'total_remuneracao'].includes(sortConfig.key)) {
      aValue = parseFloat(aValue) || 0;
      bValue = parseFloat(bValue) || 0;
    }

    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const fetchRelatorios = async () => {
    try {
      setLoading(true);
      const urlBase = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      
      const [resAgregado, resCompleto] = await Promise.all([
        axios.get(`${urlBase}/api/relatorios/operacional-agregado`),
        axios.get(`${urlBase}/api/relatorios/operacional-completo`)
      ]);

      setAgregado(resAgregado.data || []);
      setHierarquia(resCompleto.data || []);
      setError('');
    } catch (err) {
      console.error(err);
      setError('Erro ao carregar relatórios operacionais.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRelatorios();
  }, []);

  const toggleRow = (id) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  if (loading) {
    return (
      <div className="card">
        <div className="card-header">
          <h2>Relatório Operacional</h2>
        </div>
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <Activity className="spin" size={24} style={{ color: '#0f172a', margin: '0 auto' }} />
          <p style={{ marginTop: '1rem', color: '#64748b' }}>Carregando dados com integridade relacional...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="card-header">
          <h2>Erro de Relatório</h2>
        </div>
        <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>{error}</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2><FileText size={20} /> Visão Consolidada (Agregado)</h2>
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Baseado na <b>vw_relatorio_operacional_agregado</b>
          </span>
        </div>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th onClick={() => requestSort('periodo_ciclo')} style={{ cursor: 'pointer' }}>
                    Ciclo {sortConfig.key === 'periodo_ciclo' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => requestSort('opm_sigla')} style={{ cursor: 'pointer' }}>
                    OPM {sortConfig.key === 'opm_sigla' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => requestSort('nome_guerra')} style={{ cursor: 'pointer' }}>
                    Militar {sortConfig.key === 'nome_guerra' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => requestSort('qtd_escalas')} style={{ cursor: 'pointer' }}>
                    Planejadas {sortConfig.key === 'qtd_escalas' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => requestSort('qtd_servicos_executados')} style={{ cursor: 'pointer' }}>
                    Executados {sortConfig.key === 'qtd_servicos_executados' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => requestSort('total_carga_horaria_executada')} style={{ cursor: 'pointer' }}>
                    Carga (h) {sortConfig.key === 'total_carga_horaria_executada' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => requestSort('total_remuneracao')} style={{ cursor: 'pointer' }}>
                    Remuneração {sortConfig.key === 'total_remuneracao' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedAgregado.map((item, idx) => (
                <tr key={idx}>
                  <td>{item.periodo_ciclo}</td>
                  <td>{item.opm_sigla}</td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{item.nome_guerra}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{item.posto_graduacao}</div>
                  </td>
                  <td>{item.qtd_escalas}</td>
                  <td>{item.qtd_servicos_executados}</td>
                  <td>{item.total_carga_horaria_executada}h</td>
                  <td style={{ fontWeight: 600, color: '#059669' }}>
                    R$ {Number(item.total_remuneracao).toFixed(2)}
                  </td>
                </tr>
              ))}
              {agregado.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>
                    Nenhum dado agregado encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2><Activity size={20} /> Visão Detalhada Hierárquica</h2>
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Baseado na <b>vw_relatorio_operacional_completo</b>
          </span>
        </div>
        <div className="table-responsive">
          <table className="table" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ width: 40 }}>+</th>
                <th>Militar (Unidade OPM)</th>
                <th>Ciclo Mínimo Envolvido</th>
                <th>Resumo (Req | Escala | Exec)</th>
                <th>Consistência Financeira</th>
              </tr>
            </thead>
            <tbody>
              {hierarquia.map((h) => {
                const isExpanded = expandedRow === h.militar.id_militar;
                return (
                  <React.Fragment key={h.militar.id_militar}>
                    <tr onClick={() => toggleRow(h.militar.id_militar)} style={{ cursor: 'pointer', backgroundColor: isExpanded ? '#f8fafc' : 'transparent' }}>
                      <td>
                        {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <User size={16} color="#64748b" />
                          <div>
                            <div style={{ fontWeight: 600 }}>{h.militar.posto_graduacao} {h.militar.nome_guerra}</div>
                            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                              Mat: {h.militar.matricula} | {h.opm.sigla || 'Sem OPM'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>{h.referencia || 'N/A'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem' }}>
                          <span title="Requerimentos Entregues">📝 {h.requerimentos.length}</span>
                          <span title="Turnos Escalados">📅 {h.escala.length}</span>
                          <span title="Serviços Executados">✅ {h.execucao.length}</span>
                        </div>
                      </td>
                      <td style={{ fontWeight: 600, color: h.consolidacao.valor_devido > 0 ? '#059669' : '#94a3b8' }}>
                        R$ {h.consolidacao.valor_devido.toFixed(2)} ({h.consolidacao.horas_feitas}h)
                      </td>
                    </tr>
                    
                    {isExpanded && (
                      <tr>
                        <td colSpan="5" style={{ padding: 0, borderBottom: '1px solid #e2e8f0' }}>
                          <div style={{ padding: '1rem 2rem', backgroundColor: '#f8fafc', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                            
                            <div style={{ flex: 1, minWidth: 250, backgroundColor: 'white', padding: '1rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                              <h4 style={{ marginBottom: '0.8rem', fontSize: '0.9rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <FileText size={16} /> Requerimentos
                              </h4>
                              {h.requerimentos.length === 0 ? <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Nenhum</p> : (
                                <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.8rem' }}>
                                  {h.requerimentos.map((r, i) => (
                                    <li key={i}>Req: {r.numero_requerimento} - Dia {r.dia_mes} ({r.turno})</li>
                                  ))}
                                </ul>
                              )}
                            </div>

                            <div style={{ flex: 1, minWidth: 250, backgroundColor: 'white', padding: '1rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                              <h4 style={{ marginBottom: '0.8rem', fontSize: '0.9rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Calendar size={16} /> Escala
                              </h4>
                              {h.escala.length === 0 ? <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Nenhuma</p> : (
                                <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.8rem' }}>
                                  {h.escala.map((e, i) => (
                                    <li key={i}>{formatDateDisplay(e.data)} - {e.turno} ({e.funcao || 'N/A'})</li>
                                  ))}
                                </ul>
                              )}
                            </div>

                            <div style={{ flex: 1, minWidth: 250, backgroundColor: 'white', padding: '1rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                              <h4 style={{ marginBottom: '0.8rem', fontSize: '0.9rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Activity size={16} /> Execução Real
                              </h4>
                              {h.execucao.length === 0 ? <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Nenhuma</p> : (
                                <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.8rem' }}>
                                  {h.execucao.map((ex, i) => (
                                    <li key={i}>
                                      {formatDateDisplay(ex.data)} - {ex.carga_horaria}h - R${ex.remuneracao} <span style={{ padding: '2px 6px', borderRadius: 4, background: ex.status === 'PRESENTE' ? '#dcfce7' : '#fee2e2', color: ex.status === 'PRESENTE' ? '#166534' : '#991b1b', fontSize: '0.7rem' }}>{ex.status}</span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>

                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {hierarquia.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>
                    Nenhuma hierarquia relacional encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
