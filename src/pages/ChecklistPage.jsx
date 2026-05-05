import { useState, useMemo, useCallback, useEffect, useRef, memo } from 'react';
import LoadingSpinner from '../components/LoadingSpinner';
import Header from '../components/Layout/Header';
import { useApp } from '../context/AppContext';
import { organsService } from '../services/organsService';
import { organBoardsService } from '../services/organBoardsService';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, X, Save, MoreVertical, Edit2, ArrowUpToLine, ArrowDownToLine, Settings, FileText, Tag, ArrowRight, CheckSquare, Square, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { motion, AnimatePresence } from 'framer-motion';
import LabelManager from '../components/LabelManager';
import { normalizeString } from '../utils/stringUtils';

// ─── Posição fracionária ─────────────────────────────────────────────────────
function calcPos(sortedList, dropIndex) {
  const prev = sortedList[dropIndex - 1];
  const next = sortedList[dropIndex];
  if (!prev && !next) return 1000;
  if (!prev) return (next.position ?? 1000) - 1000;
  if (!next) return (prev.position ?? 0) + 1000;
  return ((prev.position ?? 0) + (next.position ?? 0)) / 2;
}

// ─── Card interno memoizado (não re-renderiza se organ/labels não mudaram) ───
const CardInner = memo(function CardInner({ organ, labels, onEditClick, onMoveToTop, onMoveToBottom, isSelected, toggleSelection }) {
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button 
            className="btn-icon" 
            onClick={(e) => { e.stopPropagation(); toggleSelection(organ.id); }}
            style={{ padding: 0, minWidth: 'auto', background: 'none' }}
          >
            {isSelected ? (
              <CheckSquare size={14} color="var(--accent-primary)" />
            ) : (
              <Square size={14} color="var(--text-tertiary)" />
            )}
          </button>
          <div className="kanban-card-title" style={{ flex: 1, paddingRight: 8 }}>{organ.name}</div>
        </div>
        <div style={{ display: 'flex', gap: 2 }}>
          <button 
            className="btn-icon" 
            style={{ padding: 4, color: 'var(--text-tertiary)' }}
            onClick={(e) => { e.stopPropagation(); onMoveToTop(organ); }}
            title="Mover para o Topo do Quadro"
          >
            <ArrowUpToLine size={14} />
          </button>
          <button 
            className="btn-icon" 
            style={{ padding: 4, color: 'var(--text-tertiary)' }}
            onClick={(e) => { e.stopPropagation(); onMoveToBottom(organ); }}
            title="Mover para o Fim do Quadro"
          >
            <ArrowDownToLine size={14} />
          </button>
          <button 
            className="btn-icon" 
            style={{ padding: 4, color: 'var(--text-tertiary)' }}
            onClick={(e) => { e.stopPropagation(); onEditClick(organ); }}
            title="Editar Órgão"
          >
            <Edit2 size={14} />
          </button>
        </div>
      </div>
      <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)', marginTop: 4 }}>
        {organ.city}
      </div>
      {organ.labelIds && organ.labelIds.length > 0 && (
        <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
          {organ.labelIds.map(lid => {
            const l = labels.find(x => x.id === lid);
            if (!l) return null;
            return (
              <span 
                key={l.id} 
                style={{ 
                  backgroundColor: l.color,
                  color: '#fff',
                  padding: '2px 6px',
                  borderRadius: '8px',
                  fontSize: '10px',
                  fontWeight: 600
                }}
                title={l.name}
              >
                {l.name}
              </span>
            );
          })}
        </div>
      )}
    </>
  );
});

// ─── Lista de cards memoizada por coluna ─────────────────────────────────────
const BoardCardList = memo(function BoardCardList({ boardOrgans, labels, onCardClick, onEditClick, onMoveToTop, onMoveToBottom, onLabelDrop, selectedOrganIds, toggleSelection }) {
  // Renderizar mais de 100 itens no DnD no mesmo container trava o layout do navegador.
  const visibleCards = boardOrgans.slice(0, 100);
  
  return (
    <>
      {visibleCards.map((organ, idx) => (
        <Draggable key={organ.id} draggableId={organ.id} index={idx}>
          {(provided, snapshot) => (
            <div
              className={`kanban-card${snapshot.isDragging ? ' is-dragging' : ''}`}
              ref={provided.innerRef}
              {...provided.draggableProps}
              {...provided.dragHandleProps}
              onClick={() => onCardClick(organ)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                try {
                  const raw = e.dataTransfer.getData('application/json');
                  if (!raw) return;
                  const data = JSON.parse(raw);
                  if (data.type === 'LABEL' && onLabelDrop) {
                    onLabelDrop(organ, data.id);
                  }
                } catch (err) {}
              }}
            >
              <CardInner 
                organ={organ} 
                labels={labels} 
                onEditClick={onEditClick} 
                onMoveToTop={onMoveToTop}
                onMoveToBottom={onMoveToBottom}
                isSelected={selectedOrganIds.includes(organ.id)}
                toggleSelection={toggleSelection}
              />
            </div>
          )}
        </Draggable>
      ))}
      
      {boardOrgans.length > 100 && (
        <div style={{ textAlign: 'center', padding: 'var(--space-md)', color: 'var(--text-tertiary)', fontSize: 'var(--font-xs)' }}>
          Use a busca para encontrar os outros {boardOrgans.length - 100} órgãos...
        </div>
      )}
    </>
  );
});

// ─── Página principal ────────────────────────────────────────────────────────
export default function ChecklistPage() {
  const { state, actions } = useApp();
  const [search, setSearch] = useState('');
  const [selectedLabelIds, setSelectedLabelIds] = useState([]);
  const [showLabelManager, setShowLabelManager] = useState(false);
  const navigate = useNavigate();

  // Estados de Ações em Massa (Bulk Actions)
  const [selectedOrganIds, setSelectedOrganIds] = useState([]);
  const [showBulkMoveMenu, setShowBulkMoveMenu] = useState(false);
  const [showBulkLabelMenu, setShowBulkLabelMenu] = useState(false);

  // Estado LOCAL — fonte de verdade para DnD (desacoplado do servidor)
  const [localOrgans, setLocalOrgans] = useState(null);
  const [localBoards, setLocalBoards] = useState(null);
  const initDone = useRef(false);

  // Inicializa UMA Única VEZ — normaliza posições defeituosas (0 ou nulas)
  useEffect(() => {
    if (!initDone.current && state.organs.length > 0 && state.organBoards.length > 0) {
      initDone.current = true;

      // Garante que todo órgão tem uma posição única e válida
      const normalized = state.organs.map(o => {
        if (o.position != null && o.position > 0) return o;
        const oid = parseInt(o.originalId, 10);
        return { ...o, position: isNaN(oid) || oid <= 0 ? 999999 : oid * 1000 };
      });

      setLocalOrgans(normalized);
      setLocalBoards(state.organBoards);
    }
  }, [state.organs, state.organBoards]);

  // Helpers para CRUD que atualizam estado local + global
  const patchLocalOrgan = useCallback((id, changes) =>
    setLocalOrgans(prev => (prev ?? []).map(o => o.id === id ? { ...o, ...changes } : o)), []);
  const addLocalOrgan = useCallback((organ) =>
    setLocalOrgans(prev => [...(prev ?? []), organ]), []);
  const removeLocalOrgan = useCallback((id) =>
    setLocalOrgans(prev => (prev ?? []).filter(o => o.id !== id)), []);

  // Modals
  const [showAddOrgan, setShowAddOrgan] = useState(false);
  const [newOrgan, setNewOrgan] = useState({ name: '', city: '', state: '', boardId: '' });
  const [editOrganModal, setEditOrganModal] = useState(null);
  const [editOrganForm, setEditOrganForm] = useState({});
  const [showAddBoard, setShowAddBoard] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [editingBoardId, setEditingBoardId] = useState(null);
  const [editBoardName, setEditBoardName] = useState('');

  // --- Ações em Massa ---
  const toggleOrganSelection = useCallback((organId) => {
    setSelectedOrganIds(prev => 
      prev.includes(organId) ? prev.filter(id => id !== organId) : [...prev, organId]
    );
  }, []);

  const handleSelectAllInBoard = useCallback((boardId) => {
    if (!localOrgans) return;
    const boardOrganIds = localOrgans.filter(o => o.organBoardId === boardId).map(o => o.id);
    const allSelected = boardOrganIds.length > 0 && boardOrganIds.every(id => selectedOrganIds.includes(id));
    
    if (allSelected) {
      setSelectedOrganIds(prev => prev.filter(id => !boardOrganIds.includes(id)));
    } else {
      setSelectedOrganIds(prev => [...new Set([...prev, ...boardOrganIds])]);
    }
  }, [localOrgans, selectedOrganIds]);

  const handleBulkMove = async (targetBoardId) => {
    if (selectedOrganIds.length === 0) return;
    setLocalOrgans(prev => prev.map(o => 
      selectedOrganIds.includes(o.id) ? { ...o, organBoardId: targetBoardId } : o
    ));
    try {
      const updates = selectedOrganIds.map(id => organsService.update(id, { organBoardId: targetBoardId }));
      await Promise.all(updates);
      toast.success(`${selectedOrganIds.length} órgãos movidos!`);
      setSelectedOrganIds([]);
      setShowBulkMoveMenu(false);
    } catch (e) {
      toast.error('Erro ao mover órgãos em massa.');
      setLocalOrgans(state.organs);
    }
  };

  const handleBulkLabel = async (labelId, action) => {
    if (selectedOrganIds.length === 0) return;
    
    setLocalOrgans(prev => prev.map(o => {
      if (!selectedOrganIds.includes(o.id)) return o;
      const currentLabels = o.labelIds || [];
      if (action === 'remove') {
        return { ...o, labelIds: currentLabels.filter(id => id !== labelId) };
      } else {
        if (!currentLabels.includes(labelId)) {
          return { ...o, labelIds: [...currentLabels, labelId] };
        }
      }
      return o;
    }));
    
    try {
      const updates = selectedOrganIds.map(id => {
        const o = localOrgans.find(org => org.id === id);
        const currentLabels = o?.labelIds || [];
        if (action === 'remove') {
          if (currentLabels.includes(labelId)) {
            return organsService.update(id, { labelIds: currentLabels.filter(lId => lId !== labelId) });
          }
        } else {
          if (!currentLabels.includes(labelId)) {
            return organsService.update(id, { labelIds: [...currentLabels, labelId] });
          }
        }
        return Promise.resolve();
      });
      await Promise.all(updates);
      toast.success(`Etiqueta ${action === 'remove' ? 'removida' : 'aplicada'} em ${selectedOrganIds.length} órgãos!`);
      setSelectedOrganIds([]);
      setShowBulkLabelMenu(false);
    } catch (e) {
      toast.error('Erro ao etiquetar órgãos.');
      setLocalOrgans(state.organs);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedOrganIds.length === 0) return;
    if (!window.confirm(`Tem certeza que deseja excluir ${selectedOrganIds.length} órgãos permanentemente?`)) return;
    
    setLocalOrgans(prev => prev.filter(o => !selectedOrganIds.includes(o.id)));
    try {
      const deletes = selectedOrganIds.map(id => organsService.delete(id));
      await Promise.all(deletes);
      toast.success(`${selectedOrganIds.length} órgãos excluídos!`);
      setSelectedOrganIds([]);
    } catch (e) {
      toast.error('Erro ao excluir órgãos.');
      setLocalOrgans(state.organs);
    }
  };

  // ─── Drag and Drop ──────────────────────────────────────────────────────────
  const onDragEnd = useCallback((result) => {
    const { destination, source, draggableId, type } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    if (type === 'BOARD') {
      const sorted = [...(localBoards ?? [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
      const [moved] = sorted.splice(source.index, 1);
      sorted.splice(destination.index, 0, moved);
      // Vizinhos na nova ordem (sorted já têm o item em nova posição)
      const prevB = sorted[destination.index - 1];
      const nextB = sorted[destination.index + 1];
      let newPos = 1000;
      if (!prevB && nextB)       newPos = (nextB.position ?? 1000) - 1000;
      else if (!nextB && prevB)  newPos = (prevB.position ?? 0) + 1000;
      else if (prevB && nextB)   newPos = ((prevB.position ?? 0) + (nextB.position ?? 0)) / 2;
      setLocalBoards(prev => (prev ?? []).map(b => b.id === moved.id ? { ...b, position: newPos } : b));
      organBoardsService.update(moved.id, { position: newPos }).catch(() => toast.error('Erro ao salvar posição do quadro'));
      return;
    }

    if (type === 'CARD') {
      const destBoardId = destination.droppableId;
      // Usa estado LOCAL com sort estável (mesma lógica da renderização)
      const destCards = [...(localOrgans ?? [])]
        .filter(o => o.organBoardId === destBoardId && o.id !== draggableId)
        .sort((a, b) => {
          const pa = a.position ?? (parseInt(a.originalId, 10) * 1000) ?? 0;
          const pb = b.position ?? (parseInt(b.originalId, 10) * 1000) ?? 0;
          if (pa !== pb) return pa - pb;
          return (parseInt(a.originalId, 10) || 0) - (parseInt(b.originalId, 10) || 0);
        });

      const newPos = calcPos(destCards, destination.index);

      setLocalOrgans(prev =>
        (prev ?? []).map(o => o.id === draggableId ? { ...o, organBoardId: destBoardId, position: newPos } : o)
      );

      organsService.move(draggableId, destBoardId, newPos).catch(() => {
        toast.error('Erro ao salvar — revertendo...');
        setLocalOrgans(state.organs);
      });
    }
  }, [localBoards, localOrgans, state.organs]);

  // ─── Board CRUD ─────────────────────────────────────────────────────────────
  const handleAddBoard = async () => {
    if (!newBoardName.trim()) return;
    const maxPos = (localBoards ?? []).reduce((m, b) => Math.max(m, b.position ?? 0), 0);
    const nb = { id: `${Date.now()}-${newBoardName.toLowerCase().replace(/\s+/g, '-')}`, name: newBoardName, position: maxPos + 1000 };
    const created = await actions.addOrganBoard(nb);
    if (created) setLocalBoards(prev => [...(prev ?? []), created]);
    setNewBoardName(''); setShowAddBoard(false);
  };

  const handleSaveBoardName = (boardId) => {
    if (!editBoardName.trim()) return;
    setLocalBoards(prev => (prev ?? []).map(b => b.id === boardId ? { ...b, name: editBoardName } : b));
    actions.updateOrganBoard(boardId, { name: editBoardName });
    setEditingBoardId(null);
  };

  const handleDeleteBoard = async (boardId) => {
    if (!confirm('Tem certeza? Os órgãos do quadro serão desvinculados.')) return;
    setLocalBoards(prev => (prev ?? []).filter(b => b.id !== boardId));
    await actions.deleteOrganBoard(boardId);
  };

  // ─── Organ CRUD ─────────────────────────────────────────────────────────────
  const handleAddOrgan = async () => {
    if (!newOrgan.name.trim() || !newOrgan.city.trim()) return toast.error('Nome e cidade são obrigatórios');
    const lastPos = (localOrgans ?? [])
      .filter(o => o.organBoardId === newOrgan.boardId)
      .reduce((m, o) => Math.max(m, o.position ?? 0), 0);
    try {
      const created = await actions.addOrgan({ ...newOrgan, organBoardId: newOrgan.boardId, position: lastPos + 1000 });
      if (created) addLocalOrgan(created);
      setNewOrgan({ name: '', city: '', state: '', boardId: '', labelIds: [] }); setShowAddOrgan(false);
      toast.success('Órgão adicionado!');
    } catch {}
  };

  const saveEditOrgan = async () => {
    patchLocalOrgan(editOrganModal, editOrganForm);
    await actions.updateOrgan(editOrganModal, editOrganForm);
    setEditOrganModal(null); toast.success('Órgão atualizado!');
  };

  // ─── Render helpers ─────────────────────────────────────────────────────────
  const sortedBoards = useMemo(() =>
    [...(localBoards ?? [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
    [localBoards]
  );

  // Ordenação estável: posição primária, originalId como desempate
  const stableSort = useCallback((arr) =>
    [...arr].sort((a, b) => {
      const pa = a.position ?? (parseInt(a.originalId, 10) * 1000) ?? 0;
      const pb = b.position ?? (parseInt(b.originalId, 10) * 1000) ?? 0;
      if (pa !== pb) return pa - pb;
      return (parseInt(a.originalId, 10) || 0) - (parseInt(b.originalId, 10) || 0);
    }), []);

  // Pré-computa os cards por board (memoizado)
  const term = normalizeString(search);
  const organsByBoard = useMemo(() => {
    const map = {};
    for (const b of sortedBoards) {
      map[b.id] = stableSort(
        (localOrgans ?? []).filter(o => {
          if (o.organBoardId !== b.id) return false;
          
          if (term && !normalizeString(o.name ?? '').includes(term) && !normalizeString(o.city ?? '').includes(term)) {
            return false;
          }

          if (selectedLabelIds.length > 0) {
            const organLabels = o.labelIds || [];
            if (!selectedLabelIds.some(id => organLabels.includes(id))) return false;
          }

          return true;
        })
      );
    }
    return map;
  }, [localOrgans, sortedBoards, term, selectedLabelIds, stableSort]);

  const handleCardClick = useCallback((organ) => {
    navigate(`/organ/${organ.id}`);
  }, [navigate]);

  const handleEditClick = useCallback((organ) => {
    setEditOrganForm(organ); setEditOrganModal(organ.id);
  }, []);

  const handleMoveToTop = useCallback((organ) => {
    // Busca TODOS os órgãos do quadro, ignorando filtros de busca, para achar o topo absoluto
    const boardCards = stableSort((localOrgans ?? []).filter(o => o.organBoardId === organ.organBoardId));
    const minPos = boardCards.length > 0 ? (boardCards[0].position ?? 0) : 1000;
    const newPos = minPos - 1000;
    
    setLocalOrgans(prev => (prev ?? []).map(o => o.id === organ.id ? { ...o, position: newPos } : o));
    organsService.update(organ.id, { position: newPos }).catch(() => toast.error('Erro ao mover.'));
  }, [localOrgans, stableSort]);

  const handleLabelDrop = useCallback((organ, labelId) => {
    const currentLabels = organ.labelIds || [];
    if (!currentLabels.includes(labelId)) {
      const newLabels = [...currentLabels, labelId];
      patchLocalOrgan(organ.id, { labelIds: newLabels });
      actions.updateOrgan(organ.id, { labelIds: newLabels });
      toast.success('Etiqueta vinculada!');
    } else {
      toast('O órgão já possui esta etiqueta.', { icon: 'ℹ️' });
    }
  }, [patchLocalOrgan, actions]);

  const handleMoveToBottom = useCallback((organ) => {
    // Busca TODOS os órgãos do quadro, ignorando filtros de busca, para achar o fim absoluto
    const boardCards = stableSort((localOrgans ?? []).filter(o => o.organBoardId === organ.organBoardId));
    const maxPos = boardCards.length > 0 ? (boardCards[boardCards.length - 1].position ?? 0) : 0;
    const newPos = maxPos + 1000;
    
    setLocalOrgans(prev => (prev ?? []).map(o => o.id === organ.id ? { ...o, position: newPos } : o));
    organsService.update(organ.id, { position: newPos }).catch(() => toast.error('Erro ao mover.'));
  }, [localOrgans, stableSort]);

  if (state.loading || !localOrgans) return <LoadingSpinner message="Carregando órgãos..." />;

  return (
    <>
      <Header title="Checklist de Órgãos (Kanban)">
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <button className="btn btn-secondary" onClick={() => setShowAddBoard(true)}>
            <Plus size={16} /> Novo Quadro
          </button>
        </div>
      </Header>

      <div style={{ padding: 'var(--space-md) var(--space-md) 0 var(--space-md)' }}>
        {/* Barra de Ferramentas Compacta */}
        <div className="glass-panel" style={{ 
          padding: '10px 16px', 
          marginBottom: '12px', 
          display: 'flex', 
          flexDirection: 'column',
          gap: '6px'
        }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Campo de Busca */}
            <div style={{ flex: '0 1 320px', position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
              <input 
                type="text" 
                className="form-input" 
                placeholder="Buscar órgão ou cidade..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: 32, width: '100%', height: '36px', fontSize: '13px' }}
              />
            </div>
          </div>

          {/* Etiquetas em linha compacta */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Etiquetas:</span>
            {state.labels.map(label => {
              const isSelected = selectedLabelIds.includes(label.id);
              return (
                <button
                  key={label.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/json', JSON.stringify({ type: 'LABEL', id: label.id }));
                  }}
                  onClick={() => setSelectedLabelIds(prev => isSelected ? prev.filter(id => id !== label.id) : [...prev, label.id])}
                  style={{
                    background: isSelected ? label.color : `${label.color}15`,
                    color: isSelected ? '#fff' : label.color,
                    border: '1px solid',
                    borderColor: isSelected ? label.color : `${label.color}30`,
                    padding: '2px 10px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: isSelected ? `0 0 8px ${label.color}60` : 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {label.name}
                </button>
              );
            })}
            <button
              onClick={() => setShowLabelManager(!showLabelManager)}
              className="btn-icon"
              style={{ width: 24, height: 24, padding: 0, marginLeft: '4px' }}
              title="Gerenciar Etiquetas"
            >
              <Settings size={14} />
            </button>
          </div>
          
          {showLabelManager && (
            <AnimatePresence>
              <motion.div 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: 'auto' }} 
                exit={{ opacity: 0, height: 0 }}
                style={{ marginTop: '12px', padding: '12px', background: 'rgba(0,0,0,0.15)', borderRadius: '8px', border: '1px solid var(--border-color)', overflow: 'hidden' }}
              >
                <LabelManager selectedIds={selectedLabelIds} onChange={setSelectedLabelIds} inlineMode={true} />
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="board-list" direction="horizontal" type="BOARD">
          {(provided) => (
            <div className="kanban-container" ref={provided.innerRef} {...provided.droppableProps}>
              {sortedBoards.map((board, boardIndex) => {
        const boardOrgans = organsByBoard[board.id] ?? [];
                return (
                  <Draggable key={board.id} draggableId={board.id} index={boardIndex}>
                    {(provided) => (
                      <div className="kanban-column" ref={provided.innerRef} {...provided.draggableProps}>
                        <div className="kanban-column-header" {...provided.dragHandleProps}>
                          {editingBoardId === board.id ? (
                            <input autoFocus className="input-base" value={editBoardName}
                              onChange={e => setEditBoardName(e.target.value)}
                              onBlur={() => handleSaveBoardName(board.id)}
                              onKeyDown={e => e.key === 'Enter' && handleSaveBoardName(board.id)}
                              style={{ flex: 1 }} />
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                              <button 
                                className="btn-icon" 
                                onClick={(e) => { e.stopPropagation(); handleSelectAllInBoard(board.id); }}
                                style={{ padding: 0, minWidth: 'auto', background: 'none' }}
                                title="Selecionar Todos"
                              >
                                {(boardOrgans.length > 0 && boardOrgans.every(o => selectedOrganIds.includes(o.id))) ? (
                                  <CheckSquare size={16} color="var(--accent-primary)" />
                                ) : (
                                  <Square size={16} color="var(--text-tertiary)" />
                                )}
                              </button>
                              <h3 onClick={() => { setEditingBoardId(board.id); setEditBoardName(board.name); }}
                                style={{ flex: 1, cursor: 'pointer', margin: 0 }}>
                                {board.name} <span style={{ opacity: 0.5, fontSize: '0.8em' }}>({boardOrgans.length})</span>
                              </h3>
                            </div>
                          )}
                          <div className="dropdown">
                            <button className="btn-icon"><MoreVertical size={16} /></button>
                            <div className="dropdown-menu">
                              <button className="dropdown-item" onClick={() => { setNewOrgan({ ...newOrgan, boardId: board.id }); setShowAddOrgan(true); }}>
                                Adicionar Órgão
                              </button>
                              <button className="dropdown-item" onClick={() => handleDeleteBoard(board.id)} style={{ color: 'var(--accent-danger)' }}>
                                Excluir Quadro
                              </button>
                            </div>
                          </div>
                        </div>

                        <Droppable droppableId={board.id} type="CARD">
                          {(provided, snapshot) => (
                            <div className={`kanban-cards-list${snapshot.isDraggingOver ? ' is-dragging-over' : ''}`}
                              ref={provided.innerRef} {...provided.droppableProps}>
                              <BoardCardList
                                boardOrgans={boardOrgans}
                                labels={state.labels}
                                onCardClick={handleCardClick}
                                onEditClick={handleEditClick}
                                onMoveToTop={handleMoveToTop}
                                onMoveToBottom={handleMoveToBottom}
                                onLabelDrop={handleLabelDrop}
                                selectedOrganIds={selectedOrganIds}
                                toggleSelection={toggleOrganSelection}
                              />
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>

                        <button className="btn-add-card"
                          onClick={() => { setNewOrgan({ ...newOrgan, boardId: board.id }); setShowAddOrgan(true); }}>
                          <Plus size={16} /> Adicionar Órgão
                        </button>
                      </div>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
              <div style={{ minWidth: 280, padding: 'var(--space-md)' }}>
                {showAddBoard ? (
                  <div className="kanban-column" style={{ padding: 'var(--space-md)' }}>
                    <input autoFocus className="input-base" placeholder="Nome do quadro..."
                      value={newBoardName} onChange={e => setNewBoardName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddBoard()}
                      style={{ marginBottom: 'var(--space-sm)' }} />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-primary" onClick={handleAddBoard}>Salvar</button>
                      <button className="btn btn-secondary" onClick={() => setShowAddBoard(false)}><X size={16} /></button>
                    </div>
                  </div>
                ) : (
                  <button className="btn btn-secondary" style={{ width: '100%', height: 48 }} onClick={() => setShowAddBoard(true)}>
                    <Plus size={16} /> Adicionar Quadro
                  </button>
                )}
              </div>
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Barra de Ações em Massa (Bottom Bar) */}
      <AnimatePresence>
        {selectedOrganIds.length > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="glass-panel"
            style={{
              position: 'fixed',
              bottom: '24px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '12px 24px',
              borderRadius: '32px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
              border: '1px solid rgba(108, 92, 231, 0.3)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', fontWeight: 600 }}>
              <CheckSquare size={18} color="var(--accent-primary)" />
              {selectedOrganIds.length} selecionado{selectedOrganIds.length > 1 ? 's' : ''}
            </div>
            
            <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.2)' }} />

            <div style={{ display: 'flex', gap: '8px', position: 'relative' }}>
              <div className="dropdown" style={{ display: 'flex' }}>
                <button 
                  className="btn btn-secondary btn-sm" 
                  onClick={() => setShowBulkMoveMenu(!showBulkMoveMenu)}
                  style={{ borderRadius: '16px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none' }}
                >
                  <ArrowRight size={14} /> Mover
                </button>
                {showBulkMoveMenu && (
                  <div className="dropdown-menu" style={{ bottom: '100%', top: 'auto', marginBottom: '8px', zIndex: 1001 }}>
                    <div style={{ padding: '8px', fontSize: '11px', fontWeight: 'bold', color: 'var(--text-tertiary)' }}>Mover para coluna:</div>
                    {localBoards.map(b => (
                      <button key={b.id} className="dropdown-item" onClick={() => handleBulkMove(b.id)}>
                        {b.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="dropdown" style={{ display: 'flex' }}>
                <button 
                  className="btn btn-secondary btn-sm" 
                  onClick={() => setShowBulkLabelMenu(!showBulkLabelMenu)}
                  style={{ borderRadius: '16px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none' }}
                >
                  <Tag size={14} /> Etiquetar
                </button>
                {showBulkLabelMenu && (
                  <div className="dropdown-menu" style={{ bottom: '100%', top: 'auto', marginBottom: '8px', zIndex: 1001 }}>
                    <div style={{ padding: '8px', fontSize: '11px', fontWeight: 'bold', color: 'var(--text-tertiary)' }}>Etiquetas:</div>
                    {state.labels.map(l => {
                      const selectedOrgansData = localOrgans.filter(o => selectedOrganIds.includes(o.id));
                      const isLabelInAll = selectedOrgansData.length > 0 && selectedOrgansData.every(o => (o.labelIds || []).includes(l.id));
                      const action = isLabelInAll ? 'remove' : 'add';
                      return (
                        <button key={l.id} className="dropdown-item" onClick={() => handleBulkLabel(l.id, action)}>
                          <div style={{ width: 12, height: 12, borderRadius: '50%', background: l.color, display: 'inline-block', marginRight: 8 }} />
                          {action === 'add' ? 'Adicionar' : 'Remover'} {l.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <button 
                className="btn btn-secondary btn-sm" 
                onClick={handleBulkDelete}
                style={{ borderRadius: '16px', background: 'rgba(255,71,87,0.15)', color: 'var(--accent-danger)', border: 'none' }}
                title="Excluir selecionados"
              >
                <Trash2 size={14} /> Excluir
              </button>
            </div>

            <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.2)' }} />

            <button 
              className="btn-icon" 
              onClick={() => setSelectedOrganIds([])} 
              style={{ color: 'var(--text-tertiary)' }}
              title="Limpar seleção"
            >
              <X size={18} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {showAddOrgan && (
        <div className="modal-overlay" onClick={() => setShowAddOrgan(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Novo Órgão</h3>
              <button className="btn-icon" onClick={() => setShowAddOrgan(false)}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <input placeholder="Nome do órgão *" value={newOrgan.name}
                onChange={e => setNewOrgan({ ...newOrgan, name: e.target.value })} autoFocus />
              <input placeholder="Cidade *" value={newOrgan.city || ''}
                onChange={e => setNewOrgan({ ...newOrgan, city: e.target.value })} />
              <LabelManager 
                selectedIds={newOrgan.labelIds || []} 
                onChange={newIds => setNewOrgan({ ...newOrgan, labelIds: newIds })} 
              />
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAddOrgan(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleAddOrgan}><Save size={14} /> Salvar</button>
            </div>
          </div>
        </div>
      )}

      {editOrganModal && (
        <div className="modal-overlay" onClick={() => setEditOrganModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Editar Órgão</h3>
              <button className="btn-icon" onClick={() => setEditOrganModal(null)}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <input placeholder="Nome *" value={editOrganForm.name}
                onChange={e => setEditOrganForm({ ...editOrganForm, name: e.target.value })} />
              <input placeholder="Cidade *" value={editOrganForm.city || ''}
                onChange={e => setEditOrganForm({ ...editOrganForm, city: e.target.value })} />
              <LabelManager 
                selectedIds={editOrganForm.labelIds || []} 
                onChange={newIds => setEditOrganForm({ ...editOrganForm, labelIds: newIds })} 
              />
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setEditOrganModal(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={saveEditOrgan}><Save size={14} /> Salvar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
