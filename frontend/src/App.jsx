import { useState, useEffect } from 'react';
import axios from 'axios';
import './index.css';
import { VolunteerForm } from './components/VolunteerForm';
import { LoginScreen } from './components/LoginScreen';
import { AdminDashboard } from './components/AdminDashboard';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { RequerimentosAdmin } from './components/RequerimentosAdmin';
import { FinanceiroDashboard } from './components/FinanceiroDashboard';
import { OpmManager } from './components/OpmManager';
import { CicloManager } from './components/CicloManager';
import { EfetivoImport } from './components/EfetivoImport';
import { ServicosImport } from './components/ServicosImport';
import { EfetivoManager } from './components/EfetivoManager';
import { ServicosExecutadosManager } from './components/ServicosExecutadosManager';
import { UserManager } from './components/UserManager';
import { ProfilePage } from './components/ProfilePage';
import { RolesManager } from './components/RolesManager';
import { RelatorioOperacional } from './components/RelatorioOperacional';
import {
  LayoutDashboard, Users, BarChart2, FileText, LogOut, DollarSign,
  Building2, Calendar, ChevronDown, Settings, Database, Activity,
  UserPlus, Menu, X, Users2, ClipboardCheck, Shield, User, Layers,
  FileSpreadsheet
} from 'lucide-react';

// ============================================================
// Restaura sessão JWT do localStorage
// ============================================================
function restoreSession() {
  try {
    const token = localStorage.getItem('ft_access_token');
    const userData = JSON.parse(localStorage.getItem('ft_user'));
    if (token && userData) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      return userData;
    }
  } catch (_) {}
  return null;
}

function App() {
  const [currentView, setCurrentView] = useState('auto');
  const [user, setUser] = useState(() => restoreSession());
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);

  // Determina a view inicial após login/restauração de sessão
  useEffect(() => {
    if (user && currentView === 'auto') {
      setCurrentView(user.is_admin ? 'admin' : 'form');
    }

    const handleNavigate = (e) => setCurrentView(e.detail);
    window.addEventListener('navigate', handleNavigate);
    return () => window.removeEventListener('navigate', handleNavigate);
  }, [user]);

  const handleLogin = (userData) => {
    setUser(userData);
    setCurrentView(userData.is_admin ? 'admin' : 'form');
  };

  const handleLogout = async () => {
    try {
      const refreshToken = localStorage.getItem('ft_refresh_token');
      if (refreshToken) {
        await axios.post(
          `${(import.meta.env.VITE_API_URL || 'http://localhost:3001')}/api/auth/logout`,
          { refresh_token: refreshToken }
        );
      }
    } catch (_) {}
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

  const isAdmin = user.is_admin || hasPermission('usuarios:admin');
  const isGerente = isAdmin || hasPermission('escalas:create');

  const chevron = (name) => (
    <ChevronDown size={14} style={{ transform: activeDropdown === name ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
  );

  // Avatar / Iniciais do usuário
  const initials = (user.nome_guerra || user.nome_completo || 'US').substring(0, 2).toUpperCase();

  return (
    <>
      <nav className="navbar">
        <div className="navbar-brand">
          <img src="/brasao_9bpm.png" alt="Brasão 9º BPM" />
          <span>9º BPM - Força Tarefa</span>
        </div>

        <button className="mobile-menu-btn" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        <div className={`nav-links ${isMenuOpen ? 'mobile-open' : ''}`}>
          {(isAdmin || isGerente) && (
            <>
              <div className="nav-separator" />

              {/* Grupo: Operacional */}
              <div className="nav-group">
                <span
                  className={`nav-category ${(['admin', 'requerimentos', 'servicos'].includes(currentView)) ? 'active' : ''}`}
                  onClick={() => toggleDropdown('operacional')}
                >
                  <Activity size={18} /> Gestão Operacional {chevron('operacional')}
                </span>
                <div className={`dropdown-menu ${activeDropdown === 'operacional' ? 'open' : ''}`}>
                  {hasPermission('escalas:read') && (
                    <a href="#" className={`dropdown-item ${currentView === 'admin' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); navigateTo('admin'); }}>
                      <LayoutDashboard size={16} /> Planejamento de Escala
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
                  {isAdmin && (
                    <a href="#" className={`dropdown-item ${currentView === 'import-servicos' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); navigateTo('import-servicos'); }}>
                      <FileSpreadsheet size={16} /> Importar Planilha FT
                    </a>
                  )}
                </div>
              </div>

              {/* Grupo: Dashboards */}
              {hasPermission('financeiro:read') && (
                <div className="nav-group">
                  <span
                    className={`nav-category ${(['analytics', 'financeiro'].includes(currentView)) ? 'active' : ''}`}
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
                    <a href="#" className={`dropdown-item ${currentView === 'relatorio-operacional' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); navigateTo('relatorio-operacional'); }}>
                      <FileText size={16} /> Relatório Hierárquico
                    </a>
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
                    {hasPermission('ciclos:read') && (
                      <a href="#" className={`dropdown-item ${currentView === 'ciclo' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); navigateTo('ciclo'); }}>
                        <Calendar size={16} /> Gerenciamento de Ciclos
                      </a>
                    )}
                    {hasPermission('opm:read') && (
                      <a href="#" className={`dropdown-item ${currentView === 'opm' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); navigateTo('opm'); }}>
                        <Building2 size={16} /> Configuração OPM
                      </a>
                    )}
                    {hasPermission('efetivo:read') && (
                      <a href="#" className={`dropdown-item ${currentView === 'efetivo' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); navigateTo('efetivo'); }}>
                        <Users2 size={16} /> Gestão de Efetivo
                      </a>
                    )}
                    {hasPermission('efetivo:import') && (
                      <a href="#" className={`dropdown-item ${currentView === 'import-efetivo' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); navigateTo('import-efetivo'); }}>
                        <UserPlus size={16} /> Importar Efetivo (Excel)
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
                  </div>
                </div>
              )}
            </>
          )}

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
              <a href="#" className={`dropdown-item ${currentView === 'profile' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); navigateTo('profile'); }}>
                <User size={16} /> Meu Perfil
              </a>
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
        {currentView === 'form' && <VolunteerForm userData={user} />}
        {currentView === 'profile' && <ProfilePage user={user} />}

        {/* Rotas administrativas — protegidas por permissão */}
        {currentView === 'admin' && (isAdmin || isGerente) && <AdminDashboard />}
        {currentView === 'requerimentos' && (isAdmin || isGerente) && <RequerimentosAdmin />}
        {currentView === 'analytics' && isAdmin && <AnalyticsDashboard />}
        {currentView === 'financeiro' && hasPermission('financeiro:read') && <FinanceiroDashboard />}
        {currentView === 'relatorio-operacional' && hasPermission('financeiro:read') && <RelatorioOperacional />}
        {currentView === 'opm' && hasPermission('opm:read') && <OpmManager />}
        {currentView === 'ciclo' && hasPermission('ciclos:read') && <CicloManager />}
        {currentView === 'efetivo' && hasPermission('efetivo:read') && <EfetivoManager />}
        {currentView === 'import-efetivo' && hasPermission('efetivo:import') && <EfetivoImport />}
        {currentView === 'import-servicos' && isAdmin && <ServicosImport />}
        {currentView === 'servicos' && isAdmin && <ServicosExecutadosManager />}
        {currentView === 'usuarios' && hasPermission('usuarios:admin') && <UserManager />}
        {currentView === 'roles' && hasPermission('usuarios:admin') && <RolesManager />}
      </main>
    </>
  );
}

export default App;
