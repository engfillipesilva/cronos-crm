import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wzzkazbfrctetjjjqoeb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6emthemJmcmN0ZXRqampxb2ViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1NDE4ODQsImV4cCI6MjA5MzExNzg4NH0.23hjfp5dUWbY3vEi83qKDYZrzrXQd63HYMTFeG0UEIA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function clearContractValues() {
  console.log("Limpando contract_value dos órgãos...");
  
  // Supabase REST não suporta UPDATE sem WHERE que englobe tudo sem cuidado, 
  // então vamos fazer um update onde contract_value não é nulo/vazio.
  // Como o client JS tem algumas restrições, vamos usar o .neq
  const { data, error } = await supabase
    .from('organs')
    .update({ contract_value: '' })
    .neq('contract_value', '');
    
  if (error) {
    console.error("Erro ao limpar:", error.message);
  } else {
    console.log("Valores limpos com sucesso!");
  }
}

clearContractValues();
