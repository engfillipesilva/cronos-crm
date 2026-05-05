import { useState, useMemo } from 'react';
import LoadingSpinner from '../components/LoadingSpinner';
import Header from '../components/Layout/Header';
import { useApp } from '../context/AppContext';
import { formatDate, formatRelativeDate, getFollowUpStatus, toInputDate } from '../utils/dateUtils';
import { Bell, Check, Clock, AlertTriangle, Edit2, Trash2, X, Save, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

export default function FollowUpPage() {
  const { state, actions } = useApp();
  const [filter, setFilter] = useState('all'); // all, pendente, overdue, soon, concluido
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const followUps = useMemo(() => {
    let list = state.followUps.map(f => {
      const client = state.clients.find(c => c.id === f.clientId);
      return { ...f, client, dateStatus: getFollowUpStatus(f.scheduledDate) };
    });

    if (filter === 'pendente') list = list.filter(f => f.status === 'pendente');
    else if (filter === 'overdue') list = list.filter(f => f.dateStatus === 'overdue' && f.status === 'pendente');
    else if (filter === 'soon') list = list.filter(f => f.dateStatus === 'soon' && f.status === 'pendente');
    else if (filter === 'mensagem_enviada') list = list.filter(f => f.status === 'mensagem_enviada');
    else if (filter === 'concluido') list = list.filter(f => f.status === 'concluido');

    return list.sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));
  }, [state.followUps, state.clients, filter]);

  const overdueCount = state.followUps.filter(f => getFollowUpStatus(f.scheduledDate) === 'overdue' && f.status === 'pendente').length;
  const soonCount = state.followUps.filter(f => getFollowUpStatus(f.scheduledDate) === 'soon' && f.status === 'pendente').length;

  if (state.loading) return <LoadingSpinner message="Carregando follow-ups..." />;

  const updateStatus = async (id, status) => {
    await actions.updateFollowUp(id, { status });
    toast.success(status === 'mensagem_enviada' ? 'Marcado como enviada!' : 'Status atualizado!');
  };

  const openEdit = (f) => {
    setEditForm({ scheduledDate: toInputDate(f.scheduledDate), notes: f.notes || '' });
    setEditId(f.id);
  };

  const saveEdit = async () => {
    await actions.updateFollowUp(editId, { scheduledDate: editForm.scheduledDate, notes: editForm.notes });
    setEditId(null);
    toast.success('Follow-up atualizado!');
  };

  const handleDelete = async (id) => {
    if (confirm('Excluir este follow-up?')) {
      await actions.deleteFollowUp(id);
      toast.success('Follow-up removido');
    }
  };

  const statusIcon = (dateStatus, status) => {
    if (status === 'concluido') return <Check size={16} style={{ color: 'var(--accent-success)' }} />;
    if (status === 'mensagem_enviada') return <Clock size={16} style={{ color: 'var(--accent-info)' }} />;
    if (dateStatus === 'overdue') return <AlertTriangle size={16} style={{ color: 'var(--accent-danger)' }} />;
    if (dateStatus === 'soon') return <Bell size={16} style={{ color: 'var(--accent-warning)' }} />;
    return <Clock size={16} style={{ color: 'var(--text-tertiary)' }} />;
  };

  const filters = [
    { key: 'all', label: 'Todos' },
    { key: 'overdue', label: `Atrasados (${overdueCount})` },
    { key: 'soon', label: `Próximos (${soonCount})` },
    { key: 'pendente', label: 'Pendentes' },
    { key: 'mensagem_enviada', label: 'Msg Enviada' },
    { key: 'concluido', label: 'Concluídos' },
  ];

  return (
    <>
      <Header title="Follow-up" />
      <div className="followup-page">
        <div className="page-header">
          <div>
            <h1 className="page-title">Follow-ups</h1>
            <p className="page-subtitle">{state.followUps.length} total · {overdueCount} atrasados</p>
          </div>
        </div>

        {/* Filtros */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-xs)', marginBottom: 'var(--space-lg)' }}>
          {filters.map(f => (
            <button
              key={f.key}
              className={`btn ${filter === f.key ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilter(f.key)}
              style={{ fontSize: 'var(--font-xs)' }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Lista */}
        <div className="followup-list">
          {followUps.map((f, i) => (
            <div
              key={f.id}
              className={`followup-item ${f.dateStatus === 'overdue' && f.status === 'pendente' ? 'overdue' : ''} ${f.dateStatus === 'soon' && f.status === 'pendente' ? 'soon' : ''}`}
              style={{ animation: `slideUp 0.2s ease ${Math.min(i * 0.03, 0.5)}s both` }}
            >
              {statusIcon(f.dateStatus, f.status)}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 'var(--font-sm)' }}>{f.client?.name || 'Cliente removido'}</div>
                <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>
                  {f.client?.city} - {f.client?.state} · {f.notes || 'Sem observações'}
                </div>
              </div>
              <div className="followup-date">
                <div style={{ fontWeight: 600 }}>{formatRelativeDate(f.scheduledDate)}</div>
                <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)' }}>{formatDate(f.scheduledDate)}</div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {f.status === 'pendente' && (
                  <button className="btn btn-success" style={{ fontSize: 'var(--font-xs)', padding: '4px 8px' }} onClick={() => updateStatus(f.id, 'mensagem_enviada')}>
                    Msg Enviada
                  </button>
                )}
                {f.status === 'mensagem_enviada' && (
                  <button className="btn btn-primary" style={{ fontSize: 'var(--font-xs)', padding: '4px 8px' }} onClick={() => updateStatus(f.id, 'concluido')}>
                    Concluir
                  </button>
                )}
                <button className="btn-icon" onClick={() => openEdit(f)}><Edit2 size={14} /></button>
                <button className="btn-icon" onClick={() => handleDelete(f.id)} style={{ color: 'var(--accent-danger)' }}><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>

        {followUps.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">🔔</div>
            <h3>Nenhum follow-up {filter !== 'all' ? 'neste filtro' : 'ainda'}</h3>
            <p>Follow-ups são criados automaticamente ao importar clientes (6 meses).</p>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editId && (
        <div className="modal-overlay" onClick={() => setEditId(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Editar Follow-up</h3>
              <button className="btn-icon" onClick={() => setEditId(null)}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <label style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>Data do follow-up</label>
              <input type="date" value={editForm.scheduledDate} onChange={e => setEditForm({ ...editForm, scheduledDate: e.target.value })} />
              <label style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>Observações</label>
              <textarea value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} rows={3} />
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setEditId(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={saveEdit}><Save size={14} /> Salvar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
