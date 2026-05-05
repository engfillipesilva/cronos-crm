import { supabase } from '../supabaseClient';

export const organBoardsService = {
  async fetchAll() {
    const { data, error } = await supabase
      .from('organ_boards')
      .select('*')
      .order('position', { ascending: true });
    if (error) throw error;
    return data.map(mapBoard);
  },

  async create(board) {
    const { data, error } = await supabase
      .from('organ_boards')
      .insert([toDb(board)])
      .select()
      .single();
    if (error) throw error;
    return mapBoard(data);
  },

  async update(id, changes) {
    const { data, error } = await supabase
      .from('organ_boards')
      .update(toDb(changes))
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return mapBoard(data);
  },

  async delete(id) {
    const { error } = await supabase
      .from('organ_boards')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};

// DB -> App
function mapBoard(row) {
  return {
    id: row.id,
    name: row.name,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// App -> DB
function toDb(obj) {
  const db = {};
  if (obj.id !== undefined) db.id = obj.id;
  if (obj.name !== undefined) db.name = obj.name;
  if (obj.position !== undefined) db.position = obj.position;
  return db;
}
