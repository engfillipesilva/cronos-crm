import { useApp } from '../../context/AppContext';
import { Menu } from 'lucide-react';
import GlobalSearch from './GlobalSearch';

export default function Header({ title, children }) {
  const { dispatch } = useApp();

  return (
    <header className="header">
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
        <button
          className="menu-toggle btn-icon"
          onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
          aria-label="Abrir menu"
        >
          <Menu size={22} />
        </button>
        <h2 className="header-title">{title}</h2>
      </div>
      <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
        <GlobalSearch />
        {children}
      </div>
    </header>
  );
}
