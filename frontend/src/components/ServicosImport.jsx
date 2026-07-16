import { useState } from 'react';
import axios from 'axios';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, Info, ArrowRight, ClipboardCheck, ArrowLeft } from 'lucide-react';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001') + '/api';

export function ServicosImport({ onBack }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [result, setResult] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (!selectedFile.name.match(/\.(xlsx|xls)$/)) {
        setError("Por favor, selecione apenas arquivos Excel (.xlsx ou .xls)");
        return;
      }
      setFile(selectedFile);
      setError(null);
      setResult(null);
      setPreview(null);
    }
  };

  const handlePreview = async () => {
    if (!file) return;
    setPreviewing(true);
    setError(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await axios.post(`${API_URL}/servicos/import/preview`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setPreview(res.data);
    } catch (err) {
      setError(err.response?.data?.error || "Erro ao pré-visualizar colunas.");
    } finally {
      setPreviewing(false);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API_URL}/servicos/import`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResult(response.data);
      setFile(null);
      setPreview(null);
    } catch (err) {
      setError(err.response?.data?.error || "Erro ao processar a importação.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '800px', margin: '1rem auto' }}>
      <div className="glass-panel" style={{ padding: '1.5rem 1rem' }}>
        <header style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
            {onBack && (
              <button
                onClick={onBack}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '8px',
                  cursor: 'pointer',
                  color: '#64748b',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                  marginLeft: '-8px'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#1e293b'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#64748b'; }}
                title="Voltar"
              >
                <ArrowLeft size={20} />
              </button>
            )}
            <div style={{ padding: '10px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', color: '#10b981' }}>
              <ClipboardCheck size={24} />
            </div>
            <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#0f172a' }}>Importar Serviços Executados (SVR)</h2>
          </div>
          <p style={{ color: '#64748b', margin: 0 }}>
            Importe serviços dde SVR da planilha baixada do DASHBOARD PMAL.
          </p>
        </header>

        {!result && (
          <div style={{ marginBottom: '2.5rem' }}>
            <div
              style={{
                border: '2px dashed #e2e8f0',
                borderRadius: '16px',
                padding: '3rem 2rem',
                textAlign: 'center',
                background: file ? 'rgba(16, 185, 129, 0.02)' : '#f8fafc',
                cursor: 'pointer',
                transition: 'all 0.2s',
                position: 'relative'
              }}
              onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = '#10b981'; }}
              onDragLeave={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = '#e2e8f0'; }}
              onDrop={(e) => {
                e.preventDefault();
                const droppedFile = e.dataTransfer.files[0];
                if (droppedFile) handleFileChange({ target: { files: [droppedFile] } });
              }}
            >
              <input
                type="file"
                onChange={handleFileChange}
                accept=".xlsx, .xls"
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
              />

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  width: '64px', height: '64px', background: file ? '#10b981' : 'white',
                  borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)', color: file ? 'white' : 'var(--text-muted)',
                  transition: 'all 0.3s'
                }}>
                  {file ? <CheckCircle2 size={32} /> : <Upload size={32} />}
                </div>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', color: '#1e293b' }}>
                    {file ? file.name : 'Selecione ou arraste a planilha FT'}
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#94a3b8' }}>
                    Suporta formatos .XLSX e .XLS
                  </p>
                </div>
              </div>
            </div>

            <div style={{
              marginTop: '1.5rem', padding: '1rem', background: '#f1f5f9', borderRadius: '12px',
              display: 'flex', gap: '12px', color: '#475569', fontSize: '0.875rem', lineHeight: '1.5'
            }}>
              <Info size={20} style={{ flexShrink: 0, color: '#10b981' }} />
              <div>
                <strong>Obrigatoriedade de Vínculo:</strong> É necessário informar ou garantir que o Ciclo de Referência exista para as datas informadas na planilha. Se o Ciclo não for encontrado, a importação deste registro falhará.
              </div>
            </div>
          </div>
        )}

        {error && (
          <div style={{
            padding: '1rem', background: '#fff1f2', border: '1px solid #fda4af',
            borderRadius: '12px', marginBottom: '1.5rem', display: 'flex', gap: '12px', color: '#e11d48'
          }}>
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {result && (() => {
          const totalProcessed = (result.stats.imported || 0) + (result.stats.skipped || 0) + (result.stats.errors || 0) + (result.stats.inactive || 0) + (result.stats.not_registered || 0);
          const totalRejected = (result.stats.errors || 0) + (result.stats.inactive || 0) + (result.stats.not_registered || 0);

          return (
            <div style={{ padding: '1.5rem', background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '2rem' }}>
              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <div style={{
                  width: '64px', height: '64px', background: '#10b981', color: 'white',
                  borderRadius: '50%', display: 'flex', alignItems: 'center',
                  margin: '0 auto 1.5rem', justifyContent: 'center'
                }}>
                  <CheckCircle2 size={40} />
                </div>
                <h3 style={{ margin: '0 0 8px 0', color: '#166534', fontSize: '1.5rem' }}>Importação concluída com sucesso.</h3>
                
                {/* UX Message Banner */}
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '1rem', color: '#15803d', fontSize: '0.9rem', maxWidth: '600px', margin: '1rem auto', textAlign: 'left', lineHeight: '1.6' }}>
                  <strong>Resumo do Processamento:</strong>
                  <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.25rem' }}>
                    <li>Serviços processados: <strong>{totalProcessed}</strong></li>
                    <li>Serviços importados: <strong>{result.stats.imported || 0}</strong></li>
                    <li>Serviços ignorados (militares inativos): <strong>{result.stats.inactive || 0}</strong></li>
                    <li>Serviços ignorados (militares não cadastrados): <strong>{result.stats.not_registered || 0}</strong></li>
                    <li>Total de serviços não importados: <strong>{totalRejected}</strong></li>
                  </ul>
                  {totalRejected > 0 && (
                    <div style={{ marginTop: '0.75rem', fontWeight: 600, color: '#b91c1c' }}>
                      Consulte o relatório de inconsistências abaixo para visualizar os militares e serviços que não puderam ser importados.
                    </div>
                  )}
                </div>
              </div>

              {/* Stats Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '1rem',
                marginBottom: '2rem'
              }}>
                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px', fontWeight: 600 }}>Processados</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a' }}>{totalProcessed}</div>
                </div>
                <div style={{ background: '#f0fdf4', padding: '1rem', borderRadius: '12px', border: '1px solid #bbf7d0', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.65rem', color: '#15803d', textTransform: 'uppercase', marginBottom: '4px', fontWeight: 600 }}>Importados</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#16a34a' }}>{result.stats.imported}</div>
                </div>
                <div style={{ background: '#fffbeb', padding: '1rem', borderRadius: '12px', border: '1px solid #fde68a', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.65rem', color: '#b45309', textTransform: 'uppercase', marginBottom: '4px', fontWeight: 600 }}>Inativos</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#d97706' }}>{result.stats.inactive || 0}</div>
                </div>
                <div style={{ background: '#fff1f2', padding: '1rem', borderRadius: '12px', border: '1px solid #fecaca', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.65rem', color: '#991b1b', textTransform: 'uppercase', marginBottom: '4px', fontWeight: 600 }}>Não Cadastrados</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#dc2626' }}>{result.stats.not_registered || 0}</div>
                </div>
                <div style={{ background: '#f1f5f9', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.65rem', color: '#475569', textTransform: 'uppercase', marginBottom: '4px', fontWeight: 600 }}>Rejeitados</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#ef4444' }}>{totalRejected}</div>
                </div>
              </div>

              {/* Relatório de Inconsistências */}
              {result.errorDetails && result.errorDetails.length > 0 && (
                <div style={{ marginTop: '2rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem' }}>
                  <h4 style={{ fontSize: '1.1rem', color: '#0f172a', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
                    <AlertCircle size={20} style={{ color: '#ef4444' }} /> 
                    Relatório de Inconsistências
                  </h4>
                  <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '2px solid #cbd5e1' }}>
                          <th style={{ padding: '10px 12px', textAlign: 'left', color: '#475569', fontWeight: 600 }}>Militar</th>
                          <th style={{ padding: '10px 12px', textAlign: 'center', color: '#475569', fontWeight: 600 }}>Matrícula</th>
                          <th style={{ padding: '10px 12px', textAlign: 'center', color: '#475569', fontWeight: 600 }}>Unidade</th>
                          <th style={{ padding: '10px 12px', textAlign: 'center', color: '#475569', fontWeight: 600 }}>Data Serviço</th>
                          <th style={{ padding: '10px 12px', textAlign: 'left', color: '#475569', fontWeight: 600 }}>Motivo da Rejeição</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.errorDetails.map((err, i) => {
                          const isInactive = err.reason === 'inactive' || err.error?.includes('inativo');
                          const isNotReg = err.reason === 'not_registered' || err.error?.includes('não cadastrado');
                          
                          let badgeBg = '#f1f5f9';
                          let badgeColor = '#475569';
                          let reasonText = err.error || 'Erro desconhecido';

                          if (isInactive) {
                            badgeBg = '#fffbeb';
                            badgeColor = '#b45309';
                            reasonText = 'Militar inativo';
                          } else if (isNotReg) {
                            badgeBg = '#fff1f2';
                            badgeColor = '#e11d48';
                            reasonText = 'Militar não cadastrado no sistema';
                          }

                          return (
                            <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                              <td style={{ padding: '10px 12px', fontWeight: 500, color: '#1e293b' }}>{err.militar}</td>
                              <td style={{ padding: '10px 12px', textAlign: 'center', color: '#64748b' }}>{err.matricula || '---'}</td>
                              <td style={{ padding: '10px 12px', textAlign: 'center', color: '#64748b' }}>{err.opm || '---'}</td>
                              <td style={{ padding: '10px 12px', textAlign: 'center', color: '#64748b' }}>
                                {err.data ? new Date(err.data).toLocaleDateString('pt-BR') : '---'}
                              </td>
                              <td style={{ padding: '10px 12px' }}>
                                <span style={{
                                  padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem',
                                  fontWeight: '600', background: badgeBg, color: badgeColor
                                }}>
                                  {reasonText}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2.5rem' }}>
                <button
                  className="btn btn-primary"
                  style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
                  onClick={() => setResult(null)}
                >
                  Nova Importação
                </button>
              </div>
            </div>
          );
        })()}

        {!result && (
          <>
            {preview && (
              <div style={{ marginBottom: '1.5rem', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
                    📋 Colunas Detectadas — {preview.total_rows} registros
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Aba: {preview.sheet}</span>
                </div>
                <div style={{ overflowX: 'auto', maxHeight: '220px', overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9' }}>
                        <th style={{ padding: '6px 12px', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>#</th>
                        <th style={{ padding: '6px 12px', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>Coluna</th>
                        <th style={{ padding: '6px 12px', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>Mapeamento</th>
                        <th style={{ padding: '6px 12px', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>Exemplo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.colunas.map((col) => (
                        <tr key={col.index} style={{ borderTop: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '5px 12px', color: '#94a3b8' }}>{col.index}</td>
                          <td style={{ padding: '5px 12px', fontWeight: 500, color: '#1e293b' }}>{col.header}</td>
                          <td style={{ padding: '5px 12px' }}>
                            <code style={{ background: '#ecfdf5', color: '#059669', padding: '1px 6px', borderRadius: '4px', fontSize: '0.72rem' }}>{col.normalizado}</code>
                          </td>
                          <td style={{ padding: '5px 12px', color: '#64748b', fontStyle: 'italic' }}>{String(col.exemplo)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button
                className="btn btn-secondary"
                disabled={!file || previewing}
                onClick={handlePreview}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                {previewing ? <><Loader2 size={16} className="animate-spin" /> Analisando...</> : <>Analisar Planilha</>}
              </button>
              <button
                className="btn btn-primary"
                disabled={!file || loading}
                onClick={handleUpload}
                style={{ minWidth: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#10b981', border: 'none' }}
              >
                {loading ? (
                  <><Loader2 size={18} className="animate-spin" /> Importando...</>
                ) : (
                  <>Iniciar Importação <ArrowRight size={18} /></>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
