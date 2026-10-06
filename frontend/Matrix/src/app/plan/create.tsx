import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { format } from 'date-fns';
import { useCreatePlanMutation } from '@/hooks/useMutations';
import { useTemplatesQuery } from '@/hooks/useQueries';
import { trackingApi } from '@/services/api';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/Button';
import {
  PlanColorPresets,
  PlanIcons,
  Radius,
  Spacing,
  Typography,
} from '@/constants/theme';
import { ScheduleType } from '@/types/api';
import { safeGoBack } from '@/utils/navigation';

const SCHEDULE_TYPES: { type: ScheduleType; label: string; icon: string }[] = [
  { type: 'daily', label: 'Daily', icon: 'calendar-sync' },
  { type: 'weekdays', label: 'Weekdays', icon: 'calendar-week' },
  { type: 'every_n_days', label: 'Interval', icon: 'timer-sand' },
  { type: 'one_time', label: 'One Time', icon: 'calendar-check' },
];

const WEEKDAYS = [
  { day: 0, label: 'M' },
  { day: 1, label: 'T' },
  { day: 2, label: 'W' },
  { day: 3, label: 'T' },
  { day: 4, label: 'F' },
  { day: 5, label: 'S' },
  { day: 6, label: 'S' },
];

export default function CreatePlanScreen() {
  const { colors } = useThemeColors();
  const createMutation = useCreatePlanMutation();
  const { data: templates } = useTemplatesQuery();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState<string>(PlanColorPresets[0]);
  const [selectedIcon, setSelectedIcon] = useState<string>(PlanIcons[0]);
  const [scheduleType, setScheduleType] = useState<ScheduleType>('daily');
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([0, 1, 2, 3, 4]);
  const [intervalDays, setIntervalDays] = useState('2');
  const [threshold, setThreshold] = useState('100');
  const [isApplyingTemplate, setIsApplyingTemplate] = useState(false);

  const toggleWeekday = (day: number) => {
    if (selectedWeekdays.includes(day)) {
      if (selectedWeekdays.length === 1) return; // Keep at least one
      setSelectedWeekdays(selectedWeekdays.filter((d) => d !== day));
    } else {
      setSelectedWeekdays([...selectedWeekdays, day].sort());
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter a plan name.');
      return;
    }

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const scheduleConfig =
      scheduleType === 'weekdays'
        ? { weekdays: selectedWeekdays }
        : scheduleType === 'every_n_days'
        ? { interval: parseInt(intervalDays, 10) || 2 }
        : {};

    const thresholdNum = Math.min(100, Math.max(1, parseInt(threshold, 10) || 100));

    try {
      await createMutation.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        color: selectedColor,
        icon: selectedIcon,
        schedule_type: scheduleType,
        schedule_config: scheduleConfig,
        completion_threshold: thresholdNum,
        start_date: todayStr,
      });
      safeGoBack();
    } catch {
      Alert.alert('Error', 'Failed to create plan.');
    }
  };

  const handleApplyTemplate = async (key: string) => {
    setIsApplyingTemplate(true);
    try {
      await trackingApi.templates.apply(key);
      safeGoBack();
    } catch {
      Alert.alert('Error', 'Failed to apply template.');
    } finally {
      setIsApplyingTemplate(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => safeGoBack()} style={styles.backBtn}>
          <Icon name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[Typography.title1, { color: colors.text }]}>New Plan</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Templates Quick Selector */}
        {templates && templates.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[Typography.headline, { color: colors.text, marginBottom: Spacing.xs }]}>
              Start from a Template
            </Text>
            <Text style={[Typography.caption, { color: colors.textMuted, marginBottom: Spacing.md }]}>
              Pre-configured habit routines with checklist tasks
            </Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {templates.map((tpl) => (
                <TouchableOpacity
                  key={tpl.key}
                  disabled={isApplyingTemplate}
                  onPress={() => handleApplyTemplate(tpl.key)}
                  style={[
                    styles.templateChip,
                    { backgroundColor: colors.cardElevated, borderColor: colors.border },
                  ]}
                >
                  <View style={[styles.tplIconCircle, { backgroundColor: tpl.color + '25' }]}>
                    <Icon name={tpl.icon} size={18} color={tpl.color} />
                  </View>
                  <View style={{ marginLeft: Spacing.sm }}>
                    <Text style={[Typography.captionMedium, { color: colors.text }]}>
                      {tpl.name}
                    </Text>
                    <Text style={[Typography.tiny, { color: colors.textDim }]}>
                      {(tpl.tasks?.length ?? tpl.task_count ?? 0)} tasks
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Basic Info */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[Typography.headline, { color: colors.text, marginBottom: Spacing.md }]}>
            Plan Details
          </Text>

          <Text style={[Typography.captionMedium, { color: colors.textMuted }]}>NAME</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Gym Workout, Study Python..."
            placeholderTextColor={colors.textDim}
            style={[
              styles.input,
              { backgroundColor: colors.cardElevated, borderColor: colors.border, color: colors.text },
            ]}
          />

          <Text style={[Typography.captionMedium, { color: colors.textMuted, marginTop: Spacing.md }]}>
            DESCRIPTION (OPTIONAL)
          </Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Why does this habit matter to you?"
            placeholderTextColor={colors.textDim}
            multiline
            numberOfLines={2}
            style={[
              styles.input,
              styles.multilineInput,
              { backgroundColor: colors.cardElevated, borderColor: colors.border, color: colors.text },
            ]}
          />
        </View>

        {/* Color & Icon Picker */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[Typography.headline, { color: colors.text, marginBottom: Spacing.md }]}>
            Icon & Color
          </Text>

          <Text style={[Typography.captionMedium, { color: colors.textMuted, marginBottom: Spacing.sm }]}>
            COLOR ACCENT
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.md }}>
            {PlanColorPresets.map((c) => {
              const isSelected = selectedColor === c;
              return (
                <TouchableOpacity
                  key={c}
                  onPress={() => setSelectedColor(c)}
                  style={[
                    styles.colorSwatch,
                    {
                      backgroundColor: c,
                      borderColor: isSelected ? '#FFFFFF' : 'transparent',
                      borderWidth: isSelected ? 3 : 0,
                    },
                  ]}
                />
              );
            })}
          </ScrollView>

          <Text style={[Typography.captionMedium, { color: colors.textMuted, marginBottom: Spacing.sm }]}>
            ICON
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {PlanIcons.map((ic) => {
              const isSelected = selectedIcon === ic;
              return (
                <TouchableOpacity
                  key={ic}
                  onPress={() => setSelectedIcon(ic)}
                  style={[
                    styles.iconBox,
                    {
                      backgroundColor: isSelected ? selectedColor + '30' : colors.cardElevated,
                      borderColor: isSelected ? selectedColor : colors.border,
                    },
                  ]}
                >
                  <Icon name={ic} size={22} color={isSelected ? selectedColor : colors.textMuted} />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Schedule */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[Typography.headline, { color: colors.text, marginBottom: Spacing.md }]}>
            Schedule & Rules
          </Text>

          <View style={styles.scheduleGrid}>
            {SCHEDULE_TYPES.map((st) => {
              const isSelected = scheduleType === st.type;
              return (
                <TouchableOpacity
                  key={st.type}
                  onPress={() => setScheduleType(st.type)}
                  style={[
                    styles.scheduleItem,
                    {
                      backgroundColor: isSelected ? colors.primary + '20' : colors.cardElevated,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Icon
                    name={st.icon}
                    size={20}
                    color={isSelected ? colors.primary : colors.textMuted}
                  />
                  <Text
                    style={[
                      Typography.captionMedium,
                      { color: isSelected ? colors.primary : colors.text, marginTop: 4 },
                    ]}
                  >
                    {st.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Weekday Selector */}
          {scheduleType === 'weekdays' && (
            <View style={styles.weekdayRow}>
              {WEEKDAYS.map((w) => {
                const isSelected = selectedWeekdays.includes(w.day);
                return (
                  <TouchableOpacity
                    key={w.day}
                    onPress={() => toggleWeekday(w.day)}
                    style={[
                      styles.weekdayBtn,
                      {
                        backgroundColor: isSelected ? colors.primary : colors.cardElevated,
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        Typography.captionMedium,
                        { color: isSelected ? '#FFFFFF' : colors.textDim },
                      ]}
                    >
                      {w.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Interval Input */}
          {scheduleType === 'every_n_days' && (
            <View style={{ marginTop: Spacing.md }}>
              <Text style={[Typography.captionMedium, { color: colors.textMuted }]}>
                EVERY N DAYS
              </Text>
              <TextInput
                value={intervalDays}
                onChangeText={setIntervalDays}
                keyboardType="numeric"
                placeholder="2"
                placeholderTextColor={colors.textDim}
                style={[
                  styles.input,
                  { backgroundColor: colors.cardElevated, borderColor: colors.border, color: colors.text },
                ]}
              />
            </View>
          )}

          {/* Completion Threshold */}
          <View style={{ marginTop: Spacing.md }}>
            <Text style={[Typography.captionMedium, { color: colors.textMuted }]}>
              COMPLETION THRESHOLD (%)
            </Text>
            <TextInput
              value={threshold}
              onChangeText={setThreshold}
              keyboardType="numeric"
              placeholder="100"
              placeholderTextColor={colors.textDim}
              style={[
                styles.input,
                { backgroundColor: colors.cardElevated, borderColor: colors.border, color: colors.text },
              ]}
            />
            <Text style={[Typography.tiny, { color: colors.textDim, marginTop: 4 }]}>
              Target percentage of tasks to mark this habit completed (e.g., 80% or 100%).
            </Text>
          </View>
        </View>

        <Button
          title="Create Plan"
          onPress={handleCreate}
          loading={createMutation.isPending}
          size="lg"
          style={{ marginTop: Spacing.md }}
        />

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
    marginBottom: Spacing.lg,
  },
  templateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginRight: Spacing.md,
  },
  tplIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    height: 48,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    fontSize: 15,
    marginTop: Spacing.xs,
  },
  multilineInput: {
    height: 72,
    textAlignVertical: 'top',
    paddingTop: Spacing.sm,
  },
  colorSwatch: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginRight: Spacing.md,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  scheduleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  scheduleItem: {
    width: '48%',
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.md,
    alignItems: 'center',
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
  },
  weekdayBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
