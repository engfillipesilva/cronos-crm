import { supabase } from '../supabaseClient';

export const clientLogsService = {
  async fetchByClient(clientId) {
    const { data, error } = await supabase
      .from('client_logs')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    return data.map(mapLog);
  },

  async create(logData) {
    const { data, error } = await supabase
      .from('client_logs')
      .insert([toDb(logData)])
      .select()
      .single();
      
    if (error) throw error;
    return mapLog(data);
  },

  async update(id, changes) {
    const { data, error } = await supabase
      .from('client_logs')
      .update(toDb(changes))
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    return mapLog(data);
  },

  async delete(id) {
    const { error } = await supabase
      .from('client_logs')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
  }
};

// DB -> App
function mapLog(row) {
  return {
    id: row.id,
    clientId: row.client_id,
    content: row.content,
    createdBy: row.created_by,
    createdAt: row.created_at
  };
}

// App -> DB
function toDb(obj) {
  const db = {};
  if (obj.id !== undefined) db.id = obj.id;
  if (obj.clientId !== undefined) db.client_id = obj.clientId;
  if (obj.content !== undefined) db.content = obj.content;
  if (obj.createdBy !== undefined) db.created_by = obj.createdBy;
  return db;
}
