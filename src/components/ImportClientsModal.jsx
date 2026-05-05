import { useState } from 'react';
import { X, Upload, FileText, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { clientsService } from '../services/clientsService';
import { useApp } from '../context/AppContext';

function cleanPhone(str) {
  if (!str) return null;
  const digits = String(str).replace(/\D/g, '');
  // Aceita qualquer coisa com 4 ou mais dígitos (para ramais ou números curtos)
  if (digits.length >= 4) return digits;
  return null;
}

import { formatCpf, privacyMaskCpf } from '../utils/stringUtils';

export default function ImportClientsModal({ organId, onClose, onImportComplete }) {
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [stats, setStats] = useState(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setFileName(file.name);
    setLoading(true);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      if (json.length === 0) {
        toast.error('A planilha está vazia.');
        setLoading(false);
        return;
      }

      // Analisar colunas
      const sampleRow = json[0];
      const keys = Object.keys(sampleRow);
      
      const nameKey = keys.find(k => k.toLowerCase().includes('nome')) || keys[0]; // Chuta o primeiro
      const cpfKey = keys.find(k => k.toLowerCase().includes('cpf'));
      const phoneKeys = keys.filter(k => 
        k.toLowerCase().includes('tel') || 
        k.toLowerCase().includes('cel') || 
        k.toLowerCase().includes('zap') || 
        k.toLowerCase().includes('whatsapp')
      );

      const parsedClients = [];
      let basePosition = 1000;

      for (const row of json) {
        const name = String(row[nameKey] || '').trim();
        if (!name) continue;

        const cpfRaw = cpfKey ? String(row[cpfKey] || '').trim() : '';
        const cpf = formatCpf(cpfRaw);
        const phonesSet = new Set();

        for (const pKey of phoneKeys) {
          const val = row[pKey];
          if (val) {
            // Removemos o hífen do split, pois hífens são usados dentro do número do telefone!
            const splitVals = String(val).split(/[\/;,]/);
            for (const v of splitVals) {
              const cleaned = cleanPhone(v);
              if (cleaned) phonesSet.add(cleaned);
            }
          }
        }

        parsedClients.push({
          organId: organId,
          clientBoardId: 'board_cli_1_analise', // Sempre cai na Análise Prévia
          position: basePosition,
          name: name,
          cpf: cpf,
          phones: Array.from(phonesSet)
        });
        
        basePosition += 1000;
      }

      setStats(parsedClients);

    } catch (err) {
      console.error(err);
      toast.error('Erro ao ler a planilha. Verifique o formato.');
    } finally {
      setLoading(false);
    }
  };

  const confirmImport = async () => {
    if (!stats || stats.length === 0) return;
    setLoading(true);
    try {
      // Cria em batch
      await clientsService.createMany(stats);
      toast.success(`${stats.length} clientes importados com sucesso!`);
      onImportComplete();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao salvar clientes no banco.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content" style={{ maxWidth: 500 }}>
        <div className="modal-header">
          <h2>Importar Clientes</h2>
          <button className="btn-icon" onClick={onClose} disabled={loading}><X size={20} /></button>
        </div>

        <div className="modal-body">
          {!stats ? (
            <div 
              style={{ 
                border: '2px dashed var(--border-color)', 
                padding: 'var(--space-2xl)', 
                textAlign: 'center',
                borderRadius: 'var(--border-radius-lg)',
                backgroundColor: 'var(--bg-secondary)',
                position: 'relative'
              }}
            >
              <input 
                type="file" 
                accept=".xlsx, .xls, .csv" 
                onChange={handleFileUpload}
                disabled={loading}
                style={{
                  position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                  opacity: 0, cursor: 'pointer'
                }}
              />
              <Upload size={40} style={{ color: 'var(--text-tertiary)', marginBottom: 'var(--space-md)' }} />
              <h3 style={{ marginBottom: 'var(--space-xs)' }}>Arraste sua planilha aqui</h3>
              <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--font-sm)' }}>
                Formatos aceitos: .xlsx, .xls, .csv
              </p>
              
              {loading && <div style={{ marginTop: 'var(--space-md)' }}>Processando arquivo...</div>}
            </div>
          ) : (
            <div style={{ padding: 'var(--space-md)', backgroundColor: 'rgba(108, 92, 231, 0.05)', borderRadius: 'var(--border-radius-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
                <FileText size={32} style={{ color: 'var(--accent-primary)' }} />
                <div>
                  <h4 style={{ margin: 0 }}>{fileName}</h4>
                  <p style={{ margin: 0, color: 'var(--text-secondary)' }}>{stats.length} clientes identificados</p>
                </div>
              </div>

              <div style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)', display: 'flex', gap: 'var(--space-sm)', alignItems: 'flex-start' }}>
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>
                  O sistema encontrou nomes e números de telefone automaticamente. 
                  Todos os clientes entrarão na coluna "Análise Prévia".
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-md)' }}>
                <button className="btn btn-secondary" onClick={() => setStats(null)} disabled={loading}>
                  Cancelar
                </button>
                <button className="btn btn-primary" onClick={confirmImport} disabled={loading}>
                  {loading ? 'Salvando...' : `Importar ${stats.length} Clientes`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
