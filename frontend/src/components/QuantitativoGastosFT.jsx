import { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import {
  FileSpreadsheet, Calendar, DollarSign, Users, Shield, Save,
  RefreshCw, Printer, CheckCircle2, AlertCircle, Info,
  TrendingUp, TrendingDown, ArrowRight, Paintbrush,
  Eraser, Palette, Check, Trash2, X
} from 'lucide-react';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001') + '/api';

const DIAS_SEMANA_ABREV = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const PRESET_COLORS = [
  { name: 'Amarelo', hex: '#fef08a', border: '#fde047' },
  { name: 'Verde', hex: '#bbf7d0', border: '#86efac' },
  { name: 'Azul', hex: '#bfdbfe', border: '#93c5fd' },
  { name: 'Laranja', hex: '#fed7aa', border: '#fdba74' },
  { name: 'Coral/Vermelho', hex: '#fecaca', border: '#fca5a5' },
  { name: 'Roxo/Lavanda', hex: '#e9d5ff', border: '#d8b4fe' },
  { name: 'Cinza', hex: '#e2e8f0', border: '#cbd5e1' }
];

const formatBRL = (val) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
};

export function QuantitativoGastosFT() {
  const [ciclos, setCiclos] = useState([]);
  const [selectedCicloId, setSelectedCicloId] = useState('');
  const [cicloData, setCicloData] = useState(null);

  // Estrutura da matriz
  const [columns, setColumns] = useState([]);
  const [shifts, setShifts] = useState([
    { id: "s1", horario: "14h às 20h", duracao: "6h", valor_diaria: 192.03, row: 14 },
    { id: "s2", horario: "18h às 00h", duracao: "6h", valor_diaria: 192.03, row: 15 },
    { id: "s3", horario: "20h às 02h", duracao: "6h", valor_diaria: 192.03, row: 16 },
    { id: "s4", horario: "14h às 22h", duracao: "8h", valor_diaria: 250.00, row: 17 },
    { id: "s5", horario: "18h às 02h", duracao: "8h", valor_diaria: 250.00, row: 18 }
  ]);
  const [matrix, setMatrix] = useState({});

  // Parâmetros financeiros e categorias editáveis
  const [valorTotalFt, setValorTotalFt] = useState(85000.00);
  const [pmFora6h, setPmFora6h] = useState(0);
  const [pmFora8h, setPmFora8h] = useState(0);
  const [label6h, setLabel6h] = useState('VALOR FT 6H');
  const [label8h, setLabel8h] = useState('VALOR FT 8H');
  const [valorDiaria6h, setValorDiaria6h] = useState(192.03);
  const [valorDiaria8h, setValorDiaria8h] = useState(250.00);

  // Cores personalizadas (Células, Linhas e Colunas)
  const [customColors, setCustomColors] = useState({
    cells: {}, // { [shiftId]: { [dataIso]: '#fef08a' } }
    rows: {},  // { [shiftId]: '#fef08a' }
    cols: {}   // { [dataIso]: '#fef08a' }
  });
  const [activeColor, setActiveColor] = useState('#fef08a'); // Cor selecionada na paleta
  const [isPaintMode, setIsPaintMode] = useState(false); // Modo Marca-texto (Pincel) ativo
  const [contextMenu, setContextMenu] = useState(null); // { x, y, type: 'cell'|'row'|'col', shiftId, dataIso }

  // Fecha menu de contexto ao clicar em qualquer lugar
  useEffect(() => {
    const handleCloseMenu = () => setContextMenu(null);
    window.addEventListener('click', handleCloseMenu);
    return () => window.removeEventListener('click', handleCloseMenu);
  }, []);

  // Estados de feedback
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error' | 'info', msg: '' }

  const printRef = useRef(null);

  // 1. Carrega os ciclos na inicialização
  useEffect(() => {
    fetchCiclos();
  }, []);

  const fetchCiclos = async () => {
    try {
      const res = await axios.get(`${API_URL}/ciclos`);
      setCiclos(res.data);
      if (res.data.length > 0) {
        const ativo = res.data.find(c => c.ativo === true) || res.data[0];
        setSelectedCicloId(ativo.id_ciclo);
      }
    } catch (err) {
      console.error('Erro ao carregar ciclos:', err);
      showFeedback('error', 'Falha ao carregar lista de ciclos.');
    }
  };

  // 2. Carrega a matriz do ciclo selecionado
  useEffect(() => {
    if (selectedCicloId) {
      loadCicloMatriz(selectedCicloId);
    }
  }, [selectedCicloId]);

  const loadCicloMatriz = async (idCiclo) => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/ciclos/${idCiclo}/gastos-matriz`);
      setCicloData(res.data.ciclo);

      const dm = res.data.dados_matriz || {};
      if (dm.columns && dm.columns.length > 0) setColumns(dm.columns);
      if (dm.shifts && dm.shifts.length > 0) setShifts(dm.shifts);
      if (dm.matrix) setMatrix(dm.matrix);

      setValorTotalFt(parseFloat(res.data.valor_total_ft || dm.valor_total_ft || 85000));
      setPmFora6h(parseInt(res.data.pm_fora_6h || dm.pm_fora_6h || 0, 10));
      setPmFora8h(parseInt(res.data.pm_fora_8h || dm.pm_fora_8h || 0, 10));
      setLabel6h(dm.label_6h || 'VALOR FT 6H');
      setLabel8h(dm.label_8h || 'VALOR FT 8H');
      setValorDiaria6h(parseFloat(dm.valor_diaria_6h !== undefined ? dm.valor_diaria_6h : 192.03));
      setValorDiaria8h(parseFloat(dm.valor_diaria_8h !== undefined ? dm.valor_diaria_8h : 250.00));

      if (dm.custom_colors) {
        setCustomColors({
          cells: dm.custom_colors.cells || {},
          rows: dm.custom_colors.rows || {},
          cols: dm.custom_colors.cols || {}
        });
      } else {
        setCustomColors({ cells: {}, rows: {}, cols: {} });
      }

    } catch (err) {
      console.error('Erro ao carregar matriz de gastos:', err);
      showFeedback('error', 'Falha ao carregar matriz de gastos do ciclo.');
    } finally {
      setLoading(false);
    }
  };

  // Funções de Gestão de Cores (Célula, Linha, Coluna)
  const applyColorCell = (shiftId, dataIso, color) => {
    setCustomColors(prev => {
      const nextCells = { ...prev.cells };
      const shiftCells = { ...(nextCells[shiftId] || {}) };
      if (!color || color === 'clear') {
        delete shiftCells[dataIso];
      } else {
        shiftCells[dataIso] = color;
      }
      nextCells[shiftId] = shiftCells;
      return { ...prev, cells: nextCells };
    });
  };

  const applyColorRow = (shiftId, color) => {
    setCustomColors(prev => {
      const nextRows = { ...prev.rows };
      if (!color || color === 'clear') {
        delete nextRows[shiftId];
      } else {
        nextRows[shiftId] = color;
      }
      return { ...prev, rows: nextRows };
    });
  };

  const applyColorCol = (dataIso, color) => {
    setCustomColors(prev => {
      const nextCols = { ...prev.cols };
      if (!color || color === 'clear') {
        delete nextCols[dataIso];
      } else {
        nextCols[dataIso] = color;
      }
      return { ...prev, cols: nextCols };
    });
  };

  const handleClearAllColors = () => {
    if (confirm('Deseja limpar todas as cores e destaques personalizados da tabela?')) {
      setCustomColors({ cells: {}, rows: {}, cols: {} });
      showFeedback('info', 'Todas as cores personalizadas foram removidas.');
    }
  };

  const handleContextMenu = (e, type, shiftId, dataIso) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      type,
      shiftId,
      dataIso
    });
  };

  const getCellBg = (shiftId, dataIso, isText, fds) => {
    if (customColors.cells?.[shiftId]?.[dataIso]) {
      return customColors.cells[shiftId][dataIso];
    }
    if (customColors.rows?.[shiftId]) {
      return customColors.rows[shiftId];
    }
    if (customColors.cols?.[dataIso]) {
      return customColors.cols[dataIso];
    }
    if (isText) return '#fef3c7';
    if (fds) return '#fffbeb';
    return '#ffffff';
  };

  const showFeedback = (type, msg) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 4000);
  };

  // 3. Atualização de Célula
  const handleCellChange = (shiftId, dataIso, val) => {
    setMatrix(prev => {
      const shiftObj = { ...(prev[shiftId] || {}) };
      // Se for vazio
      if (val === '' || val === null || val === undefined) {
        shiftObj[dataIso] = 0;
      } else if (!isNaN(val) && val.trim() !== '') {
        shiftObj[dataIso] = parseFloat(val);
      } else {
        // Aceita anotação texto (ex: "ELEIÇÃO" ou letras)
        shiftObj[dataIso] = val.toUpperCase();
      }
      return { ...prev, [shiftId]: shiftObj };
    });
  };

  // 4. Cálculos Matemáticos e Financeiros (fiel à planilha)
  const calc = useMemo(() => {
    // Totais horizontais por turno
    const shiftTotals = {};
    shifts.forEach(s => {
      let sum = 0;
      columns.forEach(col => {
        const val = matrix[s.id]?.[col.data_iso];
        if (typeof val === 'number') sum += val;
      });
      shiftTotals[s.id] = sum;
    });

    // 6h: s1 (14-20h), s2 (18-00h), s3 (20-02h)
    const totalGu6h = (shiftTotals['s1'] || 0) + (shiftTotals['s2'] || 0) + (shiftTotals['s3'] || 0);
    const qPm6h = totalGu6h * 3;
    const valorFt6h = qPm6h * valorDiaria6h;
    const vPmFora6h = (pmFora6h || 0) * valorDiaria6h;

    // 8h: s4 (14-22h), s5 (18-02h)
    const totalGu8h = (shiftTotals['s4'] || 0) + (shiftTotals['s5'] || 0);
    const qPm8h = totalGu8h * 3;
    const valorFt8h = qPm8h * valorDiaria8h;
    const vPmFora8h = (pmFora8h || 0) * valorDiaria8h;

    // Totais Consolidados (Linha 22 e 23)
    const totalSvr = (valorFt6h + valorFt8h) - (vPmFora6h + vPmFora8h);
    const saldoRestante = valorTotalFt - totalSvr;
    const qFtPm9Bpm = (qPm6h + qPm8h) - ((pmFora6h || 0) + (pmFora8h || 0));
    const totalGuGeral = totalGu6h + totalGu8h;
    const execucaoPct = valorTotalFt > 0 ? (totalSvr / valorTotalFt) * 100 : 0;

    // Totais verticais diários (Coluna D a AH)
    const dailyTotals = {};
    columns.forEach(col => {
      let colSum = 0;
      shifts.forEach(s => {
        const val = matrix[s.id]?.[col.data_iso];
        if (typeof val === 'number') colSum += val;
      });
      dailyTotals[col.data_iso] = colSum;
    });

    return {
      shiftTotals,
      totalGu6h,
      qPm6h,
      valorFt6h,
      vPmFora6h,
      totalGu8h,
      qPm8h,
      valorFt8h,
      vPmFora8h,
      totalSvr,
      saldoRestante,
      qFtPm9Bpm,
      totalGuGeral,
      execucaoPct,
      dailyTotals
    };
  }, [matrix, shifts, columns, valorTotalFt, pmFora6h, pmFora8h, valorDiaria6h, valorDiaria8h]);

  // Agrupamento dos meses nas colunas do cabeçalho
  const monthHeaders = useMemo(() => {
    if (!columns || columns.length === 0) return [];
    const groups = [];
    let currentMonth = null;
    let count = 0;

    columns.forEach((col, idx) => {
      if (col.mes !== currentMonth) {
        if (currentMonth !== null) {
          groups.push({ mes: currentMonth, span: count });
        }
        currentMonth = col.mes;
        count = 1;
      } else {
        count++;
      }
      if (idx === columns.length - 1) {
        groups.push({ mes: currentMonth, span: count });
      }
    });
    return groups;
  }, [columns]);

  // 5. Ação: Salvar Matriz no Banco
  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.post(`${API_URL}/ciclos/${selectedCicloId}/gastos-matriz`, {
        dados_matriz: {
          columns,
          shifts: shifts.map(s => ({
            ...s,
            valor_diaria: s.duracao === '8h' ? valorDiaria8h : valorDiaria6h
          })),
          matrix,
          valor_total_ft: valorTotalFt,
          pm_fora_6h: pmFora6h,
          pm_fora_8h: pmFora8h,
          label_6h: label6h,
          label_8h: label8h,
          valor_diaria_6h: valorDiaria6h,
          valor_diaria_8h: valorDiaria8h,
          custom_colors: customColors
        },
        valor_total_ft: valorTotalFt,
        pm_fora_6h: pmFora6h,
        pm_fora_8h: pmFora8h
      });
      showFeedback('success', 'Planilha de quantitativo, gastos e cores salva com sucesso!');
    } catch (err) {
      console.error('Erro ao salvar matriz:', err);
      showFeedback('error', 'Falha ao salvar planejamento de gastos.');
    } finally {
      setSaving(false);
    }
  };

  // 6. Ação: Sincronizar com Escala Real do Sistema
  const handleSyncEscala = async () => {
    if (!confirm('Deseja atualizar as células com as guarnições reais já planejadas no sistema para este ciclo?')) return;
    setSyncing(true);
    try {
      const res = await axios.get(`${API_URL}/ciclos/${selectedCicloId}/gastos-matriz/sync-escala`);
      if (res.data.success && Array.isArray(res.data.rows)) {
        const newMatrix = { ...matrix };
        // Zera números anteriores mantendo estrutura
        shifts.forEach(s => {
          newMatrix[s.id] = { ...(newMatrix[s.id] || {}) };
        });

        // Mapeia cada turno da escala para o turno correspondente na matriz
        res.data.rows.forEach(r => {
          const dataIso = r.data_iso;
          const horario = (r.horario_servico || '').toLowerCase().replace(/\s/g, '');
          const count = parseInt(r.qtd_gu, 10) || 0;

          let targetShiftId = null;
          if (horario.includes('14:00') && horario.includes('20:00')) targetShiftId = 's1';
          else if (horario.includes('18:00') && (horario.includes('00:00') || horario.includes('24:00'))) targetShiftId = 's2';
          else if (horario.includes('20:00') && horario.includes('02:00')) targetShiftId = 's3';
          else if (horario.includes('14:00') && horario.includes('22:00')) targetShiftId = 's4';
          else if (horario.includes('18:00') && horario.includes('02:00')) targetShiftId = 's5';

          if (targetShiftId && newMatrix[targetShiftId]) {
            newMatrix[targetShiftId][dataIso] = count;
          }
        });

        setMatrix(newMatrix);
        showFeedback('success', `Sincronização concluída com base em ${res.data.rows.length} registros da escala.`);
      }
    } catch (err) {
      console.error('Erro ao sincronizar escala:', err);
      showFeedback('error', 'Erro ao sincronizar dados da escala.');
    } finally {
      setSyncing(false);
    }
  };



  // 9. Ação: Imprimir
  const handlePrint = () => {
    window.print();
  };

  const getDayName = (dataIso) => {
    if (!dataIso) return '';
    const parts = dataIso.split('-');
    if (parts.length < 3) return '';
    const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    return DIAS_SEMANA_ABREV[d.getDay()] || '';
  };

  const isWeekend = (dataIso) => {
    if (!dataIso) return false;
    const parts = dataIso.split('-');
    const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    return d.getDay() === 0 || d.getDay() === 6;
  };

  return (
    <div className="quantitativo-container" style={{ padding: '1.5rem', maxWidth: '1600px', margin: '0 auto', fontFamily: "'Inter', sans-serif" }}>

      {/* BARRA SUPERIOR DE AÇÕES E CONTROLE */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '1.5rem',
        background: '#ffffff',
        padding: '1.25rem 1.5rem',
        borderRadius: '16px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.04)',
        border: '1px solid #e2e8f0'
      }}>
        {/* Seletor de Ciclo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: 44, height: 44, borderRadius: '12px',
            background: 'linear-gradient(135deg, #0D3878 0%, #1e40af 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'
          }}>
            <FileSpreadsheet size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Ciclo de Força Tarefa
            </div>
            <select
              value={selectedCicloId}
              onChange={(e) => setSelectedCicloId(e.target.value)}
              style={{
                fontSize: '1rem',
                fontWeight: 700,
                color: '#0f172a',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '0.35rem 0.75rem',
                outline: 'none',
                background: '#f8fafc',
                cursor: 'pointer'
              }}
            >
              {ciclos.map(c => (
                <option key={c.id_ciclo} value={c.id_ciclo}>
                  {c.periodo_ciclo ? `Ciclo ${c.id_ciclo} (${c.periodo_ciclo})` : `Ciclo ${c.id_ciclo}`} {c.ativo ? '— [ATIVO]' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Botões de Ação */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={handleSyncEscala}
            disabled={syncing}
            title="Lê as guarnições reais salvas na escala do ciclo e preenche a grade"
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.6rem 0.9rem', fontSize: '0.82rem', fontWeight: 600,
              background: '#f1f5f9', color: '#1e293b', border: '1px solid #cbd5e1',
              borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s'
            }}
          >
            <RefreshCw size={15} className={syncing ? 'spin-animation' : ''} />
            {syncing ? 'Sincronizando...' : 'Carregar da Escala'}
          </button>



          <button
            onClick={handlePrint}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.6rem 0.9rem', fontSize: '0.82rem', fontWeight: 600,
              background: '#f8fafc', color: '#334155', border: '1px solid #cbd5e1',
              borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s'
            }}
          >
            <Printer size={15} />
            Imprimir / PDF
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.65rem 1.25rem', fontSize: '0.88rem', fontWeight: 700,
              background: 'linear-gradient(135deg, #0D3878 0%, #1e40af 100%)',
              color: 'white', border: 'none', borderRadius: '10px',
              cursor: saving ? 'wait' : 'pointer', boxShadow: '0 4px 10px rgba(13, 56, 120, 0.25)'
            }}
          >
            <Save size={16} />
            {saving ? 'Gravando...' : 'Salvar Matriz'}
          </button>
        </div>
      </div>

      {/* FEEDBACK TOAST */}
      {feedback && (
        <div style={{
          padding: '0.85rem 1.25rem',
          borderRadius: '10px',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          fontSize: '0.88rem',
          fontWeight: 600,
          background: feedback.type === 'success' ? '#f0fdf4' : feedback.type === 'error' ? '#fef2f2' : '#eff6ff',
          color: feedback.type === 'success' ? '#166534' : feedback.type === 'error' ? '#991b1b' : '#1e40af',
          border: `1px solid ${feedback.type === 'success' ? '#bbf7d0' : feedback.type === 'error' ? '#fecaca' : '#bfdbfe'}`
        }}>
          {feedback.type === 'success' && <CheckCircle2 size={18} />}
          {feedback.type === 'error' && <AlertCircle size={18} />}
          {feedback.type === 'info' && <Info size={18} />}
          {feedback.msg}
        </div>
      )}

      {/* KPI METRIC CARDS */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        {/* Card 1: Orçamento Previsto */}
        <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Valor Total da FT</span>
            <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 700, background: '#e0f2fe', color: '#0369a1' }}>ORÇAMENTO</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="number"
              value={valorTotalFt}
              onChange={(e) => setValorTotalFt(parseFloat(e.target.value) || 0)}
              style={{
                fontSize: '1.35rem',
                fontWeight: 800,
                color: '#0f172a',
                border: 'none',
                borderBottom: '1px dashed #94a3b8',
                background: 'transparent',
                width: '100%',
                outline: 'none'
              }}
            />
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>Teto total liberado para o ciclo</div>
        </div>

        {/* Card 2: Total Gasto SVR */}
        <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Gasto SVR</span>
            <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 700, background: '#fef3c7', color: '#92400e' }}>9º BPM</span>
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#1e3a8a' }}>
            {formatBRL(calc.totalSvr)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
            6h: {formatBRL(calc.valorFt6h)} | 8h: {formatBRL(calc.valorFt8h)}
          </div>
        </div>

        {/* Card 3: Saldo Restante */}
        <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Saldo Restante</span>
            <span style={{
              padding: '3px 8px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 700,
              background: calc.saldoRestante >= 0 ? '#dcfce7' : '#fee2e2',
              color: calc.saldoRestante >= 0 ? '#15803d' : '#b91c1c'
            }}>
              {calc.saldoRestante >= 0 ? 'DENTRO DO TETO' : 'EXCEDIDO'}
            </span>
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: calc.saldoRestante >= 0 ? '#16a34a' : '#dc2626' }}>
            {formatBRL(calc.saldoRestante)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
            {calc.execucaoPct.toFixed(1)}% do orçamento consumido
          </div>
        </div>

        {/* Card 4: Quantitativo de Guarnições e Diárias */}
        <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Guarnições / Diárias</span>
            <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 700, background: '#f1f5f9', color: '#334155' }}>EFETIVO</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>{calc.totalGuGeral}</span>
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>GUs</span>
            <span style={{ color: '#cbd5e1' }}>|</span>
            <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0D3878' }}>{calc.qFtPm9Bpm}</span>
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Diárias PM</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
            6h: {calc.totalGu6h} GUs ({calc.qPm6h} PMs) | 8h: {calc.totalGu8h} GUs ({calc.qPm8h} PMs)
          </div>
        </div>
      </div>

      {/* ÁREA DE IMPRESSÃO / FOLHA OFICIAL */}
      <div
        ref={printRef}
        id="print-sheet-area"
        style={{
          background: '#ffffff',
          padding: '2rem',
          borderRadius: '16px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
          border: '1px solid #e2e8f0',
          overflowX: 'auto'
        }}
      >
        {/* CABEÇALHO OFICIAL MILITAR PMAL */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem', borderBottom: '2px solid #0f172a', paddingBottom: '1rem' }}>
          <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            SECRETARIA DE ESTADO DA SEGURANÇA PÚBLICA
          </div>
          <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            POLÍCIA MILITAR DE ALAGOAS
          </div>
          <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#334155', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            COMANDO DO POLICIAMENTO DA REGIÃO DO SERTÃO — 9º BPM
          </div>
          <div style={{
            fontWeight: 800,
            fontSize: '1.05rem',
            color: '#0D3878',
            textTransform: 'uppercase',
            background: '#f1f5f9',
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            display: 'inline-block',
            marginTop: '0.25rem'
          }}>
            PLANILHA DE QUANTITATIVO DAS GUARNIÇÕES ESCALADAS DE FORÇA TAREFA
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginTop: '0.15rem' }}>
              NO PERÍODO DE {cicloData?.periodo_ciclo ? cicloData.periodo_ciclo.toUpperCase() : '16 DE SETEMBRO A 15 DE OUTUBRO DE 2026'}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', padding: '0 0.5rem', fontSize: '0.85rem', fontWeight: 700 }}>
            <div style={{ color: '#0f172a' }}>
              VALOR TOTAL DAS DIÁRIAS (9ºBPM) : <span style={{ color: '#0D3878', fontSize: '1rem' }}>{formatBRL(calc.totalSvr)}</span>
            </div>
            <div style={{ color: '#0f172a' }}>
              VALOR TOTAL DA FT : <span style={{ color: '#047857', fontSize: '1rem' }}>{formatBRL(valorTotalFt)}</span>
            </div>
          </div>
        </div>

        {/* BARRA DE FERRAMENTAS: FORMATAÇÃO DE CORES E MARCA-TEXTO */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          padding: '0.75rem 1rem',
          background: isPaintMode ? '#eff6ff' : '#f8fafc',
          border: isPaintMode ? '2px solid #3b82f6' : '1px solid #e2e8f0',
          borderRadius: '12px',
          marginBottom: '1rem',
          transition: 'all 0.2s',
          boxShadow: isPaintMode ? '0 4px 12px rgba(59, 130, 246, 0.15)' : 'none'
        }}>
          {/* Lado Esquerdo: Botão Toggle Modo Pincel */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => setIsPaintMode(prev => !prev)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 0.9rem',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                border: 'none',
                background: isPaintMode ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' : '#e2e8f0',
                color: isPaintMode ? '#ffffff' : '#334155',
                boxShadow: isPaintMode ? '0 2px 6px rgba(37, 99, 235, 0.3)' : 'none',
                transition: 'all 0.2s'
              }}
              title="Ativa o modo de pintura para colorir células, linhas ou colunas ao clicar"
            >
              <Paintbrush size={16} />
              <span>{isPaintMode ? 'Modo Marca-texto (ATIVO)' : 'Ativar Marca-texto'}</span>
            </button>

            {/* Paleta de Cores Rápidas */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#ffffff', padding: '4px 8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginRight: '4px' }}>Cor:</span>
              {PRESET_COLORS.map(c => {
                const isSelected = activeColor === c.hex;
                return (
                  <button
                    key={c.hex}
                    onClick={() => {
                      setActiveColor(c.hex);
                      if (!isPaintMode) setIsPaintMode(true);
                    }}
                    title={`Selecionar cor ${c.name}`}
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: c.hex,
                      border: isSelected ? '2px solid #0f172a' : `1px solid ${c.border}`,
                      transform: isSelected ? 'scale(1.2)' : 'scale(1)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 0,
                      transition: 'all 0.15s'
                    }}
                  >
                    {isSelected && <Check size={12} color="#0f172a" strokeWidth={3} />}
                  </button>
                );
              })}

              {/* Seletor Livre de Cor */}
              <label
                title="Escolher cor personalizada"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)',
                  border: '1px solid #cbd5e1',
                  cursor: 'pointer',
                  marginLeft: '2px',
                  position: 'relative'
                }}
              >
                <input
                  type="color"
                  value={activeColor && activeColor.startsWith('#') ? activeColor : '#fef08a'}
                  onChange={(e) => {
                    setActiveColor(e.target.value);
                    if (!isPaintMode) setIsPaintMode(true);
                  }}
                  style={{ opacity: 0, position: 'absolute', width: '100%', height: '100%', cursor: 'pointer' }}
                />
              </label>

              {/* Botão Borracha / Limpar Selecionado */}
              <button
                onClick={() => {
                  setActiveColor('clear');
                  if (!isPaintMode) setIsPaintMode(true);
                }}
                title="Borracha (remove a cor da célula/linha/coluna clicada)"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px',
                  padding: '2px 6px',
                  borderRadius: '6px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: activeColor === 'clear' ? '#fee2e2' : '#f1f5f9',
                  color: activeColor === 'clear' ? '#dc2626' : '#64748b',
                  border: activeColor === 'clear' ? '1px solid #f87171' : '1px solid #cbd5e1',
                  marginLeft: '4px'
                }}
              >
                <Eraser size={13} />
                Borracha
              </button>
            </div>
          </div>

          {/* Lado Direito: Ações globais e Instrução */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {isPaintMode && (
              <span style={{ fontSize: '0.76rem', color: '#1e40af', fontWeight: 600 }}>
                👉 Clique em uma célula, no dia (coluna) ou no horário (linha) para pintar!
              </span>
            )}
            <button
              onClick={handleClearAllColors}
              title="Limpa todas as cores e destaques aplicados na tabela"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                padding: '0.4rem 0.75rem',
                borderRadius: '8px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                background: '#ffffff',
                color: '#64748b',
                border: '1px solid #cbd5e1',
                transition: 'all 0.2s'
              }}
            >
              <Trash2 size={13} />
              Limpar Cores
            </button>
          </div>
        </div>

        {/* GRADE MATRIZ PRINCIPAL */}
        <div style={{ overflowX: 'auto', marginBottom: '1.5rem' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '0.78rem',
            textAlign: 'center',
            border: '2px solid #0f172a'
          }}>
            <thead>
              {/* LINHA 1: TÍTULO DOS DIAS / MESES */}
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
                <th rowSpan={3} style={{ border: '1px solid #94a3b8', padding: '6px', width: '60px', fontWeight: 800, background: '#f1f5f9' }}>OPM</th>
                <th rowSpan={3} style={{ border: '1px solid #94a3b8', padding: '6px', minWidth: '95px', fontWeight: 800, background: '#f1f5f9' }}>HORÁRIO</th>
                <th colSpan={columns.length} style={{ border: '1px solid #94a3b8', padding: '6px', fontWeight: 800, background: '#e2e8f0', letterSpacing: '0.05em' }}>
                  DIAS / QUANTIDADE DE GUARNIÇÕES
                </th>
                <th rowSpan={3} style={{ border: '1px solid #94a3b8', padding: '6px', minWidth: '70px', fontWeight: 800, background: '#dbeafe', color: '#1e3a8a' }}>
                  Total GU/Ciclo
                </th>
              </tr>

              {/* LINHA 2: GRUPOS DE MESES (SETEMBRO / OUTUBRO) */}
              <tr style={{ background: '#f8fafc' }}>
                {monthHeaders.map((grp, idx) => (
                  <th
                    key={idx}
                    colSpan={grp.span}
                    style={{
                      border: '1px solid #94a3b8',
                      padding: '4px',
                      fontWeight: 800,
                      color: '#0f172a',
                      background: idx % 2 === 0 ? '#e2e8f0' : '#cbd5e1'
                    }}
                  >
                    {grp.mes}
                  </th>
                ))}
              </tr>

              {/* LINHA 3: NÚMEROS DOS DIAS E DIA DA SEMANA */}
              <tr style={{ background: '#ffffff' }}>
                {columns.map(col => {
                  const fds = isWeekend(col.data_iso);
                  const diaSem = getDayName(col.data_iso);
                  const colColor = customColors.cols?.[col.data_iso];
                  return (
                    <th
                      key={col.data_iso}
                      onClick={() => {
                        if (isPaintMode) {
                          applyColorCol(col.data_iso, activeColor);
                        }
                      }}
                      onContextMenu={(e) => handleContextMenu(e, 'col', null, col.data_iso)}
                      style={{
                        border: '1px solid #94a3b8',
                        padding: '4px 2px',
                        minWidth: '32px',
                        fontWeight: 700,
                        background: colColor || (fds ? '#fef3c7' : '#ffffff'),
                        color: fds ? '#92400e' : '#0f172a',
                        cursor: isPaintMode ? 'pointer' : 'default',
                        transition: 'background 0.15s'
                      }}
                      title={isPaintMode ? "Clique para pintar esta coluna inteira com a cor selecionada" : "Clique com o botão direito para opções de cor"}
                    >
                      <div>{col.dia}</div>
                      <div style={{ fontSize: '0.62rem', opacity: 0.75 }}>{diaSem}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {/* LINHAS DOS TURNOS */}
              {shifts.map((s, sIdx) => {
                const is6h = s.duracao === '6h';
                const rowColor = customColors.rows?.[s.id];
                return (
                  <tr key={s.id} style={{ background: sIdx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                    {/* Célula OPM mesclada na primeira linha */}
                    {sIdx === 0 && (
                      <td
                        rowSpan={shifts.length}
                        style={{
                          border: '1px solid #94a3b8',
                          fontWeight: 800,
                          fontSize: '0.85rem',
                          background: '#f1f5f9',
                          color: '#0f172a',
                          padding: '6px'
                        }}
                      >
                        {cicloData?.opm_sigla || '9ºBPM'}
                      </td>
                    )}

                    {/* Horário */}
                    <td
                      onClick={() => {
                        if (isPaintMode) {
                          applyColorRow(s.id, activeColor);
                        }
                      }}
                      onContextMenu={(e) => handleContextMenu(e, 'row', s.id, null)}
                      style={{
                        border: '1px solid #94a3b8',
                        padding: '6px 8px',
                        fontWeight: 700,
                        textAlign: 'left',
                        whiteSpace: 'nowrap',
                        color: is6h ? '#0369a1' : '#b45309',
                        background: rowColor || (is6h ? '#f0f9ff' : '#fffbeb'),
                        cursor: isPaintMode ? 'pointer' : 'default',
                        transition: 'background 0.15s'
                      }}
                      title={isPaintMode ? "Clique para pintar esta linha inteira com a cor selecionada" : "Clique com o botão direito para opções de cor"}
                    >
                      {s.horario}
                      <span style={{ fontSize: '0.65rem', marginLeft: '4px', opacity: 0.7 }}>({s.duracao})</span>
                    </td>

                    {/* Células de Dias */}
                    {columns.map(col => {
                      const val = matrix[s.id]?.[col.data_iso];
                      const isZero = val === 0 || val === undefined || val === null || val === '';
                      const isText = typeof val === 'string' && isNaN(val);
                      const fds = isWeekend(col.data_iso);
                      const cellBg = getCellBg(s.id, col.data_iso, isText, fds);

                      return (
                        <td
                          key={col.data_iso}
                          onClick={() => {
                            if (isPaintMode) {
                              applyColorCell(s.id, col.data_iso, activeColor);
                            }
                          }}
                          onContextMenu={(e) => handleContextMenu(e, 'cell', s.id, col.data_iso)}
                          style={{
                            border: '1px solid #cbd5e1',
                            padding: '2px',
                            background: cellBg,
                            fontWeight: isZero ? 400 : 700,
                            color: isText ? '#92400e' : isZero ? '#94a3b8' : '#0f172a',
                            cursor: isPaintMode ? 'pointer' : 'default',
                            transition: 'background 0.15s'
                          }}
                          title={isPaintMode ? "Clique para pintar esta célula com a cor selecionada" : "Clique com o botão direito para opções de cor"}
                        >
                          <input
                            type="text"
                            value={isZero ? '' : val}
                            placeholder="-"
                            readOnly={isPaintMode}
                            onClick={(e) => {
                              if (isPaintMode) {
                                e.stopPropagation();
                                applyColorCell(s.id, col.data_iso, activeColor);
                              }
                            }}
                            onChange={(e) => handleCellChange(s.id, col.data_iso, e.target.value)}
                            style={{
                              width: '100%',
                              textAlign: 'center',
                              border: 'none',
                              background: 'transparent',
                              fontSize: isText ? '0.72rem' : '0.82rem',
                              fontWeight: isZero ? 400 : 800,
                              color: isText ? '#b45309' : isZero ? '#cbd5e1' : '#0f172a',
                              outline: 'none',
                              cursor: isPaintMode ? 'pointer' : 'text',
                              padding: '2px 0'
                            }}
                          />
                        </td>
                      );
                    })}

                    {/* Total do Turno */}
                    <td style={{
                      border: '1px solid #94a3b8',
                      fontWeight: 800,
                      fontSize: '0.85rem',
                      color: '#1e3a8a',
                      background: '#eff6ff'
                    }}>
                      {calc.shiftTotals[s.id] || 0}
                    </td>
                  </tr>
                );
              })}

              {/* LINHA DE TOTAL DIÁRIO (Rodapé da Matriz) */}
              <tr style={{ background: '#f1f5f9', borderTop: '2px solid #0f172a' }}>
                <td colSpan={2} style={{ border: '1px solid #94a3b8', padding: '6px', fontWeight: 800, textAlign: 'right' }}>
                  TOTAL GU/DIA:
                </td>
                {columns.map(col => {
                  const dailyTotal = calc.dailyTotals[col.data_iso] || 0;
                  const fds = isWeekend(col.data_iso);
                  return (
                    <td
                      key={col.data_iso}
                      style={{
                        border: '1px solid #94a3b8',
                        padding: '4px 2px',
                        fontWeight: 800,
                        background: dailyTotal > 0 ? (fds ? '#fde68a' : '#e2e8f0') : 'transparent',
                        color: dailyTotal > 0 ? '#0f172a' : '#94a3b8'
                      }}
                    >
                      {dailyTotal > 0 ? dailyTotal : '-'}
                    </td>
                  );
                })}
                <td style={{
                  border: '1px solid #94a3b8',
                  padding: '6px',
                  fontWeight: 900,
                  fontSize: '0.9rem',
                  background: '#dbeafe',
                  color: '#1e3a8a'
                }}>
                  {calc.totalGuGeral}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* QUADRO DE APURAÇÃO FINANCEIRA E DIÁRIAS (Linhas 19 a 23 da Planilha) */}
        <div style={{ marginTop: '2rem', border: '2px solid #0f172a', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'center' }}>
            <thead>
              <tr style={{ background: '#0D3878', color: '#ffffff', fontWeight: 700 }}>
                <th style={{ border: '1px solid #1e40af', padding: '8px', textAlign: 'left', minWidth: '150px' }}>CATEGORIA</th>
                <th style={{ border: '1px solid #1e40af', padding: '8px' }}>TOTAL FT (GU)</th>
                <th style={{ border: '1px solid #1e40af', padding: '8px' }}>Q. PM (x3)</th>
                <th style={{ border: '1px solid #1e40af', padding: '8px' }}>VALOR FT (R$)</th>
                <th style={{ border: '1px solid #1e40af', padding: '8px', background: '#1e3a8a' }}>Q. FT PM FORA</th>
                <th style={{ border: '1px solid #1e40af', padding: '8px', background: '#1e3a8a' }}>V. PM - FORA (R$)</th>
              </tr>
            </thead>
            <tbody>
              {/* Linha 6H */}
              <tr style={{ background: '#ffffff', borderBottom: '1px solid #cbd5e1' }}>
                <td style={{ border: '1px solid #cbd5e1', padding: '6px 8px', textAlign: 'left' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <input
                      type="text"
                      value={label6h}
                      onChange={(e) => setLabel6h(e.target.value)}
                      title="Editar nome da categoria (ex: VALOR FT 6H)"
                      placeholder="VALOR FT 6H"
                      style={{
                        fontWeight: 800,
                        color: '#0369a1',
                        border: '1px solid #bae6fd',
                        borderRadius: '4px',
                        padding: '4px 6px',
                        fontSize: '0.82rem',
                        background: '#f0f9ff',
                        width: '100%',
                        boxSizing: 'border-box'
                      }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: '#64748b' }}>
                      <span style={{ fontWeight: 600 }}>Diária R$:</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={valorDiaria6h}
                        onChange={(e) => setValorDiaria6h(parseFloat(e.target.value) || 0)}
                        title="Valor unitário da diária de 6h (R$)"
                        style={{
                          width: '80px',
                          padding: '2px 4px',
                          border: '1px solid #cbd5e1',
                          borderRadius: '4px',
                          fontWeight: 700,
                          color: '#0369a1',
                          fontSize: '0.75rem',
                          background: '#ffffff'
                        }}
                      />
                    </div>
                  </div>
                </td>
                <td style={{ border: '1px solid #cbd5e1', padding: '8px', fontWeight: 800, fontSize: '0.9rem' }}>{calc.totalGu6h}</td>
                <td style={{ border: '1px solid #cbd5e1', padding: '8px', fontWeight: 800, fontSize: '0.9rem' }}>{calc.qPm6h}</td>
                <td style={{ border: '1px solid #cbd5e1', padding: '8px', fontWeight: 800, fontSize: '0.95rem', color: '#0D3878' }}>
                  {formatBRL(calc.valorFt6h)}
                </td>
                <td style={{ border: '1px solid #cbd5e1', padding: '4px', background: '#f8fafc' }}>
                  <input
                    type="number"
                    min="0"
                    value={pmFora6h}
                    onChange={(e) => setPmFora6h(parseInt(e.target.value) || 0)}
                    style={{ width: '60px', textAlign: 'center', padding: '4px', border: '1px solid #cbd5e1', borderRadius: '4px', fontWeight: 700 }}
                  />
                </td>
                <td style={{ border: '1px solid #cbd5e1', padding: '8px', fontWeight: 700, color: '#64748b', background: '#f8fafc' }}>
                  {formatBRL(calc.vPmFora6h)}
                </td>
              </tr>

              {/* Linha 8H */}
              <tr style={{ background: '#ffffff', borderBottom: '2px solid #0f172a' }}>
                <td style={{ border: '1px solid #cbd5e1', padding: '6px 8px', textAlign: 'left' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <input
                      type="text"
                      value={label8h}
                      onChange={(e) => setLabel8h(e.target.value)}
                      title="Editar nome da categoria (ex: VALOR FT 8H)"
                      placeholder="VALOR FT 8H"
                      style={{
                        fontWeight: 800,
                        color: '#b45309',
                        border: '1px solid #fde68a',
                        borderRadius: '4px',
                        padding: '4px 6px',
                        fontSize: '0.82rem',
                        background: '#fffbeb',
                        width: '100%',
                        boxSizing: 'border-box'
                      }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: '#64748b' }}>
                      <span style={{ fontWeight: 600 }}>Diária R$:</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={valorDiaria8h}
                        onChange={(e) => setValorDiaria8h(parseFloat(e.target.value) || 0)}
                        title="Valor unitário da diária de 8h (R$)"
                        style={{
                          width: '80px',
                          padding: '2px 4px',
                          border: '1px solid #cbd5e1',
                          borderRadius: '4px',
                          fontWeight: 700,
                          color: '#b45309',
                          fontSize: '0.75rem',
                          background: '#ffffff'
                        }}
                      />
                    </div>
                  </div>
                </td>
                <td style={{ border: '1px solid #cbd5e1', padding: '8px', fontWeight: 800, fontSize: '0.9rem' }}>{calc.totalGu8h}</td>
                <td style={{ border: '1px solid #cbd5e1', padding: '8px', fontWeight: 800, fontSize: '0.9rem' }}>{calc.qPm8h}</td>
                <td style={{ border: '1px solid #cbd5e1', padding: '8px', fontWeight: 800, fontSize: '0.95rem', color: '#0D3878' }}>
                  {formatBRL(calc.valorFt8h)}
                </td>
                <td style={{ border: '1px solid #cbd5e1', padding: '4px', background: '#f8fafc' }}>
                  <input
                    type="number"
                    min="0"
                    value={pmFora8h}
                    onChange={(e) => setPmFora8h(parseInt(e.target.value) || 0)}
                    style={{ width: '60px', textAlign: 'center', padding: '4px', border: '1px solid #cbd5e1', borderRadius: '4px', fontWeight: 700 }}
                  />
                </td>
                <td style={{ border: '1px solid #cbd5e1', padding: '8px', fontWeight: 700, color: '#64748b', background: '#f8fafc' }}>
                  {formatBRL(calc.vPmFora8h)}
                </td>
              </tr>

              {/* Linha de Totais e Saldo Final */}
              <tr style={{ background: '#f1f5f9', fontWeight: 800 }}>
                <td style={{ border: '1px solid #94a3b8', padding: '10px 8px', textAlign: 'left', fontWeight: 900, fontSize: '0.9rem' }}>
                  TOTAL SVR (9º BPM)
                </td>
                <td colSpan={2} style={{ border: '1px solid #94a3b8', padding: '10px 8px', fontSize: '1rem', color: '#0D3878', textAlign: 'left' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginRight: '6px' }}>TOTAL A PAGAR:</span>
                  {formatBRL(calc.totalSvr)}
                </td>
                <td style={{ border: '1px solid #94a3b8', padding: '10px 8px', textAlign: 'left', background: '#e2e8f0' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginRight: '6px' }}>SALDO RESTANTE:</span>
                  <span style={{ fontSize: '0.95rem', color: calc.saldoRestante >= 0 ? '#15803d' : '#dc2626' }}>
                    {formatBRL(calc.saldoRestante)}
                  </span>
                </td>
                <td style={{ border: '1px solid #94a3b8', padding: '10px 8px', fontWeight: 800, background: '#e2e8f0' }}>
                  Q. FT PM 9ºBPM:
                </td>
                <td style={{ border: '1px solid #94a3b8', padding: '10px 8px', fontWeight: 900, fontSize: '1.05rem', color: '#0D3878', background: '#dbeafe' }}>
                  {calc.qFtPm9Bpm}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* RODAPÉ INSTITUCIONAL E ASSINATURAS */}
        <div style={{ marginTop: '2.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '3rem' }}>
            Quartel em Delmiro Gouveia/AL, {cicloData?.period_name || 'SETEMBRO/OUTUBRO de 2026'}.
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-start', flexWrap: 'wrap', gap: '2rem' }}>
            <div style={{ textAlign: 'center', minWidth: '260px' }}>
              <div style={{ width: '220px', height: '1px', background: '#0f172a', margin: '0 auto 8px auto' }} />
              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>OFICIAL P1</div>
              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>9º Batalhão de Polícia Militar</div>
            </div>

            <div style={{ textAlign: 'center', minWidth: '260px' }}>
              <div style={{ width: '220px', height: '1px', background: '#0f172a', margin: '0 auto 8px auto' }} />
              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>COMANDANTE DO 9º BPM</div>
              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Polícia Militar de Alagoas</div>
            </div>
          </div>
        </div>
      </div>

      {/* MENU DE CONTEXTO FLUTUANTE (AO CLICAR COM BOTÃO DIREITO NA CÉLULA, LINHA OU COLUNA) */}
      {contextMenu && (
        <div
          style={{
            position: 'fixed',
            top: Math.min(contextMenu.y, window.innerHeight - 200),
            left: Math.min(contextMenu.x, window.innerWidth - 220),
            background: '#ffffff',
            borderRadius: '12px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.18)',
            border: '1px solid #cbd5e1',
            padding: '10px',
            zIndex: 99999,
            minWidth: '200px',
            fontFamily: "'Inter', sans-serif"
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.78rem',
            fontWeight: 800,
            color: '#0f172a',
            marginBottom: '8px',
            paddingBottom: '6px',
            borderBottom: '1px solid #f1f5f9'
          }}>
            <span>
              {contextMenu.type === 'cell' && '🎨 Cor da Célula'}
              {contextMenu.type === 'col' && `🎨 Cor da Coluna (${contextMenu.dataIso.split('-')[2]}/${contextMenu.dataIso.split('-')[1]})`}
              {contextMenu.type === 'row' && `🎨 Cor da Linha (${shifts.find(s => s.id === contextMenu.shiftId)?.horario || 'Turno'})`}
            </span>
            <button
              onClick={() => setContextMenu(null)}
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8', padding: '2px' }}
            >
              <X size={14} />
            </button>
          </div>

          {/* Paleta rápida dentro do menu */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', marginBottom: '8px' }}>
            {PRESET_COLORS.map(c => (
              <button
                key={c.hex}
                onClick={() => {
                  if (contextMenu.type === 'cell') applyColorCell(contextMenu.shiftId, contextMenu.dataIso, c.hex);
                  else if (contextMenu.type === 'col') applyColorCol(contextMenu.dataIso, c.hex);
                  else if (contextMenu.type === 'row') applyColorRow(contextMenu.shiftId, c.hex);
                  setContextMenu(null);
                }}
                title={c.name}
                style={{
                  height: '24px',
                  borderRadius: '6px',
                  background: c.hex,
                  border: `1px solid ${c.border}`,
                  cursor: 'pointer'
                }}
              />
            ))}
          </div>

          {/* Ações contextuais de expansão */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {contextMenu.type === 'cell' && (
              <>
                <button
                  onClick={() => {
                    applyColorRow(contextMenu.shiftId, activeColor);
                    setContextMenu(null);
                  }}
                  style={{
                    textAlign: 'left',
                    padding: '5px 8px',
                    fontSize: '0.74rem',
                    fontWeight: 600,
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    color: '#334155'
                  }}
                  onMouseEnter={(e) => e.target.style.background = '#eff6ff'}
                  onMouseLeave={(e) => e.target.style.background = '#f8fafc'}
                >
                  Pintar Linha Inteira (Turno)
                </button>

                <button
                  onClick={() => {
                    applyColorCol(contextMenu.dataIso, activeColor);
                    setContextMenu(null);
                  }}
                  style={{
                    textAlign: 'left',
                    padding: '5px 8px',
                    fontSize: '0.74rem',
                    fontWeight: 600,
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    color: '#334155'
                  }}
                  onMouseEnter={(e) => e.target.style.background = '#eff6ff'}
                  onMouseLeave={(e) => e.target.style.background = '#f8fafc'}
                >
                  Pintar Coluna Inteira (Dia)
                </button>
              </>
            )}

            <button
              onClick={() => {
                if (contextMenu.type === 'cell') applyColorCell(contextMenu.shiftId, contextMenu.dataIso, 'clear');
                else if (contextMenu.type === 'col') applyColorCol(contextMenu.dataIso, 'clear');
                else if (contextMenu.type === 'row') applyColorRow(contextMenu.shiftId, 'clear');
                setContextMenu(null);
              }}
              style={{
                textAlign: 'left',
                padding: '5px 8px',
                fontSize: '0.74rem',
                fontWeight: 600,
                background: '#fee2e2',
                border: '1px solid #fecaca',
                borderRadius: '6px',
                cursor: 'pointer',
                color: '#dc2626',
                marginTop: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Eraser size={13} />
              Limpar Cor Deste Item
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
