import { supabase } from '../supabaseClient';

export const settingsService = {
  async fetchSettings(userId) {
    if (!userId) return null;
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (error && error.code !== 'PGRST116') { // PGRST116 is "No rows found"
      console.error('Erro ao buscar configurações do usuário', error);
      return null;
    }
    return data;
  },

  async updateSettings(userId, settings) {
    if (!userId) return null;
    
    // First try to check if it exists
    const { data: existing } = await supabase
      .from('user_settings')
      .select('id')
      .eq('id', userId)
      .single();
      
    if (existing) {
      const { data, error } = await supabase
        .from('user_settings')
        .update({ ...settings, updated_at: new Date() })
        .eq('id', userId)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabase
        .from('user_settings')
        .insert([{ id: userId, ...settings }])
        .select()
        .single();
      if (error) throw error;
      return data;
    }
  }
};
