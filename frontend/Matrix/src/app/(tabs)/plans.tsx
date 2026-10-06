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
import { router } from 'expo-router';
import { usePlansQuery } from '@/hooks/useQueries';
import { useDeletePlanMutation } from '@/hooks/useMutations';
import { useThemeColors } from '@/hooks/useThemeColors';
import { plansApi } from '@/services/api';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/Button';
import { StreakBadge } from '@/components/StreakBadge';
import { EmptyState } from '@/components/EmptyState';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { Plan } from '@/types/api';
import { confirmAction } from '@/utils/dialog';

export default function PlansScreen() {
  const { colors } = useThemeColors();
  const [showArchived, setShowArchived] = useState(false);

  const { data: plans, isLoading, refetch, isRefetching } = usePlansQuery(showArchived);
  const deleteMutation = useDeletePlanMutation();

  const handleDelete = (plan: Plan) => {
    confirmAction(
      `Delete "${plan.name}"?`,
      'All tasks and completion history for this plan will be permanently removed.',
      () => deleteMutation.mutate(plan.id)
    );
  };

  const handleDuplicate = async (plan: Plan) => {
    try {
      await plansApi.duplicate(plan.id);
      refetch();
    } catch {
      Alert.alert('Error', 'Failed to duplicate plan.');
    }
  };

  const formatSchedule = (plan: Plan) => {
    switch (plan.schedule_type) {
      case 'daily':
        return 'Every day';
      case 'weekdays':
        return 'Specific weekdays';
      case 'every_n_days':
        return `Every ${plan.schedule_config.interval || 2} days`;
      case 'one_time':
        return 'One-time';
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={[Typography.hero, { color: colors.text }]}>Plans</Text>
          <Text style={[Typography.caption, { color: colors.textMuted }]}>
            {plans?.length || 0} active habits & checklists
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
          <ThemeToggle size={36} />
          <Button
            title="New Plan"
            icon="plus"
            size="sm"
            onPress={() => router.push('/plan/create')}
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
        }
      >
        {(!plans || plans.length === 0) && !isLoading ? (
          <EmptyState
            icon="clipboard-plus-outline"
            title="No plans created yet"
            description="Create your first plan or pick a ready-to-use template like Gym, Study or Morning Routine."
            actionTitle="Create Plan"
            onAction={() => router.push('/plan/create')}
          />
        ) : (
          plans?.map((plan) => (
            <TouchableOpacity
              key={plan.id}
              activeOpacity={0.8}
              onPress={() => router.push(`/plan/${plan.id}`)}
              style={[
                styles.card,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <View style={[styles.planIcon, { backgroundColor: plan.color + '20' }]}>
                    <Icon name={plan.icon} size={22} color={plan.color} />
                  </View>
                  <View style={{ marginLeft: Spacing.md, flex: 1 }}>
                    <Text style={[Typography.title2, { color: colors.text }]} numberOfLines={1}>
                      {plan.name}
                    </Text>
                    <Text style={[Typography.caption, { color: colors.textMuted }]}>
                      {formatSchedule(plan)} • Threshold: {plan.completion_threshold}%
                    </Text>
                  </View>
                </View>

                {plan.current_streak ? (
                  <StreakBadge streak={plan.current_streak} />
                ) : null}
              </View>

              {plan.description ? (
                <Text
                  style={[Typography.body, { color: colors.textDim, marginTop: Spacing.sm }]}
                  numberOfLines={2}
                >
                  {plan.description}
                </Text>
              ) : null}

              {/* Footer info & actions */}
              <View style={[styles.cardFooter, { borderTopColor: colors.borderLight }]}>
                <View style={styles.badgeRow}>
                  <View style={[styles.tag, { backgroundColor: colors.cardElevated }]}>
                    <Icon name="check-circle-outline" size={14} color={plan.color} />
                    <Text style={[Typography.tiny, { color: colors.textMuted, marginLeft: 4 }]}>
                      {plan.tasks_count || 0} tasks
                    </Text>
                  </View>
                </View>

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    onPress={(e) => {
                      // @ts-ignore
                      e?.stopPropagation?.();
                      handleDuplicate(plan);
                    }}
                    style={styles.iconBtn}
                  >
                    <Icon name="content-copy" size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={(e) => {
                      // @ts-ignore
                      e?.stopPropagation?.();
                      handleDelete(plan);
                    }}
                    style={styles.iconBtn}
                  >
                    <Icon name="trash-can-outline" size={18} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
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
  scroll: {
    padding: Spacing.lg,
  },
  card: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  planIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    padding: Spacing.xs,
    marginLeft: Spacing.sm,
  },
});
