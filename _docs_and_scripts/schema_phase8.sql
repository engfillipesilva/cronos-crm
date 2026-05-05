-- =============================================
-- ProspectCRM - Fase 8: Segurança e Persistência
-- Execute este SQL no Dashboard do Supabase
-- Settings > SQL Editor > New Query
-- =============================================

-- 1. Criação da tabela de configurações de usuário (Preferências de UI)
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  sidebar_open BOOLEAN DEFAULT true,
  selected_city TEXT,
  theme TEXT DEFAULT 'dark',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Permite ao usuário ver e editar apenas suas próprias configurações
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuário gerencia suas configs" ON user_settings;
CREATE POLICY "Usuário gerencia suas configs" 
  ON user_settings FOR ALL 
  USING (auth.uid() = id);

-- =============================================
-- 2. Atualização das Políticas RLS (Segurança)
-- Fechar tudo para acesso anônimo.
-- Apenas usuários autenticados (auth.uid() IS NOT NULL) terão acesso.
-- =============================================

-- Remover políticas abertas antigas
DROP POLICY IF EXISTS "Permitir tudo clients" ON clients;
DROP POLICY IF EXISTS "Permitir tudo client_boards" ON client_boards;
DROP POLICY IF EXISTS "Permitir tudo organs" ON organs;
DROP POLICY IF EXISTS "Permitir tudo organ_boards" ON organ_boards;
DROP POLICY IF EXISTS "Permitir tudo labels" ON labels;
DROP POLICY IF EXISTS "Permitir tudo follow_ups" ON follow_ups;
DROP POLICY IF EXISTS "Permitir tudo client_logs" ON client_logs;

-- Remover políticas restritas antigas (caso o script seja rodado mais de uma vez)
DROP POLICY IF EXISTS "Acesso Autenticado" ON clients;
DROP POLICY IF EXISTS "Acesso Autenticado" ON client_boards;
DROP POLICY IF EXISTS "Acesso Autenticado" ON organs;
DROP POLICY IF EXISTS "Acesso Autenticado" ON organ_boards;
DROP POLICY IF EXISTS "Acesso Autenticado" ON labels;
DROP POLICY IF EXISTS "Acesso Autenticado" ON follow_ups;
DROP POLICY IF EXISTS "Acesso Autenticado" ON client_logs;

-- Criar políticas restritas para todos (apenas logados)
CREATE POLICY "Acesso Autenticado" ON clients FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Acesso Autenticado" ON client_boards FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Acesso Autenticado" ON organs FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Acesso Autenticado" ON organ_boards FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Acesso Autenticado" ON labels FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Acesso Autenticado" ON follow_ups FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Acesso Autenticado" ON client_logs FOR ALL USING (auth.uid() IS NOT NULL);

-- Caso alguma tabela não estivesse com RLS habilitado ainda:
ALTER TABLE organs ENABLE ROW LEVEL SECURITY;
ALTER TABLE organ_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_logs ENABLE ROW LEVEL SECURITY;
