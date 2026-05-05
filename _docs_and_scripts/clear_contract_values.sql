-- ══════════════════════════════════════════════════════
-- Script: Limpar contractValue de todos os órgãos
-- Execute no Supabase Dashboard > SQL Editor
-- ══════════════════════════════════════════════════════

-- 1. Limpar o valor de contrato de TODOS os órgãos
UPDATE organs
SET contract_value = NULL
WHERE contract_value IS NOT NULL AND contract_value != '';

-- 2. Verificar resultado
SELECT
  COUNT(*) as total,
  COUNT(CASE WHEN contract_value IS NULL OR contract_value = '' THEN 1 END) as sem_valor,
  COUNT(CASE WHEN contract_value IS NOT NULL AND contract_value != '' THEN 1 END) as com_valor
FROM organs;

-- 3. (Opcional) Converter original_id para INTEGER para ordenação nativa correta
-- Se quiser fazer isso permanentemente no banco:
-- ALTER TABLE organs ALTER COLUMN original_id TYPE INTEGER USING original_id::INTEGER;
-- Após isso, o .order('original_id') do Supabase já funciona numericamente.
