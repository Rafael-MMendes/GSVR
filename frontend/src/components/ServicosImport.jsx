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
            <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#0f172a' }}>Importação de Serviços Executados (GSVR)</h2>
          </div>
          <p style={{ color: '#64748b', margin: 0 }}>
            Importe a planilha de descrição de serviços do GSVR para o sistema.
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

        {result && (
          <div style={{ 
              textAlign: 'center', padding: '2rem', background: '#f0fdf4', borderRadius: '16px', 
              border: '1px solid #bbf7d0', marginBottom: '2rem'
          }}>
            <div style={{ 
                width: '64px', height: '64px', background: '#22c55e', color: 'white',
                borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 1.5rem'
            }}>
                <CheckCircle2 size={40} />
            </div>
            <h3 style={{ margin: '0 0 8px 0', color: '#166534' }}>Importação Concluída!</h3>
            <p style={{ color: '#15803d', marginBottom: '2rem' }}>{result.message}</p>
            
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', 
                gap: '1rem' 
            }}>
                <div style={{ background: 'white', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Importados</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#16a34a' }}>{result.stats.imported}</div>
                </div>
                <div style={{ background: 'white', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Duplicados/S.Dados</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#f59e0b' }}>{result.stats.skipped || 0}</div>
                </div>
                <div style={{ background: 'white', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Erros</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#dc2626' }}>{result.stats.errors}</div>
                </div>
            </div>

            {result.errorDetails && result.errorDetails.length > 0 && (
                <div style={{ marginTop: '1.5rem', textAlign: 'left' }}>
                    <h5 style={{ fontSize: '0.875rem', color: '#b91c1c', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AlertCircle size={14} /> Detalhamento:
                    </h5>
                    <div style={{ 
                        background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '8px', 
                        padding: '0.75rem', fontSize: '0.75rem', color: '#991b1b',
                        maxHeight: '200px', overflowY: 'auto'
                    }}>
                        {result.errorDetails.map((err, i) => (
                            <div key={i} style={{ marginBottom: '4px', paddingBottom: '4px', borderBottom: i < result.errorDetails.length - 1 ? '1px solid #fecaca' : 'none' }}>
                                <strong>{err.militar}:</strong> {err.error}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <button 
                className="btn btn-primary" 
                style={{ marginTop: '2.5rem', paddingLeft: '2rem', paddingRight: '2rem' }}
                onClick={() => setResult(null)}
            >
                Nova Importação
            </button>
          </div>
        )}

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
