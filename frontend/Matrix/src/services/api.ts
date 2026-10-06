import axios from 'axios';
import { Platform } from 'react-native';
import {
  CalendarResponse,
  CreatePlanPayload,
  CreateTaskPayload,
  DayNote,
  Plan,
  PlanTemplate,
  SkipDay,
  Task,
  TodayResponse,
  ToggleResponse,
  UpdatePlanPayload,
  UpdateTaskPayload,
} from '@/types/api';

// Fallback host resolution for Web, Android emulator, and LAN
const getDefaultBaseUrl = () => {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
    const host = window.location.hostname || '127.0.0.1';
    return `http://${host}:8000/api`;
  }
  if (Platform.OS === 'android') {
    return process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:8000/api';
  }
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  return 'http://127.0.0.1:8000/api';
};

export const API_BASE_URL = getDefaultBaseUrl();

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

export const plansApi = {
  list: async (archived = false): Promise<Plan[]> => {
    const res = await api.get<Plan[]>('/plans/', { params: { archived } });
    return res.data;
  },

  get: async (id: number): Promise<Plan> => {
    const res = await api.get<Plan>(`/plans/${id}/`);
    return res.data;
  },

  create: async (data: CreatePlanPayload): Promise<Plan> => {
    const res = await api.post<Plan>('/plans/', data);
    return res.data;
  },

  update: async (id: number, data: UpdatePlanPayload): Promise<Plan> => {
    const res = await api.patch<Plan>(`/plans/${id}/`, data);
    return res.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/plans/${id}/`);
  },

  reorder: async (ids: number[]): Promise<void> => {
    await api.post('/plans/reorder/', { ids });
  },

  duplicate: async (id: number): Promise<Plan> => {
    const res = await api.post<Plan>(`/plans/${id}/duplicate/`);
    return res.data;
  },
};

export const tasksApi = {
  list: async (planId: number): Promise<Task[]> => {
    const res = await api.get<Task[]>('/tasks/', { params: { plan: planId } });
    return res.data;
  },

  create: async (data: CreateTaskPayload): Promise<Task> => {
    const res = await api.post<Task>('/tasks/', data);
    return res.data;
  },

  update: async (id: number, data: UpdateTaskPayload): Promise<Task> => {
    const res = await api.patch<Task>(`/tasks/${id}/`, data);
    return res.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/tasks/${id}/`);
  },

  reorder: async (planId: number, ids: number[]): Promise<void> => {
    await api.post('/tasks/reorder/', { plan: planId, ids });
  },
};

export const trackingApi = {
  toggle: async (taskId: number, dateStr: string): Promise<ToggleResponse> => {
    const res = await api.post<ToggleResponse>('/toggle/', {
      task: taskId,
      date: dateStr,
    });
    return res.data;
  },

  today: async (dateStr?: string): Promise<TodayResponse> => {
    const res = await api.get<TodayResponse>('/today/', {
      params: dateStr ? { date: dateStr } : undefined,
    });
    return res.data;
  },

  calendar: async (params: { start: string; end: string; plan?: number }): Promise<CalendarResponse> => {
    const res = await api.get<CalendarResponse>('/calendar/', { params });
    return res.data;
  },

  skips: {
    list: async (planId?: number, dateStr?: string): Promise<SkipDay[]> => {
      const res = await api.get<SkipDay[]>('/skips/', {
        params: { plan: planId, date: dateStr },
      });
      return res.data;
    },
    create: async (data: { plan: number; date: string; reason?: string }): Promise<SkipDay> => {
      const res = await api.post<SkipDay>('/skips/', data);
      return res.data;
    },
    delete: async (id: number): Promise<void> => {
      await api.delete(`/skips/${id}/`);
    },
  },

  notes: {
    get: async (dateStr: string): Promise<DayNote | null> => {
      try {
        const res = await api.get<DayNote>(`/notes/${dateStr}/`);
        return res.data;
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          return null;
        }
        throw err;
      }
    },
    save: async (dateStr: string, data: { mood?: number | null; text?: string }): Promise<DayNote> => {
      const res = await api.put<DayNote>(`/notes/${dateStr}/`, data);
      return res.data;
    },
    delete: async (dateStr: string): Promise<void> => {
      await api.delete(`/notes/${dateStr}/`);
    },
  },

  templates: {
    list: async (): Promise<PlanTemplate[]> => {
      const res = await api.get<PlanTemplate[]>('/templates/');
      return res.data;
    },
    apply: async (key: string): Promise<Plan> => {
      const res = await api.post<Plan>(`/templates/${key}/apply/`);
      return res.data;
    },
  },
};
