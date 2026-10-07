import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { router } from 'expo-router';
import { useTodayQuery } from '@/hooks/useQueries';
import { useToggleTaskMutation, useSkipDayMutation } from '@/hooks/useMutations';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Icon } from '@/components/Icon';
import { Checkbox } from '@/components/Checkbox';
import { ProgressBar } from '@/components/ProgressBar';
import { StreakBadge } from '@/components/StreakBadge';
import { DayBottomSheet } from '@/components/DayBottomSheet';
import { EmptyState } from '@/components/EmptyState';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { confirmAction } from '@/utils/dialog';
import { sendTestNotification, scheduleDaily8AMPlanNotification } from '@/services/notifications';

export default function TodayScreen() {
  const { colors } = useThemeColors();
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const formattedHeader = format(new Date(), 'EEEE, MMMM d');

  const { data, isLoading, refetch, isRefetching } = useTodayQuery(todayStr);
  const toggleMutation = useToggleTaskMutation(todayStr);
  const skipMutation = useSkipDayMutation();

  const [activeBottomSheetDate, setActiveBottomSheetDate] = useState<string | null>(null);

  const handleNotificationPress = () => {
    Alert.alert(
      'Daily 8:00 AM Reminder',
      "Matrix will send you a notification every day at 8:00 AM about today's plans.\n\nWould you like to send a test notification right now?",
      [
        { text: 'Close', style: 'cancel' },
        {
          text: 'Send Test Now',
          onPress: async () => {
            const res = await sendTestNotification();
            if (res.success) {
              Alert.alert('Notification Sent! 🔔', 'Check your device notifications.');
            } else {
              Alert.alert('Notice', res.message || 'Please enable notifications in device settings.');
            }
          },
        },
      ]
    );
  };

  const handleSkipPlan = (planId: number, planName: string) => {
    confirmAction(
      `Skip ${planName}?`,
      'Mark today as a rest or skip day?',
      async () => {
        try {
          await skipMutation.mutateAsync({
            plan: planId,
            date: todayStr,
            reason: 'Rest day',
          });
        } catch {
          Alert.alert('Error', 'Could not record skip day.');
        }
      },
      'Confirm Skip'
    );
  };

  const hasPlans = (data?.plans.length ?? 0) > 0;
  const overallPercent = data?.overall_percentage ?? 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
      >
        {/* Top Header */}
        <View style={styles.header}>
          <View>
            <Text style={[Typography.captionMedium, { color: colors.textMuted }]}>
              {formattedHeader.toUpperCase()}
            </Text>
            <Text style={[Typography.hero, { color: colors.text, marginTop: 2 }]}>
              Today
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
            <TouchableOpacity
              onPress={handleNotificationPress}
              style={[styles.noteButton, { backgroundColor: colors.card, borderColor: colors.border }]}
              accessibilityLabel="Daily notification settings"
            >
              <Icon
                name="bell-ring-outline"
                size={20}
                color={colors.primary}
              />
            </TouchableOpacity>
            <ThemeToggle size={42} />
            <TouchableOpacity
              onPress={() => setActiveBottomSheetDate(todayStr)}
              style={[styles.noteButton, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Icon
                name={data?.note?.mood ? 'emoticon-happy-outline' : 'note-edit-outline'}
                size={20}
                color={data?.note ? colors.primary : colors.textMuted}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Overall Progress Banner */}
        {hasPlans && (
          <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.summaryTop}>
              <View>
                <Text style={[Typography.title2, { color: colors.text }]}>
                  {overallPercent}% Completed
                </Text>
                <Text style={[Typography.caption, { color: colors.textMuted }]}>
                  {data?.completed_tasks} of {data?.total_tasks} tasks done today
                </Text>
              </View>
              {overallPercent === 100 && (
                <View style={[styles.perfectTag, { backgroundColor: colors.perfect + '20' }]}>
                  <Icon name="star" size={16} color={colors.perfect} />
                  <Text style={[Typography.tiny, { color: colors.perfect, marginLeft: 4 }]}>
                    PERFECT DAY
                  </Text>
                </View>
              )}
            </View>
            <ProgressBar progress={overallPercent} height={8} style={{ marginTop: Spacing.md }} />
          </View>
        )}

        {/* Plans & Checklist */}
        {!hasPlans && !isLoading ? (
          <EmptyState
            icon="clipboard-text-outline"
            title="No tasks scheduled today"
            description="Create a plan or select built-in templates to start tracking your daily habits."
            actionTitle="Explore Plans"
            onAction={() => router.push('/(tabs)/plans')}
          />
        ) : (
          data?.plans.map((plan) => (
            <View
              key={plan.id}
              style={[
                styles.planCard,
                {
                  backgroundColor: colors.card,
                  borderColor: plan.is_skipped ? colors.skip : colors.border,
                },
              ]}
            >
              {/* Plan Header */}
              <View style={styles.planHeader}>
                <View style={styles.planHeaderLeft}>
                  <View style={[styles.planIcon, { backgroundColor: plan.color + '20' }]}>
                    <Icon name={plan.icon} size={20} color={plan.color} />
                  </View>
                  <View style={{ marginLeft: Spacing.md }}>
                    <Text style={[Typography.headline, { color: colors.text }]}>
                      {plan.name}
                    </Text>
                    <Text style={[Typography.tiny, { color: colors.textDim }]}>
                      Threshold: {plan.completion_threshold}%
                    </Text>
                  </View>
                </View>

                <View style={styles.planHeaderRight}>
                  {plan.current_streak > 0 && (
                    <StreakBadge streak={plan.current_streak} />
                  )}
                  {!plan.is_skipped && (
                    <TouchableOpacity
                      onPress={() => handleSkipPlan(plan.id, plan.name)}
                      style={{ marginLeft: Spacing.sm, padding: 4 }}
                    >
                      <Icon name="dots-horizontal" size={20} color={colors.textDim} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Skip notice if skipped */}
              {plan.is_skipped ? (
                <View style={[styles.skipNotice, { backgroundColor: colors.cardElevated }]}>
                  <Icon name="coffee" size={16} color={colors.textMuted} />
                  <Text style={[Typography.caption, { color: colors.textMuted, marginLeft: 6 }]}>
                    Skipped ({plan.skip_reason || 'Rest Day'})
                  </Text>
                </View>
              ) : (
                <>
                  {/* Task list */}
                  <View style={styles.taskList}>
                    {plan.tasks.map((task) => (
                      <View key={task.id} style={styles.taskRow}>
                        <Checkbox
                          checked={task.completed}
                          onToggle={() =>
                            toggleMutation.mutate({ taskId: task.id, date: todayStr })
                          }
                          color={plan.color}
                        />
                        <View style={styles.taskDetails}>
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
                            <Text style={[Typography.tiny, { color: colors.textDim }]}>
                              {task.target}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    ))}
                  </View>

                  {/* Plan progress footer */}
                  <View style={styles.planFooter}>
                    <ProgressBar
                      progress={plan.progress_percent}
                      color={plan.color}
                      height={4}
                      style={{ flex: 1, marginRight: Spacing.md }}
                    />
                    <Text style={[Typography.tiny, { color: plan.color }]}>
                      {plan.progress_percent}%
                    </Text>
                  </View>
                </>
              )}
            </View>
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Day Details Bottom Sheet / Modal */}
      <DayBottomSheet
        dateStr={activeBottomSheetDate}
        onClose={() => setActiveBottomSheetDate(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    padding: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  noteButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCard: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  summaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  perfectTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  planCard: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  planHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  planHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  planIcon: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskList: {
    marginTop: Spacing.xs,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  taskDetails: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  planFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingTop: Spacing.xs,
  },
  skipNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.sm,
  },
});
