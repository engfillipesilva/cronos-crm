-- =============================================
-- ProspectCRM - Criação de Tabelas
-- Execute este SQL no Dashboard do Supabase
-- SQL Editor > New Query > Cole tudo > Run
-- =============================================

-- Tabela de Etiquetas
CREATE TABLE IF NOT EXISTS labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6c5ce7',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Órgãos
CREATE TABLE IF NOT EXISTS organs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_id TEXT,
  name TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL DEFAULT '',
  contract_value TEXT DEFAULT '',
  organ_board_id TEXT NOT NULL DEFAULT 'para-verificar',
  label_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Clientes
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  cpf TEXT DEFAULT '',
  phone1 TEXT DEFAULT '',
  phone2 TEXT DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL DEFAULT '',
  board_id TEXT NOT NULL DEFAULT 'analise-previa',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Follow-ups
CREATE TABLE IF NOT EXISTS follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL DEFAULT '',
  scheduled_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_organs_board ON organs(organ_board_id);
CREATE INDEX IF NOT EXISTS idx_organs_city_state ON organs(city, state);
CREATE INDEX IF NOT EXISTS idx_clients_board ON clients(board_id);
CREATE INDEX IF NOT EXISTS idx_clients_city ON clients(city, state);
CREATE INDEX IF NOT EXISTS idx_followups_status ON follow_ups(status);
CREATE INDEX IF NOT EXISTS idx_followups_date ON follow_ups(scheduled_date);

-- Habilitar RLS (Row Level Security)
ALTER TABLE labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE organs ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;

-- Politicas de acesso publico (temporario, ate implementar auth)
CREATE POLICY "Allow all for labels" ON labels FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for organs" ON organs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for clients" ON clients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for follow_ups" ON follow_ups FOR ALL USING (true) WITH CHECK (true);

-- Funcao para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER organs_updated_at BEFORE UPDATE ON organs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER follow_ups_updated_at BEFORE UPDATE ON follow_ups FOR EACH ROW EXECUTE FUNCTION update_updated_at();
