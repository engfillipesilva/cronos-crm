-- =============================================
-- ProspectCRM - Atualização de Tabelas para Kanban Dinâmico de Órgãos
-- Execute este SQL no Dashboard do Supabase
-- Settings > SQL Editor > New Query
-- =============================================

-- 1. Criar a tabela de colunas (boards) dos órgãos
CREATE TABLE IF NOT EXISTS organ_boards (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  position FLOAT8 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS e permitir tudo (temporário)
ALTER TABLE organ_boards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for organ_boards" ON organ_boards FOR ALL USING (true) WITH CHECK (true);

-- Gatilho para updated_at
CREATE OR REPLACE TRIGGER organ_boards_updated_at BEFORE UPDATE ON organ_boards FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 2. Inserir as 4 colunas padrão solicitadas
INSERT INTO organ_boards (id, name, position) VALUES 
('a-verificar', 'A verificar', 1000),
('verificando', 'Verificando', 2000),
('bater-toda-cidade', 'Bater TODA a cidade', 3000),
('finalizadas', 'Finalizadas', 4000)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, position = EXCLUDED.position;

-- 3. Adicionar coluna position na tabela organs
ALTER TABLE organs ADD COLUMN IF NOT EXISTS position FLOAT8;

-- 4. Atualizar a posição dos órgãos existentes baseando-se no seu original_id numérico,
-- e colocar todos na coluna 'a-verificar'
-- Multiplicamos por 1000 para deixar bastante espaço entre cada item (Fractional Indexing)
UPDATE organs
SET 
  organ_board_id = 'a-verificar',
  position = (NULLIF(regexp_replace(original_id, '[^0-9]', '', 'g'), '')::numeric) * 1000
WHERE position IS NULL;

-- 5. Atualizar os órgãos que tinham a board ID antiga 'para-verificar' (caso existam novos)
UPDATE organs SET organ_board_id = 'a-verificar' WHERE organ_board_id = 'para-verificar';
UPDATE organs SET organ_board_id = 'verificando' WHERE organ_board_id = 'em-andamento';
UPDATE organs SET organ_board_id = 'bater-toda-cidade' WHERE organ_board_id = 'verificar-cidade';
UPDATE organs SET organ_board_id = 'finalizadas' WHERE organ_board_id = 'concluido';
