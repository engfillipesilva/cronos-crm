import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Upload, Users, MessageCircle, Trash2, Edit, Plus, ArrowUpToLine, ArrowDownToLine, ChevronRight, MoreVertical, Save, X, Search, Star, Bell, Settings, FileText, Tag, ArrowRight, CheckSquare, Square } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

import Header from '../components/Layout/Header';
import LoadingSpinner from '../components/LoadingSpinner';
import ImportClientsModal from '../components/ImportClientsModal';
import ClientModal from '../components/ClientModal';
import LabelManager from '../components/LabelManager';
import { useApp } from '../context/AppContext';
import { clientsService } from '../services/clientsService';
import { privacyMaskCpf, normalizeString } from '../utils/stringUtils';

export default function OrganDashboardPage() {
  const { organId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { state: appContextState, actions } = useApp();
  
  const [organ, setOrgan] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [clients, setClients] = useState([]);
  const [loadingClients, setLoadingClients] = useState(true);

  // Estados de Filtros (Toolbar)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLabelIds, setSelectedLabelIds] = useState([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);
  const [showLabelManager, setShowLabelManager] = useState(false);
  const [showNotesSnippet, setShowNotesSnippet] = useState(false);

  // Estados de Ações em Massa (Bulk Actions)
  const [selectedClientIds, setSelectedClientIds] = useState([]);
  const [showBulkMoveMenu, setShowBulkMoveMenu] = useState(false);
  const [showBulkLabelMenu, setShowBulkLabelMenu] = useState(false);

  // Estados para CRUD de Boards (Colunas)
  const [editingBoardId, setEditingBoardId] = useState(null);
  const [editBoardName, setEditBoardName] = useState('');
  const [showAddBoard, setShowAddBoard] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [boardLimits, setBoardLimits] = useState({});
  const hasOpenedInitialClient = useRef(false);

  // 1. Encontra o Órgão
  useEffect(() => {
    const found = appContextState.organs.find(o => o.id === organId);
    if (found) setOrgan(found);
  }, [organId, appContextState.organs]);

  // 2. Busca os clientes deste órgão
  const loadClients = useCallback(async () => {
    setLoadingClients(true);
    try {
      const data = await clientsService.fetchByOrgan(organId);
      setClients(data);
    } catch (error) {
      toast.error('Erro ao carregar clientes deste órgão.');
    } finally {
      setLoadingClients(false);
    }
  }, [organId]);

  useEffect(() => {
    if (organId) loadClients();
  }, [organId, loadClients]);

  // Se veio da Busca Global, abre o modal do cliente (apenas uma vez)
  useEffect(() => {
    if (location.state?.openClientId && clients.length > 0 && !hasOpenedInitialClient.current) {
      const c = clients.find(cl => cl.id === location.state.openClientId);
      if (c) {
        setEditingClient(c);
        setShowClientModal(true);
        hasOpenedInitialClient.current = true; // Trava para não abrir de novo
        // Limpar o state para não reabrir se der refresh
        window.history.replaceState({}, document.title);
      }
    }
  }, [location.state, clients]);

  // Agrupamento e Ordenação
  const boards = useMemo(() => {
    return [...(appContextState.clientBoards || [])].sort((a, b) => a.position - b.position);
  }, [appContextState.clientBoards]);

  const filteredClients = useMemo(() => {
    return clients.filter(client => {
      // 1. Busca Global (Texto: Nome, CPF, Telefone)
      if (searchQuery.trim()) {
        const q = normalizeString(searchQuery);
        const matchName = normalizeString(client.name).includes(q);
        const matchCpf = client.cpf && String(client.cpf).includes(q.replace(/\D/g, ''));
        const matchPhones = client.phones && client.phones.some(p => p.includes(q.replace(/\D/g, '')));
        
        if (!matchName && !matchCpf && !matchPhones) return false;
      }

      // 2. Etiquetas (Lógica OR)
      if (selectedLabelIds.length > 0) {
        const clientLabels = client.labelIds || [];
        if (!selectedLabelIds.some(id => clientLabels.includes(id))) return false;
      }

      // 3. Favoritos
      if (showFavoritesOnly && !client.isFavorite) return false;

      // 4. Atrasados (Overdue)
      if (showOverdueOnly) {
        const clientFollowUps = appContextState.followUps.filter(f => f.clientId === client.id && !f.completed);
        if (clientFollowUps.length === 0) return false;
        const nextFollowUp = clientFollowUps.sort((a, b) => new Date(a.date) - new Date(b.date))[0];
        if (new Date(nextFollowUp.date) >= new Date()) return false;
      }

      return true;
    });
  }, [clients, searchQuery, selectedLabelIds, showFavoritesOnly, showOverdueOnly, appContextState.followUps]);

  const clientsByBoard = useMemo(() => {
    const map = {};
    for (const b of boards) {
      map[b.id] = filteredClients
        .filter(c => c.clientBoardId === b.id)
        .sort((a, b) => a.position - b.position);
    }
    return map;
  }, [filteredClients, boards]);

  // Drag and Drop
  const onDragEnd = async (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    // Nova referência do array
    let newClients = [...clients];
    const draggedClient = newClients.find(c => c.id === draggableId);
    if (!draggedClient) return;

    // Remove old
    newClients = newClients.filter(c => c.id !== draggableId);

    // Lista do novo board ordenada
    const destList = newClients
      .filter(c => c.clientBoardId === destination.droppableId)
      .sort((a, b) => a.position - b.position);

    const prev = destList[destination.index - 1];
    const next = destList[destination.index];

    let newPos = 1000;
    if (!prev && !next) newPos = 1000;
    else if (!prev) newPos = next.position - 1000;
    else if (!next) newPos = prev.position + 1000;
    else newPos = (prev.position + next.position) / 2;

    const updatedClient = {
      ...draggedClient,
      clientBoardId: destination.droppableId,
      position: newPos
    };

    newClients.push(updatedClient);
    setClients(newClients);

    try {
      await clientsService.update(draggableId, { 
        clientBoardId: destination.droppableId, 
        position: newPos 
      });
    } catch (e) {
      toast.error('Falha ao mover cliente');
      loadClients(); // Reverte state
    }
  };

  // Remover um número (lixeira)
  const handleDeletePhone = async (clientId, phoneToRemove) => {
    if (!confirm(`Tem certeza que deseja apagar o número ${phoneToRemove} permanentemente?`)) return;

    const client = clients.find(c => c.id === clientId);
    if (!client) return;

    const newPhones = client.phones.filter(p => p !== phoneToRemove);
    
    // Atualiza otimista
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, phones: newPhones } : c));

    try {
      await clientsService.update(clientId, { phones: newPhones });
      toast.success('Número removido!');
    } catch (e) {
      toast.error('Erro ao remover o número.');
      loadClients();
    }
  };

  const handleDeleteClient = async (clientId) => {
    if (!window.confirm('Tem certeza que deseja excluir ESTE CLIENTE e todos os seus dados permanentemente?')) return;
    try {
      await clientsService.delete(clientId);
      toast.success('Cliente excluído com sucesso!');
      loadClients();
    } catch (error) {
      toast.error('Erro ao excluir cliente.');
    }
  };

  const handleEditClient = (client) => {
    setEditingClient(client);
    setShowClientModal(true);
  };

  const handleNewClient = () => {
    setEditingClient(null);
    setShowClientModal(true);
  };

  const handleMoveToTop = async (client) => {
    const boardCards = clientsByBoard[client.clientBoardId] || [];
    const minPos = boardCards.length > 0 ? boardCards[0].position : 1000;
    const newPos = minPos - 1000;

    setClients(prev => prev.map(c => c.id === client.id ? { ...c, position: newPos } : c));
    try {
      await clientsService.update(client.id, { position: newPos });
    } catch (e) {
      toast.error('Erro ao mover cliente.');
      loadClients();
    }
  };

  const handleMoveToBottom = async (client) => {
    const boardCards = clientsByBoard[client.clientBoardId] || [];
    const maxPos = boardCards.length > 0 ? boardCards[boardCards.length - 1].position : 0;
    const newPos = maxPos + 1000;

    setClients(prev => prev.map(c => c.id === client.id ? { ...c, position: newPos } : c));
    try {
      await clientsService.update(client.id, { position: newPos });
    } catch (e) {
      toast.error('Erro ao mover cliente.');
      loadClients();
    }
  };

  // --- Ações em Massa ---
  const toggleClientSelection = (clientId) => {
    setSelectedClientIds(prev => 
      prev.includes(clientId) ? prev.filter(id => id !== clientId) : [...prev, clientId]
    );
  };

  const handleSelectAllInBoard = (boardId) => {
    const boardClientIds = filteredClients.filter(c => c.clientBoardId === boardId).map(c => c.id);
    const allSelected = boardClientIds.length > 0 && boardClientIds.every(id => selectedClientIds.includes(id));
    
    if (allSelected) {
      setSelectedClientIds(prev => prev.filter(id => !boardClientIds.includes(id)));
    } else {
      setSelectedClientIds(prev => [...new Set([...prev, ...boardClientIds])]);
    }
  };

  const handleBulkMove = async (targetBoardId) => {
    if (selectedClientIds.length === 0) return;
    setClients(prev => prev.map(c => 
      selectedClientIds.includes(c.id) ? { ...c, clientBoardId: targetBoardId } : c
    ));
    try {
      const updates = selectedClientIds.map(id => clientsService.update(id, { clientBoardId: targetBoardId }));
      await Promise.all(updates);
      toast.success(`${selectedClientIds.length} clientes movidos!`);
      setSelectedClientIds([]);
      setShowBulkMoveMenu(false);
    } catch (e) {
      toast.error('Erro ao mover clientes em massa.');
      loadClients();
    }
  };

  const handleBulkLabel = async (labelId, action) => {
    if (selectedClientIds.length === 0) return;
    
    setClients(prev => prev.map(c => {
      if (!selectedClientIds.includes(c.id)) return c;
      const currentLabels = c.labelIds || [];
      if (action === 'remove') {
        return { ...c, labelIds: currentLabels.filter(id => id !== labelId) };
      } else {
        if (!currentLabels.includes(labelId)) {
          return { ...c, labelIds: [...currentLabels, labelId] };
        }
      }
      return c;
    }));
    
    try {
      const updates = selectedClientIds.map(id => {
        const c = clients.find(cl => cl.id === id);
        const currentLabels = c?.labelIds || [];
        
        if (action === 'remove') {
          if (currentLabels.includes(labelId)) {
            return clientsService.update(id, { labelIds: currentLabels.filter(lId => lId !== labelId) });
          }
        } else {
          if (!currentLabels.includes(labelId)) {
            return clientsService.update(id, { labelIds: [...currentLabels, labelId] });
          }
        }
        return Promise.resolve();
      });
      await Promise.all(updates);
      toast.success(`Etiqueta ${action === 'remove' ? 'removida' : 'aplicada'} em ${selectedClientIds.length} clientes!`);
      setSelectedClientIds([]);
      setShowBulkLabelMenu(false);
    } catch (e) {
      toast.error('Erro ao etiquetar clientes.');
      loadClients();
    }
  };

  const handleBulkDelete = async () => {
    if (selectedClientIds.length === 0) return;
    if (!window.confirm(`Tem certeza que deseja excluir ${selectedClientIds.length} clientes permanentemente?`)) return;
    setClients(prev => prev.filter(c => !selectedClientIds.includes(c.id)));
    try {
      const deletes = selectedClientIds.map(id => clientsService.delete(id));
      await Promise.all(deletes);
      toast.success(`${selectedClientIds.length} clientes excluídos!`);
      setSelectedClientIds([]);
    } catch (e) {
      toast.error('Erro ao excluir clientes.');
      loadClients();
    }
  };
  
  const handleMoveToBoard = async (client, targetBoardId) => {
    // Busca os clientes do board de destino para calcular a posição (topo por padrão)
    const boardCards = (clientsByBoard[targetBoardId] || []).sort((a, b) => a.position - b.position);
    const minPos = boardCards.length > 0 ? boardCards[0].position : 1000;
    const newPos = minPos - 1000;

    setClients(prev => prev.map(c => c.id === client.id ? { ...c, clientBoardId: targetBoardId, position: newPos } : c));
    try {
      await clientsService.update(client.id, { clientBoardId: targetBoardId, position: newPos });
      toast.success(`Movido para ${boards.find(b => b.id === targetBoardId)?.name}`);
    } catch (e) {
      toast.error('Erro ao mover cliente.');
      loadClients();
    }
  };

  // Funções CRUD de Boards
  const handleAddBoard = async () => {
    if (!newBoardName.trim()) return;
    const maxPos = boards.reduce((m, b) => Math.max(m, b.position || 0), 0);
    const id = `board_cli_custom_${Date.now()}`;
    await actions.addClientBoard({ id, name: newBoardName, position: maxPos + 1000 });
    setNewBoardName('');
    setShowAddBoard(false);
    toast.success('Quadro adicionado!');
  };

  const handleSaveBoardName = async (boardId) => {
    if (!editBoardName.trim()) return setEditingBoardId(null);
    await actions.updateClientBoard(boardId, { name: editBoardName });
    setEditingBoardId(null);
  };

  const handleDeleteBoard = async (boardId) => {
    await actions.deleteClientBoard(boardId);
  };

  if (appContextState.loading || !organ) return <LoadingSpinner message="Carregando painel do órgão..." />;

  return (
    <>
      <Header title={`Painel: ${organ.name}`}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary btn-sm" onClick={handleNewClient}>
            <Plus size={14} /> Novo Cliente
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowImportModal(true)}>
            <Upload size={14} /> Importar
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/checklist')}>
            <ArrowLeft size={14} /> Voltar
          </button>
        </div>
      </Header>
      <div className="dashboard-content" style={{ padding: '8px', display: 'flex', flexDirection: 'column', height: 'calc(100dvh - var(--header-height))', overflow: 'hidden' }}>
        
        {/* Cabeçalho de Ações movido para o Header para poupar espaço */}

        {/* Barra de Ferramentas Compacta */}
        <div className="glass-panel" style={{ 
          padding: '6px 12px', 
          marginBottom: '8px', 
          display: 'flex', 
          flexDirection: 'column',
          gap: '4px',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Campo de Busca Compacto */}
            <div style={{ flex: '0 1 320px', position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
              <input 
                type="text" 
                className="form-input" 
                placeholder="Buscar..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ paddingLeft: 32, width: '100%', height: '36px', fontSize: '13px' }}
              />
            </div>

            {/* Botões de Filtros Avançados */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                className="btn btn-sm"
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                style={{ 
                  background: showFavoritesOnly ? 'rgba(253, 203, 110, 0.2)' : 'transparent',
                  color: showFavoritesOnly ? 'var(--accent-warning)' : 'var(--text-secondary)',
                  border: `1px solid ${showFavoritesOnly ? 'var(--accent-warning)' : 'var(--border-color)'}`
                }}
              >
                <Star size={14} fill={showFavoritesOnly ? 'var(--accent-warning)' : 'none'} /> Favoritos
              </button>
              
              <button 
                className="btn btn-sm"
                onClick={() => setShowOverdueOnly(!showOverdueOnly)}
                style={{ 
                  background: showOverdueOnly ? 'rgba(214, 48, 49, 0.1)' : 'transparent',
                  color: showOverdueOnly ? 'var(--accent-danger)' : 'var(--text-secondary)',
                  border: `1px solid ${showOverdueOnly ? 'var(--accent-danger)' : 'var(--border-color)'}`
                }}
              >
                <Bell size={14} className={showOverdueOnly ? 'bell-ringing' : ''} /> Atrasados
              </button>

              <button 
                className="btn btn-sm"
                onClick={() => setShowNotesSnippet(!showNotesSnippet)}
                style={{ 
                  background: showNotesSnippet ? 'rgba(108, 92, 231, 0.15)' : 'transparent',
                  color: showNotesSnippet ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  border: `1px solid ${showNotesSnippet ? 'var(--accent-primary)' : 'var(--border-color)'}`
                }}
              >
                <FileText size={14} /> Notas
              </button>
            </div>
          </div>

          {/* Etiquetas em linha compacta */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Etiquetas:</span>
            {appContextState.labels.map(label => {
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

        {loadingClients ? (
          <LoadingSpinner message="Carregando clientes..." />
        ) : (
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="all-boards" direction="horizontal" type="board">
                {(provided) => (
                    <div 
                      {...provided.droppableProps} 
                      ref={provided.innerRef} 
                      className="kanban-container"
                      style={{ 
                        display: 'flex', 
                        gap: '16px', 
                        paddingBottom: '16px',
                        width: '100%',
                        overflowX: 'auto',
                        flex: 1
                      }}
                    >
                    {boards.map((board, index) => {
                      const boardClients = clientsByBoard[board.id] || [];
                      return (
                        <Draggable key={board.id} draggableId={board.id} index={index}>
                          {(provided) => (
                            <div 
                              {...provided.draggableProps} 
                              ref={provided.innerRef}
                              className="kanban-column"
                              style={{
                                ...provided.draggableProps.style,
                                display: 'flex',
                                flexDirection: 'column'
                              }}
                            >
                              <div className="kanban-column-header" {...provided.dragHandleProps}>
                                {editingBoardId === board.id ? (
                                  <div style={{ display: 'flex', gap: 4, flex: 1 }}>
                                    <input 
                                      autoFocus 
                                      className="form-input" 
                                      style={{ padding: '2px 8px', height: 28 }}
                                      value={editBoardName}
                                      onChange={e => setEditBoardName(e.target.value)}
                                      onKeyDown={e => {
                                        if (e.key === 'Enter') handleSaveBoardName(board.id);
                                        if (e.key === 'Escape') setEditingBoardId(null);
                                      }}
                                    />
                                    <button className="btn-icon" onClick={() => handleSaveBoardName(board.id)}><Save size={14} /></button>
                                  </div>
                                ) : (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                                    <button 
                                      className="btn-icon" 
                                      onClick={(e) => { e.stopPropagation(); handleSelectAllInBoard(board.id); }}
                                      style={{ padding: 0, minWidth: 'auto', background: 'none' }}
                                      title="Selecionar Todos"
                                    >
                                      {(boardClients.length > 0 && boardClients.every(c => selectedClientIds.includes(c.id))) ? (
                                        <CheckSquare size={16} color="var(--accent-primary)" />
                                      ) : (
                                        <Square size={16} color="var(--text-tertiary)" />
                                      )}
                                    </button>
                                    <h2 className="kanban-column-title" style={{ cursor: 'pointer', margin: 0 }} onClick={() => { setEditingBoardId(board.id); setEditBoardName(board.name); }}>
                                      {board.name}
                                    </h2>
                                  </div>
                                )}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <span className="kanban-column-count">{boardClients.length}</span>
                                  <div className="dropdown">
                                    <button className="btn-icon"><MoreVertical size={16} /></button>
                                    <div className="dropdown-menu">
                                      <button className="dropdown-item" onClick={() => { setEditingBoardId(board.id); setEditBoardName(board.name); }}>Renomear</button>
                                      <button className="dropdown-item" onClick={() => handleDeleteBoard(board.id)} style={{ color: 'var(--accent-danger)' }}>Excluir Quadro</button>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <Droppable droppableId={board.id} type="CLIENT">
                                {(provided, snapshot) => (
                                  <div 
                                    className={`kanban-cards-list${snapshot.isDraggingOver ? ' is-dragging-over' : ''}`}
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                    style={{ flex: 1, overflowY: 'auto' }}
                                  >
                                    <div style={{ flex: 1, overflowY: 'auto' }}>
                                      {boardClients.slice(0, boardLimits[board.id] || 30).map((client, idx) => (
                                        <Draggable key={client.id} draggableId={client.id} index={idx}>
                                          {(provided, snapshot) => (
                                            <div
                                              className={`kanban-card${snapshot.isDragging ? ' is-dragging' : ''}`}
                                              ref={provided.innerRef}
                                              {...provided.draggableProps}
                                              {...provided.dragHandleProps}
                                              onClick={() => handleEditClient(client)}
                                              onDragOver={(e) => e.preventDefault()}
                                              onDrop={(e) => {
                                                e.preventDefault();
                                                try {
                                                  const raw = e.dataTransfer.getData('application/json');
                                                  if (!raw) return;
                                                  const data = JSON.parse(raw);
                                                  if (data.type === 'LABEL') {
                                                    const currentLabels = client.labelIds || [];
                                                    if (!currentLabels.includes(data.id)) {
                                                      const newLabels = [...currentLabels, data.id];
                                                      setClients(prev => prev.map(c => c.id === client.id ? { ...c, labelIds: newLabels } : c));
                                                      clientsService.update(client.id, { labelIds: newLabels });
                                                      toast.success('Etiqueta vinculada!');
                                                    } else {
                                                      toast('O cliente já possui esta etiqueta.', { icon: 'ℹ️' });
                                                    }
                                                  }
                                                } catch (err) {}
                                              }}
                                            >
                                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <div>
                                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <div className="kanban-card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                      <button 
                                                        className="btn-icon" 
                                                        onClick={(e) => { e.stopPropagation(); toggleClientSelection(client.id); }}
                                                        style={{ padding: 0, minWidth: 'auto', background: 'none' }}
                                                      >
                                                        {selectedClientIds.includes(client.id) ? (
                                                          <CheckSquare size={14} color="var(--accent-primary)" />
                                                        ) : (
                                                          <Square size={14} color="var(--text-tertiary)" />
                                                        )}
                                                      </button>
                                                      <button 
                                                        className="btn-icon" 
                                                        onClick={(e) => { 
                                                          e.stopPropagation(); 
                                                          const nextVal = !client.isFavorite;
                                                          setClients(prev => prev.map(c => c.id === client.id ? { ...c, isFavorite: nextVal } : c));
                                                          actions.toggleClientFavorite(client.id, nextVal); 
                                                        }}
                                                        style={{ padding: 0, minWidth: 'auto', background: 'none' }}
                                                      >
                                                        <Star size={14} fill={client.isFavorite ? 'var(--accent-warning)' : 'none'} color={client.isFavorite ? 'var(--accent-warning)' : 'var(--text-tertiary)'} />
                                                      </button>
                                                      {client.name}
                                                    </div>
                                                </div>
                                                
                                                {client.labelIds && client.labelIds.length > 0 && (
                                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                                                    {client.labelIds.map(labelId => {
                                                      const label = appContextState.labels.find(l => l.id === labelId);
                                                      if (!label) return null;
                                                      return (
                                                        <span 
                                                          key={label.id}
                                                          style={{
                                                            backgroundColor: label.color,
                                                            color: '#fff',
                                                            padding: '2px 6px',
                                                            borderRadius: '8px',
                                                            fontSize: '10px',
                                                            fontWeight: 600
                                                          }}
                                                        >
                                                          {label.name}
                                                        </span>
                                                      );
                                                    })}
                                                  </div>
                                                )}

                                                {/* Follow-ups */}
                                                {(() => {
                                                  const clientFollowUps = appContextState.followUps.filter(f => f.clientId === client.id && !f.completed);
                                                  if (clientFollowUps.length === 0) return null;
                                                  const nextFollowUp = clientFollowUps.sort((a, b) => new Date(a.date) - new Date(b.date))[0];
                                                  const isLate = new Date(nextFollowUp.date) < new Date();
                                                  
                                                  return (
                                                    <div style={{ 
                                                      marginTop: '8px', 
                                                      display: 'flex', 
                                                      alignItems: 'center', 
                                                      gap: '8px', 
                                                      fontSize: '11px', 
                                                      color: isLate ? 'var(--accent-danger)' : 'var(--text-tertiary)',
                                                      background: 'rgba(0,0,0,0.1)',
                                                      padding: '4px 8px',
                                                      borderRadius: '4px'
                                                    }}>
                                                      <Bell size={12} className={isLate ? 'bell-ringing' : ''} style={{ color: isLate ? 'var(--accent-danger)' : 'var(--text-tertiary)' }} />
                                                      <span>{new Date(nextFollowUp.date).toLocaleDateString('pt-BR')}</span>
                                                    </div>
                                                  );
                                                })()}

                                                {/* Notes Snippet */}
                                                {showNotesSnippet && (() => {
                                                  const logs = (appContextState.clientLogs || []).filter(l => l.clientId === client.id).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
                                                  if (logs.length === 0) return null;
                                                  const latest = logs[0].content || '';
                                                  const snippet = latest.length > 60 ? latest.substring(0, 57) + '...' : latest;
                                                  if (!snippet) return null;
                                                  return (
                                                    <div style={{ 
                                                      fontSize: '10px', 
                                                      color: 'var(--text-secondary)', 
                                                      marginTop: '8px', 
                                                      padding: '6px', 
                                                      background: 'rgba(0,0,0,0.15)', 
                                                      borderRadius: '4px', 
                                                      fontStyle: 'italic', 
                                                      borderLeft: '2px solid var(--accent-primary)' 
                                                    }}>
                                                      "{snippet}"
                                                    </div>
                                                  );
                                                })()}

                                                <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                  <span>CPF: {privacyMaskCpf(client.cpf)}</span>
                                                </div>

                                                {client.phones && client.phones.length > 0 && (
                                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px' }}>
                                                    {client.phones.map((phone, i) => (
                                                      <div
                                                        key={i}
                                                        style={{ display: 'flex', alignItems: 'center', gap: '2px' }}
                                                      >
                                                        <a 
                                                          href={`https://wa.me/55${phone.replace(/\D/g, '')}`}
                                                          target="_blank"
                                                          rel="noopener noreferrer"
                                                          onClick={(e) => e.stopPropagation()}
                                                          className="btn-whatsapp"
                                                          style={{ 
                                                            display: 'flex', 
                                                            alignItems: 'center', 
                                                            gap: '4px',
                                                            fontSize: '10px',
                                                            padding: '2px 8px',
                                                            borderRadius: '10px 0 0 10px',
                                                            backgroundColor: '#25D366',
                                                            color: '#fff',
                                                            textDecoration: 'none'
                                                          }}
                                                        >
                                                          <MessageCircle size={10} /> {phone}
                                                        </a>
                                                        <button
                                                          onClick={(e) => { e.stopPropagation(); handleDeletePhone(client.id, phone); }}
                                                          title="Remover este número"
                                                          style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            width: '20px',
                                                            height: '20px',
                                                            padding: 0,
                                                            border: 'none',
                                                            borderRadius: '0 10px 10px 0',
                                                            backgroundColor: 'rgba(225, 112, 85, 0.85)',
                                                            color: '#fff',
                                                            cursor: 'pointer',
                                                            flexShrink: 0,
                                                          }}
                                                        >
                                                          <Trash2 size={9} />
                                                        </button>
                                                      </div>
                                                    ))}
                                                  </div>
                                                )}
                                              </div>
                                              <div style={{ display: 'flex', gap: '4px' }}>
                                                <div className="dropdown">
                                                  <button className="btn-icon" onClick={(e) => e.stopPropagation()}><MoreVertical size={14} /></button>
                                                  <div className="dropdown-menu">
                                                    <button className="dropdown-item" onClick={(e) => { e.stopPropagation(); handleMoveToTop(client); }}>Mover p/ Topo</button>
                                                    <button className="dropdown-item" onClick={(e) => { e.stopPropagation(); handleMoveToBottom(client); }}>Mover p/ Fim</button>
                                                    <button className="dropdown-item" onClick={(e) => { e.stopPropagation(); handleDeleteClient(client.id); }} style={{ color: 'var(--accent-danger)' }}>Excluir</button>
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                            </div>
                                          )}
                                        </Draggable>
                                      ))}

                                      {boardClients.length > (boardLimits[board.id] || 30) && (
                                        <div style={{ padding: '8px', display: 'flex', justifyContent: 'center' }}>
                                          <button 
                                            className="btn btn-secondary btn-sm"
                                            onClick={() => setBoardLimits(prev => ({ ...prev, [board.id]: (prev[board.id] || 30) + 30 }))}
                                            style={{ width: '100%' }}
                                          >
                                            Carregar mais...
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                    {provided.placeholder}
                                  </div>
                                )}
                              </Droppable>

                              <button 
                                className="btn-add-card"
                                onClick={() => { setEditingClient({ clientBoardId: board.id }); setShowClientModal(true); }}
                                style={{ width: 'calc(100% - 16px)', margin: '8px', justifyContent: 'center', border: '1px dashed var(--border-color)' }}
                              >
                                <Plus size={16} /> Adicionar Cliente
                              </button>
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                    
                    {/* Botão Novo Quadro */}
                    <div style={{ minWidth: 260 }}>
                      {showAddBoard ? (
                        <div className="kanban-column" style={{ padding: 'var(--space-md)' }}>
                          <input 
                            autoFocus 
                            className="form-input" 
                            placeholder="Nome do quadro..."
                            value={newBoardName} 
                            onChange={e => setNewBoardName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAddBoard()}
                            style={{ marginBottom: 'var(--space-sm)' }} 
                          />
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btn-primary btn-sm" onClick={handleAddBoard}>Salvar</button>
                            <button className="btn btn-secondary btn-sm" onClick={() => setShowAddBoard(false)}><X size={16} /></button>
                          </div>
                        </div>
                      ) : (
                        <button className="btn btn-secondary" style={{ width: '100%', height: 40, borderStyle: 'dashed', fontSize: '13px' }} onClick={() => setShowAddBoard(true)}>
                          <Plus size={16} /> Novo Quadro
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </div>
        )}
      </div>

      {/* Barra de Ações em Massa (Bottom Bar) */}
      <AnimatePresence>
        {selectedClientIds.length > 0 && (
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
              {selectedClientIds.length} selecionado{selectedClientIds.length > 1 ? 's' : ''}
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
                    {boards.map(b => (
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
                    {appContextState.labels.map(l => {
                      const selectedClientsData = clients.filter(c => selectedClientIds.includes(c.id));
                      const isLabelInAll = selectedClientsData.length > 0 && selectedClientsData.every(c => (c.labelIds || []).includes(l.id));
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
              onClick={() => setSelectedClientIds([])} 
              style={{ color: 'var(--text-tertiary)' }}
              title="Limpar seleção"
            >
              <X size={18} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {showImportModal && (
        <ImportClientsModal 
          organId={organId}
          onClose={() => setShowImportModal(false)} 
          onImportComplete={loadClients}
        />
      )}

      {showClientModal && (
        <ClientModal 
          client={editingClient}
          organId={organId}
          onClose={() => setShowClientModal(false)}
          onSave={loadClients}
        />
      )}
    </>
  );
}
