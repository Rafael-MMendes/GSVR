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
import { LayoutDashboard, Users, BarChart2, FileText, LogOut, DollarSign, Building2, Calendar, ChevronDown, Settings, Database, Activity, UserPlus, Menu, X, Users2 } from 'lucide-react';

function App() {
  const [currentView, setCurrentView] = useState('form');
  const [user, setUser] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null); // 'operacional', 'dashboards', 'config'

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
    setIsMenuOpen(false); // Close menu on click
    setActiveDropdown(null); // Close dropdowns on click
  };

  const toggleDropdown = (name) => {
    setActiveDropdown(activeDropdown === name ? null : name);
  };

  if (!user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  const isAdmin = user.is_admin;

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
                  className={`nav-category ${(currentView === 'admin' || currentView === 'requerimentos') ? 'active' : ''}`}
                  onClick={() => toggleDropdown('operacional')}
                >
                  <Activity size={18} /> Gestão Operacional <ChevronDown size={14} style={{ transform: activeDropdown === 'operacional' ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
                </span>
                <div className={`dropdown-menu ${activeDropdown === 'operacional' ? 'open' : ''}`}>
                  <a href="#" className={`dropdown-item ${currentView === 'admin' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); navigateTo('admin'); }}>
                    <LayoutDashboard size={16} /> Planejamento de Escala
                  </a>
                  <a href="#" className={`dropdown-item ${currentView === 'requerimentos' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); navigateTo('requerimentos'); }}>
                    <FileText size={16} /> Gestão de Requerimentos
                  </a>
                </div>
              </div>

              {/* Grupo: Dashboards */}
              <div className="nav-group">
                <span 
                  className={`nav-category ${(currentView === 'analytics' || currentView === 'financeiro') ? 'active' : ''}`}
                  onClick={() => toggleDropdown('dashboards')}
                >
                  <BarChart2 size={18} /> Dashboards <ChevronDown size={14} style={{ transform: activeDropdown === 'dashboards' ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
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
                  className={`nav-category ${(currentView === 'ciclo' || currentView === 'opm' || currentView === 'efetivo' || currentView === 'import-efetivo') ? 'active' : ''}`}
                  onClick={() => toggleDropdown('config')}
                >
                  <Database size={18} /> Configurações <ChevronDown size={14} style={{ transform: activeDropdown === 'config' ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
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
      </main>

    </>
  );
}

export default App;
