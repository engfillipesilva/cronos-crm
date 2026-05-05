-- =============================================
-- ATUALIZAÇÃO DA TABELA CLIENTS (NOVO SCHEMA)
-- Execute este script no SQL Editor do Supabase
-- Settings > SQL Editor > New Query
-- =============================================

-- Como a tabela clients já existia com o formato antigo (phone1, phone2, city), 
-- o CREATE TABLE IF NOT EXISTS não adicionou as novas colunas.
-- Este script irá alterar a tabela para o novo formato!

-- 1. Adicionar as novas colunas (se não existirem)
-- NOTA: O id na tabela organs é do tipo UUID, portanto organ_id deve ser UUID também!
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS organ_id UUID REFERENCES organs(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS client_board_id TEXT REFERENCES client_boards(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS position FLOAT8,
ADD COLUMN IF NOT EXISTS phones JSONB DEFAULT '[]'::jsonb;

-- 2. (Opcional) Podemos remover as colunas antigas que não usaremos mais
-- Descomente as linhas abaixo se quiser limpar o banco:
-- ALTER TABLE clients DROP COLUMN IF EXISTS phone1;
-- ALTER TABLE clients DROP COLUMN IF EXISTS phone2;
-- ALTER TABLE clients DROP COLUMN IF EXISTS city;
-- ALTER TABLE clients DROP COLUMN IF EXISTS state;
-- ALTER TABLE clients DROP COLUMN IF EXISTS board_id;
-- ALTER TABLE clients DROP COLUMN IF EXISTS notes;

-- 3. Após rodar isso, o Supabase precisa recarregar o cache
NOTIFY pgrst, 'reload schema';
