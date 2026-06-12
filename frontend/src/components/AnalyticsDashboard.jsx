import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { RefreshCw, TrendingUp, Clock, AlertTriangle, Wallet, Search, FileText, Printer, Download, X } from 'lucide-react';
import { compareByRank } from '../utils/formatters';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001') + '/api';
const MAX_SERVICES = 8;

// Função para formatar data vinda do banco de forma segura
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

export function AnalyticsDashboard() {
  const [loading, setLoading] = useState(true);
  const [efetivo, setEfetivo] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [ciclos, setCiclos] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [selectedCiclo, setSelectedCiclo] = useState('');
  const [activeTab, setActiveTab] = useState('geral');
  const [stats, setStats] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'total', direction: 'desc' });
  const [searchTerm, setSearchTerm] = useState('');
  const [tiposServico, setTiposServico] = useState([]);

  // Memorandum Generator States
  const [showMemoModal, setShowMemoModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [memoNumber, setMemoNumber] = useState('124/2026/Secretaria do 9º Batalhão de Polícia Militar');
  const [memoDate, setMemoDate] = useState('');
  const [memoSender, setMemoSender] = useState('ADEMAR SIQUEIRA DA SILVA NETO - TEN CEL QOEM PM');
  const [memoRecipient, setMemoRecipient] = useState('Ilmo. Senhor Cel QOEM - Comandante do CPRS');
  const [memoPortaria, setMemoPortaria] = useState('Portaria PMAL nº 34/2025');
  const [memoCprsLimit, setMemoCprsLimit] = useState(85000.00);
  const [pdfLoading, setPdfLoading] = useState(false);

  const reportDate = useMemo(() => {
    const now = new Date();
    return now.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
  }, []);

  const voluntariosConsolidado = useMemo(() => {
    if (volunteers.length === 0) return [];
    return volunteers
      .filter(v => v.ativo !== false)
      .map(v => {
        const idKey = String(v.id_militar || v.militar_id || v.id);
        const stat = stats.find(s => String(s.militar_id) === idKey);
        return {
          numero_ordem: v.numero_ordem || v.matricula || idKey,
          rank: v.rank || v.posto_graduacao || '',
          name: v.name || v.nome_guerra || v.nome_completo || 'Militar Indefinido',
          motorista: v.motorista_req !== undefined ? v.motorista_req : v.motorista,
          total_servicos: stat ? stat.total : 0,
          valor_total: stat ? stat.valorTotal : 0
        };
      }).sort((a, b) => compareByRank(a.rank, b.rank));
  }, [volunteers, stats]);



  const handleDownloadReportPDF = async () => {
    const element = document.getElementById('relatorio-analitico-container');
    if (!element) return;
    setPdfLoading(true);
    const createdSpacers = [];

    try {
      element.classList.add('generating-pdf');

      const A4_PAGE_HEIGHT = element.offsetWidth * (297 / 210);
      const blocksToCheck = element.querySelectorAll('.bloco-relatorio-analitico');

      const getRelativeTop = (el, container) => {
        const rectEl = el.getBoundingClientRect();
        const rectContainer = container.getBoundingClientRect();
        return rectEl.top - rectContainer.top;
      };

      blocksToCheck.forEach(block => {
        const top = getRelativeTop(block, element);
        const height = block.offsetHeight;

        const startPage = Math.floor(top / A4_PAGE_HEIGHT);
        const endPage = Math.floor((top + height) / A4_PAGE_HEIGHT);
        const marginPixels = element.offsetWidth * (20 / 210); // 20mm margin

        if (startPage !== endPage && height < A4_PAGE_HEIGHT - marginPixels * 2) {
          const remainingSpace = (startPage + 1) * A4_PAGE_HEIGHT - top + marginPixels;

          const spacer = document.createElement('div');
          spacer.style.height = `${remainingSpace}px`;
          spacer.style.width = '100%';
          spacer.style.backgroundColor = 'transparent';
          spacer.style.margin = '0';
          spacer.style.padding = '0';
          spacer.style.border = 'none';

          block.parentNode.insertBefore(spacer, block);
          createdSpacers.push(spacer);
        }
      });

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
      const pageHeight = 297;
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

      const filename = `Relatorio_Analitico_Gestao_${selectedCicloText.replace(/[\s\/]/g, '_')}.pdf`;
      pdf.save(filename);
    } catch (error) {
      console.error('Erro ao gerar PDF do relatório:', error);
      alert('Erro ao gerar PDF do relatório: ' + error.message);
    } finally {
      element.classList.remove('generating-pdf');
      createdSpacers.forEach(spacer => {
        if (spacer && spacer.parentNode) {
          spacer.parentNode.removeChild(spacer);
        }
      });
      setPdfLoading(false);
    }
  };

  // Initialize Date for Memo
  useEffect(() => {
    if (!memoDate) {
      const now = new Date();
      const monthsPT = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
      setMemoDate(`${now.getDate()} de ${monthsPT[now.getMonth()]} de ${now.getFullYear()}`);
    }
  }, []);

  // Memoized compilation of SVR services executed outside 9º BPM by 9º BPM militaries
  const memoData = useMemo(() => {
    if (!selectedCiclo || servicos.length === 0 || efetivo.length === 0) {
      return { list: [], OpmDebits: {}, totalValue: 0 };
    }

    // Filter: native OPM is '9º BPM' (or '9o BPM') and execution OPM is NOT '9º BPM' (or '9o BPM')
    const filteredServices = servicos.filter(s => {
      const mil = efetivo.find(e => String(e.id_militar) === String(s.id_militar));
      const homeOpm = mil?.opm || '';
      const execOpm = s.opm_origem || '';

      const is9Bpm = (opm) => {
        if (!opm) return false;
        const norm = opm.trim().toUpperCase().replace(/º/g, 'O');
        return norm === '9O BPM' || norm === '9º BPM' || norm === '9BPM';
      };

      return is9Bpm(homeOpm) && !is9Bpm(execOpm) && execOpm !== '';
    });

    const groups = {};
    const OpmDebits = {};
    let totalValue = 0;

    filteredServices.forEach(s => {
      const milId = String(s.id_militar);
      const mil = efetivo.find(e => String(e.id_militar) === milId);
      if (!groups[milId]) {
        groups[milId] = {
          militar_id: milId,
          nome_guerra: mil?.nome_guerra || s.nome_guerra || 'Desconhecido',
          nome_completo: mil?.nome_completo || 'Militar Indefinido',
          posto_graduacao: mil?.posto_graduacao || s.posto_graduacao || '',
          cpf: mil?.cpf || '---',
          services: [],
          count6h: 0,
          count8h: 0,
          totalValue: 0
        };
      }

      // Resolve Command (CMD) dynamically
      let cmd = 'CPRS';
      const opm = s.opm_origem || '';
      if (opm === '3º BPM' || opm === '9º BPM') {
        cmd = 'CPRA';
      } else if (opm === 'CPRM') {
        cmd = 'CPRM';
      }

      const val = parseFloat(s.valor_remuneracao || 0);
      groups[milId].services.push({
        ...s,
        cmd,
        modalidade: 'FORÇA TAREFA',
        valor: val
      });

      if (Number(s.carga_horaria) === 8) {
        groups[milId].count8h += 1;
      } else {
        groups[milId].count6h += 1;
      }

      groups[milId].totalValue += val;
      totalValue += val;

      OpmDebits[opm] = (OpmDebits[opm] || 0) + val;
    });

    const list = Object.values(groups).sort((a, b) => compareByRank(a.posto_graduacao, b.posto_graduacao));

    return { list, OpmDebits, totalValue };
  }, [selectedCiclo, servicos, efetivo, tiposServico]);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const filteredStats = stats.filter(s =>
    s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(s.numero_ordem).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedStats = [...filteredStats].sort((a, b) => {
    let aValue = a[sortConfig.key];
    let bValue = b[sortConfig.key];

    if (['count6h', 'count8h', 'total', 'remaining', 'valorTotal', 'numero_ordem'].includes(sortConfig.key)) {
      aValue = parseFloat(aValue) || 0;
      bValue = parseFloat(bValue) || 0;
    }

    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedCiclo) {
      fetchCycleData(selectedCiclo);
    }
  }, [selectedCiclo]);

  useEffect(() => {
    if (selectedCiclo && (volunteers.length >= 0 || servicos.length >= 0)) {
      filterByCiclo();
    }
  }, [selectedCiclo, volunteers, servicos, efetivo, activeTab, tiposServico]);

  useEffect(() => {
    if (ciclos.length > 0 && !selectedCiclo) {
      const activeOrFirst = ciclos.find(c => c.status === 'Aberto') || ciclos[0];
      setSelectedCiclo(activeOrFirst.id_ciclo);
    }
  }, [ciclos, selectedCiclo]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [efetivoRes, ciclosRes, tiposRes] = await Promise.all([
        axios.get(`${API_URL}/efetivo`),
        axios.get(`${API_URL}/ciclos`),
        axios.get(`${API_URL}/tipos-servico`),
      ]);
      setEfetivo(efetivoRes.data);
      setCiclos(ciclosRes.data);
      setTiposServico(tiposRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchCycleData = async (cicloId) => {
    if (!cicloId) return;
    setIsRefreshing(true);
    try {
      let volReq, servReq;
      if (cicloId === 'all') {
        volReq = axios.get(`${API_URL}/volunteers`);
        servReq = axios.get(`${API_URL}/servicos`);
      } else {
        volReq = axios.get(`${API_URL}/volunteers?id_ciclo=${cicloId}`);
        servReq = axios.get(`${API_URL}/servicos?ciclo_id=${cicloId}`);
      }
      const [volRes, servRes] = await Promise.all([volReq, servReq]);
      setVolunteers(volRes.data);
      setServicos(servRes.data);
    } catch (e) {
      console.error('Erro ao buscar dados do ciclo:', e);
    } finally {
      setTimeout(() => setIsRefreshing(false), 400);
    }
  };

  const filterByCiclo = () => {
    // Agora os dados já vem filtrados do backend, 
    // então apenas repassamos para a construção das estatísticas.
    // Lidar com arrays vazios para não quebrar o UI.
    buildStats(volunteers || [], servicos || [], efetivo || []);
  };

  const buildStats = (volunteersData, servicosData, fullEfetivo = []) => {
    const targetOpm = matchingCycle?.opm_sigla;

    const map = {};

    // 1. Iniciar com todos os voluntários para garantir que o militar esteja no mapa
    volunteersData.forEach(v => {
      const id = v.id_militar || v.militar_id || v.id;
      if (!id) return;

      const idKey = String(id);
      const mil = fullEfetivo.find(e => String(e.id_militar) === idKey || String(e.id) === idKey);

      // Definição da OPM de exibição baseada na aba
      let displayOPM = 'OPM Indefinida';
      if (activeTab === 'cpm') displayOPM = 'CPM/I-Faz';
      else if (activeTab === 'unidade') displayOPM = targetOpm || 'OPM Unidade';
      else displayOPM = 'Geral'; // No Geral, consolidamos tudo do militar

      // Quando na aba geral, usamos apenas o idKey para somar tudo do militar em uma linha só
      const uniqueKey = activeTab === 'geral' ? idKey : `${idKey}_${displayOPM}`;

      if (!map[uniqueKey]) {
        map[uniqueKey] = {
          id: uniqueKey,
          militar_id: idKey,
          numero_ordem: v.numero_ordem || v.matricula || idKey,
          rank: v.rank || v.posto_graduacao || '',
          name: mil?.nome_guerra || v.name || v.nome_guerra || v.nome_completo || 'Militar Indefinido',
          opm: displayOPM,
          home_opm: mil?.opm || v.opm || 'OPM Base',
          motorista: v.motorista_req !== undefined ? v.motorista_req : v.motorista,
          count6h: 0,
          count8h: 0,
        };
      }
    });

    // 2. Adicionar/Contabilizar quem executou serviços
    servicosData.forEach(s => {
      const sId = s.id_militar || s.militar_id;
      if (!sId) return;

      const idKey = String(sId);
      const opmExec = s.opm_origem || 'OPM Indefinida';

      // Filtro de OPM por Aba Dinâmica
      if (activeTab !== 'geral' && opmExec !== activeTab) return;

      const displayOPM = activeTab === 'geral' ? 'Consolidado' : opmExec;
      const uniqueKey = activeTab === 'geral' ? idKey : `${idKey}_${opmExec}`;

      if (!map[uniqueKey]) {
        const mil = fullEfetivo.find(e => String(e.id_militar) === idKey || String(e.id) === idKey);
        map[uniqueKey] = {
          id: uniqueKey,
          militar_id: idKey,
          numero_ordem: mil?.matricula || s.matricula || idKey,
          rank: mil?.posto_graduacao || s.posto_graduacao || '',
          name: mil?.nome_guerra || s.nome_guerra || mil?.nome_completo || 'Desconhecido',
          opm: displayOPM,
          home_opm: mil?.opm || 'OPM Base',
          motorista: mil?.motorista || false,
          count6h: 0,
          count8h: 0,
        };
      }

      if (map[uniqueKey]) {
        if (Number(s.carga_horaria) === 8) {
          map[uniqueKey].count8h += 1;
        } else {
          map[uniqueKey].count6h += 1;
        }
      }
    });

    const result = Object.values(map)
      .map(item => {
        const valor6h = parseFloat(tiposServico.find(t => Number(t.carga_horaria) === 6)?.valor_remuneracao || 0);
        const valor8h = parseFloat(tiposServico.find(t => Number(t.carga_horaria) === 8)?.valor_remuneracao || 0);

        return {
          ...item,
          total: item.count6h + item.count8h,
          remaining: Math.max(0, MAX_SERVICES - (item.count6h + item.count8h)),
          valorTotal: (item.count6h * valor6h) + (item.count8h * valor8h),
        };
      })
      // Exibir apenas quem efetivamente possui serviços executados (total > 0)
      .filter(item => item && item.name && item.total > 0);

    result.sort((a, b) =>
      // Primário: quem tem mais serviços
      b.total - a.total ||
      // Secundário: maior hierarquia primeiro
      compareByRank(a.rank, b.rank) ||
      // Terciário: alfabético
      a.name.localeCompare(b.name)
    );
    setStats(result);
  };

  const totalServicos = stats.reduce((acc, s) => acc + s.total, 0);
  const totalHoras6 = stats.reduce((acc, s) => acc + s.count6h, 0);
  const totalHoras8 = stats.reduce((acc, s) => acc + s.count8h, 0);
  const matchingCycle = ciclos.find(c => String(c.id_ciclo) === String(selectedCiclo));

  const orcamentoCiclo = selectedCiclo === 'all'
    ? ciclos.reduce((acc, c) => acc + parseFloat(c.valor_total_previsto || 0), 0)
    : parseFloat(matchingCycle?.valor_total_previsto || 0);

  const recursoUtilizado = stats.reduce((acc, s) => acc + s.valorTotal, 0);
  const recursoRestante = orcamentoCiclo - recursoUtilizado;

  const militaresPertoLimite = useMemo(() => {
    const targetOpm = matchingCycle?.opm_sigla || '9º BPM';
    const isTargetOpm = (opm) => {
      if (!opm) return false;
      const norm = opm.trim().toUpperCase().replace(/º/g, 'O');
      const normTarget = targetOpm.trim().toUpperCase().replace(/º/g, 'O');
      return norm === normTarget || norm.replace(/\s/g, '') === normTarget.replace(/\s/g, '');
    };

    const targetOpmCounts = {};
    servicos.forEach(s => {
      const milId = String(s.id_militar);
      const execOpm = s.opm_origem || '';
      if (isTargetOpm(execOpm)) {
        if (!targetOpmCounts[milId]) {
          targetOpmCounts[milId] = { total: 0 };
        }
        targetOpmCounts[milId].total += 1;
      }
    });

    const pertoLimite = [];
    Object.entries(targetOpmCounts).forEach(([milId, data]) => {
      if (data.total >= 7) {
        const mil = efetivo.find(e => String(e.id_militar) === milId);
        if (mil) {
          pertoLimite.push({
            rank: mil.posto_graduacao || '',
            name: mil.nome_guerra || mil.nome_completo || 'Militar Indefinido',
            total: data.total,
            remaining: Math.max(0, MAX_SERVICES - data.total)
          });
        }
      }
    });
    return pertoLimite.sort((a, b) => b.total - a.total);
  }, [servicos, efetivo, matchingCycle]);

  const outrasOpmData = useMemo(() => {
    const targetOpm = matchingCycle?.opm_sigla || '9º BPM';
    if (!selectedCiclo || servicos.length === 0 || efetivo.length === 0) {
      return { list: [], totalValue: 0 };
    }

    const isTargetOpm = (opm) => {
      if (!opm) return false;
      const norm = opm.trim().toUpperCase().replace(/º/g, 'O');
      const normTarget = targetOpm.trim().toUpperCase().replace(/º/g, 'O');
      return norm === normTarget || norm.replace(/\s/g, '') === normTarget.replace(/\s/g, '');
    };

    const filteredServices = servicos.filter(s => {
      const mil = efetivo.find(e => String(e.id_militar) === String(s.id_militar));
      const homeOpm = mil?.opm || '';
      const execOpm = s.opm_origem || '';

      return isTargetOpm(execOpm) && !isTargetOpm(homeOpm) && homeOpm !== '';
    });

    const groups = {};
    let totalValue = 0;

    filteredServices.forEach(s => {
      const milId = String(s.id_militar);
      const mil = efetivo.find(e => String(e.id_militar) === milId);
      if (!groups[milId]) {
        groups[milId] = {
          militar_id: milId,
          nome_guerra: mil?.nome_guerra || s.nome_guerra || 'Desconhecido',
          nome_completo: mil?.nome_completo || 'Militar Indefinido',
          posto_graduacao: mil?.posto_graduacao || s.posto_graduacao || '',
          home_opm: mil?.opm || 'Outra OPM',
          cpf: mil?.cpf || '---',
          servicesCount: 0,
          totalValue: 0
        };
      }

      const val = parseFloat(s.valor_remuneracao || 0);
      groups[milId].servicesCount += 1;
      groups[milId].totalValue += val;
      totalValue += val;
    });

    const list = Object.values(groups).sort((a, b) => compareByRank(a.posto_graduacao, b.posto_graduacao));

    return { list, totalValue };
  }, [selectedCiclo, servicos, efetivo, matchingCycle]);


  const reportOpmDebits = useMemo(() => {
    const debits = { ...memoData.OpmDebits };
    const targetOpm = matchingCycle?.opm_sigla || '9º BPM';
    const isTargetOpm = (opm) => {
      if (!opm) return false;
      const norm = opm.trim().toUpperCase().replace(/º/g, 'O');
      const normTarget = targetOpm.trim().toUpperCase().replace(/º/g, 'O');
      return norm === normTarget || norm.replace(/\s/g, '') === normTarget.replace(/\s/g, '');
    };

    let targetOpmValue = 0;
    servicos.forEach(s => {
      const mil = efetivo.find(e => String(e.id_militar) === String(s.id_militar));
      const homeOpm = mil?.opm || '';
      const execOpm = s.opm_origem || '';
      if (isTargetOpm(homeOpm) && isTargetOpm(execOpm)) {
        targetOpmValue += parseFloat(s.valor_remuneracao || 0);
      }
    });

    if (targetOpmValue > 0) {
      debits[targetOpm] = targetOpmValue;
    }
    return debits;
  }, [memoData.OpmDebits, servicos, efetivo, matchingCycle]);

  const reportTotalDebitsValue = useMemo(() => {
    return Object.values(reportOpmDebits).reduce((sum, v) => sum + v, 0);
  }, [reportOpmDebits]);

  // Lista dinâmica de OPMs para as abas
  const availableOpms = Array.from(new Set(servicos.map(s => s.opm_origem).filter(Boolean))).sort();

  const formatarValor = (valor) => {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const getStatusColor = (total) => {
    const pct = total / MAX_SERVICES;
    if (pct >= 1) return '#ef4444';    // vermelho - lotado
    if (pct >= 0.75) return '#f59e0b'; // amarelo - quase no limite
    if (pct >= 0.25) return '#10b981'; // verde - normal
    return '#94a3b8';                  // cinza - poucos serviços
  };

  const getStatusLabel = (total) => {
    const pct = total / MAX_SERVICES;
    if (pct >= 1) return { text: 'Limite atingido', color: '#ef4444' };
    if (pct >= 0.75) return { text: 'Quase no limite', color: '#f59e0b' };
    if (pct > 0) return { text: 'Em dia', color: '#10b981' };
    return { text: 'Sem serviços', color: '#94a3b8' };
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    const element = document.getElementById('memo-a4-page');
    if (!element) return;

    let originalExibitions = [];
    const createdSpacers = [];

    try {
      // 1. Temporarily hide 'no-print' elements
      const noPrintElements = element.querySelectorAll('.no-print');
      originalExibitions = Array.from(noPrintElements).map(el => el.style.display);
      noPrintElements.forEach(el => el.style.display = 'none');

      element.classList.add('generating-pdf');

      // 2. Prevent table/block split across pages dynamically
      const A4_PAGE_HEIGHT = element.offsetWidth * (297 / 210);
      const blocksToCheck = element.querySelectorAll('.bloco-militar-memo');

      const getRelativeTop = (el, container) => {
        const rectEl = el.getBoundingClientRect();
        const rectContainer = container.getBoundingClientRect();
        return rectEl.top - rectContainer.top;
      };

      blocksToCheck.forEach(block => {
        const top = getRelativeTop(block, element);
        const height = block.offsetHeight;

        const startPage = Math.floor(top / A4_PAGE_HEIGHT);
        const endPage = Math.floor((top + height) / A4_PAGE_HEIGHT);
        const marginPixels = element.offsetWidth * (20 / 210); // 20mm margin

        if (startPage !== endPage && height < A4_PAGE_HEIGHT - marginPixels * 2) {
          const remainingSpace = (startPage + 1) * A4_PAGE_HEIGHT - top + marginPixels;

          const spacer = document.createElement('div');
          spacer.className = 'pdf-spacer-memo';
          spacer.style.height = `${remainingSpace}px`;
          spacer.style.width = '100%';
          spacer.style.backgroundColor = 'transparent';
          spacer.style.margin = '0';
          spacer.style.padding = '0';
          spacer.style.border = 'none';

          block.parentNode.insertBefore(spacer, block);
          createdSpacers.push(spacer);
        }
      });

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
      const pageHeight = 297;
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

      const filename = `Memorando_SVR_${selectedCicloText.replace(/[\s\/]/g, '_')}.pdf`;
      pdf.save(filename);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF: ' + error.message);
    } finally {
      // 3. Restore visibility of 'no-print' elements
      const noPrintElements = element.querySelectorAll('.no-print');
      noPrintElements.forEach((el, index) => {
        if (originalExibitions[index] !== undefined) {
          el.style.display = originalExibitions[index];
        }
      });

      element.classList.remove('generating-pdf');

      // 4. Remove temporary spacers
      createdSpacers.forEach(spacer => {
        if (spacer && spacer.parentNode) {
          spacer.parentNode.removeChild(spacer);
        }
      });
    }
  };

  const selectedCicloText = selectedCiclo === 'all'
    ? 'Todos os Ciclos'
    : (ciclos.find(c => String(c.id_ciclo) === String(selectedCiclo))?.period_name ||
      ciclos.find(c => String(c.id_ciclo) === String(selectedCiclo))?.periodo_ciclo ||
      'Selecione o Ciclo');

  return (
    <div className="container analytics-container" style={{ maxWidth: '1350px' }}>
      <style>{`
        .analytics-container {
          padding: 1rem;
          animation: fadeIn 0.5s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          gap: 1.5rem;
        }
        .tab-bar {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 0px;
          overflow-x: auto;
          scrollbar-width: none;
        }
        .tab-bar::-webkit-scrollbar { display: none; }
        
        .tab-button {
          padding: 0.75rem 2rem;
          border: none;
          background: transparent;
          color: var(--text-muted);
          cursor: pointer;
          font-weight: 600;
          font-size: 0.95rem;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          white-space: nowrap;
        }
        .tab-button.active {
          color: var(--primary);
        }
        .tab-button.active::after {
          content: '';
          position: absolute;
          bottom: -1px;
          left: 0;
          width: 100%;
          height: 3px;
          background: var(--primary);
          border-radius: 3px 3px 0 0;
          box-shadow: 0 -2px 10px rgba(13, 56, 120, 0.3);
        }
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1.5rem;
          margin-bottom: 2rem;
        }
        
        @media (max-width: 1200px) {
          .kpi-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 768px) {
          .dashboard-header { flex-direction: column; align-items: stretch; }
          .header-controls { flex-direction: column; }
          .kpi-grid { grid-template-columns: 1fr; }
          .search-box { width: 100% !important; }
          .cycle-selector { width: 100% !important; min-width: unset !important; }
        }
      `}</style>
      {/* Cabeçalho */}
      <div className="dashboard-header">
        <div>
          <h2 style={{ margin: 0, fontSize: 'clamp(1.25rem, 4vw, 1.75rem)' }}>
            Analítico SVR - Ciclo Ativo:{' '}
            <span
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              style={{
                color: 'var(--primary)',
                cursor: 'pointer',
                borderBottom: '2px dashed var(--primary)',
                paddingBottom: '2px',
                transition: 'all 0.2s',
              }}
            >
              {selectedCicloText}
            </span>
          </h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem', fontSize: '0.9rem' }}>
            Contagem de serviços por militar · Limite mensal: {MAX_SERVICES} serviços
          </p>
        </div>
        <div className="header-controls" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button
            onClick={() => setShowReportModal(true)}
            className="btn btn-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1.25rem',
              cursor: 'pointer',
              background: 'linear-gradient(135deg, #0d3878 0%, #1e3a8a 100%)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              fontWeight: 'bold',
              boxShadow: '0 4px 12px rgba(13, 56, 120, 0.2)',
            }}
          >
            <TrendingUp size={18} />
            <span>Publicar Relatório Analítico</span>
          </button>
          <button
            onClick={() => setShowMemoModal(true)}
            className="btn btn-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1.25rem',
              cursor: 'pointer',
              background: 'linear-gradient(135deg, #0d3878 0%, #1e3a8a 100%)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              fontWeight: 'bold',
              boxShadow: '0 4px 12px rgba(13, 56, 120, 0.2)',
            }}
          >
            <FileText size={18} />
            <span>Publicar Memorando SVR</span>
          </button>
          {/* Dropdown de Ciclos Glassmorphism */}
          <div style={{ position: 'relative' }} className="cycle-selector">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="glass-panel"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.65rem 1.25rem',
                cursor: 'pointer',
                border: '1px solid var(--primary)',
                background: 'white',
                borderRadius: '8px',
                color: 'var(--primary)',
                fontWeight: 600,
                fontSize: '0.9rem',
                minWidth: '220px',
                justifyContent: 'space-between',
                boxShadow: '0 4px 12px rgba(13, 56, 120, 0.1)',
              }}
            >
              <span>{selectedCicloText}</span>
              <RefreshCw size={16} className={loading ? 'spin' : ''} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            </button>

            {isDropdownOpen && (
              <>
                <div
                  onClick={() => setIsDropdownOpen(false)}
                  style={{ position: 'fixed', inset: 0, zIndex: 998 }}
                />
                <div
                  className="glass-panel"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    width: '100%',
                    zIndex: 999,
                    padding: '0.5rem',
                    background: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid var(--border-color)',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                    animation: 'slideUp 0.2s ease-out'
                  }}
                >
                  <div
                    onClick={() => {
                      setSelectedCiclo('all');
                      setIsDropdownOpen(false);
                    }}
                    style={{
                      padding: '0.75rem 1rem',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      background: selectedCiclo === 'all' ? 'var(--primary)' : 'transparent',
                      color: selectedCiclo === 'all' ? 'white' : 'var(--text-main)',
                      fontWeight: selectedCiclo === 'all' ? 700 : 500,
                      transition: 'all 0.2s ease',
                      borderBottom: '1px solid #f1f5f9',
                      marginBottom: '4px'
                    }}
                    onMouseEnter={(e) => {
                      if (selectedCiclo !== 'all') e.currentTarget.style.background = '#f1f5f9';
                    }}
                    onMouseLeave={(e) => {
                      if (selectedCiclo !== 'all') e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    Todos os Ciclos (Consolidado)
                  </div>

                  {ciclos.map(ciclo => (
                    <div
                      key={ciclo.id_ciclo}
                      onClick={() => {
                        setSelectedCiclo(ciclo.id_ciclo);
                        setIsDropdownOpen(false);
                      }}
                      style={{
                        padding: '0.75rem 1rem',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        background: String(selectedCiclo) === String(ciclo.id_ciclo) ? 'var(--primary)' : 'transparent',
                        color: String(selectedCiclo) === String(ciclo.id_ciclo) ? 'white' : 'var(--text-main)',
                        fontWeight: String(selectedCiclo) === String(ciclo.id_ciclo) ? 700 : 500,
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (String(selectedCiclo) !== String(ciclo.id_ciclo)) {
                          e.currentTarget.style.background = '#f1f5f9';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (String(selectedCiclo) !== String(ciclo.id_ciclo)) {
                          e.currentTarget.style.background = 'transparent';
                        }
                      }}
                    >
                      {ciclo.period_name || ciclo.periodo_ciclo || `Ciclo ${ciclo.id_ciclo}`}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Abas de Navegação */}
      <div className="tab-bar">
        <button
          onClick={() => setActiveTab('geral')}
          className={`tab-button ${activeTab === 'geral' ? 'active' : ''}`}
        >
          Geral (Total)
        </button>

        {availableOpms.map(opm => (
          <button
            key={opm}
            onClick={() => setActiveTab(opm)}
            className={`tab-button ${activeTab === opm ? 'active' : ''}`}
          >
            {opm}
          </button>
        ))}
      </div>

      {/* KPIs */}
      <div className="kpi-grid" style={{
        opacity: isRefreshing ? 0.6 : 1,
        transform: isRefreshing ? 'scale(0.995)' : 'scale(1)',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
      }}>
        {[
          { icon: <TrendingUp size={22} color="#0D3878" />, label: 'Recurso Utilizado', value: formatarValor(recursoUtilizado), color: '#0D3878' },
          { icon: <Clock size={22} color="#10b981" />, label: 'SVR de 6 Horas', value: totalHoras6, color: '#10b981' },
          { icon: <Clock size={22} color="#f59e0b" />, label: 'SVR de 8 Horas', value: totalHoras8, color: '#f59e0b' },
          { icon: <Wallet size={22} color="#059669" />, label: 'Recurso Restante', value: formatarValor(recursoRestante), color: '#059669' },
        ].map(kpi => (
          <div key={kpi.label} className="glass-panel" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            padding: '1.25rem 1.5rem',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {isRefreshing && (
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(255,255,255,0.2)',
                backdropFilter: 'blur(2px)',
                zIndex: 1
              }} />
            )}
            <div style={{ background: `${kpi.color}15`, padding: '0.75rem', borderRadius: '10px' }}>{kpi.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{kpi.label}</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: kpi.color, lineHeight: 1.2 }}>{kpi.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.25rem' }}>
        <div className="search-container search-box" style={{ width: '300px' }}>
          <input
            type="text"
            className="search-input"
            placeholder="Buscar por nome ou matrícula..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          <Search size={18} className="search-icon" />
        </div>
      </div>

      {/* Tabela de Dados */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '10rem' }}>
          <RefreshCw size={48} className="spin" style={{ color: 'var(--primary)', opacity: 0.5 }} />
          <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Sincronizando dados...</p>
        </div>
      ) : (
        <div style={{ opacity: isRefreshing ? 0.5 : 1, transition: 'opacity 0.3s' }}>
          {stats.length === 0 ? (
            <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem' }}>
              <AlertTriangle size={48} color="#f59e0b" style={{ marginBottom: '1rem' }} />
              <p style={{ color: 'var(--text-muted)' }}>Nenhum dado encontrado para este ciclo.</p>
            </div>
          ) : (
            <div className="table-premium-wrapper">
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th style={{ whiteSpace: 'nowrap' }}>#</th>
                    <th onClick={() => requestSort('numero_ordem')} style={{ whiteSpace: 'nowrap', cursor: 'pointer' }}>
                      N° Ordem {sortConfig.key === 'numero_ordem' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th onClick={() => requestSort('name')} style={{ whiteSpace: 'nowrap', cursor: 'pointer' }}>
                      Posto / Nome {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th style={{ whiteSpace: 'nowrap' }}>OPM</th>
                    <th style={{ whiteSpace: 'nowrap' }}>Motorista</th>
                    <th onClick={() => requestSort('count6h')} style={{ whiteSpace: 'nowrap', cursor: 'pointer' }}>
                      SVR 6h {sortConfig.key === 'count6h' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th onClick={() => requestSort('count8h')} style={{ whiteSpace: 'nowrap', cursor: 'pointer' }}>
                      SVR 8h {sortConfig.key === 'count8h' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th onClick={() => requestSort('total')} style={{ whiteSpace: 'nowrap', cursor: 'pointer' }}>
                      Total SVRs {sortConfig.key === 'total' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th onClick={() => requestSort('remaining')} style={{ whiteSpace: 'nowrap', cursor: 'pointer' }}>
                      Restantes {sortConfig.key === 'remaining' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th onClick={() => requestSort('valorTotal')} style={{ whiteSpace: 'nowrap', cursor: 'pointer' }}>
                      Valor Total {sortConfig.key === 'valorTotal' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th style={{ whiteSpace: 'nowrap' }}>Situação</th>
                    <th style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>Progresso</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedStats.map((s, idx) => {
                    const status = getStatusLabel(s.total);
                    const pct = Math.min(100, (s.total / MAX_SERVICES) * 100);
                    return (
                      <tr key={s.id} style={{ background: idx % 2 === 0 ? 'white' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '0.85rem 0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{idx + 1}</td>
                        <td style={{ padding: '0.85rem 0.75rem' }}>
                          <span style={{ background: '#e8eef7', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)' }}>
                            {s.numero_ordem}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 0.75rem' }}>
                          <div style={{ fontWeight: 600 }}>{s.rank} {s.name}</div>
                        </td>
                        <td style={{ padding: '0.85rem 0.75rem' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{s.opm}</span>
                        </td>
                        <td style={{ padding: '0.85rem 0.75rem' }}>
                          {(s.motorista === 'Sim' || s.motorista === true)
                            ? <span style={{ background: '#10b981', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>SIM</span>
                            : <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Não</span>
                          }
                        </td>
                        <td style={{ padding: '0.85rem 0.75rem', textAlign: 'center' }}>
                          <span style={{ fontWeight: 700, color: '#10b981', fontSize: '1rem' }}>{s.count6h}</span>
                        </td>
                        <td style={{ padding: '0.85rem 0.75rem', textAlign: 'center' }}>
                          <span style={{ fontWeight: 700, color: '#f59e0b', fontSize: '1rem' }}>{s.count8h}</span>
                        </td>
                        <td style={{ padding: '0.85rem 0.75rem', textAlign: 'center' }}>
                          <span style={{ fontWeight: 800, color: getStatusColor(s.total), fontSize: '1.1rem' }}>{s.total}</span>
                        </td>
                        <td style={{ padding: '0.85rem 0.75rem', textAlign: 'center' }}>
                          <span style={{ fontWeight: 700, color: s.remaining === 0 ? '#ef4444' : '#0D3878' }}>{s.remaining}</span>
                        </td>
                        <td style={{ padding: '0.85rem 0.75rem', textAlign: 'center' }}>
                          <span style={{ fontWeight: 700, color: '#059669', fontSize: '0.95rem' }}>{formatarValor(s.valorTotal)}</span>
                        </td>
                        <td style={{ padding: '0.85rem 0.75rem' }}>
                          <span style={{ background: `${status.color}18`, color: status.color, padding: '3px 10px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 600, whiteSpace: 'nowrap', border: `1px solid ${status.color}40` }}>
                            {status.text}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 1.5rem', minWidth: '160px' }}>
                          <div style={{ background: '#e2e8f0', borderRadius: '999px', height: '10px', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
                            <div style={{ width: `${pct}%`, height: '100%', borderRadius: '999px', background: getStatusColor(s.total), transition: 'width 0.4s ease' }} />
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '5px', textAlign: 'center', fontWeight: 600 }}>{s.total} / {MAX_SERVICES}</div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}


      {/* Nota de rodapé */}
      <p style={{ textAlign: 'right', marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        * Contagem baseada nas escalas salvas no Painel Admin. Limite: {MAX_SERVICES} serviços/mês por militar.
      </p>

      {/* Print Specific CSS */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #memo-a4-page, #memo-a4-page * {
            visibility: visible;
          }
          #memo-a4-page {
            position: absolute;
            left: 0;
            top: 0;
            width: 210mm;
            min-height: 297mm;
            margin: 0;
            padding: 20mm;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
          }
        }
        
        /* Styles applied during PDF generation to scale down fonts and spacing */
        .generating-pdf {
          font-size: 9.5pt !important;
          line-height: 1.4 !important;
        }
        .generating-pdf table {
          font-size: 7.5pt !important;
        }
        .generating-pdf th, .generating-pdf td {
          padding: 4px 3px !important;
        }
        .generating-pdf .bloco-militar-memo {
          margin-bottom: 12px !important;
        }
        .generating-pdf .bloco-relatorio-analitico {
          margin-bottom: 15px !important;
        }
        .generating-pdf h1 {
          font-size: 18pt !important;
        }
        .generating-pdf h2 {
          font-size: 11pt !important;
        }
        .generating-pdf h3 {
          font-size: 10pt !important;
        }
        .generating-pdf h4 {
          font-size: 9pt !important;
        }
      `}</style>

      {/* SVR Memorandum Modal */}
      {showMemoModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(8px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
        }}>
          <div style={{
            background: '#f8fafc',
            borderRadius: '16px',
            width: '95vw',
            height: '90vh',
            maxWidth: '1250px',
            display: 'flex',
            flexDirection: 'row',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid #e2e8f0',
            animation: 'fadeIn 0.2s ease-out'
          }}>
            {/* Sidebar Controls (Left) */}
            <div style={{
              width: '340px',
              padding: '1.5rem',
              background: 'white',
              borderRight: '1px solid #e2e8f0',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
              flexShrink: 0
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
                <h3 style={{ margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText size={20} color="var(--primary)" />
                  Gerador SVR
                </h3>
                <button
                  onClick={() => setShowMemoModal(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Form Inputs */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '4px' }}>Número do Memorando</label>
                  <input
                    type="text"
                    className="form-control"
                    style={{ margin: 0, width: '100%' }}
                    value={memoNumber}
                    onChange={(e) => setMemoNumber(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '4px' }}>Data do Memorando</label>
                  <input
                    type="text"
                    className="form-control"
                    style={{ margin: 0, width: '100%' }}
                    value={memoDate}
                    onChange={(e) => setMemoDate(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '4px' }}>Remetente (Comandante)</label>
                  <input
                    type="text"
                    className="form-control"
                    style={{ margin: 0, width: '100%' }}
                    value={memoSender}
                    onChange={(e) => setMemoSender(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '4px' }}>Destinatário</label>
                  <input
                    type="text"
                    className="form-control"
                    style={{ margin: 0, width: '100%' }}
                    value={memoRecipient}
                    onChange={(e) => setMemoRecipient(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '4px' }}>Portaria</label>
                  <input
                    type="text"
                    className="form-control"
                    style={{ margin: 0, width: '100%' }}
                    value={memoPortaria}
                    onChange={(e) => setMemoPortaria(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '4px' }}>Limite CPRS (R$)</label>
                  <input
                    type="number"
                    className="form-control"
                    style={{ margin: 0, width: '100%' }}
                    value={memoCprsLimit}
                    onChange={(e) => setMemoCprsLimit(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: 'auto', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                <button
                  onClick={handleDownloadPDF}
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    border: 'none',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
                  }}
                >
                  <Download size={16} />
                  <span>Baixar PDF Oficial</span>
                </button>


                <button
                  onClick={() => setShowMemoModal(false)}
                  className="btn btn-outline"
                  style={{ width: '100%' }}
                >
                  Fechar
                </button>
              </div>
            </div>

            {/* A4 Preview Panel (Right) */}
            <div style={{
              flex: 1,
              padding: '2.5rem',
              overflowY: 'auto',
              background: '#cbd5e1',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'flex-start'
            }}>
              <div
                id="memo-a4-page"
                style={{
                  width: '210mm',
                  minHeight: '297mm',
                  background: 'white',
                  padding: '25mm 20mm 20mm 20mm',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '11pt',
                  lineHeight: '1.5',
                  color: '#1e293b',
                  textAlign: 'justify',
                  boxSizing: 'border-box',
                  position: 'relative'
                }}
              >
                {/* PDF Print Instruction */}
                <div className="no-print" style={{
                  position: 'absolute',
                  top: '6px',
                  right: '12px',
                  background: '#fef3c7',
                  color: '#d97706',
                  fontSize: '0.7rem',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <span>💡 Clique nos textos pontilhados para editá-los diretamente na folha</span>
                </div>

                {/* Institution Header */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '25px', textAlign: 'center' }}>
                  <div style={{
                    height: '90px',
                    margin: '0 auto 0.75rem auto',
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
                  <div style={{ fontSize: '11pt', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', color: '#0f172a' }}>Estado de Alagoas</div>
                  <div style={{ fontSize: '12pt', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '2px', color: '#0f172a' }}>Polícia Militar de Alagoas</div>
                  <div style={{ fontSize: '10pt', fontStyle: 'italic', color: '#475569', marginTop: '2px' }}>Secretaria do 9º Batalhão de Polícia Militar</div>
                  <div style={{ fontSize: '7.5pt', color: '#64748b', marginTop: '2px' }}>Praça da Independência, 67, - Bairro Centro, Maceió/AL, CEP 57020-000</div>
                  <div style={{ fontSize: '7.5pt', color: '#64748b' }}>Telefone: (82) 3201-2002 - www.pm.al.gov.br</div>
                </div>

                <div style={{ borderBottom: '2px solid #0f172a', width: '100%', marginBottom: '20px' }} />

                {/* Metadata */}
                <div style={{ marginBottom: '20px', fontSize: '11pt', color: '#0f172a', lineHeight: '1.6' }}>
                  <div style={{ textAlign: 'left', marginBottom: '6px' }}>
                    <strong>Memorando n.º E:</strong> <span contentEditable suppressContentEditableWarning style={{ borderBottom: '1px dashed #94a3b8', padding: '0 2px', outline: 'none' }} onBlur={(e) => setMemoNumber(e.target.innerText)}>{memoNumber}</span>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '10.5pt', color: '#475569' }}>
                    Quartel em Delmiro Gouveia/AL, <span contentEditable suppressContentEditableWarning style={{ borderBottom: '1px dashed #94a3b8', padding: '0 2px', outline: 'none' }} onBlur={(e) => setMemoDate(e.target.innerText)}>{memoDate}</span>
                  </div>
                </div>

                {/* Sender/Recipient/Subject */}
                <div style={{ marginBottom: '25px', fontSize: '11pt', lineHeight: '1.6', color: '#1e293b' }}>
                  <div style={{ marginBottom: '6px' }}><strong>Do:</strong> <span contentEditable suppressContentEditableWarning style={{ borderBottom: '1px dashed #94a3b8', padding: '0 2px', outline: 'none' }} onBlur={(e) => setMemoSender(e.target.innerText)}>{memoSender}</span></div>
                  <div style={{ marginBottom: '6px' }}><strong>Ao:</strong> <span contentEditable suppressContentEditableWarning style={{ borderBottom: '1px dashed #94a3b8', padding: '0 2px', outline: 'none' }} onBlur={(e) => setMemoRecipient(e.target.innerText)}>{memoRecipient}</span></div>
                  <div><strong>Assunto:</strong> Policiais Lotados no 9º BPM Que Executaram Serviços de FT em Outras Unidades ({selectedCicloText})</div>
                </div>

                {/* Body Content */}
                <div style={{ marginBottom: '20px', fontSize: '10.5pt', lineHeight: '1.6', color: '#334155' }}>
                  <p>Senhor Comandante,</p>
                  <p style={{ textIndent: '20mm', marginTop: '10px', textAlign: 'justify' }}>
                    Sirvo-me do presente expediente para informar a Vossa Senhoria acerca do registro dos serviços executados por militares lotados no 9º BPM em outras unidades, com o objetivo de detalhar a alocação de recursos e assegurar o fiel cumprimento da <strong>{memoPortaria}</strong>.
                  </p>
                  <p style={{ textIndent: '20mm', marginTop: '10px', textAlign: 'justify' }}>
                    Informo ainda que os militares abaixo relacionados, lotados no 9º Batalhão de Polícia Militar de Alagoas, executaram Serviços Voluntários Remunerados, na modalidade Força Tarefa, em outras Unidades operacionais, conforme designações e planejamento operacional das respectivas Unidades, no período do ciclo de referência.
                  </p>
                </div>

                {/* Table list */}
                {memoData.list.length === 0 ? (
                  <div style={{ border: '1px dashed #cbd5e1', padding: '2rem', textAlign: 'center', color: '#64748b', fontSize: '10pt', borderRadius: '8px', marginBottom: '20px' }}>
                    Nenhum militar lotado no 9º BPM executou serviços de SVR fora da unidade de origem neste ciclo.
                  </div>
                ) : (
                  memoData.list.map((m, midx) => (
                    <div key={midx} className="bloco-militar-memo" style={{ marginBottom: '25px', pageBreakInside: 'avoid' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '10pt', marginBottom: '6px', textTransform: 'uppercase', color: '#0f172a' }}>
                        {m.posto_graduacao} {m.nome_completo} (CPF: {m.cpf})
                      </div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8pt', marginBottom: '6px' }}>
                        <thead>
                          <tr style={{ background: '#0f172a' }}>
                            <th style={{ border: '1px solid #0f172a', padding: '6px 4px', textAlign: 'center', width: '40px', fontWeight: '700', color: 'white', textTransform: 'uppercase', fontSize: '7.5pt', letterSpacing: '0.05em' }}>GRAD</th>
                            <th style={{ border: '1px solid #0f172a', padding: '6px 4px', textAlign: 'left', fontWeight: '700', color: 'white', textTransform: 'uppercase', fontSize: '7.5pt', letterSpacing: '0.05em' }}>NOME</th>
                            <th style={{ border: '1px solid #0f172a', padding: '6px 4px', textAlign: 'center', width: '90px', fontWeight: '700', color: 'white', textTransform: 'uppercase', fontSize: '7.5pt', letterSpacing: '0.05em' }}>CPF</th>
                            <th style={{ border: '1px solid #0f172a', padding: '6px 4px', textAlign: 'center', width: '75px', fontWeight: '700', color: 'white', textTransform: 'uppercase', fontSize: '7.5pt', letterSpacing: '0.05em' }}>DATA</th>
                            <th style={{ border: '1px solid #0f172a', padding: '6px 4px', textAlign: 'center', width: '60px', fontWeight: '700', color: 'white', textTransform: 'uppercase', fontSize: '7.5pt', letterSpacing: '0.05em' }}>OPM</th>
                            <th style={{ border: '1px solid #0f172a', padding: '6px 4px', textAlign: 'center', width: '85px', fontWeight: '700', color: 'white', textTransform: 'uppercase', fontSize: '7.5pt', letterSpacing: '0.05em' }}>MODALIDADE</th>
                            <th style={{ border: '1px solid #0f172a', padding: '6px 4px', textAlign: 'center', width: '80px', fontWeight: '700', color: 'white', textTransform: 'uppercase', fontSize: '7.5pt', letterSpacing: '0.05em' }}>GUARNIÇÃO</th>
                            <th style={{ border: '1px solid #0f172a', padding: '6px 4px', textAlign: 'right', width: '65px', fontWeight: '700', color: 'white', textTransform: 'uppercase', fontSize: '7.5pt', letterSpacing: '0.05em' }}>VALOR</th>
                          </tr>
                        </thead>
                        <tbody>
                          {m.services.map((s, sidx) => (
                            <tr key={sidx}>
                              <td style={{ border: '1px solid #e2e8f0', padding: '6px 4px', textAlign: 'center', color: '#334155' }}>{m.posto_graduacao}</td>
                              <td style={{ border: '1px solid #e2e8f0', padding: '6px 4px', color: '#334155' }}>{m.nome_guerra}</td>
                              <td style={{ border: '1px solid #e2e8f0', padding: '6px 4px', textAlign: 'center', color: '#334155' }}>{m.cpf}</td>
                              <td style={{ border: '1px solid #e2e8f0', padding: '6px 4px', textAlign: 'center', color: '#334155' }}>{formatDateDisplay(s.data_execucao)}</td>
                              <td style={{ border: '1px solid #e2e8f0', padding: '6px 4px', textAlign: 'center', color: '#334155' }}>{s.opm_origem}</td>
                              <td style={{ border: '1px solid #e2e8f0', padding: '6px 4px', textAlign: 'center', color: '#334155' }}>{s.modalidade}</td>
                              <td style={{ border: '1px solid #e2e8f0', padding: '6px 4px', textAlign: 'center', color: '#334155' }}>{s.guarnicao}</td>
                              <td style={{ border: '1px solid #e2e8f0', padding: '6px 4px', textAlign: 'right', fontWeight: 600, color: '#334155' }}>{formatarValor(s.valor)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div style={{ fontSize: '9pt', fontWeight: 'bold', fontStyle: 'italic', textAlign: 'right', paddingRight: '4px', color: '#475569' }}>
                        - SENDO {m.services.length} SERVIÇO(S) DE FORÇA TAREFA DE {m.services[0]?.carga_horaria}h, TOTALIZANDO UM VALOR DE {formatarValor(m.totalValue)}
                      </div>
                    </div>
                  ))
                )}

                {/* Final Block (Distribution + Summary + Closing + Signature) - Kept together on a single page */}
                <div className="bloco-militar-memo" style={{ pageBreakInside: 'avoid' }}>
                  {/* Budget Distribution Paragraph */}
                  {Object.keys(memoData.OpmDebits).length > 0 && (
                    <div style={{ marginTop: '25px', marginBottom: '20px', fontSize: '10.5pt', lineHeight: '1.6', color: '#334155' }}>
                      <p style={{ textAlign: 'justify' }}>
                        Em conformidade com o §1º do Art. 3º da <strong>{memoPortaria}</strong>, que estabelece que o valor correspondente ao SVR executado por militar fora de sua Unidade de origem, deverá ser debitado da cota orçamentária da Unidade que autorizou a execução, informamos a distribuição dos valores conforme segue:
                      </p>
                      <ul style={{ listStyleType: 'none', paddingLeft: '20mm', marginTop: '10px' }}>
                        {Object.entries(memoData.OpmDebits).map(([opm, val]) => (
                          <li key={opm} style={{ marginBottom: '6px' }}>
                            <strong>{opm}:</strong> {formatarValor(val)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Additional Summary Paragraph */}
                  <div style={{ marginBottom: '30px', fontSize: '10.5pt', lineHeight: '1.6', color: '#334155' }}>
                    <p style={{ textAlign: 'justify' }}>
                      Adicionalmente, informamos que, no mesmo período, a execução da Força Tarefa por militares no 9º BPM e militares de outras unidades que executaram serviços de FT no âmbito de nossa área de atuação, gerou o montante de {formatarValor(recursoUtilizado)} valor este compatível com o limite orçamentário que é de {formatarValor(memoCprsLimit)} estabelecido por este Grande Comando CPRS.
                    </p>
                  </div>

                  {/* Closing & Signatures */}
                  <div style={{ textAlign: 'center', marginTop: '40px', fontSize: '11pt', color: '#0f172a' }}>
                    <p>Respeitosamente,</p>
                    <div style={{ marginTop: '30px', fontWeight: 'bold' }}>
                      <span contentEditable suppressContentEditableWarning style={{ borderBottom: '1px dashed #94a3b8', padding: '0 2px', outline: 'none' }} onBlur={(e) => setMemoSender(e.target.innerText)}>{memoSender}</span>
                    </div>
                    <p>Comandante do 9º BPM</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SVR Report Modal */}
      {showReportModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(8px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
        }}>
          <div style={{
            background: '#f8fafc',
            borderRadius: '16px',
            width: '95vw',
            height: '90vh',
            maxWidth: '1250px',
            display: 'flex',
            flexDirection: 'row',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid #e2e8f0',
            animation: 'fadeIn 0.2s ease-out'
          }}>
            {/* Sidebar Controls (Left) */}
            <div style={{
              width: '340px',
              padding: '1.5rem',
              background: 'white',
              borderRight: '1px solid #e2e8f0',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
              flexShrink: 0
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
                <h3 style={{ margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <TrendingUp size={20} color="var(--primary)" />
                  Relatório Analítico
                </h3>
                <button
                  onClick={() => setShowReportModal(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                >
                  <X size={20} />
                </button>
              </div>

              <div style={{ fontSize: '0.9rem', color: '#64748b', lineHeight: '1.5' }}>
                Visualize e publique o relatório analítico de gestão contendo o resumo operacional, limites regulamentares, débitos por OPM e relação nominal completa.
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: 'auto', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                <button
                  onClick={handleDownloadReportPDF}
                  className="btn btn-primary"
                  disabled={pdfLoading}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    background: 'linear-gradient(135deg, #0d3878 0%, #1e3a8a 100%)',
                    border: 'none',
                    boxShadow: '0 4px 12px rgba(13, 56, 120, 0.2)'
                  }}
                >
                  <Download size={16} />
                  <span>{pdfLoading ? 'Gerando PDF...' : 'Salvar em PDF'}</span>
                </button>

                <button
                  onClick={() => setShowReportModal(false)}
                  className="btn btn-outline"
                  style={{ width: '100%' }}
                >
                  Fechar
                </button>
              </div>
            </div>

            {/* A4 Preview Panel (Right) */}
            <div style={{
              flex: 1,
              padding: '2.5rem',
              overflowY: 'auto',
              background: '#cbd5e1',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'flex-start'
            }}>
              <div
                id="relatorio-analitico-container"
                style={{
                  width: '210mm',
                  minHeight: '297mm',
                  background: 'white',
                  padding: '25mm 20mm 20mm 20mm',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '11pt',
                  lineHeight: '1.5',
                  color: '#1e293b',
                  textAlign: 'justify',
                  boxSizing: 'border-box',
                  position: 'relative'
                }}
              >
                {/* 1. CAPA */}
                <div className="bloco-relatorio-analitico" style={{ minHeight: '250mm', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderBottom: '2px solid #0d3878', paddingBottom: '40px', marginBottom: '40px' }}>
                  <div style={{ textAlign: 'center', marginTop: '20px' }}>
                    <div style={{ height: '90px', margin: '0 auto 0.75rem auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img src="/brasao_9bpm.png" alt="Brasão 9º BPM" style={{ height: '90px', width: 'auto', objectFit: 'contain' }} />
                    </div>
                    <h3 style={{ margin: '0', color: '#0d3878', letterSpacing: '1px', fontWeight: '700', fontSize: '12pt' }}>POLÍCIA MILITAR DE ALAGOAS</h3>
                    <h4 style={{ margin: '5px 0 0 0', color: '#475569', fontWeight: '500', fontSize: '10pt' }}>9º Batalhão de Polícia Militar — Batalhão de Divisas</h4>
                  </div>

                  <div style={{ textAlign: 'center', margin: '60px 0' }}>
                    <h1 style={{ fontSize: '24pt', color: '#0d3878', margin: '0 0 10px 0', fontWeight: '800' }}>RELATÓRIO ANALÍTICO DE GESTÃO</h1>
                    <h2 style={{ fontSize: '14pt', color: '#009c3b', margin: '0', fontWeight: '600' }}>Controle de Limites, Distribuição por OPM e Efetivo Voluntário</h2>
                    <div style={{ width: '80px', height: '4px', background: '#ffdf00', margin: '20px auto 0 auto' }}></div>
                  </div>

                  <div style={{ fontSize: '10pt', color: '#475569', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px', marginBottom: '6px' }}>
                      <strong>Ciclo/Período:</strong> <span>{selectedCicloText}</span>
                      <strong>Data de Emissão:</strong> <span>{reportDate}</span>
                      <strong>Setor:</strong> <span>P1 - {matchingCycle?.opm_sigla || '9º BPM'}</span>
                    </div>
                  </div>
                </div>

                {/* 2. SUMÁRIO */}
                <div className="bloco-relatorio-analitico" style={{ marginBottom: '40px', paddingBottom: '20px', borderBottom: '1px solid #e2e8f0' }}>
                  <h2 style={{ color: '#0d3878', fontSize: '14pt', borderBottom: '2px solid #0d3878', paddingBottom: '8px', fontWeight: '750' }}>Sumário</h2>
                  <ul style={{ listStyle: 'none', paddingLeft: '0', fontSize: '10pt' }}>
                    {[
                      { t: '1. Controle e Alertas de Limite Regulamentar', p: '01' },
                      { t: '2. Débitos Consolidados por OPM Destinatária', p: '02' },
                      { t: `3. Militares de Outras OPMs em Serviço na ${matchingCycle?.opm_sigla || 'OPM'} do ${selectedCicloText}`, p: '03' },
                      { t: '4. Relação Nominal Completa do Efetivo Voluntário', p: '04' },
                      { t: '5. Recomendações Estratégicas para Gestão de Escalas', p: '05' }
                    ].map((item, idx) => (
                      <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', borderBottom: '1px dotted #cbd5e1' }}>
                        <span>{item.t}</span>
                        <span>Pág. {item.p}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 1. CONTROLE E ALERTAS DE LIMITE */}
                <div className="bloco-relatorio-analitico" style={{ marginBottom: '40px' }}>
                  <h2 style={{ color: '#0d3878', fontSize: '14pt', borderBottom: '2px solid #0d3878', paddingBottom: '8px', fontWeight: '750' }}>1. Controle e Alertas de Limite Regulamentar</h2>
                  <p style={{ fontSize: '10pt', textAlign: 'justify', marginBottom: '15px' }}>
                    Abaixo estão listados os militares que atingiram ou estão na iminência de atingir o teto de <strong>{MAX_SERVICES}</strong> serviços voluntários executados na OPM de referência (<strong>{matchingCycle?.opm_sigla || '9º BPM'}</strong>) neste ciclo. Recomenda-se cautela na distribuição de novas escalas a estes integrantes.
                  </p>
                  {militaresPertoLimite.length === 0 ? (
                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '15px', color: '#166534', fontSize: '9pt' }}>
                      <strong>Excelente!</strong> Nenhum militar ativo do 9º BPM atingiu o limite de {MAX_SERVICES} escalas no período selecionado.
                    </div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '2px solid #cbd5e1' }}>
                          <th style={{ padding: '6px 10px', textAlign: 'left' }}>Posto/Grad</th>
                          <th style={{ padding: '6px 10px', textAlign: 'left' }}>Nome Militar</th>
                          <th style={{ padding: '6px 10px', textAlign: 'center' }}>Total Escalas</th>
                          <th style={{ padding: '6px 10px', textAlign: 'center' }}>Restantes</th>
                          <th style={{ padding: '6px 10px', textAlign: 'right' }}>Situação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {militaresPertoLimite.map((mil, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '6px 10px' }}>{mil.rank}</td>
                            <td style={{ padding: '6px 10px', fontWeight: '500' }}>{mil.name}</td>
                            <td style={{ padding: '6px 10px', textAlign: 'center', fontWeight: '700', color: mil.total >= MAX_SERVICES ? '#ef4444' : '#f59e0b' }}>{mil.total}</td>
                            <td style={{ padding: '6px 10px', textAlign: 'center', fontWeight: '600' }}>{mil.remaining}</td>
                            <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: '600', color: mil.total >= MAX_SERVICES ? '#ef4444' : '#f59e0b' }}>
                              {mil.total >= MAX_SERVICES ? 'Limite Atingido' : 'Quase no Limite'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* 2. DEBITOS POR OPM */}
                <div className="bloco-relatorio-analitico" style={{ marginBottom: '40px' }}>
                  <h2 style={{ color: '#0d3878', fontSize: '14pt', borderBottom: '2px solid #0d3878', paddingBottom: '8px', fontWeight: '750' }}>2. Débitos Consolidados por OPM Destinatária</h2>
                  <p style={{ fontSize: '10pt', textAlign: 'justify', marginBottom: '15px' }}>
                    Relação consolidada dos valores devidos pelas OPMs destinatárias onde policiais prestaram escalas voluntárias, incluindo a própria unidade do ciclo ativo. Estes valores representam o custo de empenho operacional da respectiva unidade:
                  </p>
                  {Object.keys(reportOpmDebits).length === 0 ? (
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '15px', color: '#64748b', fontSize: '9pt' }}>
                      Nenhuma escala externa foi registrada neste ciclo.
                    </div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt' }}>
                      <thead>
                        <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                          <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: '700' }}>OPM Destinatária</th>
                          <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '700' }}>Valor Total a Compensar</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(reportOpmDebits).map(([opm, val]) => (
                          <tr key={opm} style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: '8px 12px', fontWeight: '500' }}>{opm}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '700', color: '#0d3878' }}>{formatarValor(val)}</td>
                          </tr>
                        ))}
                        <tr style={{ background: '#f8fafc', borderTop: '2px solid #cbd5e1', fontWeight: '700' }}>
                          <td style={{ padding: '8px 12px' }}>Total Geral Consolidado</td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', color: '#10b981' }}>{formatarValor(reportTotalDebitsValue)}</td>
                        </tr>
                      </tbody>
                    </table>
                  )}
                </div>

                {/* 3. MILITARES DE OUTRAS OPMS EM SERVIÇO NA OPM DO CICLO */}
                <div className="bloco-relatorio-analitico" style={{ marginBottom: '40px' }}>
                  <h2 style={{ color: '#0d3878', fontSize: '14pt', borderBottom: '2px solid #0d3878', paddingBottom: '8px', fontWeight: '750' }}>3. Militares de Outras OPMs que executaram SVR no {matchingCycle?.opm_sigla || 'OPM'}</h2>
                  <p style={{ fontSize: '10pt', textAlign: 'justify', marginBottom: '15px' }}>
                    Relação nominal de militares pertencentes a outras unidades (OPMs) que executaram Serviço Voluntário Remunerado (SVR) na área de atuação da OPM do ciclo ativo ({matchingCycle?.opm_sigla || '9º BPM'}):
                  </p>
                  {outrasOpmData.list.length === 0 ? (
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '15px', color: '#64748b', fontSize: '9pt' }}>
                      Nenhum militar de outra OPM executou serviços nesta unidade durante este ciclo.
                    </div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8.5pt' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '2px solid #cbd5e1' }}>
                          <th style={{ padding: '6px 8px', textAlign: 'left' }}>Ordem/Matrícula</th>
                          <th style={{ padding: '6px 8px', textAlign: 'left' }}>Posto/Grad</th>
                          <th style={{ padding: '6px 8px', textAlign: 'left' }}>Nome Guerra</th>
                          <th style={{ padding: '6px 8px', textAlign: 'left' }}>OPM Origem</th>
                          <th style={{ padding: '6px 8px', textAlign: 'center' }}>Total Escalas</th>
                          <th style={{ padding: '6px 8px', textAlign: 'right' }}>Valor Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {outrasOpmData.list.map((vol, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '6px 8px' }}>{vol.numero_ordem}</td>
                            <td style={{ padding: '6px 8px' }}>{vol.posto_graduacao}</td>
                            <td style={{ padding: '6px 8px', fontWeight: '500' }}>{vol.nome_guerra}</td>
                            <td style={{ padding: '6px 8px' }}>{vol.home_opm}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'center', fontWeight: '700' }}>{vol.servicesCount}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: '600', color: '#10b981' }}>
                              {formatarValor(vol.totalValue)}
                            </td>
                          </tr>
                        ))}
                        <tr style={{ background: '#f8fafc', borderTop: '2px solid #cbd5e1', fontWeight: '700' }}>
                          <td colSpan={4} style={{ padding: '8px 8px' }}>Total de Outras OPMs</td>
                          <td style={{ padding: '8px 8px', textAlign: 'center' }}>
                            {outrasOpmData.list.reduce((sum, item) => sum + item.servicesCount, 0)}
                          </td>
                          <td style={{ padding: '8px 8px', textAlign: 'right', color: '#10b981' }}>
                            {formatarValor(outrasOpmData.totalValue)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  )}
                </div>

                {/* 4. RELAÇÃO NOMINAL COMPLETA */}
                <div className="bloco-relatorio-analitico" style={{ marginBottom: '40px' }}>
                  <h2 style={{ color: '#0d3878', fontSize: '14pt', borderBottom: '2px solid #0d3878', paddingBottom: '8px', fontWeight: '750' }}>4. Relação Nominal Completa do Efetivo Voluntário</h2>
                  <p style={{ fontSize: '10pt', textAlign: 'justify', marginBottom: '15px' }}>
                    Apresentação de toda a relação nominal de voluntários inscritos no ciclo de escalas, indicando a quantidade de serviços executados e a compensação financeira gerada:
                  </p>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8.5pt' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #cbd5e1' }}>
                        <th style={{ padding: '6px 8px', textAlign: 'left' }}>Ordem</th>
                        <th style={{ padding: '6px 8px', textAlign: 'left' }}>Posto</th>
                        <th style={{ padding: '6px 8px', textAlign: 'left' }}>Nome Guerra</th>
                        <th style={{ padding: '6px 8px', textAlign: 'center' }}>Total Escalas</th>
                        <th style={{ padding: '6px 8px', textAlign: 'right' }}>Total Recebido</th>
                      </tr>
                    </thead>
                    <tbody>
                      {voluntariosConsolidado.map((vol, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '6px 8px' }}>{vol.numero_ordem}</td>
                          <td style={{ padding: '6px 8px' }}>{vol.rank}</td>
                          <td style={{ padding: '6px 8px', fontWeight: '500' }}>{vol.name}</td>
                          <td style={{ padding: '6px 8px', textAlign: 'center', fontWeight: '700', color: vol.total_servicos > 0 ? 'var(--primary)' : '#94a3b8' }}>
                            {vol.total_servicos}
                          </td>
                          <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: '600', color: vol.total_servicos > 0 ? '#10b981' : '#94a3b8' }}>
                            {formatarValor(vol.valor_total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 5. RECOMENDAÇÕES */}
                <div className="bloco-relatorio-analitico" style={{ marginBottom: '40px' }}>
                  <h2 style={{ color: '#0d3878', fontSize: '14pt', borderBottom: '2px solid #0d3878', paddingBottom: '8px', fontWeight: '750' }}>5. Recomendações Estratégicas para Gestão de Escalas</h2>
                  <p style={{ fontSize: '10pt', textAlign: 'justify', marginBottom: '15px' }}>
                    Com base no comportamento estatístico deste ciclo operacional, orienta-se a adoção das seguintes medidas:
                  </p>
                  <ul style={{ paddingLeft: '1.5rem', fontSize: '9.5pt', lineHeight: '1.7', color: '#334155' }}>
                    <li style={{ marginBottom: '8px' }}><strong>Remanejamento de Efetivo Voluntário:</strong> Incentivar e direcionar voluntários que possuem 0 escalas ativas para turnos com maior carência operacional, equilibrando a fadiga da tropa.</li>
                    <li style={{ marginBottom: '8px' }}><strong>Gestão de Teto Limite:</strong> Criar uma trava ou barreira preventiva para militares que atingirem 7 escalas, alertando a Seção de Planejamento antes do estouro do limite máximo de 8.</li>
                    <li style={{ marginBottom: '8px' }}><strong>Compensação entre Unidades:</strong> Acionar formalmente as OPMs destinatárias listadas na seção 3 para compensação e conciliação dos débitos fiscais de Força Tarefa.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
