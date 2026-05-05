import { supabase } from '../supabaseClient';

export const followUpsService = {
  async fetchAll() {
    const { data, error } = await supabase
      .from('follow_ups')
      .select('*')
      .order('scheduled_date', { ascending: true });
    if (error) throw error;
    return data.map(mapFollowUp);
  },

  async fetchPending() {
    const { data, error } = await supabase
      .from('follow_ups')
      .select('*')
      .neq('status', 'concluido')
      .order('scheduled_date', { ascending: true });
    if (error) throw error;
    return data.map(mapFollowUp);
  },

  async create(followUp) {
    const { data, error } = await supabase
      .from('follow_ups')
      .insert([toDb(followUp)])
      .select()
      .single();
    if (error) throw error;
    return mapFollowUp(data);
  },

  async update(id, changes) {
    const { data, error } = await supabase
      .from('follow_ups')
      .update(toDb(changes))
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return mapFollowUp(data);
  },

  async delete(id) {
    const { error } = await supabase
      .from('follow_ups')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  // Deleta follow-ups de um cliente específico (chamado ao deletar cliente)
  async deleteByClient(clientId) {
    const { error } = await supabase
      .from('follow_ups')
      .delete()
      .eq('client_id', clientId);
    if (error) throw error;
  },
};

// DB → App
function mapFollowUp(row) {
  return {
    id: row.id,
    clientId: row.client_id,
    clientName: row.client_name,
    city: row.city,
    state: row.state,
    scheduledDate: row.scheduled_date,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// App → DB
function toDb(obj) {
  const db = {};
  if (obj.clientId !== undefined)     db.client_id = obj.clientId;
  if (obj.clientName !== undefined)   db.client_name = obj.clientName;
  if (obj.city !== undefined)         db.city = obj.city;
  if (obj.state !== undefined)        db.state = obj.state;
  if (obj.scheduledDate !== undefined) db.scheduled_date = obj.scheduledDate;
  if (obj.status !== undefined)       db.status = obj.status;
  if (obj.notes !== undefined)        db.notes = obj.notes;
  return db;
}
