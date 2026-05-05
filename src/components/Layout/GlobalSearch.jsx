import { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Building, User, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { clientsService } from '../../services/clientsService';
import { organsService } from '../../services/organsService';
import { privacyMaskCpf, normalizeString } from '../../utils/stringUtils';

export default function GlobalSearch() {
  const { state } = useApp();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ organs: [], clients: [] });
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(10);
  const [hasMoreClients, setHasMoreClients] = useState(false);
  const searchRef = useRef(null);

  // Fecha ao clicar fora
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Atalho de teclado (Ctrl + K)
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('global-search-input')?.focus();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Efeito de busca
  useEffect(() => {
    if (query.length < 1) {
      setResults({ organs: [], clients: [] });
      setIsSearching(false);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setIsSearching(true);
      try {
        const qLower = query.toLowerCase();
        const normalizedQuery = normalizeString(qLower);
        
        // Busca de Órgãos localmente para ignorar acentos corretamente
        const matchedOrgans = state.organs.filter(o => 
          normalizeString(o.name).includes(normalizedQuery) || 
          (o.city && normalizeString(o.city).includes(normalizedQuery))
        );

        // Busca Remota de Clientes
        const matchedClients = await clientsService.searchGlobal(qLower, displayLimit + 1);
        
        setHasMoreClients(matchedClients.length > displayLimit);

        setResults({
          organs: matchedOrgans.slice(0, 5),
          clients: matchedClients.slice(0, displayLimit)
        });
      } catch (error) {
        console.error("Erro na busca global", error);
      } finally {
        setIsSearching(false);
      }
    }, 400); // 400ms debounce

    return () => clearTimeout(delayDebounce);
  }, [query, displayLimit]);

  const handleResultClick = (type, item) => {
    setIsOpen(false);
    setQuery('');
    
    if (type === 'organ') {
      navigate(`/organ/${item.id}`);
    } else if (type === 'client') {
      // Redireciona para o órgão do cliente
      navigate(`/organ/${item.organId}`, { state: { openClientId: item.id } });
    }
  };

  return (
    <div className="global-search-container" ref={searchRef} style={{ position: 'relative', width: '100%', maxWidth: '450px' }}>
      <div 
        className="search-input-wrapper" 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--border-radius-md)',
          padding: '4px 12px',
          border: '1px solid var(--border-color)',
          transition: 'all 0.2s ease'
        }}
      >
        <Search size={16} color="var(--text-tertiary)" />
        <input
          id="global-search-input"
          type="text"
          placeholder="Buscar (Ctrl+K)..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setDisplayLimit(10);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => query.length > 0 && setIsOpen(true)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-primary)',
            padding: '8px',
            width: '100%',
            outline: 'none',
            fontSize: 'var(--font-sm)'
          }}
        />
        {isSearching && <span style={{ fontSize: '12px', color: 'var(--accent-primary)' }}>...</span>}
      </div>

      {/* Resultados da Busca (Dropdown) */}
      {isOpen && (query.length >= 1) && (
        <div 
          className="search-results-dropdown glass-panel"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            right: 0,
            borderRadius: 'var(--border-radius-md)',
            boxShadow: 'var(--shadow-lg)',
            maxHeight: '400px',
            overflowY: 'auto',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            padding: '8px 0'
          }}
        >
          {results.organs.length === 0 && results.clients.length === 0 && !isSearching && (
            <div style={{ padding: '12px 16px', color: 'var(--text-tertiary)', fontSize: 'var(--font-sm)', textAlign: 'center' }}>
              Nenhum resultado encontrado.
            </div>
          )}

          {results.organs.length > 0 && (
            <div>
              <div style={{ padding: '4px 16px', fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: 600 }}>
                Órgãos
              </div>
              {results.organs.map(o => (
                <div 
                  key={o.id}
                  onClick={() => handleResultClick('organ', o)}
                  style={{ 
                    padding: '8px 16px', 
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <Building size={16} color="var(--accent-secondary)" />
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontSize: '14px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={10} /> {o.city}
                    </div>
                  </div>
                  <ChevronRight size={14} color="var(--text-tertiary)" />
                </div>
              ))}
            </div>
          )}

          {results.clients.length > 0 && (
            <div>
              <div style={{ padding: '4px 16px', fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: 600, marginTop: '8px' }}>
                Clientes
              </div>
              {results.clients.map(c => (
                <div 
                  key={c.id}
                  onClick={() => handleResultClick('client', c)}
                  style={{ 
                    padding: '8px 16px', 
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <User size={16} color="var(--accent-primary)" />
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontSize: '14px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      <span style={{ color: 'var(--accent-secondary)', fontWeight: 'bold' }}>{c.organName}</span>
                      <span>• CPF: {privacyMaskCpf(c.cpf)}</span>
                      {c.phones && c.phones.length > 0 && (
                        <span style={{ color: 'var(--accent-primary)' }}>
                          • {c.phones[0]} {c.phones.length > 1 ? `(+${c.phones.length - 1})` : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={14} color="var(--text-tertiary)" />
                </div>
              ))}
              
              {hasMoreClients && (
                <div 
                  onClick={() => setDisplayLimit(prev => prev + 20)}
                  style={{
                    padding: '8px 16px',
                    cursor: 'pointer',
                    color: 'var(--accent-primary)',
                    fontSize: '12px',
                    textAlign: 'center',
                    fontWeight: 600,
                    marginTop: '8px',
                    borderTop: '1px solid var(--border-color)',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  Exibir mais resultados...
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
