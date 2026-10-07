import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import { format, parseISO } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { useTodayQuery, useDayNoteQuery, usePlansQuery } from '@/hooks/useQueries';
import {
  useToggleTaskMutation,
  useSaveDayNoteMutation,
  useDeleteDayNoteMutation,
  useSkipDayMutation,
} from '@/hooks/useMutations';
import { plansApi, tasksApi } from '@/services/api';
import { scheduleTaskReminderNotification } from '@/services/notifications';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Icon } from './Icon';
import { Checkbox } from './Checkbox';
import { Button } from './Button';
import { ProgressBar } from './ProgressBar';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { confirmAction } from '@/utils/dialog';

interface DayBottomSheetProps {
  dateStr: string | null;
  onClose: () => void;
}

const MOODS = [
  { value: 1, emoji: '😫', label: 'Rough' },
  { value: 2, emoji: '😕', label: 'Down' },
  { value: 3, emoji: '😐', label: 'Okay' },
  { value: 4, emoji: '🙂', label: 'Good' },
  { value: 5, emoji: '🤩', label: 'Super' },
];

const REMINDER_PRESETS = [
  { label: '8:00 AM', hour: 8, minute: 0 },
  { label: '12:00 PM', hour: 12, minute: 0 },
  { label: '2:00 PM', hour: 14, minute: 0 },
  { label: '6:00 PM', hour: 18, minute: 0 },
  { label: '8:00 PM', hour: 20, minute: 0 },
];

export const DayBottomSheet: React.FC<DayBottomSheetProps> = ({ dateStr, onClose }) => {
  const { colors, isDark } = useThemeColors();
  const queryClient = useQueryClient();

  const { data: dayData, isLoading: isLoadingDay, refetch: refetchDay } = useTodayQuery(dateStr || undefined);
  const { data: noteData, isLoading: isLoadingNote } = useDayNoteQuery(dateStr || '');
  const { data: allPlans } = usePlansQuery();

  const toggleTaskMutation = useToggleTaskMutation(dateStr || undefined);
  const saveNoteMutation = useSaveDayNoteMutation();
  const deleteNoteMutation = useDeleteDayNoteMutation();
  const skipDayMutation = useSkipDayMutation();

  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [noteText, setNoteText] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [isDeletingNote, setIsDeletingNote] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);

  // Add Task on Day state
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskTarget, setNewTaskTarget] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [enableReminder, setEnableReminder] = useState(true);
  const [reminderTime, setReminderTime] = useState<{ hour: number; minute: number }>(REMINDER_PRESETS[0]);
  const [isSavingTask, setIsSavingTask] = useState(false);

  useEffect(() => {
    if (noteData) {
      setSelectedMood(noteData.mood);
      setNoteText(noteData.text || '');
    } else {
      setSelectedMood(null);
      setNoteText('');
    }
  }, [noteData, dateStr]);

  useEffect(() => {
    // Reset add task form when date changes
    setIsAddingTask(false);
    setNewTaskTitle('');
    setNewTaskTarget('');
    if (dayData?.plans && dayData.plans.length > 0) {
      setSelectedPlanId(dayData.plans[0].id);
    } else {
      setSelectedPlanId(null);
    }
  }, [dateStr, dayData?.plans]);

  if (!dateStr) return null;

  const parsedDate = parseISO(dateStr);
  const formattedDate = format(parsedDate, 'EEEE, MMMM d, yyyy');
  const isToday = format(new Date(), 'yyyy-MM-dd') === dateStr;
  const isFuture = dateStr > format(new Date(), 'yyyy-MM-dd');

  const totalTasks = dayData?.total_tasks ?? 0;
  const completedTasks = dayData?.completed_tasks ?? 0;
  const overallPercentage = dayData?.overall_percentage ?? 0;

  const handleSaveNote = async () => {
    setIsSavingNote(true);
    setNoteSaved(false);
    try {
      await saveNoteMutation.mutateAsync({
        date: dateStr,
        mood: selectedMood,
        text: noteText,
      });
      setNoteSaved(true);
      setTimeout(() => setNoteSaved(false), 2500);
    } catch {
      Alert.alert('Error', 'Failed to save note. Please try again.');
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleDeleteNote = () => {
    confirmAction(
      'Delete Note?',
      'Are you sure you want to remove the note and mood for this day?',
      async () => {
        setIsDeletingNote(true);
        try {
          await deleteNoteMutation.mutateAsync(dateStr);
          setSelectedMood(null);
          setNoteText('');
        } catch {
          Alert.alert('Error', 'Failed to delete note.');
        } finally {
          setIsDeletingNote(false);
        }
      },
      'Delete'
    );
  };

  const handleSkipPlan = (planId: number, planName: string) => {
    confirmAction(
      `Skip ${planName}?`,
      'Mark this day as a rest or skip day?',
      async () => {
        try {
          await skipDayMutation.mutateAsync({
            plan: planId,
            date: dateStr,
            reason: 'Rest day',
          });
        } catch {
          Alert.alert('Error', 'Failed to skip day.');
        }
      },
      'Skip Day'
    );
  };

  const handleCreateTaskForDay = async () => {
    const title = newTaskTitle.trim();
    if (!title) {
      Alert.alert('Task Title Required', 'Please enter a name for your task.');
      return;
    }

    setIsSavingTask(true);
    try {
      let targetPlanId = selectedPlanId;

      // If no plan exists or user selected new plan, create a one-time plan for this date
      if (!targetPlanId) {
        const newPlan = await plansApi.create({
          name: `Tasks (${format(parsedDate, 'MMM d')})`,
          schedule_type: 'one_time',
          schedule_config: { date: dateStr },
          start_date: dateStr,
          color: colors.primary,
          icon: 'checkbox-marked-circle-outline',
          completion_threshold: 100,
        });
        targetPlanId = newPlan.id;
      }

      // Create the task in the target plan
      await tasksApi.create({
        plan: targetPlanId,
        title,
        target: newTaskTarget.trim() || undefined,
        priority: 'normal',
      });

      // Schedule notification reminder if enabled
      let reminderScheduled = false;
      if (enableReminder) {
        reminderScheduled = await scheduleTaskReminderNotification({
          title,
          dateStr,
          hour: reminderTime.hour,
          minute: reminderTime.minute,
        });
      }

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['today'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      await refetchDay();

      // Reset form
      setNewTaskTitle('');
      setNewTaskTarget('');
      setIsAddingTask(false);

      if (reminderScheduled) {
        Alert.alert(
          'Task Added! 🔔',
          `"${title}" scheduled for ${format(parsedDate, 'MMM d')}.\nYou will be notified at ${reminderTime.hour}:${reminderTime.minute.toString().padStart(2, '0')}.`
        );
      } else {
        Alert.alert('Task Added!', `"${title}" has been added to ${format(parsedDate, 'MMM d')}.`);
      }
    } catch (err) {
      console.error('Error creating task on day:', err);
      Alert.alert('Error', 'Could not create task. Please try again.');
    } finally {
      setIsSavingTask(false);
    }
  };

  return (
    <Modal visible={!!dateStr} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.dismissOverlay} activeOpacity={1} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={[Typography.title1, { color: colors.text }]}>
                  {isToday ? 'Today' : format(parsedDate, 'EEEE, MMM d')}
                </Text>
                {isToday && (
                  <View style={[styles.todayBadge, { backgroundColor: colors.primary + '20' }]}>
                    <Text style={[Typography.tiny, { color: colors.primary }]}>TODAY</Text>
                  </View>
                )}
              </View>
              <Text style={[Typography.caption, { color: colors.textMuted, marginTop: 2 }]}>
                {formattedDate} {isFuture ? '• Upcoming' : ''}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.cardElevated }]}>
              <Icon name="close" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {isLoadingDay ? (
              <ActivityIndicator color={colors.primary} size="large" style={{ marginVertical: Spacing.xl }} />
            ) : (
              <>
                {/* Day Completion Summary Progress */}
                <View style={[styles.summaryCard, { backgroundColor: colors.cardElevated, borderColor: colors.border }]}>
                  <View style={styles.summaryTopRow}>
                    <View>
                      <Text style={[Typography.headline, { color: colors.text }]}>
                        {overallPercentage}% Completed
                      </Text>
                      <Text style={[Typography.caption, { color: colors.textMuted }]}>
                        {completedTasks} of {totalTasks} tasks finished
                      </Text>
                    </View>
                    {overallPercentage === 100 && totalTasks > 0 && (
                      <View style={[styles.perfectPill, { backgroundColor: colors.perfect + '20' }]}>
                        <Icon name="star" size={14} color={colors.perfect} />
                        <Text style={[Typography.tiny, { color: colors.perfect, marginLeft: 4 }]}>PERFECT</Text>
                      </View>
                    )}
                  </View>
                  <ProgressBar progress={overallPercentage} height={8} style={{ marginTop: Spacing.sm }} />
                </View>

                {/* Add Task for This Day Button & Form */}
                {!isAddingTask ? (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setIsAddingTask(true)}
                    style={[styles.openAddTaskBtn, { backgroundColor: colors.primary }]}
                  >
                    <Icon name="plus" size={18} color="#FFFFFF" />
                    <Text style={[Typography.headline, { color: '#FFFFFF', marginLeft: 8 }]}>
                      Add Task for This Day
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View style={[styles.addTaskCard, { backgroundColor: colors.cardElevated, borderColor: colors.primary }]}>
                    <View style={styles.addTaskHeader}>
                      <Text style={[Typography.headline, { color: colors.text }]}>New Task for {format(parsedDate, 'MMM d')}</Text>
                      <TouchableOpacity onPress={() => setIsAddingTask(false)}>
                        <Icon name="close" size={18} color={colors.textMuted} />
                      </TouchableOpacity>
                    </View>

                    <TextInput
                      placeholder="Task title (e.g. Doctor appointment, Gym workout)"
                      placeholderTextColor={colors.textDim}
                      value={newTaskTitle}
                      onChangeText={setNewTaskTitle}
                      style={[styles.taskInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                      autoFocus
                    />

                    <TextInput
                      placeholder="Target / Note (optional e.g. 30 min, 3 sets)"
                      placeholderTextColor={colors.textDim}
                      value={newTaskTarget}
                      onChangeText={setNewTaskTarget}
                      style={[styles.taskInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text, marginTop: Spacing.xs }]}
                    />

                    {/* Plan selection if existing plans exist */}
                    {dayData?.plans && dayData.plans.length > 0 && (
                      <View style={{ marginTop: Spacing.sm }}>
                        <Text style={[Typography.captionMedium, { color: colors.textMuted, marginBottom: 4 }]}>
                          Add to Plan:
                        </Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row' }}>
                          {dayData.plans.map((p) => {
                            const isSelected = selectedPlanId === p.id;
                            return (
                              <TouchableOpacity
                                key={p.id}
                                onPress={() => setSelectedPlanId(p.id)}
                                style={[
                                  styles.planSelectChip,
                                  {
                                    backgroundColor: isSelected ? p.color : colors.card,
                                    borderColor: isSelected ? p.color : colors.border,
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    Typography.captionMedium,
                                    { color: isSelected ? '#FFFFFF' : colors.text },
                                  ]}
                                >
                                  {p.name}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                      </View>
                    )}

                    {/* Notification Reminder Toggle */}
                    <View style={styles.reminderRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Icon name="bell-ring-outline" size={18} color={enableReminder ? colors.primary : colors.textMuted} />
                        <Text style={[Typography.captionMedium, { color: colors.text, marginLeft: 8 }]}>
                          Notify Me About This Task
                        </Text>
                      </View>
                      <Switch
                        value={enableReminder}
                        onValueChange={setEnableReminder}
                        trackColor={{ false: colors.border, true: colors.primary }}
                        thumbColor="#FFFFFF"
                      />
                    </View>

                    {/* Reminder time preset chips */}
                    {enableReminder && (
                      <View style={{ marginTop: Spacing.xs }}>
                        <Text style={[Typography.tiny, { color: colors.textDim, marginBottom: 4 }]}>
                          Notification Time:
                        </Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row' }}>
                          {REMINDER_PRESETS.map((preset) => {
                            const isSelected =
                              reminderTime.hour === preset.hour && reminderTime.minute === preset.minute;
                            return (
                              <TouchableOpacity
                                key={preset.label}
                                onPress={() => setReminderTime({ hour: preset.hour, minute: preset.minute })}
                                style={[
                                  styles.timeChip,
                                  {
                                    backgroundColor: isSelected ? colors.primary : colors.card,
                                    borderColor: isSelected ? colors.primary : colors.border,
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    Typography.tiny,
                                    { color: isSelected ? '#FFFFFF' : colors.text },
                                  ]}
                                >
                                  {preset.label}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                      </View>
                    )}

                    <View style={styles.addTaskActionButtons}>
                      <TouchableOpacity
                        onPress={() => setIsAddingTask(false)}
                        style={[styles.cancelBtn, { borderColor: colors.border }]}
                      >
                        <Text style={[Typography.captionMedium, { color: colors.textMuted }]}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={handleCreateTaskForDay}
                        disabled={isSavingTask}
                        style={[styles.saveTaskBtn, { backgroundColor: colors.primary }]}
                      >
                        {isSavingTask ? (
                          <ActivityIndicator color="#FFFFFF" size="small" />
                        ) : (
                          <Text style={[Typography.captionMedium, { color: '#FFFFFF' }]}>Save Task</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Day Notes & Mood Section */}
                <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border, marginTop: Spacing.md }]}>
                  <Text style={[Typography.headline, { color: colors.text }]}>Daily Reflection & Mood</Text>

                  <View style={styles.moodRow}>
                    {MOODS.map((m) => {
                      const isSelected = selectedMood === m.value;
                      return (
                        <TouchableOpacity
                          key={m.value}
                          onPress={() => setSelectedMood(isSelected ? null : m.value)}
                          style={[
                            styles.moodButton,
                            {
                              backgroundColor: isSelected ? colors.primary + '20' : colors.cardElevated,
                              borderColor: isSelected ? colors.primary : colors.border,
                            },
                          ]}
                        >
                          <Text style={{ fontSize: 22 }}>{m.emoji}</Text>
                          <Text
                            style={[
                              Typography.tiny,
                              { color: isSelected ? colors.primary : colors.textMuted, marginTop: 2 },
                            ]}
                          >
                            {m.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <TextInput
                    placeholder="Add reflection or notes about this day..."
                    placeholderTextColor={colors.textDim}
                    value={noteText}
                    onChangeText={setNoteText}
                    multiline
                    style={[
                      styles.noteInput,
                      {
                        backgroundColor: colors.cardElevated,
                        borderColor: colors.border,
                        color: colors.text,
                      },
                    ]}
                  />

                  <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm }}>
                    <View style={{ flex: 1 }}>
                      <Button
                        title={noteSaved ? '✓ Saved!' : 'Save Reflection'}
                        onPress={handleSaveNote}
                        loading={isSavingNote}
                        size="sm"
                        variant={noteSaved ? 'primary' : 'secondary'}
                      />
                    </View>
                    {(!!noteData || selectedMood !== null || noteText.trim().length > 0) && (
                      <Button
                        title="Delete"
                        onPress={handleDeleteNote}
                        loading={isDeletingNote}
                        size="sm"
                        variant="danger"
                      />
                    )}
                  </View>
                </View>

                {/* Plans & Checklist Section */}
                <Text
                  style={[
                    Typography.title2,
                    { color: colors.text, marginTop: Spacing.lg, marginBottom: Spacing.sm },
                  ]}
                >
                  Tasks & Habits ({totalTasks})
                </Text>

                {dayData?.plans.length === 0 ? (
                  <View style={[styles.emptyPlansBox, { backgroundColor: colors.cardElevated, borderColor: colors.border }]}>
                    <Icon name="calendar-check" size={32} color={colors.primary} />
                    <Text style={[Typography.headline, { color: colors.text, marginTop: Spacing.sm }]}>
                      No tasks scheduled on this day
                    </Text>
                    <Text style={[Typography.caption, { color: colors.textMuted, textAlign: 'center', marginTop: 4 }]}>
                      Tap "Add Task for This Day" above to schedule tasks and reminders for {format(parsedDate, 'MMMM d')}.
                    </Text>
                  </View>
                ) : (
                  dayData?.plans.map((plan) => (
                    <View
                      key={plan.id}
                      style={[
                        styles.planCard,
                        {
                          backgroundColor: colors.cardElevated,
                          borderColor: plan.is_skipped ? colors.skip : colors.border,
                        },
                      ]}
                    >
                      <View style={styles.planHeader}>
                        <View style={styles.planTitleRow}>
                          <View style={[styles.planIconCircle, { backgroundColor: plan.color + '20' }]}>
                            <Icon name={plan.icon} size={18} color={plan.color} />
                          </View>
                          <View>
                            <Text style={[Typography.headline, { color: colors.text }]}>{plan.name}</Text>
                            <Text style={[Typography.tiny, { color: plan.color }]}>
                              {plan.is_skipped ? 'Skipped (Rest Day)' : `${plan.progress_percent}% completed`}
                            </Text>
                          </View>
                        </View>

                        {!plan.is_skipped && !isFuture && (
                          <TouchableOpacity
                            onPress={() => handleSkipPlan(plan.id, plan.name)}
                            style={styles.skipBtn}
                          >
                            <Text style={[Typography.captionMedium, { color: colors.textMuted }]}>Skip Day</Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      {plan.tasks.map((task) => (
                        <View key={task.id} style={styles.taskRow}>
                          <Checkbox
                            checked={task.completed}
                            onToggle={() => {
                              if (isFuture) {
                                Alert.alert('Notice', 'Cannot check tasks for future dates.');
                                return;
                              }
                              toggleTaskMutation.mutate({ taskId: task.id, date: dateStr });
                            }}
                            color={plan.color}
                            size={22}
                            disabled={isFuture}
                          />
                          <View style={{ flex: 1, marginLeft: Spacing.md }}>
                            <Text
                              style={[
                                Typography.bodyMedium,
                                {
                                  color: task.completed ? colors.textMuted : colors.text,
                                  textDecorationLine: task.completed ? 'line-through' : 'none',
                                },
                              ]}
                            >
                              {task.title}
                            </Text>
                            {task.target ? (
                              <Text style={[Typography.tiny, { color: colors.textDim }]}>{task.target}</Text>
                            ) : null}
                          </View>
                        </View>
                      ))}
                    </View>
                  ))
                )}
              </>
            )}
            <View style={{ height: 60 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  dismissOverlay: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderTopWidth: 1,
    maxHeight: '88%',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  todayBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
    marginLeft: 8,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    marginTop: Spacing.xs,
  },
  summaryCard: {
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  summaryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  perfectPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  openAddTaskBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
  },
  addTaskCard: {
    borderRadius: Radius.md,
    borderWidth: 1.5,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  addTaskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  taskInput: {
    borderRadius: Radius.sm,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    fontSize: 14,
  },
  planSelectChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    marginRight: Spacing.xs,
  },
  reminderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
    paddingVertical: 4,
  },
  timeChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    borderRadius: Radius.sm,
    borderWidth: 1,
    marginRight: Spacing.xs,
  },
  addTaskActionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  cancelBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  saveTaskBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 8,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionCard: {
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.md,
  },
  moodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: Spacing.sm,
  },
  moodButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    marginHorizontal: 3,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  noteInput: {
    borderRadius: Radius.sm,
    borderWidth: 1,
    padding: Spacing.md,
    minHeight: 65,
    textAlignVertical: 'top',
    fontSize: 14,
  },
  emptyPlansBox: {
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.sm,
  },
  planCard: {
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  planTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  planIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  skipBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
});
