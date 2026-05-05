import { useState, useRef } from 'react';
import Header from '../components/Layout/Header';
import { useApp } from '../context/AppContext';
import { privacyMaskCpf, formatCpf } from '../utils/stringUtils';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { clientsService } from '../services/clientsService';

function cleanPhone(str) {
  if (!str) return null;
  const digits = String(str).replace(/\D/g, '');
  if (digits.length >= 10 && digits.length <= 11) return digits;
  if (digits.length === 12 || digits.length === 13) {
    if (digits.startsWith('55')) return digits.substring(2);
  }
  return null;
}


export default function ImportPage() {
  const { state } = useApp();
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState(null);
  const [targetOrganId, setTargetOrganId] = useState('');
  const fileRef = useRef();
  const [dragActive, setDragActive] = useState(false);

  // Órgãos em ordem alfabética (que já saíram do para-verificar)
  const activeOrgans = state.organs
    .filter(o => o.organBoardId && o.organBoardId !== 'para-verificar')
    .sort((a, b) => a.name.localeCompare(b.name));

  const handleFile = async (file) => {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext)) {
      return toast.error('Formato inválido. Use .xlsx, .xls ou .csv');
    }
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

      const sampleRow = json[0];
      const keys = Object.keys(sampleRow);
      
      const nameKey = keys.find(k => k.toLowerCase().includes('nome')) || keys[0];
      const cpfKey = keys.find(k => k.toLowerCase().includes('cpf'));
      const phoneKeys = keys.filter(k => 
        k.toLowerCase().includes('tel') || 
        k.toLowerCase().includes('cel') || 
        k.toLowerCase().includes('zap') || 
        k.toLowerCase().includes('whatsapp')
      );

      const parsedClients = [];

      for (const row of json) {
        const name = String(row[nameKey] || '').trim();
        if (!name) continue;

        const cpfRaw = cpfKey ? String(row[cpfKey] || '').trim() : '';
        const cpf = formatCpf(cpfRaw);
        const phonesSet = new Set();

        for (const pKey of phoneKeys) {
          const val = row[pKey];
          if (val) {
            const splitVals = String(val).split(/[\/;,]/);
            for (const v of splitVals) {
              const cleaned = cleanPhone(v);
              if (cleaned) phonesSet.add(cleaned);
            }
          }
        }

        parsedClients.push({
          name: name,
          cpf: cpf,
          phones: Array.from(phonesSet)
        });
      }

      setPreview({ fileName: file.name, clients: parsedClients, count: parsedClients.length });
      toast.success(`${parsedClients.length} clientes encontrados!`);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao ler a planilha. Verifique o formato.');
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const confirmImport = async () => {
    if (!targetOrganId) return toast.error('Selecione o órgão de destino');

    setImporting(true);
    try {
      let basePosition = 1000;
      const finalClients = preview.clients.map(c => {
        const cl = {
          organId: targetOrganId,
          clientBoardId: 'board_cli_1_analise', // Sempre cai na Análise Prévia
          position: basePosition,
          name: c.name,
          cpf: c.cpf,
          phones: c.phones
        };
        basePosition += 1000;
        return cl;
      });

      // Salva no Supabase (novo schema)
      await clientsService.createMany(finalClients);

      toast.success(`${finalClients.length} clientes importados com sucesso!`);
      setPreview(null);
      setTargetOrganId('');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao importar: ' + err.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <>
      <Header title="Importar Clientes Central" />
      <div style={{ padding: 'var(--space-lg)', maxWidth: 640, margin: '0 auto' }}>
        <div className="page-header">
          <div>
            <h1 className="page-title">Importação Central</h1>
            <p className="page-subtitle">Faça o upload da planilha e escolha para qual órgão ela vai</p>
          </div>
        </div>

        {/* Dropzone */}
        {!preview && (
          <div
            className={`file-dropzone ${dragActive ? 'drag-active' : ''}`}
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
          >
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={e => handleFile(e.target.files[0])} hidden />
            {loading ? (
              <Loader2 size={40} style={{ color: 'var(--accent-primary)', animation: 'spin 1s linear infinite' }} />
            ) : (
              <>
                <Upload size={40} style={{ color: 'var(--accent-primary)', marginBottom: 'var(--space-md)' }} />
                <p style={{ fontWeight: 600, marginBottom: 'var(--space-xs)' }}>Arraste a planilha aqui</p>
                <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>ou clique para selecionar (.xlsx, .csv)</p>
              </>
            )}
          </div>
        )}

        {/* Preview */}
        {preview && (
          <div className="card" style={{ animation: 'slideUp 0.3s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
              <FileSpreadsheet size={24} style={{ color: 'var(--accent-success)' }} />
              <div>
                <div style={{ fontWeight: 600 }}>{preview.fileName}</div>
                <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>{preview.count} clientes encontrados</div>
              </div>
            </div>

            {/* Órgão destino */}
            <label style={{ fontSize: 'var(--font-sm)', fontWeight: 600, display: 'block', marginBottom: 'var(--space-sm)' }}>
              Selecione o Órgão de destino
            </label>
            <select value={targetOrganId} onChange={e => setTargetOrganId(e.target.value)} style={{ width: '100%', marginBottom: 'var(--space-md)', padding: 'var(--space-sm)', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)' }}>
              <option value="">Selecione o órgão...</option>
              {activeOrgans.map(o => (
                <option key={o.id} value={o.id}>{o.name} ({o.city}-{o.state})</option>
              ))}
            </select>

            {/* Preview table */}
            <div style={{ maxHeight: 240, overflow: 'auto', marginBottom: 'var(--space-lg)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)' }}>
              <table style={{ width: '100%', fontSize: 'var(--font-xs)', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-tertiary)' }}>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Nome</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>CPF</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Telefones</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.clients.slice(0, 10).map((c, i) => (
                    <tr key={i} style={{ borderTop: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '6px 8px' }}>{c.name}</td>
                      <td style={{ padding: '6px 8px', fontFamily: 'monospace' }}>{privacyMaskCpf(c.cpf)}</td>
                      <td style={{ padding: '6px 8px' }}>{(c.phones || []).join(', ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.count > 10 && <div style={{ padding: 8, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 'var(--font-xs)' }}>...e mais {preview.count - 10} ocultos</div>}
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setPreview(null)} disabled={importing}>Cancelar</button>
              <button className="btn btn-primary" onClick={confirmImport} disabled={importing}>
                {importing
                  ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Importando...</>
                  : <><CheckCircle2 size={16} /> Importar para Órgão</>
                }
              </button>
            </div>
          </div>
        )}

        {/* Formato esperado */}
        <div className="card" style={{ marginTop: 'var(--space-lg)' }}>
          <h4 style={{ marginBottom: 'var(--space-sm)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
            <AlertCircle size={16} style={{ color: 'var(--accent-info)' }} /> Detalhes da Importação
          </h4>
          <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            A planilha será lida automaticamente. Os clientes extraídos serão adicionados ao órgão selecionado, na coluna <strong>Análise Prévia</strong>.
          </p>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
