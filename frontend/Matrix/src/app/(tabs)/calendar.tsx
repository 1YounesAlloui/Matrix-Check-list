import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
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

const MOOD_EMOJI: Record<number, string> = {
  1: '😫', 2: '😕', 3: '😐', 4: '🙂', 5: '🤩',
};

const WEEKDAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function CalendarScreen() {
  const { colors, isDark } = useThemeColors();

  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedPlanId, setSelectedPlanId] = useState<number | undefined>(undefined);
  const [activeDateStr, setActiveDateStr] = useState<string | null>(null);

  // Calculate start and end for query (always starting on Monday)
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

  // Map days by date string for O(1) lookup
  const daysMap = useMemo(() => {
    const map = new Map<string, CalendarDayItem>();
    calendarData?.days.forEach((day) => {
      map.set(day.date, day);
    });
    return map;
  }, [calendarData]);

  // Break calendar interval into exactly 7-day rows to guarantee 100% alignment
  const weeks = useMemo(() => {
    const start = parseISO(dateRange.start);
    const end = parseISO(dateRange.end);
    const allDays = eachDayOfInterval({ start, end });
    const result: Date[][] = [];
    for (let i = 0; i < allDays.length; i += 7) {
      result.push(allDays.slice(i, i + 7));
    }
    return result;
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
    setActiveDateStr(format(new Date(), 'yyyy-MM-dd'));
  };

  /**
   * High-contrast styling for calendar cells in both dark and light modes
   */
  const getDayCellStyle = (
    dayItem: CalendarDayItem | undefined,
    isToday: boolean,
    isSelected: boolean,
    isCurrentMonth: boolean
  ) => {
    const pct = dayItem?.completion_percentage ?? 0;
    const hasPlans = (dayItem?.scheduled_plans_count ?? 0) > 0;
    const isSkipped = !!dayItem?.is_skipped;

    if (isDark) {
      // ── DARK THEME ──────────────────────────────────────────────────────────
      let bg = '#111714';
      let border = '#1B2921';
      let textColor = '#94A3B8';
      let isComplete = false;

      if (isSkipped) {
        bg = '#1E2522';
        border = '#374151';
        textColor = '#64748B';
      } else if (hasPlans) {
        if (pct === 100) {
          bg = '#10B981'; // Vibrant emerald highlight
          border = '#34D399';
          textColor = '#FFFFFF';
          isComplete = true;
        } else if (pct >= 50) {
          bg = 'rgba(16, 185, 129, 0.42)';
          border = '#10B981';
          textColor = '#A7F3D0';
        } else if (pct > 0) {
          bg = 'rgba(16, 185, 129, 0.22)';
          border = 'rgba(16, 185, 129, 0.45)';
          textColor = '#6EE7B7';
        } else {
          // Scheduled but 0% completed
          bg = '#16231B';
          border = '#2A4333';
          textColor = '#F0FDF4';
        }
      } else {
        // Empty day
        bg = '#0F1612';
        border = '#16221A';
        textColor = '#64748B';
      }

      let borderWidth = 1;
      if (isSelected) {
        border = '#34D399';
        borderWidth = 2;
      } else if (isToday) {
        border = '#10B981';
        borderWidth = 2;
      }

      return {
        backgroundColor: bg,
        borderColor: border,
        borderWidth,
        textColor,
        opacity: !isCurrentMonth ? 0.3 : 1,
        isComplete,
      };
    } else {
      // ── LIGHT THEME ─────────────────────────────────────────────────────────
      let bg = '#FFFFFF';
      let border = '#E2E8F0';
      let textColor = '#475569';
      let isComplete = false;

      if (isSkipped) {
        bg = '#F1F5F9';
        border = '#CBD5E1';
        textColor = '#94A3B8';
      } else if (hasPlans) {
        if (pct === 100) {
          bg = '#10B981';
          border = '#059669';
          textColor = '#FFFFFF';
          isComplete = true;
        } else if (pct >= 50) {
          bg = '#A7F3D0';
          border = '#34D399';
          textColor = '#065F46';
        } else if (pct > 0) {
          bg = '#D1FAE5';
          border = '#A7F3D0';
          textColor = '#047857';
        } else {
          // Scheduled 0%
          bg = '#F0FDF4';
          border = '#BBF7D0';
          textColor = '#0F172A';
        }
      } else {
        // Empty day
        bg = '#F8FAF8';
        border = '#E5E7EB';
        textColor = '#94A3B8';
      }

      let borderWidth = 1;
      if (isSelected) {
        border = '#059669';
        borderWidth = 2;
      } else if (isToday) {
        border = '#10B981';
        borderWidth = 2;
      }

      return {
        backgroundColor: bg,
        borderColor: border,
        borderWidth,
        textColor,
        opacity: !isCurrentMonth ? 0.35 : 1,
        isComplete,
      };
    }
  };

  const activeDayItem = activeDateStr ? daysMap.get(activeDateStr) : undefined;

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
          <TouchableOpacity onPress={handlePrev} style={[styles.navBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Icon name="chevron-left" size={22} color={colors.text} />
          </TouchableOpacity>

          <TouchableOpacity onPress={handleToday} style={[styles.todayBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[Typography.captionMedium, { color: colors.primary }]}>Today</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleNext} style={[styles.navBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
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
          {/* Weekday Names Header (Mon to Sun) - 7 strictly equal columns */}
          <View style={styles.weekHeader}>
            {WEEKDAY_NAMES.map((name) => (
              <View key={name} style={styles.colHeader}>
                <Text style={[styles.weekDayText, { color: colors.textMuted }]}>{name}</Text>
              </View>
            ))}
          </View>

          {/* Days Grid - Row-by-Row 7-column layout with perfect alignment */}
          <View style={styles.grid}>
            {weeks.map((week, wIdx) => (
              <View key={wIdx} style={styles.weekRow}>
                {week.map((dateObj) => {
                  const dateStr = format(dateObj, 'yyyy-MM-dd');
                  const dayItem = daysMap.get(dateStr);
                  const isCurrentMonth = isSameMonth(dateObj, currentDate);
                  const isToday = isSameDay(dateObj, new Date());
                  const isSelected = activeDateStr === dateStr;

                  const cellStyle = getDayCellStyle(dayItem, isToday, isSelected, isCurrentMonth);

                  return (
                    <View key={dateStr} style={styles.cellCol}>
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => setActiveDateStr(dateStr)}
                        style={[
                          styles.dayCell,
                          {
                            backgroundColor: cellStyle.backgroundColor,
                            borderColor: cellStyle.borderColor,
                            borderWidth: cellStyle.borderWidth,
                            opacity: cellStyle.opacity,
                          },
                        ]}
                      >
                        {/* Day number */}
                        <Text
                          style={[
                            Typography.captionMedium,
                            {
                              color: cellStyle.textColor,
                              fontWeight: isToday || isSelected || cellStyle.isComplete ? '800' : '500',
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
                            <View style={[styles.dotIndicator, { backgroundColor: colors.primary }]} />
                          )}
                        </View>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        </View>

        {/* Selected Day Quick Details Banner */}
        {activeDateStr && (
          <View style={[styles.dayBannerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.dayBannerTop}>
              <View>
                <Text style={[Typography.headline, { color: colors.text }]}>
                  {format(parseISO(activeDateStr), 'EEEE, MMMM d, yyyy')}
                </Text>
                <Text style={[Typography.caption, { color: colors.textMuted }]}>
                  {activeDayItem && activeDayItem.scheduled_plans_count > 0
                    ? `${activeDayItem.completion_percentage}% completed (${activeDayItem.scheduled_plans_count} plans)`
                    : 'No plans scheduled on this date'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setActiveDateStr(activeDateStr)}
                style={[styles.viewDetailsBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={[Typography.captionMedium, { color: '#FFFFFF' }]}>Open Details</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

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
    marginBottom: Spacing.md,
  },
  summaryItem: {
    alignItems: 'center',
  },
  calendarCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.sm,
  },
  weekHeader: {
    flexDirection: 'row',
    marginBottom: Spacing.xs,
    paddingBottom: Spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150, 150, 150, 0.2)',
  },
  colHeader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  weekDayText: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  grid: {
    marginTop: 4,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  cellCol: {
    flex: 1,
    paddingHorizontal: 2,
  },
  dayCell: {
    height: 52,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    paddingHorizontal: 1,
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
  dayBannerCard: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  dayBannerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewDetailsBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.sm,
  },
});
