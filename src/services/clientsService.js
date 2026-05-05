import { supabase } from '../supabaseClient';

export const clientsService = {
  async fetchByOrgan(organId) {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('organ_id', organId)
      .order('position', { ascending: true });
    if (error) throw error;
    return data.map(mapClient);
  },

  async create(client) {
    const { data, error } = await supabase
      .from('clients')
      .insert([toDb(client)])
      .select()
      .single();
    if (error) throw error;
    return mapClient(data);
  },

  async searchGlobal(query, limit = 40) {
    if (!query || query.length < 1) return [];
    
    const q = query.toLowerCase().trim();

    try {
      // TENTATIVA 1: Usar a função SQL personalizada (Super Busca)
      // Esta função deve ser criada no Supabase via SQL Editor
      const { data, error } = await supabase
        .rpc('search_clients_universal', { search_query: q });
        
      if (!error && data) {
        return data.map(row => mapClient({
          ...row,
          organ: { name: row.organ_name } // Mapeia o join do RPC
        })).slice(0, limit);
      }
      
      if (error) console.warn("RPC de busca falhou (pode não estar criado), tentando fallback...", error);
    } catch (err) {
      console.warn("Erro ao chamar RPC, usando fallback local...", err);
    }

    // FALLBACK: Busca padrão se a função SQL não existir
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('clients')
      .select('*, organ:organs(name)')
      .or(`name.ilike.%${q}%,cpf.ilike.%${q}%,organ.name.ilike.%${q}%`)
      .limit(limit);
      
    if (fallbackError) throw fallbackError;
    
    let results = fallbackData.map(mapClient);

    // Se tiver números, tenta match de telefone nos primeiros slots (melhor que nada)
    const qDigits = q.replace(/\D/g, '');
    if (qDigits.length >= 2 && results.length < limit) {
      const { data: phoneData } = await supabase
        .from('clients')
        .select('*, organ:organs(name)')
        .or(`phones->>0.ilike.%${qDigits}%,phones->>1.ilike.%${qDigits}%,phones->>2.ilike.%${qDigits}%,phones->>3.ilike.%${qDigits}%,phones->>4.ilike.%${qDigits}%`)
        .limit(limit - results.length);
        
      if (phoneData) {
        phoneData.forEach(row => {
          if (!results.some(r => r.id === row.id)) results.push(mapClient(row));
        });
      }
    }
    
    return results;
  },

  async fetchFavorites(page = 1, limit = 20) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('is_favorite', true)
      .range(from, to);
      
    if (error) throw error;
    return data.map(mapClient);
  },

  async filterClients(filters) {
    let query = supabase.from('clients').select('*, organ:organs!inner(name, city)');

    if (filters.boardId) query = query.eq('client_board_id', filters.boardId);
    if (filters.labelIds && filters.labelIds.length > 0) query = query.contains('label_ids', filters.labelIds);
    if (filters.organId) query = query.eq('organ_id', filters.organId);

    const { data, error } = await query.limit(50);
    if (error) throw error;
    return data.map(row => mapClient({
      ...row,
      organName: row.organ?.name
    }));
  },

  async createMany(clients) {
    if (!clients.length) return [];
    const { data, error } = await supabase
      .from('clients')
      .insert(clients.map(toDb))
      .select();
    if (error) throw error;
    return data.map(mapClient);
  },

  async update(id, changes) {
    const { data, error } = await supabase
      .from('clients')
      .update(toDb(changes))
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return mapClient(data);
  },

  async delete(id) {
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async getBoardStats() {
    const { data, error } = await supabase.rpc('get_clients_count_per_board');
    if (error) {
      console.warn("RPC get_clients_count_per_board failed, returning empty stats.");
      return [];
    }
    return data;
  },

  async getConversionReport(month, year) {
    const { data, error } = await supabase.rpc('get_board_movements_stats', {
      p_month: month,
      p_year: year
    });
    if (error) {
      console.warn("RPC get_board_movements_stats failed.");
      return [];
    }
    return data;
  }
};

// DB → App
function mapClient(row) {
  return {
    id: row.id,
    organId: row.organ_id,
    clientBoardId: row.client_board_id,
    position: row.position,
    name: row.name,
    cpf: row.cpf,
    phones: (row.phones || []).map(p => String(p)),
    organName: row.organ?.name || row.organ_name || '', // Suporte a join ou campo flat
    isFavorite: row.is_favorite || false,
    labelIds: row.label_ids || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// App → DB
function toDb(obj) {
  const db = {};
  if (obj.id !== undefined) db.id = obj.id;
  if (obj.organId !== undefined) db.organ_id = obj.organId;
  if (obj.clientBoardId !== undefined) db.client_board_id = obj.clientBoardId;
  if (obj.position !== undefined) db.position = obj.position;
  if (obj.name !== undefined) db.name = obj.name;
  if (obj.cpf !== undefined) db.cpf = obj.cpf;
  if (obj.phones !== undefined) {
    db.phones = (obj.phones || []).map(p => String(p).replace(/\D/g, ''));
  }
  if (obj.isFavorite !== undefined)  db.is_favorite = obj.isFavorite;
  if (obj.labelIds !== undefined)    db.label_ids = obj.labelIds;
  return db;
}
