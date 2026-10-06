import { useQuery } from '@tanstack/react-query';
import { plansApi, tasksApi, trackingApi } from '@/services/api';

export const usePlansQuery = (archived = false) => {
  return useQuery({
    queryKey: ['plans', { archived }],
    queryFn: () => plansApi.list(archived),
  });
};

export const usePlanQuery = (id: number) => {
  return useQuery({
    queryKey: ['plan', id],
    queryFn: () => plansApi.get(id),
    enabled: !!id,
  });
};

export const useTasksQuery = (planId: number) => {
  return useQuery({
    queryKey: ['tasks', planId],
    queryFn: () => tasksApi.list(planId),
    enabled: !!planId,
  });
};

export const useTodayQuery = (dateStr?: string) => {
  return useQuery({
    queryKey: ['today', dateStr || 'today'],
    queryFn: () => trackingApi.today(dateStr),
    staleTime: 1000 * 30, // 30 seconds
  });
};

export const useCalendarQuery = (params: { start: string; end: string; plan?: number }) => {
  return useQuery({
    queryKey: ['calendar', params],
    queryFn: () => trackingApi.calendar(params),
    staleTime: 1000 * 60,
  });
};

export const useTemplatesQuery = () => {
  return useQuery({
    queryKey: ['templates'],
    queryFn: () => trackingApi.templates.list(),
  });
};

export const useDayNoteQuery = (dateStr: string) => {
  return useQuery({
    queryKey: ['note', dateStr],
    queryFn: () => trackingApi.notes.get(dateStr),
    enabled: !!dateStr,
  });
};
