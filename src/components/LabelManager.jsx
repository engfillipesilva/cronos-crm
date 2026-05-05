import React, { useState } from 'react';
import { Plus, Settings, Check, X, Edit2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import ColorPicker from './ColorPicker';
import toast from 'react-hot-toast';

export default function LabelManager({ selectedIds = [], onChange, inlineMode = false }) {
  const { state, actions } = useApp();
  
  const [isManagingLabels, setIsManagingLabels] = useState(false);
  const [editingLabel, setEditingLabel] = useState(null); // { id?, name, color }
  const [isSavingLabel, setIsSavingLabel] = useState(false);

  const toggleLabel = (id) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(lid => lid !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  return (
    <div className="form-group" style={{ marginTop: inlineMode ? 0 : '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <label style={{ margin: 0 }}>Etiquetas Visuais</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            type="button" 
            onClick={() => {
              setEditingLabel({ name: '', color: '#54a0ff' });
              setIsManagingLabels(true);
            }}
            className="btn btn-secondary"
            style={{ padding: '2px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <Plus size={12} /> Nova
          </button>
          <button 
            type="button" 
            onClick={() => setIsManagingLabels(!isManagingLabels)}
            className="btn btn-secondary"
            style={{ 
              padding: '2px 8px', 
              fontSize: '11px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '4px',
              backgroundColor: isManagingLabels ? 'var(--accent-primary)' : 'transparent',
              color: isManagingLabels ? '#fff' : 'var(--text-primary)'
            }}
          >
            <Settings size={12} /> {isManagingLabels ? 'Concluir' : 'Gerenciar'}
          </button>
        </div>
      </div>

      {/* Área de Edição/Criação de Etiqueta */}
      {editingLabel && (
        <div className="glass-panel" style={{ padding: '12px', marginBottom: '16px', border: '1px solid var(--accent-primary)' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <input 
              className="form-input"
              placeholder="Nome da etiqueta..."
              value={editingLabel.name}
              onChange={e => setEditingLabel({ ...editingLabel, name: e.target.value })}
              style={{ flex: 1, height: '32px', fontSize: '13px' }}
              autoFocus
            />
            <button 
              type="button"
              className="btn btn-primary"
              style={{ height: '32px', padding: '0 12px' }}
              disabled={isSavingLabel || !editingLabel.name.trim()}
              onClick={async () => {
                const name = editingLabel.name.trim();
                const existing = state.labels.find(l => l.name.toLowerCase() === name.toLowerCase() && l.id !== editingLabel.id);
                
                if (existing) {
                  return toast.error('Já existe uma etiqueta com esse nome!');
                }

                setIsSavingLabel(true);
                try {
                  if (editingLabel.id) {
                    await actions.updateLabel(editingLabel.id, { name: name, color: editingLabel.color });
                    toast.success('Etiqueta atualizada!');
                  } else {
                    await actions.addLabel({ name: name, color: editingLabel.color });
                    toast.success('Etiqueta criada!');
                  }
                  setEditingLabel(null);
                } catch (e) {
                  console.error(e);
                } finally {
                  setIsSavingLabel(false);
                }
              }}
            >
              <Check size={16} />
            </button>
            <button 
              type="button"
              className="btn btn-secondary"
              style={{ height: '32px', padding: '0 12px' }}
              onClick={() => setEditingLabel(null)}
            >
              <X size={16} />
            </button>
          </div>
          <ColorPicker 
            selectedColor={editingLabel.color} 
            onSelect={(color) => setEditingLabel({ ...editingLabel, color })} 
          />
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {state.labels.map(label => {
          const isSelected = selectedIds.includes(label.id);
          return (
            <div key={label.id} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => isManagingLabels ? setEditingLabel(label) : toggleLabel(label.id)}
                style={{
                  background: isSelected ? label.color : 'transparent',
                  color: isSelected ? '#fff' : label.color,
                  border: `1px solid ${label.color}`,
                  padding: isManagingLabels ? '4px 28px 4px 12px' : '4px 12px',
                  borderRadius: '16px',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  opacity: isSelected ? 1 : 0.6,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                {label.name}
                {isManagingLabels && <Edit2 size={10} style={{ marginLeft: '4px' }} />}
              </button>
              {isManagingLabels && (
                <button
                  type="button"
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (window.confirm(`Excluir etiqueta "${label.name}"?`)) {
                      await actions.deleteLabel(label.id);
                      toast.success('Etiqueta removida!');
                    }
                  }}
                  style={{
                    position: 'absolute',
                    right: '4px',
                    background: 'rgba(255,0,0,0.2)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '18px',
                    height: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    cursor: 'pointer',
                    zIndex: 2
                  }}
                >
                  <X size={10} />
                </button>
              )}
            </div>
          );
        })}
        {state.labels.length === 0 && !editingLabel && (
          <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Nenhuma etiqueta cadastrada no sistema.</span>
        )}
      </div>
    </div>
  );
}
