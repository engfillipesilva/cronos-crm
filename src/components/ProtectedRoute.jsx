import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { authService } from '../services/authService';
import { Briefcase } from 'lucide-react';

export default function ProtectedRoute({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    // Busca a sessão inicial
    authService.getSession().then((currentSession) => {
      setSession(currentSession);
      setLoading(false);
    });

    // Escuta mudanças de auth (login/logout em outras abas, expiração de token)
    const { data: { subscription } } = authService.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      setLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gray-900 text-gray-100">
         <div className="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center mb-4 border border-blue-500/30">
            <Briefcase className="w-8 h-8 text-blue-400 animate-pulse" />
          </div>
          <p className="text-gray-400 text-sm">Autenticando...</p>
      </div>
    );
  }

  if (!session) {
    // Redireciona para o login e salva a página que o usuário tentou acessar
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Se tem sessão, renderiza os filhos, injetando o userId como prop (opcional)
  return React.cloneElement(children, { session });
}
