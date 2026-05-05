/**
 * backupService.js
 * Serviço de exportação completa dos dados do Cronos CRM para Excel/CSV.
 * Finalidade: garantir que o usuário sempre tenha uma cópia local dos dados
 * independente do banco de dados em nuvem (Supabase).
 */
import { supabase } from '../supabaseClient';
import * as XLSX from 'xlsx';

export const backupService = {
  /**
   * Busca TODOS os dados do banco sem limite de paginação.
   * Retorna um objeto com todas as entidades.
   */
  async fetchAllData() {
    const [organsRes, clientsRes, followUpsRes, labelsRes] = await Promise.all([
      // Órgãos (paginado, pode ter 1000+)
      (async () => {
        let all = [];
        let from = 0;
        const PAGE = 500;
        while (true) {
          const { data, error } = await supabase
            .from('organs')
            .select('*')
            .range(from, from + PAGE - 1)
            .order('original_id', { ascending: true });
          if (error) throw error;
          all = all.concat(data);
          if (data.length < PAGE) break;
          from += PAGE;
        }
        return all;
      })(),

      // Clientes (paginado)
      (async () => {
        let all = [];
        let from = 0;
        const PAGE = 500;
        while (true) {
          const { data, error } = await supabase
            .from('clients')
            .select('*, organ:organs(name, city, state)')
            .range(from, from + PAGE - 1)
            .order('created_at', { ascending: true });
          if (error) throw error;
          all = all.concat(data);
          if (data.length < PAGE) break;
          from += PAGE;
        }
        return all;
      })(),

      // Follow-ups
      supabase.from('follow_ups').select('*, client:clients(name)').order('scheduled_date'),

      // Etiquetas
      supabase.from('labels').select('*').order('name'),
    ]);

    if (followUpsRes.error) throw followUpsRes.error;
    if (labelsRes.error) throw labelsRes.error;

    return {
      organs: organsRes,
      clients: clientsRes,
      followUps: followUpsRes.data,
      labels: labelsRes.data,
    };
  },

  /**
   * Gera um arquivo .xlsx com uma aba para cada entidade e força o download.
   */
  async exportToExcel() {
    const data = await backupService.fetchAllData();
    const wb = XLSX.utils.book_new();

    // ── ABA 1: Órgãos ──────────────────────────────────────────────────────
    const organsRows = data.organs.map(o => ({
      'ID':           o.id,
      'Nome':         o.name,
      'Cidade':       o.city,
      'Estado':       o.state,
      'Quadro':       o.organ_board_id,
      'Posição':      o.position,
      'Favorito':     o.is_favorite ? 'Sim' : 'Não',
      'Criado em':    o.created_at ? new Date(o.created_at).toLocaleString('pt-BR') : '',
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(organsRows), 'Órgãos');

    // ── ABA 2: Clientes ─────────────────────────────────────────────────────
    const clientsRows = data.clients.map(c => ({
      'ID':           c.id,
      'Nome':         c.name,
      'CPF':          c.cpf || '',
      'Telefones':    (c.phones || []).join(' | '),
      'Órgão':        c.organ?.name || '',
      'Cidade':       c.organ?.city || '',
      'Estado':       c.organ?.state || '',
      'Quadro':       c.client_board_id,
      'Favorito':     c.is_favorite ? 'Sim' : 'Não',
      'Etiquetas':    (c.label_ids || []).join(', '),
      'Criado em':    c.created_at ? new Date(c.created_at).toLocaleString('pt-BR') : '',
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(clientsRows), 'Clientes');

    // ── ABA 3: Follow-ups ───────────────────────────────────────────────────
    const followUpsRows = data.followUps.map(f => ({
      'ID':           f.id,
      'Cliente':      f.client?.name || f.client_id,
      'Data Agendada':f.scheduled_date ? new Date(f.scheduled_date).toLocaleDateString('pt-BR') : '',
      'Status':       f.status,
      'Observações':  f.notes || '',
      'Criado em':    f.created_at ? new Date(f.created_at).toLocaleString('pt-BR') : '',
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(followUpsRows), 'Follow-ups');

    // ── ABA 4: Etiquetas ────────────────────────────────────────────────────
    const labelsRows = data.labels.map(l => ({
      'ID':     l.id,
      'Nome':   l.name,
      'Cor':    l.color,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(labelsRows), 'Etiquetas');

    // ── Gera o arquivo e força download ─────────────────────────────────────
    const dateStr = new Date().toISOString().slice(0, 10); // "2024-05-04"
    const filename = `cronos-crm-backup-${dateStr}.xlsx`;
    XLSX.writeFile(wb, filename);

    return {
      totalOrgaos:    data.organs.length,
      totalClientes:  data.clients.length,
      totalFollowUps: data.followUps.length,
      totalEtiquetas: data.labels.length,
      filename,
    };
  },
};
