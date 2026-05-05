import { useState, useEffect } from 'react';
import { X, Plus, Star, Phone, MapPin, Clock, Send, Trash2, Edit2, Check, Settings } from 'lucide-react';
import toast from 'react-hot-toast';
import { useApp } from '../context/AppContext';
import { clientsService } from '../services/clientsService';
import { formatCpf, privacyMaskCpf } from '../utils/stringUtils';
import LabelManager from './LabelManager';

export default function ClientModal({ client, organId, onClose, onSave }) {
  const { state, actions } = useApp();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    cpf: '',
    phones: [''],
    isFavorite: false,
    labelIds: []
  });
  const [cpfFocused, setCpfFocused] = useState(false);
  const [newLog, setNewLog] = useState('');
  const [isSubmittingLog, setIsSubmittingLog] = useState(false);

  // Histórico
  const logs = client?.id ? (state.clientLogs[client.id] || []) : [];

  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name || '',
        cpf: formatCpf(client.cpf) || '',
        phones: client.phones?.length > 0 ? [...client.phones] : [''],
        isFavorite: client.isFavorite || false,
        labelIds: client.labelIds || []
      });
      // Fetch history if it's an existing client
      if (client.id) {
        actions.fetchClientLogs(client.id);
      }
    }
  }, [client]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'cpf') {
      setFormData(prev => ({ ...prev, cpf: formatCpf(value) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handlePhoneChange = (index, value) => {
    const newPhones = [...formData.phones];
    newPhones[index] = value;
    setFormData(prev => ({ ...prev, phones: newPhones }));
  };

  const addPhone = () => {
    setFormData(prev => ({ ...prev, phones: [...prev.phones, ''] }));
  };

  const removePhone = (index) => {
    const newPhones = [...formData.phones];
    newPhones.splice(index, 1);
    if (newPhones.length === 0) newPhones.push('');
    setFormData(prev => ({ ...prev, phones: newPhones }));
  };

  const toggleLabel = (labelId) => {
    setFormData(prev => {
      const isSelected = prev.labelIds.includes(labelId);
      if (isSelected) {
        return { ...prev, labelIds: prev.labelIds.filter(id => id !== labelId) };
      } else {
        return { ...prev, labelIds: [...prev.labelIds, labelId] };
      }
    });
  };

  const toggleFavorite = () => {
    setFormData(prev => ({ ...prev, isFavorite: !prev.isFavorite }));
    if (client?.id) {
      actions.toggleClientFavorite(client.id, !formData.isFavorite);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return toast.error('O nome do cliente é obrigatório!');

    const cleanPhones = formData.phones
      .map(p => p.trim())
      .filter(p => p.replace(/\D/g, '').length >= 8);
      
    const uniquePhones = Array.from(new Set(cleanPhones));

    const payload = {
      name: formData.name.trim(),
      cpf: formData.cpf.trim() || null,
      phones: uniquePhones,
      isFavorite: formData.isFavorite,
      labelIds: formData.labelIds
    };

    setLoading(true);
    try {
      if (client?.id) {
        await clientsService.update(client.id, payload);
        toast.success('Cliente atualizado!');
      } else {
        payload.organId = organId;
        payload.clientBoardId = client?.clientBoardId || 'board_cli_1_analise'; 
        payload.position = 999999;
        await clientsService.create(payload);
        toast.success('Cliente criado!');
      }
      onSave();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar cliente.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddLog = async (e) => {
    e.preventDefault();
    if (!newLog.trim() || !client?.id) return;
    
    setIsSubmittingLog(true);
    try {
      await actions.addClientLog({
        clientId: client.id,
        content: newLog.trim(),
        createdBy: 'Usuário' // Aqui entraria o nome do user autenticado
      });
      setNewLog('');
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmittingLog(false);
    }
  };

  const handleDeleteLog = async (logId) => {
    if (window.confirm('Tem certeza que deseja apagar esta nota?')) {
      await actions.deleteClientLog(client.id, logId);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal glass-panel" style={{ width: '90%', maxWidth: '900px', display: 'flex', flexDirection: 'column' }}>
        
        {/* HEADER DO MODAL */}
        <div className="modal-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h2>{client ? 'Editar Cliente' : 'Novo Cliente'}</h2>
            {client && (
              <button 
                type="button" 
                className="btn-icon" 
                onClick={toggleFavorite}
                aria-label="Favoritar"
              >
                <Star 
                  size={22} 
                  fill={formData.isFavorite ? 'var(--accent-warning)' : 'none'} 
                  className={formData.isFavorite ? 'star-favorite' : 'star-outline'} 
                />
              </button>
            )}
          </div>
          <button className="btn-icon" onClick={onClose} disabled={loading}><X size={20} /></button>
        </div>

        {/* CORPO DO MODAL (2 COLUNAS) */}
        <div className="modal-two-columns">
          
          {/* COLUNA ESQUERDA: Formulário e Dados */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <form id="client-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <div className="form-group">
                <label>Nome Completo *</label>
                <input 
                  type="text" 
                  name="name" 
                  value={formData.name} 
                  onChange={handleChange} 
                  placeholder="Ex: João da Silva"
                  className="form-input"
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label>CPF (Opcional)</label>
                <input 
                  type="text" 
                  name="cpf" 
                  value={cpfFocused ? formData.cpf : privacyMaskCpf(formData.cpf)} 
                  onChange={handleChange} 
                  onFocus={() => setCpfFocused(true)}
                  onBlur={() => setCpfFocused(false)}
                  placeholder="000.000.000-00"
                  className="form-input"
                  maxLength={14}
                />
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Telefones / WhatsApp</span>
                  <button type="button" onClick={addPhone} className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '12px' }}>
                    <Plus size={14} style={{ marginRight: 4 }} /> Adicionar
                  </button>
                </label>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
                  {formData.phones.map((phone, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', flex: 1, position: 'relative' }}>
                        <Phone size={16} style={{ position: 'absolute', left: 12, color: 'var(--text-tertiary)' }} />
                        <input 
                          type="text"
                          value={phone}
                          onChange={(e) => handlePhoneChange(idx, e.target.value)}
                          placeholder="(DD) 99999-9999"
                          className="form-input"
                          style={{ paddingLeft: 36 }}
                        />
                      </div>
                      {formData.phones.length > 1 && (
                        <button 
                          type="button"
                          onClick={() => removePhone(idx)}
                          className="btn-icon"
                          style={{ color: 'var(--accent-danger)' }}
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

            </form>
            
            {/* Etiquetas e Follow-ups */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
              <LabelManager 
                selectedIds={formData.labelIds} 
                onChange={(newIds) => setFormData(prev => ({ ...prev, labelIds: newIds }))} 
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-start', gap: 'var(--space-sm)', marginTop: 'auto', paddingTop: '24px' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
                Cancelar
              </button>
              <button type="submit" form="client-form" className="btn btn-primary" disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar Cliente'}
              </button>
            </div>
          </div>

          {/* COLUNA DIREITA: TIMELINE / HISTÓRICO */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--border-color)', paddingLeft: '32px' }}>
            <h3 style={{ fontSize: '16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} color="var(--accent-primary)" /> Histórico & Anotações
            </h3>

            {!client?.id ? (
              <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', marginTop: '40px' }}>
                <p>Salve o cliente primeiro para adicionar anotações ao histórico.</p>
              </div>
            ) : (
              <>
                <form onSubmit={handleAddLog} style={{ position: 'relative', marginBottom: '24px' }}>
                  <textarea
                    value={newLog}
                    onChange={(e) => setNewLog(e.target.value)}
                    placeholder="Adicione uma nota sobre a negociação..."
                    className="form-input"
                    rows="3"
                    style={{ resize: 'vertical', paddingBottom: '40px' }}
                  />
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={isSubmittingLog || !newLog.trim()}
                    style={{ position: 'absolute', bottom: '8px', right: '8px', padding: '4px 12px', fontSize: '12px' }}
                  >
                    {isSubmittingLog ? 'Salvando...' : <><Send size={14} style={{ marginRight: 4 }} /> Enviar</>}
                  </button>
                </form>

                <div className="timeline" style={{ flex: 1, overflowY: 'auto' }}>
                  {logs.length === 0 ? (
                    <p style={{ color: 'var(--text-tertiary)', fontSize: '14px', textAlign: 'center', marginTop: '20px' }}>
                      Nenhum histórico registrado ainda.
                    </p>
                  ) : (
                    logs.map(log => (
                      <div key={log.id} className="timeline-item">
                        <div className="timeline-header">
                          <span className="timeline-author">{log.createdBy}</span>
                          <span className="timeline-date">
                            {new Date(log.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="timeline-content">{log.content}</div>
                        <div className="timeline-actions">
                          <button className="btn-delete" onClick={() => handleDeleteLog(log.id)} title="Excluir nota">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
