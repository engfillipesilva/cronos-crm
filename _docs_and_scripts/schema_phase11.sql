-- schema_phase11.sql
-- Fase 11: Histórico de Movimentações para BI e Relatórios

-- 1. Criação da tabela de log
CREATE TABLE IF NOT EXISTS board_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    from_board_id TEXT REFERENCES client_boards(id) ON DELETE SET NULL,
    to_board_id TEXT REFERENCES client_boards(id) ON DELETE SET NULL,
    moved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Segurança RLS
ALTER TABLE board_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura de board_movements para autenticados" ON board_movements;
CREATE POLICY "Permitir leitura de board_movements para autenticados"
ON board_movements FOR SELECT
TO authenticated USING (true);

-- 3. Função do Trigger
CREATE OR REPLACE FUNCTION log_client_board_movement()
RETURNS TRIGGER AS $$
BEGIN
    -- Se o board id mudou, criar o log de movimentação
    IF OLD.client_board_id IS DISTINCT FROM NEW.client_board_id THEN
        INSERT INTO board_movements (client_id, from_board_id, to_board_id)
        VALUES (NEW.id, OLD.client_board_id, NEW.client_board_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Trigger
DROP TRIGGER IF EXISTS trigger_log_client_board_movement ON clients;

CREATE TRIGGER trigger_log_client_board_movement
AFTER UPDATE OF client_board_id ON clients
FOR EACH ROW
EXECUTE FUNCTION log_client_board_movement();

-- 5. RPC: Contagem de clientes por quadro
DROP FUNCTION IF EXISTS get_clients_count_per_board();
CREATE OR REPLACE FUNCTION get_clients_count_per_board()
RETURNS TABLE (board_id TEXT, total_count BIGINT) AS $$
BEGIN
  RETURN QUERY 
  SELECT client_board_id, COUNT(*)
  FROM clients
  WHERE client_board_id IS NOT NULL
  GROUP BY client_board_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. RPC: Estatísticas de conversão (movimentações para um quadro em um mês)
DROP FUNCTION IF EXISTS get_board_movements_stats(INTEGER, INTEGER);
CREATE OR REPLACE FUNCTION get_board_movements_stats(p_month INTEGER, p_year INTEGER)
RETURNS TABLE (to_board_id TEXT, movements_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT bm.to_board_id, COUNT(DISTINCT bm.client_id)
  FROM board_movements bm
  WHERE EXTRACT(MONTH FROM bm.moved_at) = p_month
    AND EXTRACT(YEAR FROM bm.moved_at) = p_year
  GROUP BY bm.to_board_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
