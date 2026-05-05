import React, { useMemo } from 'react';
import { Shield, Clock, Calendar, User, Printer, FileText, ChevronLeft } from 'lucide-react';

/**
 * EscalaPublicacaoOficial
 * Componente para exibição e impressão de escalas planejadas em formato institucional.
 * 
 * Props:
 * - patrols: Array de guarnições (do state.patrols)
 * - date: Data selecionada (YYYY-MM-DD)
 * - cycle: Objeto do ciclo selecionado (contém period_name, opm_sigla, etc.)
 * - onBack: Função para retornar ao editor
 */
export function EscalaPublicacaoOficial({ patrols, date, cycle, onBack }) {
  
  // Agrupa guarnições por turno para melhor organização visual
  const groupedPatrols = useMemo(() => {
    const groups = {};
    patrols.forEach(p => {
      const shift = p.timeSpan || 'Horário Não Definido';
      if (!groups[shift]) groups[shift] = [];
      groups[shift].push(p);
    });
    return groups;
  }, [patrols]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f1f5f9',
      padding: '2rem',
      fontFamily: "'Inter', sans-serif",
      color: '#1e293b'
    }}>
      <style>
        {`
          @media print {
            @page {
              size: A4;
              margin: 15mm;
            }
            body {
              background: white !important;
              padding: 0 !important;
              margin: 0 !important;
            }
            .no-print {
              display: none !important;
            }
            .print-container {
              box-shadow: none !important;
              border: none !important;
              padding: 0 !important;
              width: 100% !important;
              max-width: none !important;
              background: white !important;
            }
            .shift-block {
              break-inside: avoid;
            }
          }
          
          .official-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 1rem;
            font-size: 0.85rem;
          }
          .official-table th {
            background: #0f172a;
            color: white;
            text-align: left;
            padding: 8px 12px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            font-size: 0.7rem;
            border: 1px solid #0f172a;
          }
          .official-table td {
            padding: 10px 12px;
            border: 1px solid #e2e8f0;
            color: #334155;
          }
          .official-table tr:nth-child(even) {
            background: #f8fafc;
          }
        `}
      </style>

      {/* Toolbar - No Print */}
      <div className="no-print" style={{
        maxWidth: '1000px',
        margin: '0 auto 2rem auto',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <button
          onClick={onBack}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.6rem 1rem',
            borderRadius: '10px',
            border: '1px solid #cbd5e1',
            background: 'white',
            color: '#475569',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <ChevronLeft size={18} /> Voltar ao Editor
        </button>

        <button
          onClick={handlePrint}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            padding: '0.6rem 1.5rem',
            borderRadius: '10px',
            border: 'none',
            background: '#0f172a',
            color: 'white',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.2)',
            transition: 'all 0.2s'
          }}
        >
          <Printer size={18} /> Imprimir Escala Oficial
        </button>
      </div>

      {/* Main Publication Container */}
      <div className="print-container" style={{
        maxWidth: '900px',
        margin: '0 auto',
        background: 'white',
        borderRadius: '8px',
        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
        padding: '40px',
        border: '1px solid #e2e8f0',
        minHeight: '1100px', // Aprox A4 ratio
        display: 'flex',
        flexDirection: 'column'
      }}>
        
        {/* Header Institucional */}
        <div style={{
          textAlign: 'center',
          marginBottom: '2.5rem',
          borderBottom: '2px solid #0f172a',
          paddingBottom: '1.5rem',
          position: 'relative'
        }}>
          <div style={{
            width: '70px',
            height: '70px',
            margin: '0 auto 1rem auto',
            background: '#f1f5f9',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid #0f172a'
          }}>
            <Shield size={40} color="#0f172a" />
          </div>
          
          <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Escala de Serviço Voluntário Remunerado (SVR)
          </h2>
          <h3 style={{ margin: '0.25rem 0 0 0', fontSize: '1.1rem', fontWeight: 700, color: '#475569' }}>
            {cycle?.opm_sigla || 'POLÍCIA MILITAR DE ALAGOAS'} - {cycle?.period_name || '9º BATALHÃO'}
          </h3>
          
          <div style={{
            marginTop: '1.5rem',
            display: 'flex',
            justifyContent: 'center',
            gap: '2rem',
            fontSize: '0.9rem',
            fontWeight: 600,
            color: '#1e293b'
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar size={16} color="#0f172a" /> DATA: {formatDate(date)}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={16} color="#0f172a" /> REF: {cycle?.periodo_ciclo || 'Ciclo Operacional'}
            </span>
          </div>
        </div>

        {/* Body - Grouped by Shifts */}
        <div style={{ flex: 1 }}>
          {Object.entries(groupedPatrols).map(([shift, shiftPatrols], idx) => (
            <div key={shift} className="shift-block" style={{ marginBottom: '2.5rem' }}>
              <div style={{
                background: '#f1f5f9',
                padding: '6px 15px',
                borderLeft: '5px solid #0f172a',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                marginBottom: '0.5rem'
              }}>
                <Clock size={18} color="#0f172a" />
                <span style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a', textTransform: 'uppercase' }}>
                  TURNO: {shift}
                </span>
              </div>

              <table className="official-table">
                <thead>
                  <tr>
                    <th style={{ width: '25%' }}>Guarnição</th>
                    <th style={{ width: '15%' }}>Posto/Grad</th>
                    <th style={{ width: '35%' }}>Nome de Guerra</th>
                    <th style={{ width: '25%' }}>Matrícula</th>
                  </tr>
                </thead>
                <tbody>
                  {shiftPatrols.map(patrol => (
                    <React.Fragment key={patrol.id}>
                      {patrol.members.map((member, mIdx) => (
                        <tr key={`${patrol.id}-${mIdx}`}>
                          {mIdx === 0 && (
                            <td rowSpan={patrol.members.length} style={{ 
                              fontWeight: 800, 
                              color: '#0f172a', 
                              verticalAlign: 'middle',
                              background: 'white',
                              fontSize: '0.9rem'
                            }}>
                              {patrol.name}
                              <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600, marginTop: '2px' }}>
                                DURAÇÃO: {patrol.duration}
                              </div>
                            </td>
                          )}
                          <td style={{ fontWeight: 600 }}>{member?.rank || '—'}</td>
                          <td style={{ fontWeight: 700, color: '#0f172a' }}>{member?.name || <span style={{ color: '#cbd5e1', fontWeight: 400 }}>VAGO</span>}</td>
                          <td style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>{member?.matricula || '—'}</td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

          {patrols.length === 0 && (
            <div style={{ textAlign: 'center', padding: '5rem', color: '#94a3b8' }}>
              Nenhuma guarnição planejada para esta data.
            </div>
          )}
        </div>

        {/* Footer Institucional / Assinaturas */}
        <div style={{
          marginTop: '3rem',
          borderTop: '1px solid #e2e8f0',
          paddingTop: '2rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '2rem' }}>
            <div style={{ textAlign: 'center', width: '250px' }}>
              <div style={{ borderBottom: '1px solid #334155', marginBottom: '8px' }}></div>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a' }}>COMANDANTE DA GUARNIÇÃO</div>
              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Responsável Operacional</div>
            </div>
            
            <div style={{ textAlign: 'center', width: '250px' }}>
              <div style={{ borderBottom: '1px solid #334155', marginBottom: '8px' }}></div>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a' }}>COMANDANTE DO 9º BPM</div>
              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Autoridade Homologadora</div>
            </div>
          </div>
          
          <div style={{
            marginTop: '4rem',
            textAlign: 'center',
            fontSize: '0.65rem',
            color: '#94a3b8',
            textTransform: 'uppercase',
            letterSpacing: '0.1em'
          }}>
            Documento gerado eletronicamente pelo Sistema GSVR em {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}
          </div>
        </div>
      </div>
    </div>
  );
}
