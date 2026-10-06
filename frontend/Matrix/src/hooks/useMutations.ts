import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { plansApi, tasksApi, trackingApi } from '@/services/api';
import {
  CreatePlanPayload,
  CreateTaskPayload,
  TodayResponse,
  UpdatePlanPayload,
  UpdateTaskPayload,
} from '@/types/api';

export const useToggleTaskMutation = (dateStr?: string) => {
  const queryClient = useQueryClient();
  const todayKey = ['today', dateStr || 'today'];

  return useMutation({
    mutationFn: async ({ taskId, date }: { taskId: number; date: string }) => {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {
        // Haptics not supported on web/simulator
      }
      return trackingApi.toggle(taskId, date);
    },
    onMutate: async ({ taskId }) => {
      await queryClient.cancelQueries({ queryKey: todayKey });
      const previousToday = queryClient.getQueryData<TodayResponse>(todayKey);

      if (previousToday) {
        const updatedPlans = previousToday.plans.map((plan) => {
          const taskIndex = plan.tasks.findIndex((t) => t.id === taskId);
          if (taskIndex === -1) return plan;

          const updatedTasks = plan.tasks.map((task) =>
            task.id === taskId ? { ...task, completed: !task.completed } : task
          );

          const totalWeight = updatedTasks.reduce((sum, t) => sum + t.weight, 0);
          const doneWeight = updatedTasks
            .filter((t) => t.completed)
            .reduce((sum, t) => sum + t.weight, 0);
          const progressPercent = totalWeight > 0 ? Math.round((doneWeight / totalWeight) * 100) : 0;
          const isComplete = progressPercent >= plan.completion_threshold;

          return {
            ...plan,
            tasks: updatedTasks,
            progress_percent: progressPercent,
            is_complete: isComplete,
          };
        });

        const totalTasks = updatedPlans.reduce((sum, p) => sum + p.tasks.length, 0);
        const completedTasks = updatedPlans.reduce(
          (sum, p) => sum + p.tasks.filter((t) => t.completed).length,
          0
        );
        const overallPercent =
          totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        queryClient.setQueryData<TodayResponse>(todayKey, {
          ...previousToday,
          plans: updatedPlans,
          total_tasks: totalTasks,
          completed_tasks: completedTasks,
          overall_percentage: overallPercent,
        });
      }

      return { previousToday };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousToday) {
        queryClient.setQueryData(todayKey, context.previousToday);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['today'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      queryClient.invalidateQueries({ queryKey: ['plans'] });
    },
  });
};

export const useCreatePlanMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePlanPayload) => plansApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      queryClient.invalidateQueries({ queryKey: ['today'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
    },
  });
};

export const useUpdatePlanMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdatePlanPayload }) =>
      plansApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      queryClient.invalidateQueries({ queryKey: ['plan', id] });
      queryClient.invalidateQueries({ queryKey: ['today'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
    },
  });
};

export const useDeletePlanMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => plansApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      queryClient.invalidateQueries({ queryKey: ['today'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
    },
  });
};

export const useCreateTaskMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTaskPayload) => tasksApi.create(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', variables.plan] });
      queryClient.invalidateQueries({ queryKey: ['today'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
    },
  });
};

export const useUpdateTaskMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateTaskPayload; planId: number }) =>
      tasksApi.update(id, data),
    onSuccess: (_, { planId }) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', planId] });
      queryClient.invalidateQueries({ queryKey: ['today'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
    },
  });
};

export const useDeleteTaskMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, planId }: { id: number; planId: number }) => tasksApi.delete(id),
    onSuccess: (_, { planId }) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', planId] });
      queryClient.invalidateQueries({ queryKey: ['today'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
    },
  });
};

export const useSkipDayMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { plan: number; date: string; reason?: string }) =>
      trackingApi.skips.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['today'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
    },
  });
};

export const useSaveDayNoteMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ date, mood, text }: { date: string; mood?: number | null; text?: string }) =>
      trackingApi.notes.save(date, { mood, text }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['note', variables.date] });
      queryClient.invalidateQueries({ queryKey: ['today'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
    },
  });
};

export const useDeleteDayNoteMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (date: string) => trackingApi.notes.delete(date),
    onSuccess: (_, date) => {
      queryClient.invalidateQueries({ queryKey: ['note', date] });
      queryClient.invalidateQueries({ queryKey: ['today'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
    },
  });
};
