-- =============================================
-- ATUALIZAÇÃO PREMIUM: Histórico, Favoritos e Etiquetas
-- Execute este script no SQL Editor do Supabase
-- Settings > SQL Editor > New Query
-- =============================================

-- 1. Favoritos para Órgãos e Clientes
ALTER TABLE organs ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false;

-- 2. Suporte a Etiquetas Visuais nos Clientes
ALTER TABLE clients ADD COLUMN IF NOT EXISTS label_ids UUID[] DEFAULT '{}';

-- 3. Tabela de Histórico de Clientes (Timeline)
CREATE TABLE IF NOT EXISTS client_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_by TEXT DEFAULT 'User', -- Pode ser adaptado quando tiver autenticação
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices de performance para os logs
CREATE INDEX IF NOT EXISTS idx_client_logs_client_id ON client_logs(client_id);

-- Habilitar RLS e permitir tudo (temporário para desenvolvimento)
ALTER TABLE client_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir tudo client_logs" ON client_logs;
CREATE POLICY "Permitir tudo client_logs" ON client_logs FOR ALL USING (true);

-- 4. Opcional: Adicionar um tipo às Etiquetas (se não existir)
ALTER TABLE labels ADD COLUMN IF NOT EXISTS target_type TEXT DEFAULT 'universal';

-- 5. Recarregar o Schema
NOTIFY pgrst, 'reload schema';
