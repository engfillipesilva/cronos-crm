import { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';

import { labelsService } from '../services/labelsService';
import { organsService } from '../services/organsService';
import { organBoardsService } from '../services/organBoardsService';
import { clientsService } from '../services/clientsService';
import { clientBoardsService } from '../services/clientBoardsService';
import { followUpsService } from '../services/followUpsService';
import { clientLogsService } from '../services/clientLogsService';
import { settingsService } from '../services/settingsService';
import { supabase } from '../supabaseClient';

import { DEFAULT_CRM_BOARDS, DEFAULT_LABELS } from '../constants';

const AppContext = createContext(null);

// ─── Estado inicial ───────────────────────────────────────────────────────────

const initialState = {
  organs:      [],
  organBoards: [],
  labels:      [],
  boards:      DEFAULT_CRM_BOARDS,
  clientBoards:[],
  clients:     [], // Clientes continuarão aqui por enquanto para compatibilidade, mas serão carregados sob demanda
  clientLogs:  {}, // Cache de logs: { clientId: [log1, log2] }
  followUps:   [],
  sidebarOpen: false,
  selectedCity: null,
  loading:     true,   // aguardando fetch inicial
  error:       null,
};

// ─── Reducer ─────────────────────────────────────────────────────────────────

function appReducer(state, action) {
  switch (action.type) {

    // UI
    case 'TOGGLE_SIDEBAR': return { ...state, sidebarOpen: !state.sidebarOpen };
    case 'CLOSE_SIDEBAR':  return { ...state, sidebarOpen: false };
    case 'SELECT_CITY':    return { ...state, selectedCity: action.payload };
    case 'SET_LOADING':    return { ...state, loading: action.payload };
    case 'SET_ERROR':      return { ...state, error: action.payload };

    // Carregamento inicial completo
    case 'INIT_DATA':
      return {
        ...state,
        organs:      action.payload.organs,
        organBoards: action.payload.organBoards,
        labels:      action.payload.labels,
        clientBoards:action.payload.clientBoards,
        clients:     action.payload.clients,
        clientLogs:  {},
        followUps:   action.payload.followUps,
        loading:     false,
        error:       null,
      };

    // ── Organ Boards ──
    case 'ADD_ORGAN_BOARD':    return { ...state, organBoards: [...state.organBoards, action.payload] };
    case 'UPDATE_ORGAN_BOARD':
      return {
        ...state,
        organBoards: state.organBoards.map(b =>
          b.id === action.payload.id ? { ...b, ...action.payload } : b
        ),
      };
    case 'DELETE_ORGAN_BOARD':
      return { ...state, organBoards: state.organBoards.filter(b => b.id !== action.payload) };
    case 'REORDER_ORGAN_BOARDS':
      return { ...state, organBoards: action.payload };

    // ── Organs ──
    case 'SET_ORGANS':   return { ...state, organs: action.payload };
    case 'ADD_ORGAN':    return { ...state, organs: [...state.organs, action.payload] };
    case 'UPDATE_ORGAN':
      return {
        ...state,
        organs: state.organs.map(o =>
          o.id === action.payload.id ? { ...o, ...action.payload } : o
        ),
      };
    case 'DELETE_ORGAN':
      return { ...state, organs: state.organs.filter(o => o.id !== action.payload) };
    case 'MOVE_ORGAN':
      return {
        ...state,
        organs: state.organs.map(o =>
          o.id === action.payload.organId
            ? { ...o, organBoardId: action.payload.organBoardId, position: action.payload.position }
            : o
        ),
      };
    case 'REORDER_ORGANS':
      // payload = nova lista completa de organs (já reordenada localmente)
      return { ...state, organs: action.payload };
    case 'ADD_LABEL_TO_ORGAN':
      return {
        ...state,
        organs: state.organs.map(o =>
          o.id === action.payload.organId
            ? { ...o, labelIds: [...(o.labelIds || []), action.payload.labelId] }
            : o
        ),
      };
    case 'REMOVE_LABEL_FROM_ORGAN':
      return {
        ...state,
        organs: state.organs.map(o =>
          o.id === action.payload.organId
            ? { ...o, labelIds: (o.labelIds || []).filter(l => l !== action.payload.labelId) }
            : o
        ),
      };

    // ── Labels ──
    case 'ADD_LABEL':    return { ...state, labels: [...state.labels, action.payload] };
    case 'UPDATE_LABEL':
      return {
        ...state,
        labels: state.labels.map(l =>
          l.id === action.payload.id ? { ...l, ...action.payload } : l
        ),
      };
    case 'DELETE_LABEL':
      return {
        ...state,
        labels: state.labels.filter(l => l.id !== action.payload),
        organs: state.organs.map(o => ({
          ...o,
          labelIds: (o.labelIds || []).filter(id => id !== action.payload),
        })),
      };

    // ── Clients ──
    case 'SET_CLIENTS':   return { ...state, clients: action.payload };
    case 'ADD_CLIENTS':   return { ...state, clients: [...state.clients, ...action.payload] };
    case 'UPDATE_CLIENT':
      return {
        ...state,
        clients: state.clients.map(c =>
          c.id === action.payload.id ? { ...c, ...action.payload } : c
        ),
      };
    case 'DELETE_CLIENT':
      return { ...state, clients: state.clients.filter(c => c.id !== action.payload) };
    case 'MOVE_CLIENT':
      return {
        ...state,
        clients: state.clients.map(c =>
          c.id === action.payload.clientId
            ? { ...c, boardId: action.payload.boardId }
            : c
        ),
      };

    // ── Client Boards (Kanban de Clientes) ──
    case 'ADD_CLIENT_BOARD':    return { ...state, clientBoards: [...state.clientBoards, action.payload] };
    case 'UPDATE_CLIENT_BOARD':
      return {
        ...state,
        clientBoards: state.clientBoards.map(b =>
          b.id === action.payload.id ? { ...b, ...action.payload } : b
        ),
      };
    case 'DELETE_CLIENT_BOARD':
      return { 
        ...state, 
        clientBoards: state.clientBoards.filter(b => b.id !== action.payload),
        clients: state.clients.filter(c => c.clientBoardId !== action.payload) 
      };

    // ── Follow-ups ──
    case 'SET_FOLLOWUPS':   return { ...state, followUps: action.payload };
    case 'ADD_FOLLOWUP':    return { ...state, followUps: [...state.followUps, action.payload] };
    case 'UPDATE_FOLLOWUP':
      return {
        ...state,
        followUps: state.followUps.map(f =>
          f.id === action.payload.id ? { ...f, ...action.payload } : f
        ),
      };
    case 'DELETE_FOLLOWUP':
      return { ...state, followUps: state.followUps.filter(f => f.id !== action.payload) };

    // ── Client Logs ──
    case 'SET_CLIENT_LOGS':
      return {
        ...state,
        clientLogs: { ...state.clientLogs, [action.payload.clientId]: action.payload.logs }
      };
    case 'ADD_CLIENT_LOG':
      const currentLogs = state.clientLogs[action.payload.clientId] || [];
      return {
        ...state,
        clientLogs: {
          ...state.clientLogs,
          [action.payload.clientId]: [action.payload, ...currentLogs]
        }
      };
    case 'DELETE_CLIENT_LOG':
      const logs = state.clientLogs[action.payload.clientId] || [];
      return {
        ...state,
        clientLogs: {
          ...state.clientLogs,
          [action.payload.clientId]: logs.filter(l => l.id !== action.payload.logId)
        }
      };

    default: return state;
  }
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const loadedRef = useRef(false);

  // Carrega todos os dados do Supabase no mount (uma única vez)
  const loadAll = useCallback(async () => {
    if (loadedRef.current) return; // Evitar recarga duplicada (HMR)
    loadedRef.current = true;
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      let userSettings = null;
      if (session?.user?.id) {
        userSettings = await settingsService.fetchSettings(session.user.id);
      }

      // 1. Seed etiquetas padrão se banco vazio
      const seededLabels = await labelsService.seedDefaults(DEFAULT_LABELS);

      // 2. Busca etiquetas
      const labels = await labelsService.fetchAll();

      // Seed organs is disabled as data is managed exclusively via DB agora

      // 4. Busca órgãos e quadros de órgãos
      const [organs, organBoards] = await Promise.all([
        organsService.fetchAll(),
        organBoardsService.fetchAll()
      ]);

      // 5. Busca clientes e follow-ups (clientes globais ignorados por padrão para não pesar a memória)
      const [clientBoards, followUps] = await Promise.all([
        clientBoardsService.fetchAll(),
        followUpsService.fetchAll(),
      ]);

      dispatch({
        type: 'INIT_DATA',
        payload: { 
          organs, 
          organBoards,
          labels: labels.length ? labels : (seededLabels || DEFAULT_LABELS), 
          clientBoards,
          clients: [], // Removido fetch global
          followUps,
          sidebarOpen: userSettings?.sidebar_open ?? true,
          selectedCity: userSettings?.selected_city ?? null,
        },
      });
      
      // Update the main reducer state with settings
      if (userSettings) {
         if (userSettings.sidebar_open !== undefined) {
             dispatch({ type: 'TOGGLE_SIDEBAR' }); // Temporary simple mapping, we will rewrite toggleSidebar below
         }
      }

    } catch (err) {
      console.error('[AppContext] Erro ao carregar dados:', err);
      dispatch({ type: 'SET_ERROR', payload: err.message });
      dispatch({ type: 'SET_LOADING', payload: false });
      toast.error('Erro ao conectar com o banco de dados. Verifique sua conexão.');
      loadedRef.current = false; // Permitir retry em caso de erro
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ── Ações com persistência no Supabase ─────────────────────────────────────

  const actions = {
    // Organs
    async addOrgan(organ) {
      try {
        const created = await organsService.create(organ);
        dispatch({ type: 'ADD_ORGAN', payload: created });
        return created;
      } catch (err) {
        toast.error('Erro ao adicionar órgão'); throw err;
      }
    },
    async updateOrgan(id, changes) {
      dispatch({ type: 'UPDATE_ORGAN', payload: { id, ...changes } }); // optimistic
      try {
        const updated = await organsService.update(id, changes);
        dispatch({ type: 'UPDATE_ORGAN', payload: updated });
      } catch (err) {
        toast.error('Erro ao atualizar órgão'); await loadAll();
      }
    },
    async deleteOrgan(id) {
      dispatch({ type: 'DELETE_ORGAN', payload: id }); // optimistic
      try {
        await organsService.delete(id);
      } catch (err) {
        toast.error('Erro ao deletar órgão'); await loadAll();
      }
    },
    moveOrgan(organId, organBoardId, position) {
      // 1. Update imediato na UI (sem await = zero piscar)
      dispatch({ type: 'MOVE_ORGAN', payload: { organId, organBoardId, position } });
      // 2. Persiste em background — sem re-despachar nada ao concluir
      organsService.move(organId, organBoardId, position).catch(() => {
        toast.error('Erro ao salvar movimentação — revertendo...');
        loadAll(); // só recarrega se der erro
      });
    },
    async reorderOrgans(newOrgans, updates) {
      dispatch({ type: 'REORDER_ORGANS', payload: newOrgans }); // optimistic
      // Persistir no DB é best-effort (coluna position pode não existir)
      if (updates && updates.length > 0) {
        organsService.reorder(updates).catch(() => {});
      }
    },
    async addLabelToOrgan(organId, labelId) {
      dispatch({ type: 'ADD_LABEL_TO_ORGAN', payload: { organId, labelId } }); // optimistic
      try {
        await organsService.addLabel(organId, labelId);
      } catch (err) {
        toast.error('Erro ao adicionar etiqueta'); await loadAll();
      }
    },
    async removeLabelFromOrgan(organId, labelId) {
      dispatch({ type: 'REMOVE_LABEL_FROM_ORGAN', payload: { organId, labelId } }); // optimistic
      try {
        await organsService.removeLabel(organId, labelId);
      } catch (err) {
        toast.error('Erro ao remover etiqueta'); await loadAll();
      }
    },

    // Organ Boards
    async addOrganBoard(board) {
      try {
        const created = await organBoardsService.create(board);
        dispatch({ type: 'ADD_ORGAN_BOARD', payload: created });
        return created;
      } catch (err) {
        toast.error('Erro ao criar quadro'); throw err;
      }
    },
    updateOrganBoard(id, changes) {
      dispatch({ type: 'UPDATE_ORGAN_BOARD', payload: { id, ...changes } }); // optimistic, imediato
      // Persiste em background — sem segundo dispatch ao concluir
      organBoardsService.update(id, changes).catch(() => {
        toast.error('Erro ao atualizar quadro');
        loadAll();
      });
    },
    async deleteOrganBoard(id) {
      dispatch({ type: 'DELETE_ORGAN_BOARD', payload: id }); // optimistic
      try {
        await organBoardsService.delete(id);
      } catch (err) {
        toast.error('Erro ao deletar quadro'); await loadAll();
      }
    },

    // Labels
    async addLabel(label) {
      try {
        const created = await labelsService.create(label);
        dispatch({ type: 'ADD_LABEL', payload: created });
        return created;
      } catch (err) {
        toast.error('Erro ao criar etiqueta'); throw err;
      }
    },
    async updateLabel(id, changes) {
      dispatch({ type: 'UPDATE_LABEL', payload: { id, ...changes } }); // optimistic
      try {
        const updated = await labelsService.update(id, changes);
        dispatch({ type: 'UPDATE_LABEL', payload: updated });
      } catch (err) {
        toast.error('Erro ao atualizar etiqueta'); await loadAll();
      }
    },
    async deleteLabel(id) {
      dispatch({ type: 'DELETE_LABEL', payload: id }); // optimistic
      try {
        await labelsService.delete(id);
      } catch (err) {
        toast.error('Erro ao deletar etiqueta'); await loadAll();
      }
    },

    // Clients
    async addClients(clients) {
      try {
        const created = await clientsService.createMany(clients);
        dispatch({ type: 'ADD_CLIENTS', payload: created });
        return created;
      } catch (err) {
        toast.error('Erro ao importar clientes'); throw err;
      }
    },
    async addClient(client) {
      try {
        const created = await clientsService.create(client);
        dispatch({ type: 'ADD_CLIENTS', payload: [created] });
        return created;
      } catch (err) {
        toast.error('Erro ao adicionar cliente'); throw err;
      }
    },
    async updateClient(id, changes) {
      dispatch({ type: 'UPDATE_CLIENT', payload: { id, ...changes } }); // optimistic
      try {
        const updated = await clientsService.update(id, changes);
        dispatch({ type: 'UPDATE_CLIENT', payload: updated });
      } catch (err) {
        toast.error('Erro ao atualizar cliente'); await loadAll();
      }
    },
    async deleteClient(id) {
      dispatch({ type: 'DELETE_CLIENT', payload: id }); // optimistic
      try {
        await followUpsService.deleteByClient(id);
        await clientsService.delete(id);
        // Remove follow-ups do estado local
        dispatch({
          type: 'SET_FOLLOWUPS',
          payload: state.followUps.filter(f => f.clientId !== id),
        });
      } catch (err) {
        toast.error('Erro ao deletar cliente'); await loadAll();
      }
    },
    async moveClient(clientId, boardId) {
      dispatch({ type: 'MOVE_CLIENT', payload: { clientId, boardId } }); // optimistic
      try {
        await clientsService.move(clientId, boardId);
      } catch (err) {
        toast.error('Erro ao mover cliente'); await loadAll();
      }
    },
    async toggleOrganFavorite(id, isFavorite) {
      dispatch({ type: 'UPDATE_ORGAN', payload: { id, isFavorite } });
      try {
        await organsService.update(id, { isFavorite });
      } catch (err) {
        toast.error('Erro ao favoritar órgão'); await loadAll();
      }
    },
    async toggleClientFavorite(id, isFavorite) {
      dispatch({ type: 'UPDATE_CLIENT', payload: { id, isFavorite } });
      try {
        await clientsService.update(id, { isFavorite });
      } catch (err) {
        toast.error('Erro ao favoritar cliente'); await loadAll();
      }
    },

    // Client Logs
    async fetchClientLogs(clientId) {
      try {
        const logs = await clientLogsService.fetchByClient(clientId);
        dispatch({ type: 'SET_CLIENT_LOGS', payload: { clientId, logs } });
      } catch (err) {
        console.error('Erro ao buscar histórico:', err);
      }
    },
    async addClientLog(logData) {
      try {
        const created = await clientLogsService.create(logData);
        dispatch({ type: 'ADD_CLIENT_LOG', payload: created });
        return created;
      } catch (err) {
        toast.error('Erro ao adicionar nota ao histórico'); throw err;
      }
    },
    async deleteClientLog(clientId, logId) {
      dispatch({ type: 'DELETE_CLIENT_LOG', payload: { clientId, logId } });
      try {
        await clientLogsService.delete(logId);
      } catch (err) {
        toast.error('Erro ao deletar nota');
        // revert by re-fetching
        actions.fetchClientLogs(clientId);
      }
    },

    // Follow-ups
    async addFollowUp(followUp) {
      try {
        const created = await followUpsService.create(followUp);
        dispatch({ type: 'ADD_FOLLOWUP', payload: created });
        return created;
      } catch (err) {
        toast.error('Erro ao criar follow-up'); throw err;
      }
    },
    async updateFollowUp(id, changes) {
      dispatch({ type: 'UPDATE_FOLLOWUP', payload: { id, ...changes } }); // optimistic
      try {
        const updated = await followUpsService.update(id, changes);
        dispatch({ type: 'UPDATE_FOLLOWUP', payload: updated });
      } catch (err) {
        toast.error('Erro ao atualizar follow-up'); await loadAll();
      }
    },
    async deleteFollowUp(id) {
      dispatch({ type: 'DELETE_FOLLOWUP', payload: id }); // optimistic
      try {
        await followUpsService.delete(id);
      } catch (err) {
        toast.error('Erro ao deletar follow-up'); await loadAll();
      }
    },

    // UI (Persistentes com Supabase)
    async toggleSidebar() {
      dispatch({ type: 'TOGGLE_SIDEBAR' });
      const newState = !state.sidebarOpen;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          await settingsService.updateSettings(session.user.id, { sidebar_open: newState });
        }
      } catch (err) {
        console.error('Erro ao salvar preferência de sidebar:', err);
      }
    },
    closeSidebar:  () => {
      dispatch({ type: 'CLOSE_SIDEBAR' });
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user?.id) {
          settingsService.updateSettings(session.user.id, { sidebar_open: false }).catch(() => {});
        }
      });
    },
    async selectCity(city) {
      dispatch({ type: 'SELECT_CITY', payload: city });
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          await settingsService.updateSettings(session.user.id, { selected_city: city });
        }
      } catch (err) {
        console.error('Erro ao salvar cidade selecionada:', err);
      }
    },

    // Client Boards
    async addClientBoard(board) {
      try {
        const created = await clientBoardsService.create(board);
        dispatch({ type: 'ADD_CLIENT_BOARD', payload: created });
        return created;
      } catch (err) {
        toast.error('Erro ao adicionar quadro'); throw err;
      }
    },
    async updateClientBoard(id, changes) {
      dispatch({ type: 'UPDATE_CLIENT_BOARD', payload: { id, ...changes } });
      try {
        await clientBoardsService.update(id, changes);
      } catch (err) {
        toast.error('Erro ao atualizar quadro'); await loadAll();
      }
    },
    async deleteClientBoard(id) {
      if (!confirm('Tem certeza? Todos os clientes deste quadro serão excluídos.')) return;
      dispatch({ type: 'DELETE_CLIENT_BOARD', payload: id });
      try {
        await clientBoardsService.delete(id);
      } catch (err) {
        toast.error('Erro ao deletar quadro'); await loadAll();
      }
    },

    // Reload manual
    reload: loadAll,
  };

  return (
    <AppContext.Provider value={{ state, dispatch, actions }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp deve ser usado dentro de AppProvider');
  return context;
}
