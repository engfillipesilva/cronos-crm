import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Layout/Header';
import { useApp } from '../context/AppContext';
import { Building2, Users, ChevronRight, Star } from 'lucide-react';

export default function OrganMenuPage() {
  const { state, actions } = useApp();
  const navigate = useNavigate();

  // Lista todos os órgãos, talvez ordenados alfabeticamente ou agrupados por status
  // Aqui vamos pegar todos que não estão na coluna "para-verificar"
  const activeOrgans = useMemo(() => {
    return state.organs
      .filter(o => o.organBoardId && o.organBoardId !== 'para-verificar')
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [state.organs]);

  const handleClick = (organId) => {
    navigate(`/organ/${organId}`);
  };

  return (
    <>
      <Header title="Órgãos" />
      <div className="city-menu" style={{ padding: 'var(--space-xl)', maxWidth: 1200, margin: '0 auto' }}>
        <div className="page-header" style={{ marginBottom: 'var(--space-xl)' }}>
          <div>
            <h1 className="page-title">Menu de Órgãos</h1>
            <p className="page-subtitle">{activeOrgans.length} órgãos em andamento</p>
          </div>
        </div>

        <div className="city-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-md)' }}>
          {activeOrgans.map((organ) => (
            <div
              key={organ.id}
              className="city-card"
              onClick={() => handleClick(organ.id)}
              style={{
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--border-radius-md)',
                padding: 'var(--space-lg)',
                border: '1px solid var(--border-color)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                  <Building2 size={18} style={{ color: 'var(--accent-primary)' }} />
                  {organ.name}
                  <button 
                    className="btn-icon" 
                    onClick={(e) => { e.stopPropagation(); actions.toggleOrganFavorite(organ.id, !organ.isFavorite); }}
                    style={{ padding: 4, minWidth: 'auto', marginLeft: 'auto' }}
                  >
                    <Star size={16} fill={organ.isFavorite ? 'var(--accent-warning)' : 'none'} color={organ.isFavorite ? 'var(--accent-warning)' : 'var(--text-tertiary)'} />
                  </button>
                </h3>
                <div style={{ color: 'var(--text-tertiary)', fontSize: 'var(--font-sm)', marginTop: 'var(--space-xs)', display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                  📍 {organ.city} {organ.state ? `- ${organ.state}` : ''}
                </div>
              </div>
              <ChevronRight size={20} style={{ color: 'var(--text-tertiary)' }} />
            </div>
          ))}

          {activeOrgans.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 'var(--space-2xl)', color: 'var(--text-tertiary)' }}>
              Nenhum órgão ativo no momento. Mova órgãos da coluna "Para Verificar" no Checklist.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
