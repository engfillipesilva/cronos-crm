import { NavLink } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import {
  LayoutDashboard,
  CheckSquare,
  MapPin,
  Bell,
  Upload,
  X,
  Tags,
  Building2,
  LogOut,
  Settings,
} from 'lucide-react';

export default function Sidebar() {
  const { state, dispatch } = useApp();

  const overdueCount = state.followUps.filter(f => {
    const d = new Date(f.scheduledDate);
    return d < new Date() && f.status === 'pendente';
  }).length;

  const closeSidebar = () => dispatch({ type: 'CLOSE_SIDEBAR' });

  const links = [
    { to: '/', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
    { to: '/checklist', icon: <CheckSquare size={18} />, label: 'Checklist' },
    { to: '/etiquetas', icon: <Tags size={18} />, label: 'Etiquetas' },
    { to: '/orgaos', icon: <Building2 size={18} />, label: 'Órgãos' },
    { to: '/follow-up', icon: <Bell size={18} />, label: 'Follow-up', badge: overdueCount },
    { to: '/importar', icon: <Upload size={18} />, label: 'Importar' },
    { to: '/configuracoes', icon: <Settings size={18} />, label: 'Config & Backup' },
  ];

  return (
    <>
      {state.sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={closeSidebar}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 99,
            display: 'none',
          }}
        />
      )}
      <aside className={`sidebar ${state.sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <LayoutDashboard size={24} style={{ color: 'var(--accent-primary)' }} />
          <h1>Cronos CRM</h1>
          <button
            className="btn-icon"
            onClick={closeSidebar}
            style={{ marginLeft: 'auto', display: state.sidebarOpen ? 'flex' : 'none' }}
          >
            <X size={18} />
          </button>
        </div>
        <nav className="sidebar-nav">
          {links.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              onClick={closeSidebar}
              end={link.to === '/'}
            >
              {link.icon}
              <span>{link.label}</span>
              {link.badge > 0 && <span className="sidebar-badge">{link.badge}</span>}
            </NavLink>
          ))}
        </nav>
        
        <div style={{ marginTop: 'auto', padding: 'var(--space-md)', borderTop: '1px solid var(--border-color)' }}>
          <button
            onClick={async () => {
              try {
                const { authService } = await import('../../services/authService');
                await authService.signOut();
                window.location.href = '/login';
              } catch (e) {
                console.error(e);
              }
            }}
            className="sidebar-link"
            style={{ width: '100%', color: 'var(--accent-danger)', background: 'transparent' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(225, 112, 85, 0.1)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            <LogOut size={18} />
            <span>Sair do Sistema</span>
          </button>
        </div>
      </aside>

      <style>{`
        @media (max-width: 768px) {
          .sidebar-overlay { display: block !important; }
        }
      `}</style>
    </>
  );
}
