import { API_URL } from './utils/apiConfig';
import { useState, useEffect, lazy, Suspense } from 'react';
import axios from 'axios';
import './utils/axiosSetup';
import './index.css';
import { ToastProvider } from './components/common/ToastProvider';
import { VolunteerForm } from './components/VolunteerForm';
import { LoginScreen } from './components/LoginScreen';
import { Footer } from './components/Footer';

const lazyNamed = (loader, name) => lazy(() => loader().then(m => ({ default: m[name] })));

const AdminDashboardV2 = lazyNamed(() => import('./components/AdminDashboardV2'), 'AdminDashboardV2');
const HistoricoMilitar = lazyNamed(() => import('./components/HistoricoMilitar'), 'HistoricoMilitar');
const AnalyticsDashboard = lazyNamed(() => import('./components/AnalyticsDashboard'), 'AnalyticsDashboard');
const RequerimentosAdmin = lazyNamed(() => import('./components/RequerimentosAdmin'), 'RequerimentosAdmin');
const FinanceiroDashboard = lazyNamed(() => import('./components/FinanceiroDashboard'), 'FinanceiroDashboard');
const OpmManager = lazyNamed(() => import('./components/OpmManager'), 'OpmManager');
const CicloManager = lazyNamed(() => import('./components/CicloManager'), 'CicloManager');
const MetasAlocacaoManager = lazyNamed(() => import('./components/MetasAlocacaoManager'), 'MetasAlocacaoManager');
const EfetivoImport = lazyNamed(() => import('./components/EfetivoImport'), 'EfetivoImport');
const ServicosImport = lazyNamed(() => import('./components/ServicosImport'), 'ServicosImport');
const EfetivoManager = lazyNamed(() => import('./components/EfetivoManager'), 'EfetivoManager');
const ServicosExecutadosManager = lazyNamed(() => import('./components/ServicosExecutadosManager'), 'ServicosExecutadosManager');
const UserManager = lazyNamed(() => import('./components/UserManager'), 'UserManager');
const ProfilePage = lazyNamed(() => import('./components/ProfilePage'), 'ProfilePage');
const RolesManager = lazyNamed(() => import('./components/RolesManager'), 'RolesManager');
const TiposServicoManager = lazyNamed(() => import('./components/TiposServicoManager'), 'TiposServicoManager');
const ConferenciaOperacional = lazyNamed(() => import('./components/ConferenciaOperacional'), 'ConferenciaOperacional');
const QuantitativoGastosFT = lazyNamed(() => import('./components/QuantitativoGastosFT'), 'QuantitativoGastosFT');
const MinhasEscalas = lazyNamed(() => import('./components/MinhasEscalas'), 'MinhasEscalas');
const SuperUserDashboard = lazyNamed(() => import('./components/SuperUserDashboard'), 'SuperUserDashboard');
const DocsPortal = lazyNamed(() => import('./components/DocsPortal'), 'DocsPortal');
import {
  LayoutDashboard, Users, BarChart2, FileText, LogOut, DollarSign,
  Building2, Calendar, ChevronDown, Settings, Database, Activity,
  UserPlus, Menu, X, Users2, ClipboardCheck, Shield, User, Layers,
  FileSpreadsheet, Target, GitCompareArrows, CalendarCheck, Terminal, BookOpen
} from 'lucide-react';

// ============================================================
// Restaura sessão JWT do localStorage
// ============================================================
function restoreSession() {
  try {
    const token = localStorage.getItem('ft_access_token');
    const userRaw = localStorage.getItem('ft_user');
    if (token && userRaw && userRaw !== 'undefined') {
      const userData = JSON.parse(userRaw);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      return userData;
    }
  } catch (e) {
    console.error("Session restoration failed:", e);
    localStorage.removeItem('ft_access_token');
    localStorage.removeItem('ft_user');
  }
  return null;
}

function App() {
  const [currentView, setCurrentView] = useState('auto');
  const [user, setUser] = useState(() => restoreSession());
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);

  // Listener para logout centralizado (disparado quando o refresh token expirar ou falhar)
  useEffect(() => {
    const onAuthLogout = () => {
      console.warn("Sessão expirada ou encerrada. Redirecionando para login...");
      handleLogout();
    };
    window.addEventListener('auth:logout', onAuthLogout);
    return () => window.removeEventListener('auth:logout', onAuthLogout);
  }, []);

  // Determina a view inicial após login/restauração de sessão
  useEffect(() => {
    if (user && currentView === 'auto') {
      setCurrentView(user.is_admin ? 'admin-v2' : 'minhas-escalas');
    }

    const handleNavigate = (e) => setCurrentView(e.detail);
    window.addEventListener('navigate', handleNavigate);
    return () => window.removeEventListener('navigate', handleNavigate);
  }, [user]);

  // Fecha dropdowns ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Se clicar fora de um grupo de navegação, fecha o dropdown ativo
      if (activeDropdown && !event.target.closest('.nav-group')) {
        setActiveDropdown(null);
      }
      // Se clicar fora da navbar link e o menu mobile estiver aberto, fecha-o
      if (isMenuOpen && !event.target.closest('.nav-links') && !event.target.closest('.mobile-menu-btn')) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeDropdown, isMenuOpen]);

  const handleLogin = (userData) => {
    setUser(userData);
    setCurrentView(userData.is_admin ? 'admin-v2' : 'minhas-escalas');
  };

  const handleLogout = async () => {
    try {
      const refreshToken = localStorage.getItem('ft_refresh_token');
      if (refreshToken) {
        await axios.post(
          `${API_URL}/auth/logout`,
          { refresh_token: refreshToken }
        );
      }
    } catch (_) { }
    localStorage.removeItem('ft_access_token');
    localStorage.removeItem('ft_refresh_token');
    localStorage.removeItem('ft_user');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    setCurrentView('auto');
  };

  const navigateTo = (view) => {
    setCurrentView(view);
    setIsMenuOpen(false);
    setActiveDropdown(null);
  };

  const toggleDropdown = (name) => {
    setActiveDropdown(activeDropdown === name ? null : name);
  };

  // Helper: verifica permissão no token em memória
  const hasPermission = (...perms) => {
    if (!user) return false;
    if (user.is_admin && (!user.permissions || user.permissions.length === 0)) return true;
    return perms.every(p => user.permissions?.includes(p));
  };

  if (!user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  const isSuperuser = Boolean(user.is_superuser || user.role_name === 'SUPERUSER' || user.permissions?.includes('sistema:admin'));
  const isAdmin = isSuperuser || user.is_admin || hasPermission('usuarios:admin');
  const isGerente = isAdmin || hasPermission('escalas:create');

  const chevron = (name) => (
    <ChevronDown size={14} style={{ transform: activeDropdown === name ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
  );

  // Avatar / Iniciais do usuário
  const initials = (user.nome_guerra || user.nome_completo || 'US').substring(0, 2).toUpperCase();

  return (
    <ToastProvider>
      <nav className="navbar">
        <div className="navbar-brand">
          <img src="/brasao_9bpm.png" alt="Brasão 9º BPM" />
          <span>GSVR - Gestão de Serviço Voluntário Remunerado - {user.opm_sigla || '9º BPM'}</span>
        </div>

        <button className="mobile-menu-btn" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        <div className={`nav-links ${isMenuOpen ? 'mobile-open' : ''}`}>
          {(isAdmin || isGerente) ? (
            <>
              <div className="nav-separator" />

              {/* Grupo: Operacional */}
              <div className="nav-group">
                <span
                  className={`nav-category ${(['admin', 'requerimentos', 'servicos', 'minhas-escalas'].includes(currentView)) ? 'active' : ''}`}
                  onClick={() => toggleDropdown('operacional')}
                >
                  <Activity size={18} /> Gestão Operacional {chevron('operacional')}
                </span>
                <div className={`dropdown-menu ${activeDropdown === 'operacional' ? 'open' : ''}`}>
                  <a href="#" className={`dropdown-item ${currentView === 'minhas-escalas' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); navigateTo('minhas-escalas'); }}>
                    <CalendarCheck size={16} /> Minhas Escalas (Pessoal)
                  </a>
                  {hasPermission('escalas:read') && (
                    <a href="#" className={`dropdown-item ${currentView === 'admin-v2' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); navigateTo('admin-v2'); }}>
                      <LayoutDashboard size={16} /> Planejamento de Escala
                    </a>
                  )}
                  {hasPermission('escalas:read') && (
                    <a href="#" className={`dropdown-item ${currentView === 'escalas-planejadas' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); navigateTo('escalas-planejadas'); }}>
                      <FileText size={16} /> Histórico do Militar
                    </a>
                  )}
                  {hasPermission('escalas:read') && (
                    <a href="#" className={`dropdown-item ${currentView === 'requerimentos' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); navigateTo('requerimentos'); }}>
                      <FileText size={16} /> Gestão de Requerimentos
                    </a>
                  )}
                  {isAdmin && (
                    <a href="#" className={`dropdown-item ${currentView === 'servicos' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); navigateTo('servicos'); }}>
                      <ClipboardCheck size={16} /> Serviços Executados
                    </a>
                  )}
                  {hasPermission('escalas:read') && (
                    <a href="#" className={`dropdown-item ${currentView === 'conferencia' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); navigateTo('conferencia'); }}>
                      <GitCompareArrows size={16} /> Conferência Operacional
                    </a>
                  )}

                </div>
              </div>

              {/* Grupo: Dashboards */}
              {hasPermission('financeiro:read') && (
                <div className="nav-group">
                  <span
                    className={`nav-category ${(['analytics', 'financeiro', 'metas', 'quantitativo-gastos'].includes(currentView)) ? 'active' : ''}`}
                    onClick={() => toggleDropdown('dashboards')}
                  >
                    <BarChart2 size={18} /> Dashboards {chevron('dashboards')}
                  </span>
                  <div className={`dropdown-menu ${activeDropdown === 'dashboards' ? 'open' : ''}`}>
                    <a href="#" className={`dropdown-item ${currentView === 'analytics' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); navigateTo('analytics'); }}>
                      <Activity size={16} /> Estatísticas Analíticas
                    </a>
                    <a href="#" className={`dropdown-item ${currentView === 'financeiro' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); navigateTo('financeiro'); }}>
                      <DollarSign size={16} /> Dashboard Financeiro
                    </a>
                    {hasPermission('ciclos:read') && (
                      <a href="#" className={`dropdown-item ${currentView === 'metas' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); navigateTo('metas'); }}>
                        <Target size={16} /> Metas de Alocação
                      </a>
                    )}
                    {(hasPermission('financeiro:read') || isAdmin) && (
                      <a href="#" className={`dropdown-item ${currentView === 'quantitativo-gastos' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); navigateTo('quantitativo-gastos'); }}>
                        <FileSpreadsheet size={16} /> Quantitativo e Gastos FT
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Grupo: Configurações */}
              {isAdmin && (
                <div className="nav-group">
                  <span
                    className={`nav-category ${(['ciclo', 'opm', 'efetivo', 'import-efetivo', 'usuarios', 'roles'].includes(currentView)) ? 'active' : ''}`}
                    onClick={() => toggleDropdown('config')}
                  >
                    <Database size={18} /> Configurações {chevron('config')}
                  </span>
                  <div className={`dropdown-menu ${activeDropdown === 'config' ? 'open' : ''}`}>
                    {hasPermission('opm:read') && (
                      <a href="#" className={`dropdown-item ${currentView === 'opm' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); navigateTo('opm'); }}>
                        <Building2 size={16} /> Configuração OPM
                      </a>
                    )}
                    <a href="#" className={`dropdown-item ${currentView === 'ciclo' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); navigateTo('ciclo'); }}>
                      <Calendar size={16} /> Gerenciamento de Ciclos
                    </a>


                    {isAdmin && (
                      <a href="#" className={`dropdown-item ${currentView === 'tipos-servico' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); navigateTo('tipos-servico'); }}>
                        <DollarSign size={16} /> Tipos de Serviço (Verba)
                      </a>
                    )}
                    {hasPermission('efetivo:read') && (
                      <a href="#" className={`dropdown-item ${currentView === 'efetivo' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); navigateTo('efetivo'); }}>
                        <Users2 size={16} /> Gestão de Efetivo
                      </a>
                    )}
                    {hasPermission('usuarios:admin') && (
                      <a href="#" className={`dropdown-item ${currentView === 'usuarios' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); navigateTo('usuarios'); }}>
                        <Shield size={16} /> Gestão de Usuários
                      </a>
                    )}
                    {hasPermission('usuarios:admin') && (
                      <a href="#" className={`dropdown-item ${currentView === 'roles' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); navigateTo('roles'); }}>
                        <Layers size={16} /> Controle de Acesso (RBAC)
                      </a>
                    )}
                    {isSuperuser && (
                      <a href="#" className={`dropdown-item ${currentView === 'superuser' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); navigateTo('superuser'); }} style={{ color: '#7c3aed', fontWeight: 700 }}>
                        <Terminal size={16} /> Painel Técnico (Superuser)
                      </a>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="nav-separator" />
              <a
                href="#"
                className={`nav-link ${currentView === 'minhas-escalas' ? 'active' : ''}`}
                onClick={(e) => { e.preventDefault(); navigateTo('minhas-escalas'); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 600,
                  color: currentView === 'minhas-escalas' ? '#38bdf8' : 'white',
                  textDecoration: 'none', padding: '0.5rem 0.85rem', borderRadius: '8px'
                }}
              >
                <CalendarCheck size={18} /> Minhas Escalas
              </a>
              <a
                href="#"
                className={`nav-link ${currentView === 'form' ? 'active' : ''}`}
                onClick={(e) => { e.preventDefault(); navigateTo('form'); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 600,
                  color: currentView === 'form' ? '#38bdf8' : 'white',
                  textDecoration: 'none', padding: '0.5rem 0.85rem', borderRadius: '8px'
                }}
              >
                <FileText size={18} /> Inscrição / Voluntariado
              </a>
            </>
          )}

          {/* Link direto para Documentação & Manual */}
          <a
            href="#"
            className={`nav-link ${currentView === 'docs' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); navigateTo('docs'); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 600,
              color: currentView === 'docs' ? '#38bdf8' : '#e2e8f0',
              textDecoration: 'none', padding: '0.5rem 0.85rem', borderRadius: '8px'
            }}
          >
            <BookOpen size={18} /> Documentação & Manual
          </a>

          {/* Perfil do usuário */}
          <div className="nav-group">
            <span
              className={`nav-category ${currentView === 'profile' ? 'active' : ''}`}
              onClick={() => toggleDropdown('profile')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <div style={{
                width: 26, height: 26, borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.7rem', fontWeight: 700, color: 'white', flexShrink: 0
              }}>
                {initials}
              </div>
              {user.nome_guerra || user.numero_ordem} {chevron('profile')}
            </span>
            <div className={`dropdown-menu ${activeDropdown === 'profile' ? 'open' : ''}`}>
              <a href="#" className={`dropdown-item ${currentView === 'minhas-escalas' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); navigateTo('minhas-escalas'); }}>
                <CalendarCheck size={16} /> Minhas Escalas
              </a>
              <a href="#" className={`dropdown-item ${currentView === 'profile' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); navigateTo('profile'); }}>
                <User size={16} /> Meu Perfil
              </a>
              <a href="#" className={`dropdown-item ${currentView === 'docs' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); navigateTo('docs'); }}>
                <BookOpen size={16} /> Documentação & Manual
              </a>
              {isSuperuser && (
                <a href="#" className={`dropdown-item ${currentView === 'superuser' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); navigateTo('superuser'); }} style={{ color: '#7c3aed', fontWeight: 700 }}>
                  <Terminal size={16} /> Painel Superuser
                </a>
              )}
              <a href="#" className="dropdown-item" onClick={(e) => { e.preventDefault(); handleLogout(); }} style={{ color: '#dc2626' }}>
                <LogOut size={16} /> Sair
              </a>
            </div>
          </div>

          {/* Botão de logout rápido no mobile */}
          <a href="#" className="nav-link" style={{ display: 'none' }}
            onClick={(e) => { e.preventDefault(); handleLogout(); }}>
            <LogOut size={18} /> Sair
          </a>
        </div>
      </nav>

      <main>
        <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Carregando módulo...</div>}>
          {currentView === 'minhas-escalas' && <MinhasEscalas user={user} />}
          {currentView === 'form' && <VolunteerForm userData={user} />}
          {currentView === 'profile' && <ProfilePage user={user} />}
          {currentView === 'docs' && <DocsPortal />}

          {/* Rotas administrativas — protegidas por permissão */}
          {currentView === 'admin-v2' && (isAdmin || isGerente) && <AdminDashboardV2 />}
          {currentView === 'escalas-planejadas' && (isAdmin || isGerente) && <HistoricoMilitar />}
          {currentView === 'requerimentos' && (isAdmin || isGerente) && <RequerimentosAdmin user={user} />}
          {currentView === 'analytics' && isAdmin && <AnalyticsDashboard />}
          {currentView === 'financeiro' && hasPermission('financeiro:read') && <FinanceiroDashboard />}
          {currentView === 'quantitativo-gastos' && (hasPermission('financeiro:read') || isAdmin) && <QuantitativoGastosFT />}
          {currentView === 'opm' && hasPermission('opm:read') && <OpmManager />}
          {currentView === 'tipos-servico' && isAdmin && <TiposServicoManager />}
          {currentView === 'ciclo' && hasPermission('ciclos:read') && <CicloManager />}
          {currentView === 'metas' && hasPermission('ciclos:read') && <MetasAlocacaoManager />}
          {currentView === 'efetivo' && hasPermission('efetivo:read') && <EfetivoManager />}
          {currentView === 'import-efetivo' && hasPermission('efetivo:import') && <EfetivoImport />}
          {currentView === 'import-servicos' && isAdmin && <ServicosImport onBack={() => navigateTo('servicos')} />}
          {currentView === 'servicos' && isAdmin && <ServicosExecutadosManager />}
          {currentView === 'conferencia' && (isAdmin || isGerente) && <ConferenciaOperacional />}
          {currentView === 'usuarios' && hasPermission('usuarios:admin') && <UserManager />}
          {currentView === 'roles' && hasPermission('usuarios:admin') && <RolesManager />}
          {currentView === 'superuser' && isSuperuser && <SuperUserDashboard user={user} />}
        </Suspense>
      </main>
      <Footer />
    </ToastProvider>
  );
}

export default App;
