import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wzzkazbfrctetjjjqoeb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6emthemJmcmN0ZXRqampxb2ViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1NDE4ODQsImV4cCI6MjA5MzExNzg4NH0.23hjfp5dUWbY3vEi83qKDYZrzrXQd63HYMTFeG0UEIA';

const supabase = createClient(supabaseUrl, supabaseKey);

// Este SQL precisa ser rodado no Dashboard do Supabase > SQL Editor
const SQL = `
-- =============================================
-- ProspectCRM - Criação de Tabelas
-- Execute este SQL no Dashboard do Supabase
-- Settings > SQL Editor > New Query
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
-- Permite leitura e escrita para qualquer usuario anonimo
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
`;

console.log("=== SQL para executar no Supabase Dashboard ===");
console.log(SQL);
console.log("================================================");
console.log("");
console.log("Testando conexao com Supabase...");

async function testAndSeed() {
  // Testa conexao
  const { data: session, error: authError } = await supabase.auth.getSession();
  if (authError) {
    console.error("Erro de conexao:", authError.message);
    return;
  }
  console.log("Conexao OK!");

  // Tenta listar tabelas (vai falhar se nao existirem ainda)
  const { data: labelsData, error: labelsError } = await supabase.from('labels').select('id').limit(1);
  
  if (labelsError) {
    console.log("");
    console.log("As tabelas ainda NAO existem no Supabase.");
    console.log("Voce precisa copiar o SQL acima e colar no:");
    console.log("  Supabase Dashboard > SQL Editor > New Query > Run");
    console.log("");
    console.log("Depois de rodar o SQL, execute este script novamente para popular os dados.");
  } else {
    console.log("Tabelas encontradas! Populando dados iniciais...");
    await seedData();
  }
}

async function seedData() {
  // Inserir etiquetas padrao
  const { error: labelErr } = await supabase.from('labels').upsert([
    { id: 'a0000000-0000-0000-0000-000000000001', name: 'Verificando', color: '#fdcb6e', is_default: true },
    { id: 'a0000000-0000-0000-0000-000000000002', name: 'Verificadas', color: '#00b894', is_default: true },
  ], { onConflict: 'id' });
  
  if (labelErr) {
    console.error("Erro ao inserir etiquetas:", labelErr.message);
  } else {
    console.log("Etiquetas padrao inseridas!");
  }

  // Inserir orgaos do JSON
  const fs = await import('fs');
  const organsRaw = JSON.parse(fs.readFileSync('src/utils/organs_data.json', 'utf-8'));
  
  console.log(`Inserindo ${organsRaw.length} orgaos...`);
  
  // Supabase tem limite de ~1000 rows por insert, vamos fazer em batches
  const batchSize = 500;
  let inserted = 0;
  
  for (let i = 0; i < organsRaw.length; i += batchSize) {
    const batch = organsRaw.slice(i, i + batchSize).map(o => ({
      original_id: o.original_id,
      name: o.name,
      city: o.city,
      state: o.state,
      contract_value: o.contract_value || '',
      organ_board_id: 'para-verificar',
      label_ids: [],
    }));
    
    const { error } = await supabase.from('organs').insert(batch);
    if (error) {
      console.error(`Erro no batch ${i}-${i+batchSize}:`, error.message);
    } else {
      inserted += batch.length;
      console.log(`  ${inserted}/${organsRaw.length} inseridos...`);
    }
  }
  
  console.log(`Pronto! ${inserted} orgaos inseridos no Supabase.`);
}

testAndSeed();
