import React, { useMemo, useState, useRef } from 'react';
import { Shield, Clock, Calendar, User, Printer, FileText, ChevronLeft, Download } from 'lucide-react';
import { formatPhone } from '../utils/formatters';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Footer } from './Footer';

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
  const ROLES = ['Comandante', 'Motorista', 'Patrulheiro'];
  const [patrolColors, setPatrolColors] = useState({});
  const printRef = useRef(null);
  const [isExporting, setIsExporting] = useState(false);

  const getPatrolColor = (patrolId) => patrolColors[patrolId] || '#ffffff';
  const handleColorChange = (patrolId, color) => {
    setPatrolColors(prev => ({ ...prev, [patrolId]: color }));
  };

  // Agrupa guarnições por turno para melhor organização visual
  const groupedPatrols = useMemo(() => {
    const groups = {};
    patrols.forEach(p => {
      if (p.publicado === false) return;
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

  const handleExportPDF = async () => {
    if (!printRef.current) return;
    const elementoImpressao = printRef.current;
    let exibicoesOriginais = [];
    const espacadoresCriadosParaQuebra = [];

    // Guardar estilos originais de largura para restauração
    const larguraOriginal = elementoImpressao.style.width;
    const larguraMaximaOriginal = elementoImpressao.style.maxWidth;

    try {
      setIsExporting(true);

      // Forçar largura exata de 900px para garantir cálculos idênticos ao do html2canvas
      elementoImpressao.style.width = '900px';
      elementoImpressao.style.maxWidth = '900px';

      // Ocultar temporariamente elementos com classe 'no-print'
      const elementosSemImpressao = elementoImpressao.querySelectorAll('.no-print');
      exibicoesOriginais = Array.from(elementosSemImpressao).map(el => el.style.display);
      elementosSemImpressao.forEach(el => el.style.display = 'none');

      // Evitar quebras de tabelas no meio da página de forma dinâmica
      const ALTURA_PAGINA_A4 = 1270;
      const elementosParaEvitar = elementoImpressao.querySelectorAll('.bloco-guarnicao, .pdf-footer');

      // Função para calcular a distância do elemento até o topo do container de impressão
      const obterTopoRelativo = (elementoIndividual, conteiner) => {
        const retanguloIndividual = elementoIndividual.getBoundingClientRect();
        const retanguloConteiner = conteiner.getBoundingClientRect();
        return retanguloIndividual.top - retanguloConteiner.top;
      };

      elementosParaEvitar.forEach(elementoIndividual => {
        const topoCalculado = obterTopoRelativo(elementoIndividual, elementoImpressao);
        const alturaCalculada = elementoIndividual.offsetHeight;

        const paginaInicioCalculada = Math.floor(topoCalculado / ALTURA_PAGINA_A4);
        const paginaFimCalculada = Math.floor((topoCalculado + alturaCalculada) / ALTURA_PAGINA_A4);

        // Se o elemento começar em uma página e terminar na outra, adiciona o espaçador antes dele
        if (paginaInicioCalculada !== paginaFimCalculada) {
          // Adicionamos um recuo de 35px no topo da nova página para que o cabeçalho do turno desça um pouco
          const MARGEM_TOPO_NOVA_PAGINA = 35;
          const espacoRestanteCalculado = (paginaInicioCalculada + 1) * ALTURA_PAGINA_A4 - topoCalculado + MARGEM_TOPO_NOVA_PAGINA;
          
          const divEspacadora = document.createElement('div');
          divEspacadora.className = 'espacador-impressao-pdf';
          divEspacadora.style.height = `${espacoRestanteCalculado}px`;
          divEspacadora.style.width = '100%';
          divEspacadora.style.backgroundColor = 'transparent';
          divEspacadora.style.margin = '0';
          divEspacadora.style.padding = '0';
          divEspacadora.style.border = 'none';
          
          elementoIndividual.parentNode.insertBefore(divEspacadora, elementoIndividual);
          espacadoresCriadosParaQuebra.push(divEspacadora);
        }
      });

      const capturaDeTela = await html2canvas(elementoImpressao, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 900 // Force fixed width to match A4 rendering exactly
      });

      const dadosDaImagem = capturaDeTela.toDataURL('image/png');

      const documentoPdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const larguraDoPdf = documentoPdf.internal.pageSize.getWidth(); // 210
      const alturaDoPdf = (capturaDeTela.height * larguraDoPdf) / capturaDeTela.width;

      let posicao = 0;

      documentoPdf.addImage(dadosDaImagem, 'PNG', 0, posicao, larguraDoPdf, alturaDoPdf);

      let alturaRestante = alturaDoPdf - documentoPdf.internal.pageSize.getHeight();

      while (alturaRestante >= 0) {
        posicao = alturaRestante - alturaDoPdf;
        documentoPdf.addPage();
        documentoPdf.addImage(dadosDaImagem, 'PNG', 0, posicao, larguraDoPdf, alturaDoPdf);
        alturaRestante -= documentoPdf.internal.pageSize.getHeight();
      }

      const dataFormatadaParaNomeArquivo = formatDate(date).replace(/\//g, '-');
      documentoPdf.save(`Escala_do_dia_${dataFormatadaParaNomeArquivo}.pdf`);
    } catch (erro) {
      console.error('Erro ao gerar PDF:', erro);
      alert('Houve um erro ao gerar o PDF.');
    } finally {
      setIsExporting(false);

      // Restaurar largura original do container
      elementoImpressao.style.width = larguraOriginal;
      elementoImpressao.style.maxWidth = larguraMaximaOriginal;

      // Restaurar visibilidade dos elementos no-print
      const elementosSemImpressao = elementoImpressao.querySelectorAll('.no-print');
      elementosSemImpressao.forEach((el, index) => {
        if (exibicoesOriginais[index] !== undefined) {
          el.style.display = exibicoesOriginais[index];
        }
      });

      // Remover espaçadores temporários
      espacadoresCriadosParaQuebra.forEach(espacador => {
        if (espacador && espacador.parentNode) {
          espacador.parentNode.removeChild(espacador);
        }
      });
    }
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
            background: transparent;
          }
          .official-table td {
            background: transparent;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
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

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            onClick={handleExportPDF}
            disabled={isExporting}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              padding: '0.6rem 1.5rem',
              borderRadius: '10px',
              border: '1px solid #0f172a',
              background: 'white',
              color: '#0f172a',
              fontWeight: 700,
              cursor: isExporting ? 'wait' : 'pointer',
              boxShadow: '0 4px 12px rgba(15, 23, 42, 0.05)',
              transition: 'all 0.2s',
              opacity: isExporting ? 0.7 : 1
            }}
          >
            <Download size={18} /> {isExporting ? 'Gerando...' : 'Exportar PDF'}
          </button>
        </div>
      </div>

      {/* Main Publication Container */}
      <div ref={printRef} className="print-container" style={{
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
            height: '90px',
            margin: '0 auto 1rem auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <img 
              src="/pmal.png" 
              alt="Brasão PMAL" 
              style={{ 
                height: '90px',
                width: 'auto',
                maxWidth: '100%',
                objectFit: 'contain'
              }} 
            />
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
              <FileText size={16} color="#0f172a" /> CICLO: {cycle?.periodo_ciclo || 'Ciclo Operacional'}
            </span>
          </div>
        </div>

        {/* Body - Grouped by Shifts */}
        <div style={{ flex: 1 }}>
          {Object.entries(groupedPatrols).map(([shift, shiftPatrols], idx) => (
            <div key={shift} className="shift-block" style={{ marginBottom: '1rem' }}>
              {shiftPatrols.map(patrol => (
                <div key={patrol.id} className="bloco-guarnicao" style={{ marginBottom: '2.5rem', pageBreakInside: 'avoid', breakInside: 'avoid' }}>

                  {/* Cabeçalho do Turno acima da tabela */}
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
                    <span style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a', textTransform: 'uppercase', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <span>TURNO: {shift}</span>
                      <span style={{ fontWeight: 600, fontSize: '0.8rem', color: '#475569', textTransform: 'none', background: '#e2e8f0', padding: '2px 8px', borderRadius: '4px' }}>
                        {patrol.horario_embarque || 'local de embarque; 30 minutos de antecedência na sede do 9º BPM'}
                      </span>
                    </span>
                  </div>

                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                    <div style={{
                      background: '#e2e8f0',
                      padding: '8px 15px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderBottom: '1px solid #cbd5e1'
                    }}>
                      <div>
                        <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9rem' }}>{patrol.name}</span>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '10px', fontWeight: 600 }}>DURAÇÃO: {patrol.duration}</span>
                      </div>

                      <div className="no-print" style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        background: 'white',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1'
                      }}>
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b' }}>COR:</span>
                        <input
                          type="color"
                          value={getPatrolColor(patrol.id)}
                          onChange={(e) => handleColorChange(patrol.id, e.target.value)}
                          style={{
                            border: 'none',
                            width: '20px',
                            height: '20px',
                            cursor: 'pointer',
                            background: 'transparent',
                            padding: 0
                          }}
                        />
                      </div>
                    </div>

                    <table className="official-table" style={{ marginTop: 0 }}>
                      <thead>
                        <tr>
                          <th style={{ width: '20%', textAlign: 'center' }}>Função</th>
                          <th style={{ width: '15%', textAlign: 'center' }}>Posto/Grad</th>
                          <th style={{ width: '45%', textAlign: 'center' }}>Efetivo</th>
                          <th style={{ width: '20%', textAlign: 'center' }}>Telefone</th>
                        </tr>
                      </thead>
                      <tbody>
                        {patrol.members.map((member, mIdx) => (
                          <tr key={`${patrol.id}-${mIdx}`} style={{ backgroundColor: getPatrolColor(patrol.id) }}>
                            <td style={{ fontWeight: 700, background: getPatrolColor(patrol.id), color: '#475569', fontSize: '0.8rem', textTransform: 'uppercase', textAlign: 'center' }}>{ROLES[mIdx] || 'Patrulheiro'}</td>
                            <td style={{ fontWeight: 600, background: getPatrolColor(patrol.id), textAlign: 'center' }}>{member?.rank || '—'}</td>
                            <td style={{ fontWeight: 700, color: '#0f172a', background: getPatrolColor(patrol.id), textAlign: 'center' }}>
                              {member?.name || <span style={{ color: '#cbd5e1', fontWeight: 400 }}>VAGO</span>}
                              {member?.numero_ordem && (
                                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, marginTop: '2px' }}>
                                  Nº Ordem: {member.numero_ordem}
                                </div>
                              )}
                            </td>
                            <td style={{ fontFamily: 'monospace', fontSize: '0.9rem', background: getPatrolColor(patrol.id), textAlign: 'center' }}>{member ? formatPhone(member.phone || member.telefone) || '—' : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          ))}

          {patrols.length === 0 && (
            <div style={{ textAlign: 'center', padding: '5rem', color: '#94a3b8' }}>
              Nenhuma guarnição planejada para esta data.
            </div>
          )}
        </div>

        {/* Footer Institucional / Assinaturas */}
        <Footer isPdf={true} />
      </div>
    </div>
  );
}
