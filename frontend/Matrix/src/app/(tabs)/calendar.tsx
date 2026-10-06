import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  parseISO,
} from 'date-fns';
import { useCalendarQuery, usePlansQuery } from '@/hooks/useQueries';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Icon } from '@/components/Icon';
import { DayBottomSheet } from '@/components/DayBottomSheet';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { CalendarDayItem } from '@/types/api';

const SCREEN_WIDTH = Dimensions.get('window').width;
// Account for: scroll padding (Spacing.lg*2) + card padding (Spacing.md*2) + 6 gaps of 2px
const DAY_SIZE = Math.floor((SCREEN_WIDTH - Spacing.lg * 2 - Spacing.md * 2 - 12) / 7);
const DAY_HEIGHT = Math.floor(DAY_SIZE * 1.45);

const MOOD_EMOJI: Record<number, string> = {
  1: '😫', 2: '😕', 3: '😐', 4: '🙂', 5: '🤩',
};

const WEEKDAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function CalendarScreen() {
  const { colors } = useThemeColors();

  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedPlanId, setSelectedPlanId] = useState<number | undefined>(undefined);
  const [activeDateStr, setActiveDateStr] = useState<string | null>(null);

  // Calculate start and end for query
  const dateRange = useMemo(() => {
    if (viewMode === 'month') {
      const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
      const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
      return {
        start: format(start, 'yyyy-MM-dd'),
        end: format(end, 'yyyy-MM-dd'),
      };
    } else {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      return {
        start: format(start, 'yyyy-MM-dd'),
        end: format(end, 'yyyy-MM-dd'),
      };
    }
  }, [currentDate, viewMode]);

  const { data: plans } = usePlansQuery();
  const { data: calendarData, isLoading, refetch, isRefetching } = useCalendarQuery({
    start: dateRange.start,
    end: dateRange.end,
    plan: selectedPlanId,
  });

  // Map days by date string for quick O(1) lookup
  const daysMap = useMemo(() => {
    const map = new Map<string, CalendarDayItem>();
    calendarData?.days.forEach((day) => {
      map.set(day.date, day);
    });
    return map;
  }, [calendarData]);

  // Days list to render in calendar grid
  const daysToRender = useMemo(() => {
    const start = parseISO(dateRange.start);
    const end = parseISO(dateRange.end);
    return eachDayOfInterval({ start, end });
  }, [dateRange]);

  const handlePrev = () => {
    if (viewMode === 'month') {
      setCurrentDate((d) => subMonths(d, 1));
    } else {
      setCurrentDate((d) => subWeeks(d, 1));
    }
  };

  const handleNext = () => {
    if (viewMode === 'month') {
      setCurrentDate((d) => addMonths(d, 1));
    } else {
      setCurrentDate((d) => addWeeks(d, 1));
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const getHeatmapColor = (day: CalendarDayItem | undefined) => {
    if (!day || day.scheduled_plans_count === 0) return colors.emptyHeatmap;
    if (day.is_skipped) return colors.skip + '40';

    const pct = day.completion_percentage;
    if (pct === 0) return colors.cardElevated;
    if (pct < 40) return colors.primary + '30';
    if (pct < 70) return colors.primary + '60';
    if (pct < 100) return colors.primary + '90';
    return colors.primary; // 100%
  };

  const activePlan = plans?.find((p) => p.id === selectedPlanId);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={[Typography.hero, { color: colors.text }]}>Calendar</Text>
          <Text style={[Typography.caption, { color: colors.textMuted }]}>
            {format(currentDate, viewMode === 'month' ? 'MMMM yyyy' : "'Week of' MMM d, yyyy")}
          </Text>
        </View>

        {/* Right Header Actions: ThemeToggle + View Mode Segment */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
          <ThemeToggle size={38} />
          <View style={[styles.segment, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TouchableOpacity
              onPress={() => setViewMode('month')}
              style={[
                styles.segmentBtn,
                viewMode === 'month' && { backgroundColor: colors.primary },
              ]}
            >
              <Text
                style={[
                  Typography.captionMedium,
                  { color: viewMode === 'month' ? '#FFFFFF' : colors.textMuted },
                ]}
              >
                Month
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setViewMode('week')}
              style={[
                styles.segmentBtn,
                viewMode === 'week' && { backgroundColor: colors.primary },
              ]}
            >
              <Text
                style={[
                  Typography.captionMedium,
                  { color: viewMode === 'week' ? '#FFFFFF' : colors.textMuted },
                ]}
              >
                Week
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Plan Filter Chips */}
      <View style={styles.filterWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          <TouchableOpacity
            onPress={() => setSelectedPlanId(undefined)}
            style={[
              styles.chip,
              {
                backgroundColor: !selectedPlanId ? colors.primary : colors.card,
                borderColor: !selectedPlanId ? colors.primary : colors.border,
              },
            ]}
          >
            <Text
              style={[
                Typography.captionMedium,
                { color: !selectedPlanId ? '#FFFFFF' : colors.textMuted },
              ]}
            >
              All Plans
            </Text>
          </TouchableOpacity>

          {plans?.map((p) => {
            const isSelected = selectedPlanId === p.id;
            return (
              <TouchableOpacity
                key={p.id}
                onPress={() => setSelectedPlanId(isSelected ? undefined : p.id)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isSelected ? p.color : colors.card,
                    borderColor: isSelected ? p.color : colors.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.chipDot,
                    { backgroundColor: isSelected ? '#FFFFFF' : p.color },
                  ]}
                />
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

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
        }
      >
        {/* Navigation Bar (Prev / Next / Today) */}
        <View style={styles.navBar}>
          <TouchableOpacity onPress={handlePrev} style={[styles.navBtn, { borderColor: colors.border }]}>
            <Icon name="chevron-left" size={22} color={colors.text} />
          </TouchableOpacity>

          <TouchableOpacity onPress={handleToday} style={[styles.todayBtn, { borderColor: colors.border }]}>
            <Text style={[Typography.captionMedium, { color: colors.primary }]}>Today</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleNext} style={[styles.navBtn, { borderColor: colors.border }]}>
            <Icon name="chevron-right" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Summary Strip */}
        {calendarData?.summary && (
          <View style={[styles.summaryStrip, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.summaryItem}>
              <Text style={[Typography.title2, { color: colors.primary }]}>
                {calendarData.summary.average_completion}%
              </Text>
              <Text style={[Typography.tiny, { color: colors.textMuted }]}>Avg Done</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[Typography.title2, { color: colors.perfect }]}>
                {calendarData.summary.perfect_days}
              </Text>
              <Text style={[Typography.tiny, { color: colors.textMuted }]}>Perfect</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[Typography.title2, { color: colors.streak }]}>
                {calendarData.summary.current_streak}d
              </Text>
              <Text style={[Typography.tiny, { color: colors.textMuted }]}>Streak</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[Typography.title2, { color: colors.text }]}>
                {calendarData.summary.best_streak}d
              </Text>
              <Text style={[Typography.tiny, { color: colors.textMuted }]}>Best</Text>
            </View>
          </View>
        )}

        {/* Calendar Grid Card */}
        <View style={[styles.calendarCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Weekday Names */}
          <View style={styles.weekHeader}>
            {WEEKDAY_NAMES.map((name) => (
              <Text key={name} style={[styles.weekDayText, { color: colors.textDim }]}>
                {name}
              </Text>
            ))}
          </View>

          {/* Days Grid */}
          <View style={styles.grid}>
            {daysToRender.map((dateObj) => {
              const dateStr = format(dateObj, 'yyyy-MM-dd');
              const dayItem = daysMap.get(dateStr);
              const isCurrentMonth = isSameMonth(dateObj, currentDate);
              const isToday = isSameDay(dateObj, new Date());
              const isFuture = dateStr > format(new Date(), 'yyyy-MM-dd');

              const cellBg = getHeatmapColor(dayItem);

              return (
                <TouchableOpacity
                  key={dateStr}
                  activeOpacity={0.7}
                  onPress={() => setActiveDateStr(dateStr)}
                  style={[
                    styles.dayCell,
                    {
                      width: DAY_SIZE,
                      height: DAY_HEIGHT,
                      backgroundColor: cellBg,
                      borderColor: isToday ? colors.primary : colors.borderLight,
                      borderWidth: isToday ? 2 : 1,
                      opacity: !isCurrentMonth ? 0.3 : 1,
                    },
                  ]}
                >
                  {/* Day number */}
                  <Text
                    style={[
                      Typography.captionMedium,
                      {
                        color:
                          dayItem && dayItem.completion_percentage === 100
                            ? '#FFFFFF'
                            : isToday
                            ? colors.primary
                            : colors.text,
                        fontWeight: isToday ? '800' : '500',
                      },
                    ]}
                  >
                    {format(dateObj, 'd')}
                  </Text>

                  {/* Mood emoji */}
                  {dayItem?.mood ? (
                    <Text style={{ fontSize: 11, lineHeight: 13 }}>
                      {MOOD_EMOJI[dayItem.mood] ?? ''}
                    </Text>
                  ) : null}

                  {/* Indicators row: perfect star / skipped / note dot */}
                  <View style={styles.indicatorsRow}>
                    {dayItem?.is_perfect && (
                      <Icon name="star" size={9} color={colors.perfect} />
                    )}
                    {dayItem?.is_skipped && (
                      <Icon name="coffee" size={9} color={colors.skip} />
                    )}
                    {dayItem?.has_note && !dayItem?.mood && (
                      <View style={[styles.dotIndicator, { backgroundColor: colors.accent }]} />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Day Details Bottom Sheet / Modal */}
      <DayBottomSheet
        dateStr={activeDateStr}
        onClose={() => setActiveDateStr(null)}
      />
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
    paddingTop: Spacing.md,
  },
  segment: {
    flexDirection: 'row',
    borderRadius: Radius.full,
    borderWidth: 1,
    padding: 3,
  },
  segmentBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  filterWrapper: {
    marginVertical: Spacing.md,
  },
  filterScroll: {
    paddingHorizontal: Spacing.lg,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    marginRight: Spacing.sm,
  },
  chipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  scroll: {
    paddingHorizontal: Spacing.lg,
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 8,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  summaryStrip: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.lg,
  },
  summaryItem: {
    alignItems: 'center',
  },
  calendarCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Spacing.sm,
  },
  weekDayText: {
    fontSize: 12,
    fontWeight: '600',
    width: DAY_SIZE,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
    justifyContent: 'center',
  },
  dayCell: {
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  indicatorsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 10,
  },
  dotIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
