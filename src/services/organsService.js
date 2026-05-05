import { supabase } from '../supabaseClient';

const PAGE_SIZE = 500;

export const organsService = {
  async fetchAll() {
    let all = [];
    let from = 0;
    // Supabase retorna no máximo 1000 por request; paginamos por segurança
    while (true) {
      const { data, error } = await supabase
        .from('organs')
        .select('*')
        .range(from, from + PAGE_SIZE - 1)
        // Ordenar pela posição original do PDF (cast para inteiro para ordem numérica correta)
        .order('original_id', { ascending: true, nullsFirst: true });
      if (error) throw error;
      all = all.concat(data);
      if (data.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }
    // Ordenar por original_id numérico (Supabase ordena como TEXT: "10" < "2")
    all.sort((a, b) => {
      const na = parseInt(a.original_id, 10) || 0;
      const nb = parseInt(b.original_id, 10) || 0;
      return na - nb;
    });
    return all.map(mapOrgan);
  },

  async create(organ) {
    const { data, error } = await supabase
      .from('organs')
      .insert([toDb(organ)])
      .select()
      .single();
    if (error) throw error;
    return mapOrgan(data);
  },

  async update(id, changes) {
    const { data, error } = await supabase
      .from('organs')
      .update(toDb(changes))
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return mapOrgan(data);
  },

  async move(id, organBoardId, position) {
    const updates = { organ_board_id: organBoardId };
    if (position !== undefined) updates.position = position;
    const { data, error } = await supabase
      .from('organs')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return mapOrgan(data);
  },

  // Atualiza posições em batch (para reordenação manual)
  // Nota: requer coluna 'position' no Supabase. Se não existir, reordenação é apenas local.
  async reorder(updates) {
    try {
      const promises = updates.map(({ id, position }) =>
        supabase.from('organs').update({ position }).eq('id', id)
      );
      await Promise.all(promises);
    } catch (err) {
      // Silencioso — a coluna position pode não existir ainda
      console.log('[organsService] reorder: coluna position não encontrada, ordem local apenas.');
    }
  },

  async delete(id) {
    const { error } = await supabase
      .from('organs')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async search(query) {
    if (!query) return [];
    const q = query.toLowerCase().trim();

    try {
      // Tenta usar a Super Busca (RPC) que ignora acentos
      const { data, error } = await supabase
        .rpc('search_organs_universal', { search_query: q });
      
      if (!error && data) return data.map(mapOrgan);
      if (error) console.warn("RPC search_organs_universal falhou, usando fallback...", error);
    } catch (err) {
      console.warn("Erro ao chamar RPC de órgãos", err);
    }

    // Fallback padrão (sensível a acentos)
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('organs')
      .select('*')
      .or(`name.ilike.%${q}%,city.ilike.%${q}%,state.ilike.%${q}%`)
      .limit(20);
    if (fallbackError) throw fallbackError;
    return fallbackData.map(mapOrgan);
  },

  async addLabel(id, labelId) {
    // Busca label_ids atual e adiciona
    const { data: row, error: fetchErr } = await supabase
      .from('organs')
      .select('label_ids')
      .eq('id', id)
      .single();
    if (fetchErr) throw fetchErr;

    const current = row.label_ids || [];
    if (current.includes(labelId)) return;

    const { data, error } = await supabase
      .from('organs')
      .update({ label_ids: [...current, labelId] })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return mapOrgan(data);
  },

  async removeLabel(id, labelId) {
    const { data: row, error: fetchErr } = await supabase
      .from('organs')
      .select('label_ids')
      .eq('id', id)
      .single();
    if (fetchErr) throw fetchErr;

    const updated = (row.label_ids || []).filter(l => l !== labelId);

    const { data, error } = await supabase
      .from('organs')
      .update({ label_ids: updated })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return mapOrgan(data);
  },

  // Seed: insere os 1.433 órgãos do JSON se o banco estiver vazio
  async seedFromJson(organsJson) {
    const { data: existing } = await supabase
      .from('organs')
      .select('id')
      .limit(1);

    if (existing && existing.length > 0) {
      console.log('[organsService] Órgãos já presentes no Supabase, seed ignorado.');
      return null;
    }

    console.log(`[organsService] Inserindo ${organsJson.length} órgãos no Supabase...`);

    // Insere em lotes de 500 para evitar timeout
    const BATCH = 500;
    let inserted = [];
    for (let i = 0; i < organsJson.length; i += BATCH) {
      const batch = organsJson.slice(i, i + BATCH).map(o => ({
        original_id: o.original_id || o.id || null,
        name: o.name || '',
        city: o.city || '',
        state: o.state || '',
        contract_value: o.contractValue || o.contract_value || '',
        organ_board_id: o.organBoardId || 'para-verificar',
        label_ids: o.labelIds || [],
      }));

      const { data, error } = await supabase
        .from('organs')
        .insert(batch)
        .select();
      if (error) throw error;
      inserted = inserted.concat(data);
    }

    console.log(`[organsService] Seed concluído: ${inserted.length} órgãos inseridos.`);
    return inserted.map(mapOrgan);
  },
};

// DB → App
function mapOrgan(row) {
  return {
    id: row.id,
    originalId: row.original_id,
    name: row.name,
    city: row.city,
    state: row.state,
    organBoardId: row.organ_board_id,
    position: row.position,
    labelIds: row.label_ids || [],
    isFavorite: row.is_favorite || false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// App → DB
function toDb(obj) {
  const db = {};
  if (obj.originalId !== undefined)   db.original_id = obj.originalId;
  if (obj.name !== undefined)          db.name = obj.name;
  if (obj.city !== undefined)          db.city = obj.city;
  if (obj.state !== undefined)         db.state = obj.state;
  if (obj.contractValue !== undefined) db.contract_value = obj.contractValue;
  if (obj.organBoardId !== undefined)  db.organ_board_id = obj.organBoardId;
  if (obj.position !== undefined)      db.position = obj.position;
  if (obj.labelIds !== undefined)      db.label_ids = obj.labelIds;
  if (obj.isFavorite !== undefined)    db.is_favorite = obj.isFavorite;
  return db;
}
