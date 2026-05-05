import { useState, useEffect } from 'react';
import Header from '../components/Layout/Header';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { clientsService } from '../services/clientsService';
import { Users, Building2, MapPin, Bell, TrendingUp, ArrowRight, Star, ChevronRight, Tag } from 'lucide-react';
import { getFollowUpStatus } from '../utils/dateUtils';
import LoadingSpinner from '../components/LoadingSpinner';
import { privacyMaskCpf, normalizeString } from '../utils/stringUtils';

export default function DashboardPage() {
  const { state } = useApp();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('geral'); // 'geral', 'organs', 'clients'
  const [favoriteClients, setFavoriteClients] = useState([]);
  const [loadingFavorites, setLoadingFavorites] = useState(false);

  const [favPage, setFavPage] = useState(1);
  const [hasMoreFavs, setHasMoreFavs] = useState(true);

  // Stats
  const [loadingStats, setLoadingStats] = useState(false);
  const [dbBoardStats, setDbBoardStats] = useState([]);
  const [conversionStats, setConversionStats] = useState([]);

  // Advanced Filters
  const [filterBoardId, setFilterBoardId] = useState('');
  const [filterLabelId, setFilterLabelId] = useState('');
  const [filterOrganName, setFilterOrganName] = useState('');
  const [showOrganSuggestions, setShowOrganSuggestions] = useState(false);
  const [filterResults, setFilterResults] = useState([]);
  const [isFiltering, setIsFiltering] = useState(false);
  const [hasFiltered, setHasFiltered] = useState(false);

  // Suggestions for the organ filter
  const organSuggestions = state.organs
    .filter(o => filterOrganName ? normalizeString(o.name).includes(normalizeString(filterOrganName)) : true)
    .sort((a,b) => a.name.localeCompare(b.name))
    .slice(0, 50);

  useEffect(() => {
    if (activeTab === 'geral' && dbBoardStats.length === 0) {
      const loadStats = async () => {
        setLoadingStats(true);
        try {
          const bStats = await clientsService.getBoardStats();
          setDbBoardStats(bStats);
          
          const now = new Date();
          const cStats = await clientsService.getConversionReport(now.getMonth() + 1, now.getFullYear());
          setConversionStats(cStats);
        } catch (e) {
          console.error("Erro ao carregar estatísticas", e);
        } finally {
          setLoadingStats(false);
        }
      };
      loadStats();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'clients' && favoriteClients.length === 0) {
      loadFavClients(1);
    }
  }, [activeTab]);

  const loadFavClients = async (pageNumber) => {
    setLoadingFavorites(true);
    try {
      const clients = await clientsService.fetchFavorites(pageNumber, 20);
      if (clients.length < 20) {
        setHasMoreFavs(false);
      } else {
        setHasMoreFavs(true);
      }
      
      if (pageNumber === 1) {
        setFavoriteClients(clients);
      } else {
        setFavoriteClients(prev => [...prev, ...clients]);
      }
      setFavPage(pageNumber);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingFavorites(false);
    }
  };

  const handleFilter = async () => {
    setIsFiltering(true);
    setHasFiltered(true);
    try {
      const filters = {};
      if (filterBoardId) filters.boardId = filterBoardId;
      if (filterLabelId) filters.labelIds = [filterLabelId]; // Pode ser array no futuro
      if (filterOrganName) {
        const normalizedInput = normalizeString(filterOrganName);
        // Primeiro tenta match exato, se não achar, tenta parcial (includes)
        let matchedOrgan = state.organs.find(o => normalizeString(o.name) === normalizedInput);
        if (!matchedOrgan) {
          matchedOrgan = state.organs.find(o => normalizeString(o.name).includes(normalizedInput));
        }
        if (matchedOrgan) {
          filters.organId = matchedOrgan.id;
        }
      }
      const res = await clientsService.filterClients(filters);
      setFilterResults(res);
    } catch (e) {
      console.error(e);
    } finally {
      setIsFiltering(false);
    }
  };

  const handleClearFilters = () => {
    setFilterBoardId('');
    setFilterLabelId('');
    setFilterOrganName('');
    setFilterResults([]);
    setHasFiltered(false);
  };

  const totalOrgans = state.organs.length;
  const activeOrgans = state.organs.filter(o => o.organBoardId !== 'para-verificar').length;
  const totalLabels = state.labels.length;

  const overdueFollowUps = state.followUps.filter(
    f => getFollowUpStatus(f.scheduledDate) === 'overdue' && f.status === 'pendente'
  ).length;

  const boardStats = (state.clientBoards || []).sort((a, b) => a.position - b.position).map(b => {
    const dbStat = dbBoardStats.find(s => s.board_id === b.id);
    const convStat = conversionStats.find(s => s.to_board_id === b.id);
    return {
      ...b,
      count: dbStat ? parseInt(dbStat.total_count, 10) : 0,
      movementsThisMonth: convStat ? parseInt(convStat.movements_count, 10) : 0
    };
  });

  const totalClientsReal = boardStats.reduce((acc, curr) => acc + curr.count, 0);

  const statCards = [
    { icon: <Building2 size={24} />, label: 'Órgãos', value: totalOrgans, sub: `${activeOrgans} em andamento`, color: 'var(--accent-primary)' },
    { icon: <Users size={24} />, label: 'Clientes', value: loadingStats ? '...' : totalClientsReal, sub: 'cadastrados', color: 'var(--accent-warning)' },
    { icon: <Tag size={24} />, label: 'Etiquetas', value: totalLabels, sub: 'configuradas', color: 'var(--accent-secondary)' },
    { icon: <Bell size={24} />, label: 'Follow-ups', value: overdueFollowUps, sub: 'pendentes', color: overdueFollowUps > 0 ? 'var(--accent-danger)' : 'var(--accent-success)' },
  ];

  const favOrgans = state.organs.filter(o => o.isFavorite);

  return (
    <>
      <Header title="Dashboard" />
      <div style={{ padding: 'var(--space-lg)', maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* TABS */}
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', borderBottom: '1px solid var(--border-color)', marginBottom: '32px' }}>
          <button 
            onClick={() => setActiveTab('geral')}
            style={{
              background: 'none', border: 'none', padding: '12px 0', fontSize: '16px', fontWeight: 600, cursor: 'pointer',
              color: activeTab === 'geral' ? 'var(--text-primary)' : 'var(--text-tertiary)',
              borderBottom: activeTab === 'geral' ? '2px solid var(--accent-primary)' : '2px solid transparent',
              transition: 'all 0.2s ease'
            }}
          >
            Visão Geral
          </button>
          <button 
            onClick={() => setActiveTab('organs')}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: 'none', border: 'none', padding: '12px 0', fontSize: '16px', fontWeight: 600, cursor: 'pointer',
              color: activeTab === 'organs' ? 'var(--accent-warning)' : 'var(--text-tertiary)',
              borderBottom: activeTab === 'organs' ? '2px solid var(--accent-warning)' : '2px solid transparent',
              transition: 'all 0.2s ease'
            }}
          >
            <Star size={18} fill={activeTab === 'organs' ? 'var(--accent-warning)' : 'none'} /> Órgãos Favoritos
          </button>
          <button 
            onClick={() => setActiveTab('clients')}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: 'none', border: 'none', padding: '12px 0', fontSize: '16px', fontWeight: 600, cursor: 'pointer',
              color: activeTab === 'clients' ? 'var(--accent-warning)' : 'var(--text-tertiary)',
              borderBottom: activeTab === 'clients' ? '2px solid var(--accent-warning)' : '2px solid transparent',
              transition: 'all 0.2s ease'
            }}
          >
            <Star size={18} fill={activeTab === 'clients' ? 'var(--accent-warning)' : 'none'} /> Clientes Favoritos
          </button>
        </div>

        {/* TAB GERAL */}
        {activeTab === 'geral' && (
          <div>
            {/* KPI Cards */}
            <div className="stats-grid" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 'var(--space-md)',
              marginBottom: 'var(--space-xl)',
            }}>
              {statCards.map((s, i) => (
                <div key={i} className="card glass-panel" style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-md)',
                  animation: `slideUp 0.3s ease ${i * 0.1}s both`,
                }}>
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: 'var(--border-radius-md)',
                    background: `${s.color}20`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: s.color,
                    flexShrink: 0,
                  }}>
                    {s.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: 'var(--font-2xl)', fontWeight: 800, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>{s.label} · {s.sub}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* BI SECTION */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px', marginBottom: '32px' }}>
              
              {/* FUNIL DE VENDAS */}
              <div className="card glass-panel">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                  <TrendingUp size={20} color="var(--accent-success)" />
                  <h3 style={{ margin: 0, fontSize: '16px' }}>Funil de Vendas (Geral)</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {boardStats.map((board, idx) => {
                    const count = board.count;
                    const percentage = totalClientsReal > 0 ? (count / totalClientsReal) * 100 : 0;
                    return (
                      <div key={board.id}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>{board.name}</span>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            {board.movementsThisMonth > 0 && (
                              <span style={{ color: 'var(--accent-success)', fontSize: '11px', background: 'var(--accent-success)20', padding: '2px 6px', borderRadius: '4px' }}>
                                +{board.movementsThisMonth} no mês
                              </span>
                            )}
                            <span style={{ fontWeight: 600 }}>{count} clientes</span>
                          </div>
                        </div>
                        <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ 
                            height: '100%', 
                            width: `${percentage}%`, 
                            background: board.color || 'var(--accent-primary)',
                            borderRadius: '4px',
                            transition: 'width 1s ease-out'
                          }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* RANKING DE ÓRGÃOS */}
              <div className="card glass-panel">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                  <Building2 size={20} color="var(--accent-primary)" />
                  <h3 style={{ margin: 0, fontSize: '16px' }}>Top Órgãos por Volume</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {state.organs
                    .map(o => ({ ...o, clientCount: state.clients.filter(c => c.organId === o.id).length }))
                    .sort((a, b) => b.clientCount - a.clientCount)
                    .slice(0, 5)
                    .map((o, idx) => (
                      <div 
                        key={o.id} 
                        onClick={() => navigate(`/organ/${o.id}`)}
                        style={{ 
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                          padding: '8px', borderRadius: '8px', cursor: 'pointer',
                          background: 'rgba(255,255,255,0.02)', border: '1px solid transparent',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-tertiary)', width: '15px' }}>{idx + 1}</span>
                          <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{o.name}</span>
                        </div>
                        <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '4px', background: 'var(--accent-primary)20', color: 'var(--accent-primary)' }}>
                          {o.clientCount} cli
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            {/* FILTROS AVANÇADOS */}
            <div className="card glass-panel" style={{ marginBottom: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <Users size={20} color="var(--accent-secondary)" />
                <h3 style={{ margin: 0, fontSize: '16px' }}>Filtros Cruzados de Clientes</h3>
              </div>
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
                <div style={{ flex: '1 1 200px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Fase (Quadro)</label>
                  <select 
                    className="form-input" 
                    value={filterBoardId} 
                    onChange={e => setFilterBoardId(e.target.value)}
                  >
                    <option value="">Todas as Fases</option>
                    {state.clientBoards.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                
                <div style={{ flex: '1 1 200px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Etiqueta</label>
                  <select 
                    className="form-input" 
                    value={filterLabelId} 
                    onChange={e => setFilterLabelId(e.target.value)}
                  >
                    <option value="">Todas as Etiquetas</option>
                    {state.labels.map(l => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ flex: '1 1 200px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Órgão</label>
                  <div style={{ position: 'relative' }}>
                    <Building2 size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                    <input 
                      className="form-input" 
                      style={{ paddingLeft: 36, width: '100%', height: '36px', fontSize: '13px' }}
                      placeholder="Todos os Órgãos"
                      value={filterOrganName || ''}
                      onChange={e => {
                        setFilterOrganName(e.target.value);
                        setShowOrganSuggestions(true);
                      }}
                      onFocus={() => setShowOrganSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowOrganSuggestions(false), 200)}
                    />
                    {showOrganSuggestions && organSuggestions.length > 0 && (
                      <div style={{
                        position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                        background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                        borderRadius: 'var(--border-radius-sm)', marginTop: '4px',
                        boxShadow: 'var(--shadow-lg)', maxHeight: '250px', overflowY: 'auto'
                      }}>
                        {organSuggestions.map(org => (
                          <div 
                            key={org.id} 
                            style={{ padding: '10px 12px', fontSize: '13px', cursor: 'pointer', borderBottom: '1px solid var(--border-color)' }}
                            onMouseDown={() => {
                              setFilterOrganName(org.name);
                              setShowOrganSuggestions(false);
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            {org.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                <button className="btn btn-primary" onClick={handleFilter} disabled={isFiltering}>
                  {isFiltering ? 'Buscando...' : 'Aplicar Filtros'}
                </button>
                {hasFiltered && (
                  <button className="btn btn-secondary" onClick={handleClearFilters}>
                    Limpar
                  </button>
                )}
              </div>

              {/* RESULTADOS DOS FILTROS */}
              {hasFiltered && (
                <div>
                  <h4 style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                    Resultados ({filterResults.length} encontrados)
                  </h4>
                  {isFiltering ? (
                    <LoadingSpinner message="Buscando..." inline={true} />
                  ) : filterResults.length === 0 ? (
                    <p style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>Nenhum cliente encontrado com os filtros selecionados.</p>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                      {filterResults.map(c => (
                        <div 
                          key={c.id} 
                          onClick={() => navigate(`/organ/${c.organId}`, { state: { openClientId: c.id } })}
                          style={{
                            padding: '12px',
                            background: 'rgba(255,255,255,0.02)',
                            borderRadius: '8px',
                            border: '1px solid rgba(255,255,255,0.05)',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
                          onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'}
                        >
                          <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {c.name}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                            {c.organName} <br />
                            CPF: {privacyMaskCpf(c.cpf)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* QUICK ACTIONS */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 'var(--space-md)',
            }}>
              {[
                { label: 'Ver Checklist', desc: 'Gerenciar órgãos e etiquetas', to: '/checklist' },
                { label: 'Ver Órgãos', desc: 'Acessar boards Kanban', to: '/orgaos' },
                { label: 'Importar Clientes', desc: 'Upload de planilha', to: '/importar' },
                { label: 'Follow-ups', desc: 'Acompanhar pendências', to: '/follow-up' },
              ].map((a, i) => (
                <button key={i} className="card glass-panel" onClick={() => navigate(a.to)} style={{
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'transform 0.2s ease',
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 2, color: 'var(--text-primary)' }}>{a.label}</div>
                    <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>{a.desc}</div>
                  </div>
                  <ArrowRight size={18} style={{ color: 'var(--text-tertiary)' }} />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* TAB ÓRGÃOS FAVORITOS */}
        {activeTab === 'organs' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
            {favOrgans.length === 0 ? (
              <p style={{ color: 'var(--text-tertiary)' }}>Nenhum órgão marcado como favorito.</p>
            ) : (
              favOrgans.map(o => (
                <div 
                  key={o.id} 
                  className="card glass-panel" 
                  style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                  onClick={() => navigate(`/organ/${o.id}`)}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-warning)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)'}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Building2 size={20} color="var(--accent-warning)" />
                      <h3 style={{ fontSize: '16px', color: 'var(--text-primary)', margin: 0 }}>{o.name}</h3>
                    </div>
                    <ChevronRight size={18} color="var(--text-tertiary)" />
                  </div>
                  <div style={{ marginTop: '12px', fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={14} /> {o.city} {o.state ? `- ${o.state}` : ''}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB CLIENTES FAVORITOS */}
        {activeTab === 'clients' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              {loadingFavorites && favoriteClients.length === 0 ? (
                <LoadingSpinner message="Carregando clientes favoritos..." />
            ) : favoriteClients.length === 0 ? (
              <p style={{ color: 'var(--text-tertiary)' }}>Nenhum cliente marcado como favorito.</p>
            ) : (
              favoriteClients.map(c => (
                <div 
                  key={c.id} 
                  className="card glass-panel" 
                  style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                  onClick={() => navigate(`/organ/${c.organId}`, { state: { openClientId: c.id } })}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-warning)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)'}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Users size={20} color="var(--accent-warning)" />
                      <div>
                        <h3 style={{ fontSize: '16px', color: 'var(--text-primary)', margin: 0 }}>{c.name}</h3>
                        <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>CPF: {privacyMaskCpf(c.cpf)}</span>
                      </div>
                    </div>
                    <ChevronRight size={18} color="var(--text-tertiary)" />
                  </div>
                  <div style={{ marginTop: '12px', fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={14} /> Ir para Kanban
                  </div>
                </div>
              ))
            )}
            </div>
            
            {favoriteClients.length > 0 && hasMoreFavs && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => loadFavClients(favPage + 1)}
                  disabled={loadingFavorites}
                >
                  {loadingFavorites ? 'Carregando...' : 'Carregar mais'}
                </button>
              </div>
            )}
          </>
        )}

      </div>
    </>
  );
}
