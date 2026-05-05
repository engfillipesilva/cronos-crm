import { supabase } from '../supabaseClient';

export const labelsService = {
  async fetchAll() {
    const { data, error } = await supabase
      .from('labels')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data.map(mapLabel);
  },

  async create(label) {
    const { data, error } = await supabase
      .from('labels')
      .insert([toDb(label)])
      .select()
      .single();
    if (error) throw error;
    return mapLabel(data);
  },

  async update(id, changes) {
    const { data, error } = await supabase
      .from('labels')
      .update(toDb(changes))
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return mapLabel(data);
  },

  async delete(id) {
    const { error } = await supabase
      .from('labels')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  // Seed das etiquetas padrão se o banco estiver vazio
  async seedDefaults(defaults) {
    const { data: existing } = await supabase.from('labels').select('id').limit(1);
    if (existing && existing.length > 0) return null; // já tem dados

    const { data, error } = await supabase
      .from('labels')
      .insert(defaults.map(l => ({ id: l.id, name: l.name, color: l.color, is_default: l.isDefault ?? false })))
      .select();
    if (error) throw error;
    return data.map(mapLabel);
  },
};

// DB → App (snake_case → camelCase)
function mapLabel(row) {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    isDefault: row.is_default,
    targetType: row.target_type || 'universal',
    createdAt: row.created_at,
  };
}

// App → DB
function toDb(obj) {
  const db = {};
  if (obj.name !== undefined)      db.name = obj.name;
  if (obj.color !== undefined)     db.color = obj.color;
  if (obj.isDefault !== undefined) db.is_default = obj.isDefault;
  if (obj.targetType !== undefined) db.target_type = obj.targetType;
  return db;
}
