import { createClient } from '@supabase/supabase-js';

// Configure suas credenciais do Supabase aqui
// Você encontra no Dashboard > Settings > API
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://seu-projeto.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sua-chave-anon-aqui';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
