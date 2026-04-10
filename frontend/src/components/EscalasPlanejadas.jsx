import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Calendar, Search, Shield, Filter, Clock, FileText, ChevronDown } from 'lucide-react';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001') + '/api';

export function EscalasPlanejadas() {
  const [escalas, setEscalas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    const fetchEscalas = async () => {
      try {
        const { data } = await axios.get(`${API_URL}/reports/escalas-planejadas`);
        setEscalas(data);
      } catch (err) {
        console.error('Erro ao buscar escalas:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchEscalas();
  }, []);

  const filteredEscalas = escalas.filter(e => 
    (e.nome_guerra || '').toLowerCase().includes(filter.toLowerCase()) ||
    (e.nome_recurso || '').toLowerCase().includes(filter.toLowerCase()) ||
    (e.data_formatada || '').includes(filter) ||
    (e.matricula || '').includes(filter) ||
    (e.funcao || '').toLowerCase().includes(filter.toLowerCase())
  );

  const groupedEscalas = useMemo(() => {
    const datesMap = new Map();
    filteredEscalas.forEach(e => {
      const dateKey = `${e.data_servico}|${e.data_formatada}|${e.ciclo}`;
      if (!datesMap.has(dateKey)) {
        datesMap.set(dateKey, new Map());
      }
      
      const vtrMap = datesMap.get(dateKey);
      const vtrKey = e.nome_recurso || 'Indefinida';
      if (!vtrMap.has(vtrKey)) {
        vtrMap.set(vtrKey, {
          viatura: vtrKey,
          horario: e.horario_servico,
          membros: []
        });
      }
      vtrMap.get(vtrKey).membros.push(e);
    });

    const result = [];
    datesMap.forEach((vtrMap, dateKey) => {
      const [dataIso, dataForm, ciclo] = dateKey.split('|');
      result.push({
        dataIso,
        dataForm,
        ciclo,
        equipes: Array.from(vtrMap.values())
      });
    });
    return result;
  }, [filteredEscalas]);

  return (
    <div style={{ padding: '2rem', fontFamily: "'Inter', sans-serif", background: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.8rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Calendar size={28} color="#2563eb" /> Base de Escalas Planejadas
          </h1>
          <p style={{ margin: '0.5rem 0 0 0', color: '#64748b' }}>Relatório inteligente descritivo e analítico do escalonamento (VTRs e Guarnições)</p>
        </div>
        <div style={{ position: 'relative', width: '320px' }}>
          <Search size={18} color="#94a3b8" style={{ position: 'absolute', top: '12px', left: '12px' }} />
          <input 
            type="text" 
            placeholder="Buscar por militar, vtr, data..." 
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{ width: '100%', padding: '0.65rem 1rem 0.65rem 2.5rem', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', fontSize: '0.95rem' }}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Processando matriz operacional...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          {groupedEscalas.map(grupo => (
            <div key={grupo.dataIso} style={{ background: '#fff', padding: '1.5rem', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', borderBottom: '2px solid #f8fafc', paddingBottom: '1rem' }}>
                <Calendar size={28} color="#0D3878" />
                <div>
                  <h2 style={{ margin: 0, color: '#0f172a', fontSize: '1.4rem' }}>{grupo.dataForm}</h2>
                  <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>CICLO VIGENTE: {grupo.ciclo}</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
                {grupo.equipes.map(eq => (
                  <div key={eq.viatura} style={{ background: '#fff' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #cbd5e1', fontFamily: 'sans-serif' }}>
                      <thead>
                        <tr>
                          <th colSpan="4" style={{ 
                            border: '1px solid #cbd5e1', 
                            padding: '6px', 
                            textAlign: 'center', 
                            fontWeight: 'normal', 
                            fontSize: '0.9rem', 
                            background: '#f8fafc',
                            color: '#0f172a'
                          }}>
                            {eq.viatura}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {eq.membros.map(m => (
                          <tr key={m.id_escala}>
                            <td style={{ border: '1px solid #cbd5e1', padding: '6px 8px', fontSize: '0.85rem', color: '#0f172a', whiteSpace: 'nowrap' }}>
                              <span style={{ fontWeight: m.funcao === 'Comandante' ? 'bold' : 'normal' }}>
                                <strong>Nome:</strong> {m.posto_graduacao} {m.nome_guerra}
                              </span>
                            </td>
                            <td style={{ border: '1px solid #cbd5e1', padding: '6px 8px', fontSize: '0.85rem', color: '#0f172a' }}>
                              <span style={{ fontWeight: m.funcao === 'Comandante' ? 'bold' : 'normal' }}>
                                <strong>Mat.</strong>{m.matricula}
                              </span>
                            </td>
                            <td style={{ border: '1px solid #cbd5e1', padding: '6px 8px', fontSize: '0.85rem', color: '#0f172a' }}>
                              {m.funcao}
                            </td>
                            <td style={{ border: '1px solid #cbd5e1', padding: '6px 8px', fontSize: '0.85rem', color: '#0f172a' }}>
                              {m.carga_horaria ? `${m.carga_horaria}h` : ''}
                            </td>
                          </tr>
                        ))}
                        {eq.membros.length === 0 && (
                          <tr>
                            <td colSpan="4" style={{ border: '1px solid #cbd5e1', padding: '12px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                              Guarnição Vazia
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {groupedEscalas.length === 0 && (
            <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8', background: '#fff', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
              <Shield size={48} color="#e2e8f0" style={{ marginBottom: '1rem' }} />
              <div style={{ fontSize: '1.2rem', fontWeight: 600, color: '#64748b' }}>Nenhum registro encontrado</div>
              <div style={{ marginTop: '0.5rem' }}>Não há guarnições planejadas que correspondam à sua busca.</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
