export type ScheduleType = 'daily' | 'weekdays' | 'every_n_days' | 'one_time';
export type TaskPriority = 'low' | 'normal' | 'high';

export interface ScheduleConfig {
  weekdays?: number[]; // 0=Mon, 6=Sun
  interval?: number;
  date?: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface AuthResponse {
  tokens: AuthTokens;
  user: User;
}

export interface Plan {
  id: number;
  name: string;
  description: string;
  icon: string;
  color: string;
  schedule_type: ScheduleType;
  schedule_config: ScheduleConfig;
  start_date: string;
  end_date: string | null;
  reminder_time: string | null;
  completion_threshold: number;
  archived: boolean;
  order: number;
  created_at: string;
  updated_at: string;
  tasks_count?: number;
  current_streak?: number;
  best_streak?: number;
}

export interface CreatePlanPayload {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  schedule_type?: ScheduleType;
  schedule_config?: ScheduleConfig;
  start_date: string;
  end_date?: string | null;
  reminder_time?: string | null;
  completion_threshold?: number;
  order?: number;
}

export interface UpdatePlanPayload extends Partial<CreatePlanPayload> {
  archived?: boolean;
}

export interface Task {
  id: number;
  plan: number;
  title: string;
  note: string;
  target: string;
  priority: TaskPriority;
  weight: number;
  order: number;
  created_at: string;
}

export interface CreateTaskPayload {
  plan: number;
  title: string;
  note?: string;
  target?: string;
  priority?: TaskPriority;
  weight?: number;
  order?: number;
}

export interface UpdateTaskPayload extends Partial<CreateTaskPayload> {}

export interface TodayTaskItem {
  id: number;
  title: string;
  note: string;
  target: string;
  priority: TaskPriority;
  weight: number;
  order: number;
  completed: boolean;
  completed_at: string | null;
}

export interface TodayPlanItem {
  id: number;
  name: string;
  color: string;
  icon: string;
  completion_threshold: number;
  is_skipped: boolean;
  skip_reason: string | null;
  progress_percent: number;
  is_complete: boolean;
  current_streak: number;
  tasks: TodayTaskItem[];
}

export interface DayNoteData {
  id: number;
  mood: number | null; // 1 to 5
  text: string;
}

export interface TodayResponse {
  date: string;
  plans: TodayPlanItem[];
  total_tasks: number;
  completed_tasks: number;
  overall_percentage: number;
  note: DayNoteData | null;
}

export interface ToggleResponse {
  completed: boolean;
  date: string;
  task_id: number;
  plan_id: number;
  plan_progress_percent: number;
  plan_is_complete: boolean;
  current_streak: number;
}

export interface CalendarPlanStatus {
  scheduled: boolean;
  completed: boolean;
  percent: number;
  skipped: boolean;
}

export interface CalendarDayItem {
  date: string;
  is_today: boolean;
  is_future: boolean;
  scheduled_plans_count: number;
  completed_plans_count: number;
  total_tasks: number;
  completed_tasks: number;
  completion_percentage: number;
  is_perfect: boolean;
  is_skipped: boolean;
  has_note: boolean;
  mood: number | null;
  plan_statuses?: Record<string, CalendarPlanStatus>;
}

export interface CalendarSummary {
  total_days: number;
  scheduled_days: number;
  perfect_days: number;
  average_completion: number;
  current_streak: number;
  best_streak: number;
}

export interface CalendarResponse {
  start: string;
  end: string;
  days: CalendarDayItem[];
  summary: CalendarSummary;
}

export interface SkipDay {
  id: number;
  plan: number;
  date: string;
  reason: string;
}

export interface DayNote {
  id: number;
  date: string;
  mood: number | null;
  text: string;
}

export interface PlanTemplateItem {
  title: string;
  target?: string;
  priority?: TaskPriority;
  weight?: number;
}

export interface PlanTemplate {
  key: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  schedule_type?: ScheduleType;
  schedule_config?: ScheduleConfig;
  completion_threshold?: number;
  task_count?: number;
  tasks?: PlanTemplateItem[];
}
