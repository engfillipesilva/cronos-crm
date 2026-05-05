import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { authService } from '../services/authService';
import { Briefcase, Lock, Mail, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Preencha todos os campos.');
      return;
    }
    
    setLoading(true);
    try {
      await authService.signIn(email, password);
      toast.success('Login bem-sucedido!');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      console.error(err);
      toast.error('Credenciais inválidas ou erro ao logar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100dvh',
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-primary)',
      position: 'relative',
      overflow: 'hidden',
      color: 'var(--text-primary)'
    }}>
      {/* Background gradients */}
      <div style={{
        position: 'absolute',
        top: '25%',
        left: '25%',
        width: '400px',
        height: '400px',
        background: 'var(--accent-primary)',
        borderRadius: '50%',
        filter: 'blur(100px)',
        opacity: 0.15
      }}></div>
      <div style={{
        position: 'absolute',
        bottom: '25%',
        right: '25%',
        width: '400px',
        height: '400px',
        background: 'var(--accent-secondary)',
        borderRadius: '50%',
        filter: 'blur(100px)',
        opacity: 0.15
      }}></div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        style={{ width: '100%', maxWidth: '420px', zIndex: 10, padding: 'var(--space-lg)' }}
      >
        <div className="glass-panel" style={{ padding: 'var(--space-2xl) var(--space-xl)', borderRadius: 'var(--border-radius-lg)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 'var(--space-xl)' }}>
            <div style={{ 
              width: '64px', height: '64px', 
              background: 'rgba(108, 92, 231, 0.2)', 
              borderRadius: 'var(--border-radius-md)', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', 
              marginBottom: 'var(--space-md)', 
              border: '1px solid var(--border-color)' 
            }}>
              <Briefcase size={32} style={{ color: 'var(--accent-primary)' }} />
            </div>
            <h1 style={{ fontSize: 'var(--font-2xl)', fontWeight: 800, color: '#fff', margin: 0 }}>Cronos CRM</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)', marginTop: 'var(--space-xs)' }}>Acesso Restrito</p>
          </div>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
            <div>
              <label style={{ display: 'block', fontSize: 'var(--font-sm)', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 'var(--space-xs)' }}>Email Administrativo</label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                  <Mail size={18} style={{ color: 'var(--text-tertiary)' }} />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ width: '100%', paddingLeft: 40, height: '44px', borderRadius: 'var(--border-radius-sm)', background: 'var(--bg-tertiary)' }}
                  placeholder="admin@cronoscrm.com"
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 'var(--font-sm)', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 'var(--space-xs)' }}>Senha Mestra</label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                  <Lock size={18} style={{ color: 'var(--text-tertiary)' }} />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ width: '100%', paddingLeft: 40, height: '44px', borderRadius: 'var(--border-radius-sm)', background: 'var(--bg-tertiary)' }}
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', height: '44px', justifyContent: 'center', marginTop: 'var(--space-sm)' }}
            >
              {loading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : 'Entrar no Sistema'}
            </button>
          </form>
        </div>
      </motion.div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
