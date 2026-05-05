import { useState } from 'react';
import Header from '../components/Layout/Header';
import { useApp } from '../context/AppContext';
import { Plus, Edit2, Trash2, X, Save, Tag, Palette } from 'lucide-react';
import toast from 'react-hot-toast';

const PRESET_COLORS = [
  '#6c5ce7', '#00cec9', '#00b894', '#fdcb6e', '#e17055',
  '#74b9ff', '#a29bfe', '#fd79a8', '#55efc4', '#ffeaa7',
  '#dfe6e9', '#636e72', '#2d3436', '#0984e3', '#d63031',
];

export default function LabelsPage() {
  const { state, actions } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  const [newLabel, setNewLabel] = useState({ name: '', color: '#6c5ce7' });
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const handleAdd = async () => {
    if (!newLabel.name.trim()) return toast.error('Nome é obrigatório');
    try {
      await actions.addLabel({ ...newLabel, isDefault: false });
      setNewLabel({ name: '', color: '#6c5ce7' });
      setShowAdd(false);
      toast.success('Etiqueta criada!');
    } catch {}
  };

  const openEdit = (label) => {
    setEditForm({ name: label.name, color: label.color });
    setEditId(label.id);
  };

  const saveEdit = async () => {
    await actions.updateLabel(editId, editForm);
    setEditId(null);
    toast.success('Etiqueta atualizada!');
  };

  const handleDelete = async (id) => {
    if (confirm('Excluir esta etiqueta? Ela será removida de todos os órgãos.')) {
      await actions.deleteLabel(id);
      toast.success('Etiqueta removida');
    }
  };

  const ColorPicker = ({ value, onChange }) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {PRESET_COLORS.map(c => (
        <button
          key={c}
          onClick={() => onChange(c)}
          style={{
            width: 28, height: 28, borderRadius: '50%', background: c, border: value === c ? '3px solid var(--text-primary)' : '3px solid transparent',
            cursor: 'pointer', transition: 'transform 0.15s',
          }}
          onMouseEnter={e => e.target.style.transform = 'scale(1.2)'}
          onMouseLeave={e => e.target.style.transform = 'scale(1)'}
        />
      ))}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <input type="color" value={value} onChange={e => onChange(e.target.value)} style={{ width: 28, height: 28, padding: 0, border: 'none', cursor: 'pointer', borderRadius: 4 }} />
      </div>
    </div>
  );

  return (
    <>
      <Header title="Etiquetas" />
      <div style={{ padding: 'var(--space-lg)', maxWidth: 640, margin: '0 auto' }}>
        <div className="page-header">
          <div>
            <h1 className="page-title">Gerenciar Etiquetas</h1>
            <p className="page-subtitle">{state.labels.length} etiquetas</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            <Plus size={16} /> Nova Etiqueta
          </button>
        </div>

        {/* Lista */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          {state.labels.map((label, i) => (
            <div key={label.id} className="card" style={{
              display: 'flex', alignItems: 'center', gap: 'var(--space-md)',
              animation: `slideUp 0.2s ease ${i * 0.05}s both`,
            }}>
              <div style={{ width: 16, height: 16, borderRadius: '50%', background: label.color, flexShrink: 0 }} />
              <span className="label-badge" style={{ background: label.color + '25', color: label.color, fontSize: 'var(--font-sm)' }}>
                {label.name}
              </span>
              {label.isDefault && (
                <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-tertiary)', marginLeft: 4 }}>padrão</span>
              )}
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                <button className="btn-icon" onClick={() => openEdit(label)}><Edit2 size={14} /></button>
                <button className="btn-icon" onClick={() => handleDelete(label.id)} style={{ color: 'var(--accent-danger)' }}><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>

        {state.labels.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">🏷️</div>
            <h3>Nenhuma etiqueta</h3>
            <p>Crie etiquetas para organizar seus órgãos.</p>
          </div>
        )}
      </div>

      {/* Modal Add/Edit */}
      {(showAdd || editId) && (
        <div className="modal-overlay" onClick={() => { setShowAdd(false); setEditId(null); }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editId ? 'Editar Etiqueta' : 'Nova Etiqueta'}</h3>
              <button className="btn-icon" onClick={() => { setShowAdd(false); setEditId(null); }}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
              <div>
                <label style={{ fontSize: 'var(--font-sm)', fontWeight: 600, display: 'block', marginBottom: 'var(--space-sm)' }}>Nome</label>
                <input
                  placeholder="Ex: Prioridade Alta"
                  value={editId ? editForm.name : newLabel.name}
                  onChange={e => editId ? setEditForm({ ...editForm, name: e.target.value }) : setNewLabel({ ...newLabel, name: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 'var(--font-sm)', fontWeight: 600, display: 'block', marginBottom: 'var(--space-sm)' }}>
                  <Palette size={14} style={{ marginRight: 4 }} /> Cor
                </label>
                <ColorPicker
                  value={editId ? editForm.color : newLabel.color}
                  onChange={c => editId ? setEditForm({ ...editForm, color: c }) : setNewLabel({ ...newLabel, color: c })}
                />
              </div>
              <div>
                <label style={{ fontSize: 'var(--font-sm)', fontWeight: 600, marginBottom: 'var(--space-sm)', display: 'block' }}>Preview</label>
                <span className="label-badge" style={{
                  background: (editId ? editForm.color : newLabel.color) + '25',
                  color: editId ? editForm.color : newLabel.color,
                  fontSize: 'var(--font-sm)',
                }}>
                  {(editId ? editForm.name : newLabel.name) || 'Etiqueta'}
                </span>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => { setShowAdd(false); setEditId(null); }}>Cancelar</button>
              <button className="btn btn-primary" onClick={editId ? saveEdit : handleAdd}>
                <Save size={14} /> {editId ? 'Salvar' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
