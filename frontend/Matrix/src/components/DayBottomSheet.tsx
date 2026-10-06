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
} from 'react-native';
import { format, parseISO } from 'date-fns';
import { useTodayQuery, useDayNoteQuery } from '@/hooks/useQueries';
import {
  useToggleTaskMutation,
  useSaveDayNoteMutation,
  useDeleteDayNoteMutation,
  useSkipDayMutation,
} from '@/hooks/useMutations';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Icon } from './Icon';
import { Checkbox } from './Checkbox';
import { Button } from './Button';
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

export const DayBottomSheet: React.FC<DayBottomSheetProps> = ({ dateStr, onClose }) => {
  const { colors } = useThemeColors();

  const { data: dayData, isLoading: isLoadingDay } = useTodayQuery(dateStr || undefined);
  const { data: noteData, isLoading: isLoadingNote } = useDayNoteQuery(dateStr || '');

  const toggleTaskMutation = useToggleTaskMutation(dateStr || undefined);
  const saveNoteMutation = useSaveDayNoteMutation();
  const deleteNoteMutation = useDeleteDayNoteMutation();
  const skipDayMutation = useSkipDayMutation();

  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [noteText, setNoteText] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [isDeletingNote, setIsDeletingNote] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);

  useEffect(() => {
    if (noteData) {
      setSelectedMood(noteData.mood);
      setNoteText(noteData.text || '');
    } else {
      setSelectedMood(null);
      setNoteText('');
    }
  }, [noteData, dateStr]);

  if (!dateStr) return null;

  const parsedDate = parseISO(dateStr);
  const formattedDate = format(parsedDate, 'EEEE, MMMM d, yyyy');
  const isToday = format(new Date(), 'yyyy-MM-dd') === dateStr;
  const isFuture = dateStr > format(new Date(), 'yyyy-MM-dd');

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

  return (
    <Modal visible={!!dateStr} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.dismissOverlay} activeOpacity={1} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={[Typography.title1, { color: colors.text }]}>
                {isToday ? 'Today' : format(parsedDate, 'EEEE, MMM d')}
              </Text>
              <Text style={[Typography.caption, { color: colors.textMuted }]}>
                {formattedDate} {isFuture ? '(Upcoming)' : ''}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.cardElevated }]}>
              <Icon name="close" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {isLoadingDay || isLoadingNote ? (
              <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 30 }} />
            ) : (
              <>
                {/* Mood and Note Card */}
                <View style={[styles.sectionCard, { backgroundColor: colors.cardElevated, borderColor: colors.border }]}>
                  <Text style={[Typography.headline, { color: colors.text, marginBottom: Spacing.sm }]}>
                    Mood & Reflection
                  </Text>
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
                              backgroundColor: isSelected ? colors.primary + '25' : colors.card,
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
                    value={noteText}
                    onChangeText={setNoteText}
                    placeholder="Notes or highlights for this day..."
                    placeholderTextColor={colors.textDim}
                    multiline
                    numberOfLines={3}
                    style={[
                      styles.noteInput,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                        color: colors.text,
                      },
                    ]}
                  />

                  <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm }}>
                    <View style={{ flex: 1 }}>
                      <Button
                        title={noteSaved ? '✓ Saved!' : 'Save Note & Mood'}
                        onPress={handleSaveNote}
                        loading={isSavingNote}
                        size="sm"
                        variant={noteSaved ? 'primary' : 'secondary'}
                      />
                    </View>
                    {(!!noteData || selectedMood !== null || noteText.trim().length > 0) && (
                      <Button
                        title="Delete Note"
                        onPress={handleDeleteNote}
                        loading={isDeletingNote}
                        size="sm"
                        variant="danger"
                      />
                    )}
                  </View>
                </View>

                {/* Plans & Tasks */}
                <Text style={[Typography.title2, { color: colors.text, marginTop: Spacing.lg, marginBottom: Spacing.sm }]}>
                  Plans ({dayData?.plans.length || 0})
                </Text>

                {dayData?.plans.length === 0 ? (
                  <Text style={[Typography.body, { color: colors.textMuted, paddingVertical: Spacing.lg }]}>
                    No plans scheduled on this date.
                  </Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  dismissOverlay: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderTopWidth: 1,
    maxHeight: '85%',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    marginTop: Spacing.sm,
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
    minHeight: 70,
    textAlignVertical: 'top',
    fontSize: 14,
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
