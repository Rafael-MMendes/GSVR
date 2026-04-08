import { useState } from 'react';
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
import { EfetivoManager } from './components/EfetivoManager';
import { ServicosExecutadosManager } from './components/ServicosExecutadosManager';
import { UserManager } from './components/UserManager';
import {
  LayoutDashboard, Users, BarChart2, FileText, LogOut, DollarSign,
  Building2, Calendar, ChevronDown, Settings, Database, Activity,
  UserPlus, Menu, X, Users2, ClipboardCheck, Shield
} from 'lucide-react';

function App() {
  const [currentView, setCurrentView] = useState('form');
  const [user, setUser] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);

  const handleLogin = (userData, isAdmin) => {
    setUser({ ...userData, is_admin: isAdmin });
    setCurrentView(isAdmin ? 'admin' : 'requerimentos');
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentView('login');
  };

  const navigateTo = (view) => {
    setCurrentView(view);
    setIsMenuOpen(false);
    setActiveDropdown(null);
  };

  const toggleDropdown = (name) => {
    setActiveDropdown(activeDropdown === name ? null : name);
  };

  if (!user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  const isAdmin = user.is_admin;

  const chevron = (name) => (
    <ChevronDown size={14} style={{ transform: activeDropdown === name ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
  );

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
          {isAdmin && (
            <>
              <div className="nav-separator" />

              {/* Grupo: Operacional */}
              <div className="nav-group">
                <span
                  className={`nav-category ${(currentView === 'admin' || currentView === 'requerimentos' || currentView === 'servicos') ? 'active' : ''}`}
                  onClick={() => toggleDropdown('operacional')}
                >
                  <Activity size={18} /> Gestão Operacional {chevron('operacional')}
                </span>
                <div className={`dropdown-menu ${activeDropdown === 'operacional' ? 'open' : ''}`}>
                  <a href="#" className={`dropdown-item ${currentView === 'admin' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); navigateTo('admin'); }}>
                    <LayoutDashboard size={16} /> Planejamento de Escala
                  </a>
                  <a href="#" className={`dropdown-item ${currentView === 'requerimentos' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); navigateTo('requerimentos'); }}>
                    <FileText size={16} /> Gestão de Requerimentos
                  </a>
                  <a href="#" className={`dropdown-item ${currentView === 'servicos' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); navigateTo('servicos'); }}>
                    <ClipboardCheck size={16} /> Serviços Executados
                  </a>
                </div>
              </div>

              {/* Grupo: Dashboards */}
              <div className="nav-group">
                <span
                  className={`nav-category ${(currentView === 'analytics' || currentView === 'financeiro') ? 'active' : ''}`}
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
                </div>
              </div>

              {/* Grupo: Configurações */}
              <div className="nav-group">
                <span
                  className={`nav-category ${(['ciclo', 'opm', 'efetivo', 'import-efetivo', 'usuarios'].includes(currentView)) ? 'active' : ''}`}
                  onClick={() => toggleDropdown('config')}
                >
                  <Database size={18} /> Configurações {chevron('config')}
                </span>
                <div className={`dropdown-menu ${activeDropdown === 'config' ? 'open' : ''}`}>
                  <a href="#" className={`dropdown-item ${currentView === 'ciclo' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); navigateTo('ciclo'); }}>
                    <Calendar size={16} /> Gerenciamento de Ciclos
                  </a>
                  <a href="#" className={`dropdown-item ${currentView === 'opm' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); navigateTo('opm'); }}>
                    <Building2 size={16} /> Configuração OPM
                  </a>
                  <a href="#" className={`dropdown-item ${currentView === 'efetivo' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); navigateTo('efetivo'); }}>
                    <Users2 size={16} /> Gestão de Efetivo
                  </a>
                  <a href="#" className={`dropdown-item ${currentView === 'import-efetivo' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); navigateTo('import-efetivo'); }}>
                    <UserPlus size={16} /> Importar Efetivo (Excel)
                  </a>
                  <a href="#" className={`dropdown-item ${currentView === 'usuarios' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); navigateTo('usuarios'); }}>
                    <Shield size={16} /> Gestão de Usuários
                  </a>
                </div>
              </div>
            </>
          )}

          <a
            href="#"
            className="nav-link"
            onClick={(e) => { e.preventDefault(); handleLogout(); }}
          >
            <LogOut size={18} />
            Sair
          </a>
        </div>
      </nav>

      <main>
        {currentView === 'form' && <VolunteerForm userData={user} />}
        {currentView === 'admin' && isAdmin && <AdminDashboard />}
        {currentView === 'requerimentos' && isAdmin && <RequerimentosAdmin />}
        {currentView === 'analytics' && isAdmin && <AnalyticsDashboard />}
        {currentView === 'financeiro' && isAdmin && <FinanceiroDashboard />}
        {currentView === 'opm' && isAdmin && <OpmManager />}
        {currentView === 'ciclo' && isAdmin && <CicloManager />}
        {currentView === 'efetivo' && isAdmin && <EfetivoManager />}
        {currentView === 'import-efetivo' && isAdmin && <EfetivoImport />}
        {currentView === 'servicos' && isAdmin && <ServicosExecutadosManager />}
        {currentView === 'usuarios' && isAdmin && <UserManager />}
      </main>
    </>
  );
}

export default App;
