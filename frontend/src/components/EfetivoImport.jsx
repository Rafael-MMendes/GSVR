import { useState } from 'react';
import axios from 'axios';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, Info, ArrowRight } from 'lucide-react';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001') + '/api';

export function EfetivoImport({ onComplete }) {
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
      const res = await axios.post(`${API_URL}/efetivo/import/preview`, formData, {
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
      const response = await axios.post(`${API_URL}/efetivo/import`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResult(response.data);
      setFile(null);
      setPreview(null);
      if (onComplete) onComplete();
    } catch (err) {
      setError(err.response?.data?.error || "Erro ao processar a importação.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="glass-panel" style={{ padding: '1.5rem 1rem' }}>
        <header style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={{ padding: '10px', background: 'rgba(30, 58, 138, 0.1)', borderRadius: '12px', color: 'var(--primary)' }}>
              <FileSpreadsheet size={24} />
            </div>
            <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#0f172a' }}>Importação de Efetivo</h2>
          </div>
          <p style={{ color: '#64748b', margin: 0 }}>
            Integre a relação de militares ao sistema através de uma planilha Excel.
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
                background: file ? 'rgba(59, 130, 246, 0.02)' : '#f8fafc',
                cursor: 'pointer',
                transition: 'all 0.2s',
                position: 'relative'
              }}
              onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--primary)'; }}
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
                    width: '64px', height: '64px', background: file ? 'var(--primary)' : 'white', 
                    borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)', color: file ? 'white' : 'var(--text-muted)',
                    transition: 'all 0.3s'
                }}>
                  {file ? <CheckCircle2 size={32} /> : <Upload size={32} />}
                </div>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', color: '#1e293b' }}>
                    {file ? file.name : 'Selecione ou arraste a planilha'}
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
              <Info size={20} style={{ flexShrink: 0, color: 'var(--primary)' }} />
              <div>
                O sistema reconhecerá automaticamente colunas como <strong>Matrícula, CPF, Nome e Posto</strong>. 
                Os militares importados terão a senha inicial definida como o próprio CPF (apenas números).
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
              textAlign: 'center', padding: '2rem', background: '#f8fafc', borderRadius: '16px', 
              border: '1px solid #e2e8f0', marginBottom: '2rem', animation: 'fadeIn 0.5s ease-out'
          }}>
            <div style={{ 
                width: '64px', height: '64px', background: '#22c55e', color: 'white',
                borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 1.5rem', boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)'
            }}>
                <CheckCircle2 size={40} />
            </div>
            <h3 style={{ margin: '0 0 8px 0', color: '#0f172a' }}>Sincronização Concluída!</h3>
            <p style={{ color: '#475569', marginBottom: '2rem', fontSize: '0.95rem' }}>{result.message}</p>
            
            {/* Grid com todas as 6 métricas principais */}
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', 
                gap: '1rem',
                marginBottom: '2rem'
            }}>
                <div style={{ background: 'white', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>📋 Planilha</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#0f172a' }}>{result.stats.total_planilha || (result.stats.inserted + (result.stats.updated || 0) + (result.stats.unchanged || 0))}</div>
                </div>
                <div style={{ background: 'white', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '0.68rem', color: '#0284c7', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>🔄 Atualizados</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#0284c7' }}>{result.stats.updated || 0}</div>
                </div>
                <div style={{ background: 'white', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '0.68rem', color: '#16a34a', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>➕ Novos</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#16a34a' }}>{result.stats.inserted || 0}</div>
                </div>
                <div style={{ background: 'white', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>⏸️ Inalterados</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#64748b' }}>{result.stats.unchanged || 0}</div>
                </div>
                <div style={{ background: 'white', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '0.68rem', color: '#d97706', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>⚠️ Inativados</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#d97706' }}>{result.stats.deactivated || 0}</div>
                </div>
                <div style={{ background: 'white', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '0.68rem', color: '#dc2626', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>❌ Erros</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#dc2626' }}>{result.stats.errors || 0}</div>
                </div>
            </div>

            {/* Detalhes de Militares Atualizados */}
            {result.details?.updated && result.details.updated.length > 0 && (
                <div style={{ marginTop: '1.5rem', textAlign: 'left', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                    <div style={{ padding: '0.75rem 1rem', background: '#f0f9ff', borderBottom: '1px solid #e2e8f0', fontWeight: 600, fontSize: '0.85rem', color: '#0369a1' }}>
                        🔄 Divergências Atualizadas ({result.details.updated.length}):
                    </div>
                    <div style={{ maxHeight: '200px', overflowY: 'auto', padding: '0.5rem 1rem', fontSize: '0.78rem' }}>
                        {result.details.updated.map((item, i) => (
                            <div key={i} style={{ padding: '6px 0', borderBottom: i < result.details.updated.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                                <div style={{ fontWeight: 600, color: '#1e293b' }}>
                                    {item.militar} <span style={{ color: '#94a3b8', fontWeight: 400 }}>| CPF: {item.cpf}</span>
                                </div>
                                <div style={{ color: '#475569', fontSize: '0.72rem', marginTop: '2px' }}>
                                    {item.changes.map((ch, idx) => (
                                        <span key={idx} style={{ display: 'inline-block', background: '#e0f2fe', color: '#0284c7', padding: '2px 6px', borderRadius: '4px', marginRight: '6px', marginTop: '2px' }}>
                                            {ch}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Detalhes de Militares Inativados */}
            {result.details?.deactivated && result.details.deactivated.length > 0 && (
                <div style={{ marginTop: '1.5rem', textAlign: 'left', background: 'white', borderRadius: '12px', border: '1px solid #fef3c7', overflow: 'hidden' }}>
                    <div style={{ padding: '0.75rem 1rem', background: '#fffbeb', borderBottom: '1px solid #fef3c7', fontWeight: 600, fontSize: '0.85rem', color: '#b45309' }}>
                        ⚠️ Militares Inativados (ausentes na planilha importada):
                    </div>
                    <div style={{ maxHeight: '160px', overflowY: 'auto', padding: '0.5rem 1rem', fontSize: '0.78rem' }}>
                        {result.details.deactivated.map((item, i) => (
                            <div key={i} style={{ padding: '5px 0', borderBottom: i < result.details.deactivated.length - 1 ? '1px solid #fef3c7' : 'none', display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontWeight: 600, color: '#92400e' }}>{item.militar}</span>
                                <span style={{ color: '#b45309' }}>Matrícula: {item.matricula} | CPF: {item.cpf}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Detalhamento de Erros */}
            {result.details?.errors && result.details.errors.length > 0 && (
                <div style={{ marginTop: '1.5rem', textAlign: 'left', background: 'white', borderRadius: '12px', border: '1px solid #fee2e2', overflow: 'hidden' }}>
                    <div style={{ padding: '0.75rem 1rem', background: '#fef2f2', borderBottom: '1px solid #fee2e2', fontWeight: 600, fontSize: '0.85rem', color: '#b91c1c' }}>
                        ❌ Registros Rejeitados por Erro:
                    </div>
                    <div style={{ maxHeight: '150px', overflowY: 'auto', padding: '0.5rem 1rem', fontSize: '0.75rem', color: '#991b1b' }}>
                        {result.details.errors.map((err, i) => (
                            <div key={i} style={{ padding: '4px 0', borderBottom: i < result.details.errors.length - 1 ? '1px solid #fecaca' : 'none' }}>
                                <strong>Linha {err.linha || '?'}: {err.militar}</strong> — {err.error}
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
                Nova Sincronização
            </button>
          </div>
        )}

        {!result && (
            <>
              {/* Tabela de preview das colunas detectadas */}
              {preview && (
                <div style={{ marginBottom: '1.5rem', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                  <div style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
                      📋 Colunas Detectadas — {preview.total_rows} registros na planilha
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Aba: {preview.sheet}</span>
                  </div>
                  <div style={{ overflowX: 'auto', maxHeight: '220px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                      <thead>
                        <tr style={{ background: '#f1f5f9' }}>
                          <th style={{ padding: '6px 12px', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>#</th>
                          <th style={{ padding: '6px 12px', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>Coluna (planilha)</th>
                          <th style={{ padding: '6px 12px', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>Chave detectada</th>
                          <th style={{ padding: '6px 12px', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>Exemplo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.colunas.map((col) => (
                          <tr key={col.index} style={{ borderTop: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '5px 12px', color: '#94a3b8' }}>{col.index}</td>
                            <td style={{ padding: '5px 12px', fontWeight: 500, color: '#1e293b' }}>{col.header}</td>
                            <td style={{ padding: '5px 12px' }}>
                              <code style={{ background: '#e0f2fe', color: '#0369a1', padding: '1px 6px', borderRadius: '4px', fontSize: '0.72rem' }}>{col.normalizado}</code>
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
                    {previewing ? <><Loader2 size={16} className="animate-spin" /> Analisando...</> : <>Ver Colunas</>}
                </button>
                <button
                    className="btn btn-primary"
                    disabled={!file || loading}
                    onClick={handleUpload}
                    style={{ minWidth: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                    {loading ? (
                        <><Loader2 size={18} className="animate-spin" /> Processando...</>
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
