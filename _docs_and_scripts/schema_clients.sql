-- =============================================
-- ProspectCRM - Tabelas para Clientes (Pessoas Físicas)
-- Execute este SQL no Dashboard do Supabase
-- Settings > SQL Editor > New Query
-- =============================================

-- 1. Tabela de Quadros (Boards) para o Kanban de Clientes
CREATE TABLE IF NOT EXISTS client_boards (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  position FLOAT8 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabela de Clientes
CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  organ_id UUID NOT NULL REFERENCES organs(id) ON DELETE CASCADE,
  client_board_id TEXT NOT NULL REFERENCES client_boards(id) ON DELETE CASCADE,
  position FLOAT8 NOT NULL,
  name TEXT NOT NULL,
  cpf TEXT,
  phones JSONB DEFAULT '[]'::jsonb, -- Array de strings com os telefones [ "(11) 9999-9999", ... ]
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS e permitir tudo (temporário para desenvolvimento rápido)
ALTER TABLE client_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir tudo client_boards" ON client_boards;
CREATE POLICY "Permitir tudo client_boards" ON client_boards FOR ALL USING (true);

DROP POLICY IF EXISTS "Permitir tudo clients" ON clients;
CREATE POLICY "Permitir tudo clients" ON clients FOR ALL USING (true);

-- =============================================
-- Inserir os Quadros Padrão (Seed)
-- =============================================
INSERT INTO client_boards (id, name, position) VALUES
  ('board_cli_1_analise', 'Análise Prévia', 1000),
  ('board_cli_2_enviado', 'Mensagem enviada', 2000),
  ('board_cli_3_nao_encontrado', 'Número não encontrado', 3000),
  ('board_cli_4_errado', 'Número errado', 4000),
  ('board_cli_5_andamento', 'Em andamento', 5000),
  ('board_cli_6_contrato', 'Em fase de contrato', 6000),
  ('board_cli_7_doc', 'Documentação', 7000),
  ('board_cli_8_assinado', 'Contrato assinado', 8000),
  ('board_cli_9_finalizados', 'Finalizados', 9000)
ON CONFLICT (id) DO NOTHING;
