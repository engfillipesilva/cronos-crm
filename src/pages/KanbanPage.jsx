import { useState, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Layout/Header';
import LoadingSpinner from '../components/LoadingSpinner';
import { useApp } from '../context/AppContext';
import { generateWhatsAppLink, formatPhone } from '../utils/whatsapp';
import { formatCpf, privacyMaskCpf } from '../utils/stringUtils';
import { ArrowLeft, MessageCircle, Edit2, Trash2, X, Save, GripVertical, MapPin, Star } from 'lucide-react';
import toast from 'react-hot-toast';

/* ── Card de cliente ── */
function ClientCard({ client, onEdit, onDelete, isDragging }) {
  const { state: appContextState, actions } = useApp();
  
  // No KanbanPage o cliente pode ter phones como array ou string (depende de como ele é montado). 
  // O código anterior usava phone1/phone2, vamos manter pra evitar quebra, ou usar o array "phones".
  const phones = client.phones?.length ? client.phones : [client.phone1, client.phone2].filter(p => p && p !== 'N/A' && p.trim() !== '');

  return (
    <div className={`client-card ${isDragging ? 'card-dragging' : ''}`}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-sm)' }}>
        <div style={{ color: 'var(--text-tertiary)', paddingTop: 2, flexShrink: 0 }}>
          <GripVertical size={14} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="client-card-name" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {client.isFavorite && <Star size={14} fill="var(--accent-warning)" color="var(--accent-warning)" />}
            {client.name}
          </div>

          {/* Etiquetas Visuais */}
          {client.labelIds && client.labelIds.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', margin: '4px 0' }}>
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
                margin: '6px 0', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                fontSize: '11px', 
                color: isLate ? 'var(--accent-danger)' : 'var(--text-tertiary)',
                background: 'var(--bg-tertiary)',
                padding: '4px 8px',
                borderRadius: '4px'
              }}>
                <div className={isLate ? 'bell-ringing' : ''}>🔔</div>
                <span>{new Date(nextFollowUp.date).toLocaleDateString('pt-BR')}</span>
                {isLate && (
                  <button 
                    onClick={async (e) => {
                      e.stopPropagation();
                      await actions.updateFollowUp(nextFollowUp.id, { completed: true });
                      toast.success('Retorno marcado como feito!');
                    }}
                    style={{
                      marginLeft: 'auto',
                      background: 'var(--accent-primary)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '2px 6px',
                      fontSize: '10px',
                      cursor: 'pointer'
                    }}
                  >
                    Feito
                  </button>
                )}
              </div>
            );
          })()}

          <div className="client-card-cpf">{privacyMaskCpf(client.cpf)}</div>
          <div className="client-card-location"><MapPin size={12} /> {client.city} - {client.state}</div>
          {client.notes && (
            <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', marginBottom: 'var(--space-sm)', lineHeight: 1.4 }}>
              {client.notes.length > 80 ? client.notes.slice(0, 80) + '...' : client.notes}
            </div>
          )}
          <div className="client-card-phones">
            {phones.map((phone, i) => (
              <a key={i} href={generateWhatsAppLink(phone, client.name)} target="_blank" rel="noopener noreferrer" className="btn btn-whatsapp">
                <MessageCircle size={10} /> {formatPhone(phone)}
              </a>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <button className="btn-icon" onClick={(e) => { e.stopPropagation(); onEdit(client); }} title="Editar"><Edit2 size={12} /></button>
          <button className="btn-icon" onClick={(e) => { e.stopPropagation(); onDelete(client.id); }} title="Excluir" style={{ color: 'var(--accent-danger)' }}><Trash2 size={12} /></button>
        </div>
      </div>
    </div>
  );
}

/* ── Placeholder fantasma (estilo Trello) ── */
function CardPlaceholder({ height }) {
  return <div className="card-placeholder" style={{ height: height || 60 }} />;
}

/* ── Kanban Column ── */
function KanbanColumn({ board, clients, onEdit, onDelete, dragState, onColumnDragOver, onColumnDrop, onCardDragStart }) {
  const [isOver, setIsOver] = useState(false);
  const bodyRef = useRef(null);

  const renderItems = useMemo(() => {
    const items = [];
    const isTargetColumn = dragState.targetBoardId === board.id;
    const insertIdx = dragState.insertIndex;
    const visibleClients = clients.filter(c => c.id !== dragState.draggingId);

    if (isTargetColumn && insertIdx !== null && dragState.draggingId) {
      for (let i = 0; i < visibleClients.length; i++) {
        if (i === insertIdx) items.push({ type: 'placeholder', key: 'ph' });
        items.push({ type: 'card', client: visibleClients[i], key: visibleClients[i].id });
      }
      if (insertIdx >= visibleClients.length) items.push({ type: 'placeholder', key: 'ph' });
    } else {
      visibleClients.forEach(c => items.push({ type: 'card', client: c, key: c.id }));
    }
    return items;
  }, [clients, board.id, dragState.targetBoardId, dragState.insertIndex, dragState.draggingId]);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsOver(true);

    const body = bodyRef.current;
    if (!body) return;
    const cards = body.querySelectorAll('.client-card:not(.card-dragging)');
    let insertIndex = cards.length;
    for (let i = 0; i < cards.length; i++) {
      const rect = cards[i].getBoundingClientRect();
      if (e.clientY < rect.top + rect.height / 2) { insertIndex = i; break; }
    }
    onColumnDragOver(board.id, insertIndex);
  };

  return (
    <div
      className={`kanban-column ${isOver ? 'column-drag-over' : ''}`}
      onDragOver={handleDragOver}
      onDragEnter={(e) => { e.preventDefault(); setIsOver(true); }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setIsOver(false); }}
      onDrop={(e) => {
        e.preventDefault();
        setIsOver(false);
        const clientId = e.dataTransfer.getData('text/plain');
        if (clientId) onColumnDrop(clientId, board.id);
      }}
    >
      <div className="kanban-column-header">
        <span className="kanban-column-title">{board.name}</span>
        <span className="kanban-column-count">{clients.length}</span>
      </div>
      <div ref={bodyRef} className="kanban-column-body">
        {renderItems.map(item =>
          item.type === 'placeholder' ? (
            <CardPlaceholder key={item.key} height={dragState.cardHeight} />
          ) : (
            <div
              key={item.key}
              draggable="true"
              onDragStart={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', item.client.id);
                onCardDragStart(item.client.id, board.id, rect.height);
              }}
            >
              <ClientCard
                client={item.client}
                onEdit={onEdit}
                onDelete={onDelete}
                isDragging={item.client.id === dragState.draggingId}
              />
            </div>
          )
        )}
        {renderItems.length === 0 && (
          <div style={{ padding: 'var(--space-lg)', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 'var(--font-xs)' }}>
            Arraste cards aqui
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main Page ── */
export default function KanbanPage() {
  const { city, state: st } = useParams();
  const decodedCity = decodeURIComponent(city);
  const decodedState = decodeURIComponent(st);
  const navigate = useNavigate();
  const { state, actions } = useApp();

  const [editModal, setEditModal] = useState(null);
  const [editForm, setEditForm] = useState({});

  const [dragState, setDragState] = useState({
    draggingId: null, sourceBoardId: null, targetBoardId: null, insertIndex: null, cardHeight: 60,
  });

  const cityClients = useMemo(
    () => state.clients.filter(c => c.city === decodedCity && c.state === decodedState),
    [state.clients, decodedCity, decodedState]
  );

  const handleCardDragStart = useCallback((clientId, boardId, height) => {
    setDragState({ draggingId: clientId, sourceBoardId: boardId, targetBoardId: boardId, insertIndex: null, cardHeight: height });
  }, []);

  const handleColumnDragOver = useCallback((boardId, insertIndex) => {
    setDragState(prev => {
      if (prev.targetBoardId === boardId && prev.insertIndex === insertIndex) return prev;
      return { ...prev, targetBoardId: boardId, insertIndex };
    });
  }, []);

  const handleColumnDrop = useCallback((clientId, targetBoardId) => {
    const client = state.clients.find(c => c.id === clientId);
    if (!client) return;

    if (client.boardId !== targetBoardId) {
      actions.moveClient(clientId, targetBoardId);
      const boardName = state.boards.find(b => b.id === targetBoardId)?.name || targetBoardId;
      toast.success(`Movido para "${boardName}"`);
    }

    setDragState({ draggingId: null, sourceBoardId: null, targetBoardId: null, insertIndex: null, cardHeight: 60 });
  }, [state.clients, state.boards, actions]);

  const handleGlobalDragEnd = () => {
    setDragState({ draggingId: null, sourceBoardId: null, targetBoardId: null, insertIndex: null, cardHeight: 60 });
  };

  if (state.loading) return <LoadingSpinner message="Carregando kanban..." />;

  const openEdit = (client) => {
    setEditForm({ name: client.name, cpf: client.cpf, notes: client.notes || '', phone1: client.phone1 || '', phone2: client.phone2 || '' });
    setEditModal(client.id);
  };

  const saveEdit = async () => {
    await actions.updateClient(editModal, editForm);
    setEditModal(null);
    toast.success('Cliente atualizado!');
  };

  const handleDelete = async (id) => {
    if (confirm('Excluir este cliente?')) {
      await actions.deleteClient(id);
      toast.success('Cliente removido');
    }
  };

  return (
    <>
      <Header title={`${decodedCity} - ${decodedState}`}>
        <button className="btn btn-secondary" onClick={() => navigate('/cidades')}>
          <ArrowLeft size={16} /> Voltar
        </button>
      </Header>

      <div className="kanban-board" onDragEnd={handleGlobalDragEnd}>
        {state.boards.map(board => (
          <KanbanColumn
            key={board.id}
            board={board}
            clients={cityClients.filter(c => c.boardId === board.id)}
            onEdit={openEdit}
            onDelete={handleDelete}
            dragState={dragState}
            onColumnDragOver={handleColumnDragOver}
            onColumnDrop={handleColumnDrop}
            onCardDragStart={handleCardDragStart}
          />
        ))}
      </div>

      {/* Edit Modal */}
      {editModal && (
        <div className="modal-overlay" onClick={() => setEditModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Editar Cliente</h3>
              <button className="btn-icon" onClick={() => setEditModal(null)}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <label style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>Nome completo</label>
              <input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
              <label style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>CPF</label>
              <input 
                value={editForm.cpfFocused ? editForm.cpf : privacyMaskCpf(editForm.cpf)} 
                onFocus={() => setEditForm(prev => ({ ...prev, cpfFocused: true }))}
                onBlur={() => setEditForm(prev => ({ ...prev, cpfFocused: false }))}
                onChange={e => setEditForm({ ...editForm, cpf: formatCpf(e.target.value) })} 
              />
              <label style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>Observações / Perfil</label>
              <textarea value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} rows={3} style={{ resize: 'vertical' }} />
              <label style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>Telefone 1</label>
              <input value={editForm.phone1} onChange={e => setEditForm({ ...editForm, phone1: e.target.value })} placeholder="Ex: 11999998888" />
              <label style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>Telefone 2</label>
              <input value={editForm.phone2} onChange={e => setEditForm({ ...editForm, phone2: e.target.value })} placeholder="Ex: 11988887777" />
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setEditModal(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={saveEdit}><Save size={14} /> Salvar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
