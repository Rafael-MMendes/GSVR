import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { DollarSign, TrendingUp, TrendingDown, PieChart, Calendar, Users, Wallet, AlertTriangle, Activity, FileText, Download, CheckCircle } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';


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
  const [selectedCycleId, setSelectedCycleId] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('visao geral');
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'data', direction: 'desc' });
  const [pdfLoading, setPdfLoading] = useState(false);

  const totalHorasTrabalhadas = useMemo(() => {
    if (!resumo?.detalhes_por_tipo) return 0;
    return resumo.detalhes_por_tipo.reduce((acc, tipo) => {
      const horas = parseInt(tipo.descricao.replace(/\D/g, '')) || 6;
      return acc + (horas * tipo.qtd_servicos);
    }, 0);
  }, [resumo]);

  const projecaoGastos = useMemo(() => {
    if (!resumo || !detalhado?.detalhes_diarios || detalhado.detalhes_diarios.length === 0) return 0;
    const diasRegistrados = detalhado.detalhes_diarios.length;
    const gastoAteAgora = resumo.total_gasto;
    const mediaDiaria = gastoAteAgora / diasRegistrados;
    return mediaDiaria * 30; // Estimando para 30 dias de ciclo
  }, [resumo, detalhado]);

  const user = useMemo(() => {
    try {
      const userRaw = localStorage.getItem('ft_user');
      return userRaw ? JSON.parse(userRaw) : null;
    } catch (e) {
      return null;
    }
  }, []);

  const reportDate = useMemo(() => {
    const now = new Date();
    return now.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
  }, []);

  const activeCycleName = useMemo(() => {
    const cycle = months.find(m => String(m.id_ciclo) === String(selectedCycleId));
    return cycle ? `${cycle.period_name} - ${cycle.opm_sigla}` : 'Nenhum Ciclo Selecionado';
  }, [months, selectedCycleId]);

  const handleDownloadReportPDF = async () => {
    const element = document.getElementById('relatorio-executivo-container');
    if (!element) return;
    setPdfLoading(true);
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      const filename = `Relatorio_Executivo_Financeiro_${activeCycleName.replace(/[\s\/]/g, '_')}.pdf`;
      pdf.save(filename);
    } catch (error) {
      console.error('Erro ao gerar PDF do relatório:', error);
      alert('Erro ao gerar PDF do relatório: ' + error.message);
    } finally {
      setPdfLoading(false);
    }
  };


  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedDetalhadoDiario = useMemo(() => {
    if (!detalhado?.detalhes_diarios) return [];
    return [...detalhado.detalhes_diarios].sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      if (sortConfig.key === 'gasto' || sortConfig.key === 'acumulado' || sortConfig.key === 'servicos') {
        aValue = parseFloat(aValue) || 0;
        bValue = parseFloat(bValue) || 0;
      } else if (sortConfig.key === 'data') {
        // Formato esperado DD/MM conforme retornado pelo backend (TO_CHAR)
        const partsA = aValue.split('/');
        const partsB = bValue.split('/');
        const da = parseInt(partsA[0]) || 0;
        const ma = parseInt(partsA[1]) || 0;
        const db = parseInt(partsB[0]) || 0;
        const mb = parseInt(partsB[1]) || 0;

        // Criar um marcador numérico MMDD para comparação correta
        aValue = ma * 100 + da;
        bValue = mb * 100 + db;
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [detalhado, sortConfig]);

  useEffect(() => {
    const loadMonths = async () => {
      setLoading(true);
      setError(null);
      try {
        const monthsRes = await axios.get(`${API_URL}/ciclos`);
        setMonths(monthsRes.data);
        const activeCycle = monthsRes.data.find(c => c.status === 'Aberto');
        if (activeCycle) {
          setSelectedCycleId(activeCycle.id_ciclo);
        } else if (monthsRes.data.length > 0) {
          setSelectedCycleId(monthsRes.data[0].id_ciclo);
        } else {
          setLoading(false);
        }
      } catch (e) {
        console.error('Erro ao carregar meses:', e);
        setError('Ocorreu um erro ao carregar os ciclos/meses.');
        setLoading(false);
      }
    };
    loadMonths();
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = selectedCycleId ? { id_ciclo: selectedCycleId } : {};
        const [resumoRes, detalhadoRes] = await Promise.all([
          axios.get(`${API_URL}/financeiro/resumo`, { params }),
          axios.get(`${API_URL}/financeiro/detalhado`, { params })
        ]);
        setResumo(resumoRes.data);
        setDetalhado(detalhadoRes.data);
      } catch (e) {
        console.error('Erro ao carregar dados financeiros:', e);
        const backendMsg = e.response?.data?.error;
        setError(backendMsg || 'Erro ao carregar dados financeiros. Verifique o servidor.');
      } finally {
        setLoading(false);
      }
    };

    // Se temos selectedMonth ou se a lista de meses já foi carregada (mesmo vazia)
    if (selectedCycleId !== '' || (months.length === 0 && !loading)) {
      loadData();
    }
  }, [selectedCycleId]);

  if (error) {
    return (
      <div className="container" style={{ paddingTop: '2rem', textAlign: 'center' }}>
        <div style={{ padding: '2rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', color: '#dc2626' }}>
          <AlertTriangle size={48} style={{ marginBottom: '1rem' }} />
          <h3>Erro de Carregamento</h3>
          <p>{error}</p>
          <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => window.location.reload()}>
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

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
            Módulo Financeiro - GSVR
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
            value={selectedCycleId}
            onChange={e => setSelectedCycleId(e.target.value)}
          >
            <option value="">Selecione o Ciclo</option>
            {months.map(m => (
              <option key={m.id_ciclo} value={m.id_ciclo}>{m.period_name} - {m.opm_sigla}</option>
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
        <button
          className={`btn ${activeTab === 'relatorio' ? 'btn-primary' : 'btn-outline'}`}
          style={{ flex: 1 }}
          onClick={() => setActiveTab('relatorio')}
        >
          <FileText size={16} style={{ marginRight: '6px' }} />
          Relatório Executivo
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            {/* Bloco 1: Distribuição das Modalidades de Duração */}
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h3 style={{ margin: '0 0 1rem 0', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
                <PieChart size={20} />
                Distribuição das Modalidades de Serviço
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {resumo.detalhes_por_tipo && resumo.detalhes_por_tipo.map((tipo, idx) => {
                  const totalGasto = resumo.total_gasto || 1;
                  const totalServicos = resumo.total_militar_servicos || 1;
                  const pctQtd = (tipo.qtd_servicos / totalServicos) * 100;
                  const pctGasto = (tipo.total_gasto_tipo / totalGasto) * 100;

                  return (
                    <div key={idx} style={{ padding: '1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, color: 'var(--primary)', marginBottom: '0.5rem' }}>
                        <span>{tipo.descricao}</span>
                        <span style={{ color: '#10b981' }}>{formatCurrency(tipo.total_gasto_tipo)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                        <span>{tipo.qtd_servicos} serviços executados</span>
                        <span>{pctQtd.toFixed(1)}% do volume total</span>
                      </div>
                      {/* Bar 1: Volume de Serviços */}
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '2px' }}>Volume (Qtd)</div>
                      <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden', marginBottom: '0.5rem' }}>
                        <div style={{ width: `${pctQtd}%`, height: '100%', background: 'var(--primary)' }}></div>
                      </div>
                      {/* Bar 2: Financeiro */}
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '2px' }}>Financeiro (Custo)</div>
                      <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${pctGasto}%`, height: '100%', background: '#10b981' }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bloco 2: Previsão e Análise Gerencial */}
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h3 style={{ margin: '0 0 1rem 0', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
                <TrendingUp size={20} />
                Previsão e Análise Gerencial
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Projeção Fim do Ciclo</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', marginTop: '0.25rem' }}>
                      {formatCurrency(projecaoGastos)}
                    </div>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Balanço Estimado</div>
                    <div style={{ 
                      fontSize: '1.4rem', 
                      fontWeight: 700, 
                      color: (resumo.verba_ciclo - projecaoGastos >= 0) ? '#10b981' : '#ef4444', 
                      marginTop: '0.25rem' 
                    }}>
                      {formatCurrency(resumo.verba_ciclo - projecaoGastos)}
                    </div>
                  </div>
                </div>

                <div style={{ padding: '1rem', borderRadius: '8px', background: (resumo.verba_ciclo - projecaoGastos >= 0) ? '#f0fdf4' : '#fef2f2', border: `1px solid ${(resumo.verba_ciclo - projecaoGastos >= 0) ? '#bbf7d0' : '#fecaca'}`, color: (resumo.verba_ciclo - projecaoGastos >= 0) ? '#166534' : '#991b1b' }}>
                  <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                    <AlertTriangle size={16} />
                    {(resumo.verba_ciclo - projecaoGastos >= 0) ? 'Previsão de Superávit' : 'Alerta de Déficit'}
                  </div>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem' }}>
                    {(resumo.verba_ciclo - projecaoGastos >= 0) 
                      ? `Estimativa de economia de ${formatCurrency(resumo.verba_ciclo - projecaoGastos)} ao final deste ciclo de escalas.` 
                      : `Atenção: A projeção de gastos supera a verba em ${formatCurrency(Math.abs(resumo.verba_ciclo - projecaoGastos))}.`
                    }
                  </p>
                </div>

                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem' }}>
                  <div style={{ fontWeight: 600, color: 'var(--primary)', marginBottom: '0.5rem' }}>Status do Ciclo</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span>Consumo Real:</span>
                    <span style={{ fontWeight: 600 }}>{formatPercent(resumo.percentual_utilizado)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Margem Operacional:</span>
                    <span style={{ fontWeight: 600, color: '#10b981' }}>{formatPercent(100 - resumo.percentual_utilizado)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Indicadores Estratégicos Adicionais */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="glass-panel" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <div style={{ background: '#3b82f6', borderRadius: '8px', padding: '0.5rem', color: 'white' }}>
                  <Activity size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Horas Trabalhadas</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary)' }}>{totalHorasTrabalhadas} h</div>
                </div>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total acumulado de horas operacionais no período</div>
            </div>

            <div className="glass-panel" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <div style={{ background: '#8b5cf6', borderRadius: '8px', padding: '0.5rem', color: 'white' }}>
                  <DollarSign size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Custo Médio por Serviço</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary)' }}>
                    {formatCurrency(resumo.total_militar_servicos > 0 ? (resumo.total_gasto / resumo.total_militar_servicos) : 0)}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Valor total pago ÷ quantidade total de serviços reais</div>
            </div>

            <div className="glass-panel" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <div style={{ background: '#f59e0b', borderRadius: '8px', padding: '0.5rem', color: 'white' }}>
                  <Users size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Custo Médio por Militar</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary)' }}>
                    {formatCurrency(resumo.total_militares_unicos > 0 ? (resumo.total_gasto / resumo.total_militares_unicos) : 0)}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Valor total pago ÷ militares ativos que atuaram nas escalas</div>
            </div>

            <div className="glass-panel" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <div style={{ background: '#10b981', borderRadius: '8px', padding: '0.5rem', color: 'white' }}>
                  <Users size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Militares Empenhados</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary)' }}>{resumo.total_militares_unicos} PMs</div>
                </div>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Quantidade de policiais distintos que atuaram</div>
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
                  <th onClick={() => requestSort('data')} style={{ padding: '0.75rem', textAlign: 'left', color: 'var(--text-muted)', cursor: 'pointer' }}>
                    Data {sortConfig.key === 'data' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => requestSort('servicos')} style={{ padding: '0.75rem', textAlign: 'center', color: 'var(--text-muted)', cursor: 'pointer' }}>
                    Serviços {sortConfig.key === 'servicos' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => requestSort('gasto')} style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--text-muted)', cursor: 'pointer' }}>
                    Gasto do Dia {sortConfig.key === 'gasto' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => requestSort('acumulado')} style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--text-muted)', cursor: 'pointer' }}>
                    Acumulado {sortConfig.key === 'acumulado' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedDetalhadoDiario.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      Nenhum serviço registrado no período selecionado.
                    </td>
                  </tr>
                ) : (
                  sortedDetalhadoDiario.map((dia, idx) => (
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
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>escalas</div>
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

      {activeTab === 'relatorio' && resumo && detalhado && (
        <div className="glass-panel" style={{ padding: '2rem', background: '#fff', color: '#1e293b' }}>
          {/* Controles do Relatório (não impresso) */}
          <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', paddingBottom: '1rem', borderBottom: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.95rem', color: 'var(--text-muted)' }}>
              Visualize e exporte o relatório executivo oficial consolidado para este ciclo.
            </span>
            <button
              className="btn btn-primary"
              onClick={handleDownloadReportPDF}
              disabled={pdfLoading}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Download size={16} />
              {pdfLoading ? 'Gerando PDF...' : 'Salvar em PDF'}
            </button>
          </div>

          {/* Container do Relatório A4 */}
          <div id="relatorio-executivo-container" style={{
            width: '100%',
            maxWidth: '800px',
            margin: '0 auto',
            padding: '40px',
            backgroundColor: '#ffffff',
            fontFamily: '"Inter", sans-serif',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
            borderRadius: '8px',
            lineHeight: '1.6'
          }}>
            
            {/* CAPA */}
            <div style={{ minHeight: '800px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderBottom: '2px solid #0d3878', paddingBottom: '40px', marginBottom: '40px' }}>
              <div style={{ textAlign: 'center', marginTop: '40px' }}>
                <img src="/brasao_9bpm.png" alt="Brasão 9º BPM" style={{ height: '100px', marginBottom: '20px' }} />
                <h3 style={{ margin: '0', color: '#0d3878', letterSpacing: '1px', fontWeight: '700' }}>POLÍCIA MILITAR DE ALAGOAS</h3>
                <h4 style={{ margin: '5px 0 0 0', color: '#475569', fontWeight: '500' }}>9º Batalhão de Polícia Militar — Batalhão de Divisas</h4>
              </div>
              
              <div style={{ textAlign: 'center', margin: '100px 0' }}>
                <h1 style={{ fontSize: '2.5rem', color: '#0d3878', margin: '0 0 10px 0', fontWeight: '800' }}>RELATÓRIO FINANCEIRO EXECUTIVO</h1>
                <h2 style={{ fontSize: '1.5rem', color: '#009c3b', margin: '0', fontWeight: '600' }}>Consolidado e Detalhado do Serviço Voluntário Remunerado</h2>
                <div style={{ width: '80px', height: '4px', background: '#ffdf00', margin: '20px auto 0 auto' }}></div>
              </div>

              <div style={{ fontSize: '0.95rem', color: '#475569', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px', marginBottom: '6px' }}>
                  <strong>Ciclo/Período:</strong> <span>{activeCycleName}</span>
                  <strong>Data de Emissão:</strong> <span>{reportDate}</span>
                  <strong>Responsável:</strong> <span>{user ? `${user.posto_graduacao || ''} ${user.nome_guerra || user.nome_completo}` : 'Gestão Financeira GSVR'}</span>
                  <strong>Órgão:</strong> <span>Seção de Finanças / Comando do 9º BPM</span>
                </div>
              </div>
            </div>

            {/* SUMÁRIO */}
            <div style={{ marginBottom: '40px', paddingBottom: '20px', borderBottom: '1px solid #e2e8f0' }}>
              <h2 style={{ color: '#0d3878', fontSize: '1.5rem', borderBottom: '2px solid #0d3878', paddingBottom: '8px' }}>Sumário</h2>
              <ul style={{ listStyle: 'none', paddingLeft: '0', fontSize: '0.95rem' }}>
                {[
                  { t: '1. Resumo Executivo', p: '01' },
                  { t: '2. Visão Geral Consolidada', p: '02' },
                  { t: '3. Análise Detalhada', p: '03' },
                  { t: '4. Achados Relevantes', p: '04' },
                  { t: '5. Recomendações Estratégicas', p: '05' },
                  { t: '6. Conclusão', p: '06' },
                  { t: '7. Anexos', p: '07' }
                ].map((item, idx) => (
                  <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', borderBottom: '1px dotted #cbd5e1' }}>
                    <span>{item.t}</span>
                    <span>Pág. {item.p}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 1. RESUMO EXECUTIVO */}
            <div style={{ marginBottom: '40px' }}>
              <h2 style={{ color: '#0d3878', fontSize: '1.5rem', borderBottom: '2px solid #0d3878', paddingBottom: '8px' }}>1. Resumo Executivo</h2>
              <p style={{ fontSize: '0.95rem', textAlign: 'justify' }}>
                Este relatório apresenta a análise financeira executiva referente à execução do Serviço Voluntário Remunerado (SVR) no âmbito da unidade, consolidando dados orçamentários, distribuição de escalas e aplicação de verbas do ciclo <strong>{activeCycleName}</strong>. A análise visa dar subsídio para a tomada de decisão gerencial, assegurando a transparência e a eficiência na aplicação dos recursos públicos direcionados à segurança pública local.
              </p>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', margin: '20px 0' }}>
                <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #0d3878' }}>
                  <h4 style={{ margin: '0 0 5px 0', fontSize: '0.9rem', color: '#475569' }}>Principais Conclusões</h4>
                  <ul style={{ margin: '0', paddingLeft: '1.25rem', fontSize: '0.85rem' }}>
                    <li>A verba total disponibilizada para o ciclo foi de <strong>{formatCurrency(resumo.verba_ciclo)}</strong>.</li>
                    <li>O montante total liquidado é de <strong>{formatCurrency(resumo.total_gasto)}</strong> ({formatPercent(resumo.percentual_utilizado)} de aproveitamento).</li>
                    <li>Projeção para o fim do ciclo: <strong>{formatCurrency(projecaoGastos)}</strong> (Balanço estimado: <strong style={{ color: (resumo.verba_ciclo - projecaoGastos >= 0) ? '#166534' : '#dc2626' }}>{formatCurrency(resumo.verba_ciclo - projecaoGastos)}</strong>).</li>
                  </ul>
                </div>
                
                <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #009c3b' }}>
                  <h4 style={{ margin: '0 0 5px 0', fontSize: '0.9rem', color: '#475569' }}>Indicadores Estratégicos</h4>
                  <ul style={{ margin: '0', paddingLeft: '1.25rem', fontSize: '0.85rem' }}>
                    <li>Saldo Disponível: <strong>{formatCurrency(resumo.saldo_restante)}</strong>.</li>
                    <li>Total de Horas Trabalhadas: <strong>{totalHorasTrabalhadas} h</strong>.</li>
                    <li>Custo Médio: <strong>{formatCurrency(resumo.total_militar_servicos > 0 ? (resumo.total_gasto / resumo.total_militar_servicos) : 0)}</strong>/serviço • <strong>{formatCurrency(resumo.total_militares_unicos > 0 ? (resumo.total_gasto / resumo.total_militares_unicos) : 0)}</strong>/PM.</li>
                  </ul>
                </div>
              </div>

              {resumo.percentual_utilizado > 80 ? (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '15px', display: 'flex', alignItems: 'center', gap: '10px', color: '#dc2626', marginBottom: '15px' }}>
                  <AlertTriangle size={24} />
                  <div>
                    <strong style={{ fontSize: '0.9rem' }}>Ponto de Atenção Crítico:</strong>
                    <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem' }}>A utilização orçamentária do ciclo ultrapassou 80% ({formatPercent(resumo.percentual_utilizado)}). Há risco iminente de esgotamento de verbas antes do fim do ciclo regulamentar, recomendando-se controle rigoroso das escalas pendentes.</p>
                  </div>
                </div>
              ) : (
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '15px', display: 'flex', alignItems: 'center', gap: '10px', color: '#166534', marginBottom: '15px' }}>
                  <CheckCircle size={24} />
                  <div>
                    <strong style={{ fontSize: '0.9rem' }}>Ponto de Atenção:</strong>
                    <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem' }}>O consumo orçamentária encontra-se em níveis adequados de segurança ({formatPercent(resumo.percentual_utilizado)}), sem riscos iminentes de ultrapassar o limite estabelecido para o ciclo.</p>
                  </div>
                </div>
              )}
            </div>

            {/* 2. VISÃO GERAL CONSOLIDADA */}
            <div style={{ marginBottom: '40px' }}>
              <h2 style={{ color: '#0d3878', fontSize: '1.5rem', borderBottom: '2px solid #0d3878', paddingBottom: '8px' }}>2. Visão Geral Consolidada</h2>
              <p style={{ fontSize: '0.95rem', textAlign: 'justify', marginBottom: '15px' }}>
                A apresentação sintética dos dados demonstra o equilíbrio entre o recurso previsto e a sua execução real. A distribuição dos recursos e a destinação final da verba por modalidade de serviço encontram-se resumidas na tabela abaixo:
              </p>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', marginBottom: '20px' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: '700' }}>Tipo de Serviço</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: '700' }}>Qtd. Serviços</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '700' }}>Investimento Total</th>
                  </tr>
                </thead>
                <tbody>
                  {resumo.detalhes_por_tipo && resumo.detalhes_por_tipo.map((tipo, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '8px 12px' }}>{tipo.descricao}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>{tipo.qtd_servicos}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '600' }}>{formatCurrency(tipo.total_gasto_tipo)}</td>
                    </tr>
                  ))}
                  <tr style={{ background: '#f8fafc', borderTop: '2px solid #cbd5e1', fontWeight: '700' }}>
                    <td style={{ padding: '8px 12px' }}>Total Consolidado</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>{resumo.total_militar_servicos}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: '#0d3878' }}>{formatCurrency(resumo.total_gasto)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 3. ANÁLISE DETALHADA */}
            <div style={{ marginBottom: '40px' }}>
              <h2 style={{ color: '#0d3878', fontSize: '1.5rem', borderBottom: '2px solid #0d3878', paddingBottom: '8px' }}>3. Análise Detalhada</h2>
              <p style={{ fontSize: '0.95rem', textAlign: 'justify', marginBottom: '15px' }}>
                A análise cronológica da evolução diária dos gastos demonstra o fluxo de escala e a constância operacional do batalhão. A tabela de evolução diária consolida os dias de maior demanda e o acúmulo financeiro ao longo do período selecionado:
              </p>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #cbd5e1' }}>
                    <th style={{ padding: '6px 10px', textAlign: 'left' }}>Data</th>
                    <th style={{ padding: '6px 10px', textAlign: 'center' }}>Serviços Atendidos</th>
                    <th style={{ padding: '6px 10px', textAlign: 'right' }}>Gasto Diário</th>
                    <th style={{ padding: '6px 10px', textAlign: 'right' }}>Saldo Acumulado</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedDetalhadoDiario.map((dia, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '6px 10px' }}>{dia.data}</td>
                      <td style={{ padding: '6px 10px', textAlign: 'center' }}>{dia.servicos}</td>
                      <td style={{ padding: '6px 10px', textAlign: 'right', color: '#ef4444' }}>{formatCurrency(dia.gasto)}</td>
                      <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: '600' }}>{formatCurrency(dia.acumulado)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 4. ACHADOS RELEVANTES */}
            <div style={{ marginBottom: '40px' }}>
              <h2 style={{ color: '#0d3878', fontSize: '1.5rem', borderBottom: '2px solid #0d3878', paddingBottom: '8px' }}>4. Achados Relevantes</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.9rem' }}>
                <div style={{ borderLeft: '3px solid #009c3b', paddingLeft: '12px' }}>
                  <strong>Pontos Positivos:</strong>
                  <p style={{ margin: '4px 0 0 0', color: '#475569' }}>
                    - Excelente índice de adesão dos militares ao SVR, com <strong>{resumo.total_militares_unicos}</strong> policiais participando voluntariamente.
                    <br />
                    - Distribuição equilibrada das escalas de serviço, mantendo uma média saudável de <strong>{resumo.total_militares_unicos > 0 ? (resumo.total_militar_servicos * 3 / resumo.total_militares_unicos).toFixed(1) : 0}</strong> escalas por homem.
                  </p>
                </div>
                
                <div style={{ borderLeft: '3px solid #ef4444', paddingLeft: '12px' }}>
                  <strong>Problemas Identificados:</strong>
                  <p style={{ margin: '4px 0 0 0', color: '#475569' }}>
                    - A oscilação pontual nos gastos diários pode indicar gargalos de escala em finais de semana ou datas festivas locais, necessitando planejamento operacional preditivo.
                  </p>
                </div>

                <div style={{ borderLeft: '3px solid #f59e0b', paddingLeft: '12px' }}>
                  <strong>Riscos e Oportunidades:</strong>
                  <p style={{ margin: '4px 0 0 0', color: '#475569' }}>
                    - <em>Risco:</em> Eventual falta de verba em ciclos curtos e com alta demanda operacional local.
                    <br />
                    - <em>Oportunidade:</em> Otimizar o controle de verbas por meio de limites dinâmicos parametrizados baseados no histórico consolidado.
                  </p>
                </div>
              </div>
            </div>

            {/* 5. RECOMENDAÇÕES */}
            <div style={{ marginBottom: '40px' }}>
              <h2 style={{ color: '#0d3878', fontSize: '1.5rem', borderBottom: '2px solid #0d3878', paddingBottom: '8px' }}>5. Recomendações Estratégicas</h2>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>Ação Recomendada</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center' }}>Prazo</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center' }}>Impacto</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px 12px' }}>Instituir alertas automáticos no sistema ao atingir 75% e 90% da verba do ciclo.</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', color: '#b45309', fontWeight: '600' }}>Curto Prazo</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', color: '#dc2626', fontWeight: '600' }}>Alto</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px 12px' }}>Refinar a distribuição de verba entre as subunidades conforme a mancha criminal.</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', color: '#0891b2', fontWeight: '600' }}>Médio Prazo</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', color: '#d97706', fontWeight: '600' }}>Médio</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px 12px' }}>Desenvolver dashboard preditivo para estimativa de gastos futuros baseados nos ciclos anteriores.</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', color: '#059669', fontWeight: '600' }}>Longo Prazo</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', color: '#2563eb', fontWeight: '600' }}>Alto</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 6. CONCLUSÃO */}
            <div style={{ marginBottom: '40px' }}>
              <h2 style={{ color: '#0d3878', fontSize: '1.5rem', borderBottom: '2px solid #0d3878', paddingBottom: '8px' }}>6. Conclusão</h2>
              <p style={{ fontSize: '0.95rem', textAlign: 'justify' }}>
                Conclui-se que o ciclo operacional analisado apresenta uma execução orçamentária e financeira {resumo.percentual_utilizado > 95 ? 'crítica, demandando atenção operacional imediata' : 'estável e dentro dos limites regulamentares planejados'}. A gestão integrada e o monitoramento em tempo real fornecido pelo módulo GSVR garantem a tomada de decisão ágil e segura pelo escalão superior, potencializando o policiamento preventivo nas divisas de Alagoas.
              </p>
            </div>

            {/* 7. ANEXOS */}
            <div style={{ marginBottom: '40px' }}>
              <h2 style={{ color: '#0d3878', fontSize: '1.5rem', borderBottom: '2px solid #0d3878', paddingBottom: '8px' }}>7. Anexos</h2>
              <p style={{ fontSize: '0.9rem', marginBottom: '10px' }}><strong>Tabela A: Militares com maior frequência operacional (Top Militares no ciclo)</strong></p>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #cbd5e1' }}>
                    <th style={{ padding: '6px 10px', textAlign: 'left' }}>Classificação</th>
                    <th style={{ padding: '6px 10px', textAlign: 'left' }}>Nome Militar</th>
                    <th style={{ padding: '6px 10px', textAlign: 'center' }}>Qtd. Escalas</th>
                    <th style={{ padding: '6px 10px', textAlign: 'right' }}>Total Recebido</th>
                  </tr>
                </thead>
                <tbody>
                  {detalhado.top_militares && detalhado.top_militares.slice(0, 5).map((mil, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '6px 10px' }}>#{idx + 1}</td>
                      <td style={{ padding: '6px 10px', fontWeight: '500' }}>{mil.name}</td>
                      <td style={{ padding: '6px 10px', textAlign: 'center' }}>{mil.servicos}</td>
                      <td style={{ padding: '6px 10px', textAlign: 'right', color: '#10b981', fontWeight: '600' }}>{formatCurrency(mil.gasto)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}