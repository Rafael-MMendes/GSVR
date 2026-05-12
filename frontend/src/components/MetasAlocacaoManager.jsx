import { useState, useEffect } from 'react';
import axios from 'axios';
import { Target, Calendar, Edit2, Trash2, X, Check, ArrowLeft, TrendingUp, DollarSign, Users, AlertCircle } from 'lucide-react';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001') + '/api';

export function MetasAlocacaoManager() {
    const [ciclos, setCiclos] = useState([]);
    const [selectedCiclo, setSelectedCiclo] = useState(null);
    const [metas, setMetas] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editingMeta, setEditingMeta] = useState(null);
    const [formData, setFormData] = useState({ qtd: '', custo: '' });

    useEffect(() => {
        fetchCiclos();
    }, []);

    const fetchCiclos = async (skipAutoSelect = false) => {
        try {
            const res = await axios.get(`${API_URL}/ciclos`);
            setCiclos(res.data);
            if (!skipAutoSelect && res.data.length > 0 && !selectedCiclo) {
                const active = res.data.find(c => c.ativo === true);
                if (active) {
                    handleSelectCiclo(active.id_ciclo);
                } else {
                    handleSelectCiclo(res.data[0].id_ciclo);
                }
            }
        } catch (err) {
            console.error('Erro ao buscar ciclos:', err);
        }
    };

    const handleSelectCiclo = async (id) => {
        setSelectedCiclo(id);
        setLoading(true);
        try {
            await fetchCiclos(true); // Pula a auto-seleção para evitar loop
            const res = await axios.get(`${API_URL}/ciclos/${id}/metas`);
            setMetas(res.data);
        } catch (err) {
            console.error('Erro ao buscar metas:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (meta) => {
        setEditingMeta(meta);
        setFormData({
            qtd: meta.qtd_equipes_planejadas,
            custo: meta.custo_estimado
        });
    };

    const handleSave = async (id_meta) => {
        const metaOriginal = metas.find(m => m.id_meta === id_meta);
        const novoCusto = parseFloat(formData.custo);
        
        // Calcula qual seria o novo total planejado restante se salvarmos
        const custoDiferenca = novoCusto - parseFloat(metaOriginal.custo_estimado);
        const novoTotalPlanejado = totalPlannedRemaining + (isPast(metaOriginal.data) ? 0 : custoDiferenca);

        if (novoTotalPlanejado > currentCiclo.saldo_restante) {
            alert(`⚠️ Bloqueio de Segurança: Esta alteração faria o planejamento total (${formatCurrency(novoTotalPlanejado)}) exceder o saldo disponível (${formatCurrency(currentCiclo.saldo_restante)}). Ajuste os valores.`);
            return;
        }

        try {
            await axios.put(`${API_URL}/metas/${id_meta}`, {
                qtd_equipes_planejadas: parseInt(formData.qtd),
                custo_estimado: novoCusto
            });
            setEditingMeta(null);
            handleSelectCiclo(selectedCiclo);
        } catch (err) {
            alert('Erro ao salvar alteração');
        }
    };

    const handleDelete = async (id_meta) => {
        if (!confirm('Deseja excluir esta meta diária?')) return;
        try {
            await axios.delete(`${API_URL}/metas/${id_meta}`);
            handleSelectCiclo(selectedCiclo);
        } catch (err) {
            alert('Erro ao excluir meta');
        }
    };

    const formatDate = (dateValue) => {
        if (!dateValue) return '---';
        try {
            const dateStr = String(dateValue).split('T')[0]; 
            const [ano, mes, dia] = dateStr.split('-');
            return `${dia}/${mes}/${ano}`;
        } catch (e) { return '---'; }
    };

    const isPast = (dateValue) => {
        const today = new Date();
        today.setHours(0,0,0,0);
        const d = new Date(String(dateValue).split('T')[0] + 'T12:00:00');
        return d < today;
    };

    const currentCiclo = ciclos.find(c => c.id_ciclo === selectedCiclo);
    
    // Agora calculamos apenas o que ainda está por vir (metas futuras)
    const metasFuturas = metas.filter(m => !isPast(m.data));

    const totalPlannedRemaining = metasFuturas
        .reduce((acc, m) => acc + parseFloat(m.custo_estimado), 0);
        
    const totalTeamsRemaining = metasFuturas
        .reduce((acc, m) => acc + parseInt(m.qtd_equipes_planejadas), 0);

    const totalTeams = metas.reduce((acc, m) => acc + parseInt(m.qtd_equipes_planejadas), 0);

    const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

    return (
        <div className="container">
            <header style={{ marginBottom: '2rem' }}>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#1e3a5f' }}>
                    <Target size={28} /> Planejamento de Metas de Alocação
                </h2>
                <p style={{ color: '#64748b' }}>Gestão de metas diárias calculadas dinamicamente com base no saldo disponível.</p>
            </header>

            {/* Sumário do Ciclo - Premium Cards */}
            {currentCiclo && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1.5rem', marginBottom: '2.5rem' }}>
                    <div className="card" style={{ 
                        padding: '1.5rem', 
                        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', 
                        color: 'white',
                        border: 'none',
                        boxShadow: '0 10px 15px -3px rgba(37, 99, 235, 0.2)'
                    }}>
                        <div style={{ opacity: 0.8, fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Teto do Ciclo</div>
                        <div style={{ fontSize: '1.75rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <DollarSign size={24} /> {formatCurrency(currentCiclo.valor_total_previsto)}
                        </div>
                    </div>

                    <div className="card" style={{ 
                        padding: '1.5rem', 
                        background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', 
                        color: 'white',
                        border: 'none',
                        boxShadow: '0 10px 15px -3px rgba(234, 88, 12, 0.2)'
                    }}>
                        <div style={{ opacity: 0.8, fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Contingência</div>
                        <div style={{ fontSize: '1.75rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <AlertCircle size={24} /> {formatCurrency(currentCiclo.valor_contingencia)}
                        </div>
                    </div>

                    <div className="card" style={{ 
                        padding: '1.5rem', 
                        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', 
                        color: 'white',
                        border: 'none',
                        boxShadow: '0 10px 15px -3px rgba(220, 38, 38, 0.2)'
                    }}>
                        <div style={{ opacity: 0.8, fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Executado (Real)</div>
                        <div style={{ fontSize: '1.75rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <TrendingUp size={24} /> {formatCurrency(currentCiclo.custo_executado)}
                        </div>
                    </div>

                    <div className="card" style={{ 
                        padding: '1.5rem', 
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
                        color: 'white',
                        border: 'none',
                        boxShadow: '0 10px 15px -3px rgba(5, 150, 105, 0.2)'
                    }}>
                        <div style={{ opacity: 0.8, fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Saldo (Teto - Cont. - Exec.)</div>
                        <div style={{ fontSize: '1.75rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Check size={24} /> {formatCurrency(currentCiclo.saldo_restante)}
                        </div>
                    </div>

                    <div className="card" style={{ 
                        padding: '1.5rem', 
                        background: 'white', 
                        color: '#1e293b',
                        border: totalPlannedRemaining > currentCiclo.saldo_restante ? '2px solid #ef4444' : '1px solid #e2e8f0',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                        position: 'relative'
                    }}>
                        <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Planejado (Futuro)</div>
                        <div style={{ fontSize: '1.75rem', fontWeight: '800', color: totalPlannedRemaining > currentCiclo.saldo_restante ? '#ef4444' : '#1e293b' }}>
                            {formatCurrency(totalPlannedRemaining)}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '0.85rem', marginTop: '0.5rem', fontWeight: '500' }}>
                            <Users size={16} /> {totalTeamsRemaining} equipes planejadas
                        </div>
                        {totalPlannedRemaining > currentCiclo.saldo_restante && (
                            <div style={{ position: 'absolute', top: '-10px', right: '10px', background: '#ef4444', color: 'white', padding: '2px 8px', borderRadius: '10px', fontSize: '0.6rem', fontWeight: 'bold' }}>ESTOURADO</div>
                        )}
                    </div>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '2rem' }}>
                {/* Lateral: Seleção de Ciclo */}
                <aside>
                    <div className="card" style={{ padding: '1rem' }}>
                        <h4 style={{ marginBottom: '1rem', fontSize: '0.9rem', color: '#94a3b8', textTransform: 'uppercase' }}>Ciclos Operacionais</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {ciclos.map(c => (
                                <button 
                                    key={c.id_ciclo}
                                    onClick={() => handleSelectCiclo(c.id_ciclo)}
                                    style={{
                                        padding: '12px',
                                        borderRadius: '8px',
                                        border: selectedCiclo === c.id_ciclo ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                                        background: selectedCiclo === c.id_ciclo ? '#eff6ff' : 'white',
                                        textAlign: 'left',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div style={{ fontWeight: '700', color: selectedCiclo === c.id_ciclo ? '#2563eb' : '#334155' }}>
                                            {c.period_name || formatDate(c.data_inicio)}
                                        </div>
                                        {c.ativo && (
                                            <span style={{ 
                                                background: '#dcfce7', 
                                                color: '#166534', 
                                                fontSize: '0.65rem', 
                                                padding: '2px 6px', 
                                                borderRadius: '10px',
                                                fontWeight: 'bold'
                                            }}>ATIVO</span>
                                        )}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                                        {formatDate(c.data_inicio)} - {formatDate(c.data_fim)}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {selectedCiclo && (
                        <div className="card" style={{ marginTop: '1.5rem', background: '#1e3a5f', color: 'white' }}>
                            <div style={{ padding: '1.5rem' }}>
                                <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.8rem', opacity: 0.8 }}>RESUMO DO PLANEJAMENTO</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div>
                                        <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>CUSTO RESTANTE</div>
                                        <div style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>R$ {totalPlannedRemaining.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>TOTAL DE EQUIPES</div>
                                        <div style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>{totalTeams}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </aside>

                {/* Principal: Tabela de Metas */}
                <main>
                    {loading ? (
                        <div className="card" style={{ textAlign: 'center', padding: '4rem' }}>Carregando metas...</div>
                    ) : selectedCiclo ? (
                        <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
                            <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#334155' }}>Detalhamento Diário</h3>
                                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                    {metas.length} dias planejados
                                </div>
                            </div>
                            
                            <div className="table-premium-wrapper" style={{ maxHeight: '600px' }}>
                                <table className="admin-table">
                                    <thead>
                                        <tr>
                                            <th style={{ width: '180px', padding: '1rem 1.5rem' }}>Data</th>
                                            <th style={{ width: '180px', padding: '1rem 1.5rem' }}>Cenário</th>
                                            <th style={{ width: '120px', padding: '1rem 1.5rem', textAlign: 'center' }}>Equipes</th>
                                            <th style={{ padding: '1rem 1.5rem' }}>Custo Estimado</th>
                                            <th style={{ width: '140px', padding: '1rem 1.5rem', textAlign: 'center' }}>Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {metas.map(m => (
                                            <tr key={m.id_meta} style={{ 
                                                backgroundColor: isPast(m.data) ? '#f8fafc' : 'white',
                                                borderBottom: '1px solid #f1f5f9',
                                                transition: 'background 0.2s'
                                            }}>
                                                <td style={{ padding: '1rem 1.5rem', fontWeight: isPast(m.data) ? 400 : 700, color: isPast(m.data) ? '#94a3b8' : '#1e293b' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        {formatDate(m.data)}
                                                        {isPast(m.data) && <span style={{ fontSize: '0.65rem', background: '#f1f5f9', color: '#64748b', padding: '2px 6px', borderRadius: '4px' }}>PASSADO</span>}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '1rem 1.5rem' }}>
                                                    <span style={{ 
                                                        padding: '4px 10px', 
                                                        borderRadius: '20px', 
                                                        fontSize: '0.7rem',
                                                        fontWeight: 'bold',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        background: m.cenario === 'B' ? '#fee2e2' : '#e0e7ff',
                                                        color: m.cenario === 'B' ? '#ef4444' : '#4f46e5',
                                                        border: `1px solid ${m.cenario === 'B' ? '#fecaca' : '#c7d2fe'}`,
                                                        whiteSpace: 'nowrap'
                                                    }}>
                                                        <AlertCircle size={10} /> {m.cenario === 'B' ? 'CRÍTICO' : 'ORDINÁRIO'}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>
                                                    {editingMeta?.id_meta === m.id_meta ? (
                                                        <input 
                                                            type="number" 
                                                            value={formData.qtd}
                                                            onChange={e => setFormData({ ...formData, qtd: e.target.value })}
                                                            style={{ width: '60px', padding: '4px' }}
                                                        />
                                                    ) : (
                                                        <span style={{ fontWeight: 'bold' }}>{m.qtd_equipes_planejadas}</span>
                                                    )}
                                                </td>
                                                <td style={{ padding: '1rem 1.5rem' }}>
                                                    {editingMeta?.id_meta === m.id_meta ? (
                                                        <input 
                                                            type="number" 
                                                            value={formData.custo}
                                                            onChange={e => setFormData({ ...formData, custo: e.target.value })}
                                                            style={{ width: '100px', padding: '4px' }}
                                                        />
                                                    ) : (
                                                        `R$ ${parseFloat(m.custo_estimado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                                                    )}
                                                </td>
                                                <td style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                                                        <button 
                                                            onClick={() => handleEdit(m)} 
                                                            style={{ color: '#3b82f6', background: '#eff6ff', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDelete(m.id_meta)} 
                                                            style={{ color: '#ef4444', background: '#fef2f2', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className="card" style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8' }}>
                            <AlertCircle size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                            <p>Selecione um ciclo operacional para gerenciar as metas.</p>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
