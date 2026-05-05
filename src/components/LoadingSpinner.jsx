export default function LoadingSpinner({ message = 'Carregando dados...', inline = false }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: inline ? 'auto' : '100vh',
      minHeight: inline ? '100px' : '100vh',
      gap: 'var(--space-lg)',
      background: inline ? 'transparent' : 'var(--bg-primary)',
    }}>
      <div style={{
        width: 48,
        height: 48,
        borderRadius: '50%',
        border: '3px solid var(--border-color)',
        borderTopColor: 'var(--accent-primary)',
        animation: 'spin 0.8s linear infinite',
      }} />
      <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>{message}</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
