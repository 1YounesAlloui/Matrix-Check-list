import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { safeGoBack } from '@/utils/navigation';
import { confirmAction } from '@/utils/dialog';
import { usePlanQuery, useTasksQuery } from '@/hooks/useQueries';
import {
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
  useDeletePlanMutation,
} from '@/hooks/useMutations';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/Button';
import { StreakBadge } from '@/components/StreakBadge';
import { EmptyState } from '@/components/EmptyState';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { Task, TaskPriority } from '@/types/api';

export default function PlanDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const planId = parseInt(id || '0', 10);
  const { colors } = useThemeColors();

  const { data: plan, isLoading: isLoadingPlan } = usePlanQuery(planId);
  const { data: tasks, isLoading: isLoadingTasks } = useTasksQuery(planId);

  const createTaskMutation = useCreateTaskMutation();
  const updateTaskMutation = useUpdateTaskMutation();
  const deleteTaskMutation = useDeleteTaskMutation();
  const deletePlanMutation = useDeletePlanMutation();

  // Task Modal state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskNote, setTaskNote] = useState('');
  const [taskTarget, setTaskTarget] = useState('');
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('normal');
  const [taskWeight, setTaskWeight] = useState('1');

  const openCreateTask = () => {
    setEditingTask(null);
    setTaskTitle('');
    setTaskNote('');
    setTaskTarget('');
    setTaskPriority('normal');
    setTaskWeight('1');
    setIsTaskModalOpen(true);
  };

  const openEditTask = (task: Task) => {
    setEditingTask(task);
    setTaskTitle(task.title);
    setTaskNote(task.note);
    setTaskTarget(task.target);
    setTaskPriority(task.priority);
    setTaskWeight(task.weight.toString());
    setIsTaskModalOpen(true);
  };

  const handleSaveTask = async () => {
    if (!taskTitle.trim()) {
      Alert.alert('Required', 'Please enter a task title.');
      return;
    }

    const weightNum = Math.max(1, parseInt(taskWeight, 10) || 1);

    try {
      if (editingTask) {
        await updateTaskMutation.mutateAsync({
          id: editingTask.id,
          planId,
          data: {
            title: taskTitle.trim(),
            note: taskNote.trim(),
            target: taskTarget.trim(),
            priority: taskPriority,
            weight: weightNum,
          },
        });
      } else {
        await createTaskMutation.mutateAsync({
          plan: planId,
          title: taskTitle.trim(),
          note: taskNote.trim(),
          target: taskTarget.trim(),
          priority: taskPriority,
          weight: weightNum,
        });
      }
      setIsTaskModalOpen(false);
    } catch {
      Alert.alert('Error', 'Failed to save task. Please try again.');
    }
  };

  const handleDeleteTask = (task: Task) => {
    confirmAction(
      `Delete "${task.title}"?`,
      'Are you sure you want to delete this task?',
      () => deleteTaskMutation.mutate({ id: task.id, planId })
    );
  };

  const handleDeletePlan = () => {
    confirmAction(
      `Delete "${plan?.name}"?`,
      'This will delete the plan, all checklist items, and tracking history.',
      async () => {
        await deletePlanMutation.mutateAsync(planId);
        safeGoBack();
      },
      'Delete Permanently'
    );
  };

  if (isLoadingPlan) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!plan) return null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => safeGoBack()} style={styles.backBtn}>
          <Icon name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[Typography.title1, { color: colors.text }]} numberOfLines={1}>
          {plan.name}
        </Text>
        <TouchableOpacity onPress={handleDeletePlan} style={styles.backBtn}>
          <Icon name="trash-can-outline" size={22} color={colors.danger} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Plan Overview Card */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.planHeader}>
            <View style={[styles.planIconCircle, { backgroundColor: plan.color + '20' }]}>
              <Icon name={plan.icon} size={28} color={plan.color} />
            </View>
            <View style={{ flex: 1, marginLeft: Spacing.md }}>
              <Text style={[Typography.title2, { color: colors.text }]}>{plan.name}</Text>
              <Text style={[Typography.caption, { color: colors.textMuted }]}>
                Schedule: {plan.schedule_type} • Threshold: {plan.completion_threshold}%
              </Text>
            </View>
            {plan.current_streak ? <StreakBadge streak={plan.current_streak} size="md" /> : null}
          </View>

          {plan.description ? (
            <Text style={[Typography.body, { color: colors.textDim, marginTop: Spacing.md }]}>
              {plan.description}
            </Text>
          ) : null}
        </View>

        {/* Tasks Section Header */}
        <View style={styles.tasksHeader}>
          <Text style={[Typography.title2, { color: colors.text }]}>
            Checklist Tasks ({tasks?.length || 0})
          </Text>
          <Button
            title="Add Task"
            icon="plus"
            size="sm"
            onPress={openCreateTask}
          />
        </View>

        {/* Tasks List */}
        {(!tasks || tasks.length === 0) && !isLoadingTasks ? (
          <EmptyState
            icon="format-list-checks"
            title="No tasks in this plan"
            description="Add checklist items to track when this habit is scheduled."
            actionTitle="Add First Task"
            onAction={openCreateTask}
          />
        ) : (
          tasks?.map((task) => (
            <View
              key={task.id}
              style={[
                styles.taskCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={styles.taskCardLeft}>
                <View
                  style={[
                    styles.priorityDot,
                    {
                      backgroundColor:
                        task.priority === 'high'
                          ? colors.danger
                          : task.priority === 'low'
                          ? colors.textDim
                          : colors.primary,
                    },
                  ]}
                />
                <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                  <Text style={[Typography.bodyMedium, { color: colors.text }]}>
                    {task.title}
                  </Text>
                  {task.target ? (
                    <Text style={[Typography.tiny, { color: colors.textDim }]}>
                      Target: {task.target}
                    </Text>
                  ) : null}
                  {task.note ? (
                    <Text style={[Typography.caption, { color: colors.textMuted, marginTop: 2 }]}>
                      {task.note}
                    </Text>
                  ) : null}
                </View>
              </View>

              <View style={styles.taskActions}>
                <TouchableOpacity onPress={() => openEditTask(task)} style={styles.taskActionBtn}>
                  <Icon name="pencil-outline" size={18} color={colors.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDeleteTask(task)} style={styles.taskActionBtn}>
                  <Icon name="trash-can-outline" size={18} color={colors.danger} />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Task Create / Edit Modal */}
      <Modal visible={isTaskModalOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[Typography.title2, { color: colors.text }]}>
                {editingTask ? 'Edit Task' : 'New Task'}
              </Text>
              <TouchableOpacity onPress={() => setIsTaskModalOpen(false)}>
                <Icon name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={[Typography.captionMedium, { color: colors.textMuted, marginTop: Spacing.md }]}>
              TITLE
            </Text>
            <TextInput
              value={taskTitle}
              onChangeText={setTaskTitle}
              placeholder="e.g. 50 Push-ups, Read 20 pages..."
              placeholderTextColor={colors.textDim}
              style={[
                styles.input,
                { backgroundColor: colors.cardElevated, borderColor: colors.border, color: colors.text },
              ]}
            />

            <Text style={[Typography.captionMedium, { color: colors.textMuted, marginTop: Spacing.md }]}>
              TARGET (OPTIONAL)
            </Text>
            <TextInput
              value={taskTarget}
              onChangeText={setTaskTarget}
              placeholder="e.g. 3 sets, 30 min, 10 pages"
              placeholderTextColor={colors.textDim}
              style={[
                styles.input,
                { backgroundColor: colors.cardElevated, borderColor: colors.border, color: colors.text },
              ]}
            />

            <Text style={[Typography.captionMedium, { color: colors.textMuted, marginTop: Spacing.md }]}>
              NOTE (OPTIONAL)
            </Text>
            <TextInput
              value={taskNote}
              onChangeText={setTaskNote}
              placeholder="Tips, links, or instructions..."
              placeholderTextColor={colors.textDim}
              style={[
                styles.input,
                { backgroundColor: colors.cardElevated, borderColor: colors.border, color: colors.text },
              ]}
            />

            {/* Priority Selector */}
            <Text style={[Typography.captionMedium, { color: colors.textMuted, marginTop: Spacing.md }]}>
              PRIORITY
            </Text>
            <View style={styles.priorityRow}>
              {(['low', 'normal', 'high'] as TaskPriority[]).map((p) => {
                const isSelected = taskPriority === p;
                return (
                  <TouchableOpacity
                    key={p}
                    onPress={() => setTaskPriority(p)}
                    style={[
                      styles.priorityBtn,
                      {
                        backgroundColor: isSelected ? colors.primary + '25' : colors.cardElevated,
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        Typography.captionMedium,
                        {
                          color: isSelected ? colors.primary : colors.textMuted,
                          textTransform: 'capitalize',
                        },
                      ]}
                    >
                      {p}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Button
              title={editingTask ? 'Save Changes' : 'Create Task'}
              onPress={handleSaveTask}
              style={{ marginTop: Spacing.xl }}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  backBtn: {
    padding: Spacing.xs,
  },
  scroll: {
    padding: Spacing.lg,
  },
  card: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    marginBottom: Spacing.xl,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  planIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tasksHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  taskCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  taskCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  taskActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskActionBtn: {
    padding: Spacing.xs,
    marginLeft: Spacing.sm,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderTopWidth: 1,
    padding: Spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  input: {
    height: 48,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    fontSize: 15,
    marginTop: Spacing.xs,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  priorityBtn: {
    flex: 1,
    height: 40,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
