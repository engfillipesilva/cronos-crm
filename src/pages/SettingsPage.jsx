import { useState } from 'react';
import Header from '../components/Layout/Header';
import { useApp } from '../context/AppContext';
import { backupService } from '../services/backupService';
import {
  Download, CheckCircle2, AlertTriangle, Loader2,
  Database, Users, Building2, Bell, Tag, Shield, RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { state } = useApp();
  const [exporting, setExporting] = useState(false);
  const [lastBackup, setLastBackup] = useState(null);

  const handleExport = async () => {
    setExporting(true);
    try {
      const result = await backupService.exportToExcel();
      setLastBackup({ ...result, date: new Date() });
      toast.success(`Backup gerado! ${result.totalClientes} clientes exportados.`);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao gerar backup: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  const statCards = [
    {
      icon: <Building2 size={22} />,
      label: 'Órgãos',
      value: state.organs?.length ?? '—',
      color: 'var(--accent-primary)',
    },
    {
      icon: <Users size={22} />,
      label: 'Clientes',
      value: state.clients?.length ?? '—',
      color: 'var(--accent-info)',
    },
    {
      icon: <Bell size={22} />,
      label: 'Follow-ups',
      value: state.followUps?.length ?? '—',
      color: 'var(--accent-warning)',
    },
    {
      icon: <Tag size={22} />,
      label: 'Etiquetas',
      value: state.labels?.length ?? '—',
      color: 'var(--accent-success)',
    },
  ];

  return (
    <>
      <Header title="Configurações" />
      <div style={{ padding: 'var(--space-lg)', maxWidth: 800, margin: '0 auto' }}>

        {/* Page Header */}
        <div className="page-header" style={{ marginBottom: 'var(--space-xl)' }}>
          <div>
            <h1 className="page-title">Configurações & Backup</h1>
            <p className="page-subtitle">
              Gerencie os dados do sistema e mantenha cópias de segurança locais.
            </p>
          </div>
        </div>

        {/* Stats rápidas */}
        <div
          className="stats-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 'var(--space-md)',
            marginBottom: 'var(--space-xl)',
          }}
        >
          {statCards.map((s) => (
            <div
              key={s.label}
              className="card glass-panel"
              style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 'var(--border-radius-md)',
                  background: `${s.color}20`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: s.color,
                  flexShrink: 0,
                }}
              >
                {s.icon}
              </div>
              <div>
                <div style={{ fontSize: 'var(--font-xl)', fontWeight: 800, color: s.color }}>
                  {s.value}
                </div>
                <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>
                  {s.label}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Seção de Backup */}
        <div className="card glass-panel" style={{ marginBottom: 'var(--space-lg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 'var(--border-radius-md)',
                background: 'rgba(0, 206, 201, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Database size={24} style={{ color: 'var(--accent-secondary)' }} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 'var(--font-lg)' }}>Backup de Dados</h2>
              <p style={{ margin: 0, fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>
                Exporta todos os dados (órgãos, clientes, follow-ups e etiquetas) para um arquivo Excel.
              </p>
            </div>
          </div>

          {/* Info cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 'var(--space-sm)',
              marginBottom: 'var(--space-lg)',
            }}
          >
            {[
              { icon: '📊', text: 'Arquivo .xlsx compatível com Excel e Google Sheets' },
              { icon: '🔒', text: 'Os dados ficam apenas no seu computador' },
              { icon: '♻️', text: 'Faça backup quantas vezes quiser, sem custo' },
              { icon: '📅', text: 'Nome do arquivo inclui a data automática' },
            ].map((item) => (
              <div
                key={item.text}
                style={{
                  padding: 'var(--space-sm) var(--space-md)',
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: 'var(--border-radius-sm)',
                  border: '1px solid var(--border-color)',
                  fontSize: 'var(--font-xs)',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  gap: 'var(--space-sm)',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontSize: 16 }}>{item.icon}</span>
                {item.text}
              </div>
            ))}
          </div>

          {/* Último backup */}
          {lastBackup && (
            <div
              style={{
                padding: 'var(--space-md)',
                background: 'rgba(0, 184, 148, 0.08)',
                borderRadius: 'var(--border-radius-sm)',
                border: '1px solid rgba(0, 184, 148, 0.3)',
                marginBottom: 'var(--space-lg)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-sm)',
              }}
            >
              <CheckCircle2 size={18} style={{ color: 'var(--accent-success)', flexShrink: 0 }} />
              <div style={{ fontSize: 'var(--font-sm)' }}>
                <strong>{lastBackup.filename}</strong> salvo às{' '}
                {lastBackup.date.toLocaleTimeString('pt-BR')} —{' '}
                <span style={{ color: 'var(--text-secondary)' }}>
                  {lastBackup.totalOrgaos} órgãos · {lastBackup.totalClientes} clientes ·{' '}
                  {lastBackup.totalFollowUps} follow-ups
                </span>
              </div>
            </div>
          )}

          <button
            className="btn btn-primary"
            onClick={handleExport}
            disabled={exporting}
            style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', minWidth: 220 }}
          >
            {exporting ? (
              <>
                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                Exportando dados...
              </>
            ) : (
              <>
                <Download size={18} />
                Baixar Backup Completo (.xlsx)
              </>
            )}
          </button>
        </div>

        {/* Alerta de boas práticas */}
        <div
          className="card"
          style={{
            border: '1px solid rgba(253, 203, 110, 0.3)',
            background: 'rgba(253, 203, 110, 0.05)',
          }}
        >
          <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'flex-start' }}>
            <AlertTriangle size={20} style={{ color: 'var(--accent-warning)', flexShrink: 0, marginTop: 2 }} />
            <div>
              <h4 style={{ margin: '0 0 var(--space-xs)', color: 'var(--accent-warning)' }}>
                Boas práticas de segurança
              </h4>
              <ul style={{ margin: 0, paddingLeft: 'var(--space-lg)', fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                <li>Faça backup <strong>pelo menos uma vez por semana</strong></li>
                <li>Salve o arquivo em um HD externo ou Google Drive / OneDrive</li>
                <li>O plano gratuito do Supabase <strong>não garante backup automático</strong></li>
                <li>Em caso de emergência, o arquivo exportado pode ser reimportado via <strong>Importar Clientes</strong></li>
              </ul>
            </div>
          </div>
        </div>

      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
