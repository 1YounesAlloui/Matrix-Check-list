import { Platform } from 'react-native';
import { isRunningInExpoGo } from 'expo';

type NotificationsType = typeof import('expo-notifications');

let notificationsModule: NotificationsType | null = null;

/**
 * Safely get the expo-notifications module.
 * Expo SDK 53+ removed notification functionality from Expo Go on Android
 * and throws an uncaught error at import time if accessed in Expo Go.
 */
function getNotifications(): NotificationsType | null {
  if (Platform.OS === 'web') {
    return null;
  }

  // Prevent crash in Expo Go on Android
  if (Platform.OS === 'android' && isRunningInExpoGo()) {
    return null;
  }

  if (!notificationsModule) {
    try {
      notificationsModule = require('expo-notifications') as NotificationsType;
      notificationsModule.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
    } catch (err) {
      console.warn('[notifications] Unable to initialize expo-notifications:', err);
      return null;
    }
  }

  return notificationsModule;
}

export const DAILY_NOTIFICATION_ID = 'daily-8am-plans';
export const DAILY_CHANNEL_ID = 'daily-plans';

/**
 * Configure Android notification channels and request permission
 */
export async function registerForNotificationsAsync(): Promise<boolean> {
  const Notifications = getNotifications();
  if (!Notifications) {
    return false;
  }

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(DAILY_CHANNEL_ID, {
        name: "Daily Plans Reminder",
        description: "Notifies you every day at 8:00 AM about today's checklist and plans",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#10B981',
        sound: 'default',
        enableLights: true,
        enableVibrate: true,
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  } catch (err) {
    console.warn('[notifications] Error setting up notification permissions:', err);
    return false;
  }
}

/**
 * Schedules a daily recurring notification at 8:00 AM for today's plans
 */
export async function scheduleDaily8AMPlanNotification(hour: number = 8, minute: number = 0): Promise<boolean> {
  const Notifications = getNotifications();
  if (!Notifications) {
    return false;
  }

  try {
    const hasPermission = await registerForNotificationsAsync();
    if (!hasPermission) {
      return false;
    }

    // Cancel existing daily reminders to avoid duplicates
    await cancelDailyPlanNotification();

    // Schedule the daily 8:00 AM notification
    await Notifications.scheduleNotificationAsync({
      identifier: DAILY_NOTIFICATION_ID,
      content: {
        title: "📋 Today's Plans Reminder",
        body: "Good morning! Open Matrix to complete your scheduled plans and habits for today.",
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.HIGH,
        color: '#10B981',
        data: {
          url: '/today',
          type: 'daily-plan-reminder',
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        channelId: DAILY_CHANNEL_ID,
      },
    });

    return true;
  } catch (error) {
    console.warn('[notifications] Failed to schedule daily notification:', error);
    return false;
  }
}

/**
 * Cancels any active daily notification
 */
export async function cancelDailyPlanNotification(): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications) return;

  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const item of scheduled) {
      if (item.identifier === DAILY_NOTIFICATION_ID || item.content?.data?.type === 'daily-plan-reminder') {
        await Notifications.cancelScheduledNotificationAsync(item.identifier);
      }
    }
  } catch (err) {
    console.warn('[notifications] Error cancelling notification:', err);
  }
}

/**
 * Sends an instant test notification to verify notification delivery
 */
export async function sendTestNotification(): Promise<{ success: boolean; message?: string }> {
  if (Platform.OS === 'android' && isRunningInExpoGo()) {
    return {
      success: false,
      message: 'Notifications are disabled in Expo Go on Android by Expo SDK 53+. They will be fully functional once built as an APK with EAS Build.',
    };
  }

  const Notifications = getNotifications();
  if (!Notifications) {
    return {
      success: false,
      message: 'Notifications are not supported in this environment.',
    };
  }

  try {
    const hasPermission = await registerForNotificationsAsync();
    if (!hasPermission) {
      return {
        success: false,
        message: 'Notification permissions were denied. Please enable them in system settings.',
      };
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "📋 Today's Plans Reminder (Test)",
        body: "Your daily 8:00 AM notification is active! You'll be reminded every morning.",
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.HIGH,
        color: '#10B981',
        data: { url: '/today' },
      },
      trigger: null, // deliver immediately
    });

    return { success: true };
  } catch (err: any) {
    console.warn('[notifications] Failed to send test notification:', err);
    return {
      success: false,
      message: err?.message || 'Failed to trigger test notification.',
    };
  }
}

/**
 * Sets up listeners for user tapping on a notification
 */
export function setupNotificationListeners(onNavigate: (url: string) => void): () => void {
  const Notifications = getNotifications();
  if (!Notifications) return () => {};

  try {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const url = response.notification.request.content.data?.url;
      if (url && typeof url === 'string') {
        onNavigate(url);
      }
    });

    return () => {
      subscription.remove();
    };
  } catch (err) {
    console.warn('[notifications] Error adding response listener:', err);
    return () => {};
  }
}

/**
 * Schedules a notification for a task on a specific calendar date and time
 */
export async function scheduleTaskReminderNotification(params: {
  title: string;
  dateStr: string; // "YYYY-MM-DD"
  hour?: number;   // default 8
  minute?: number; // default 0
}): Promise<boolean> {
  const Notifications = getNotifications();
  if (!Notifications) return false;

  try {
    const hasPermission = await registerForNotificationsAsync();
    if (!hasPermission) return false;

    const [year, month, day] = params.dateStr.split('-').map(Number);
    const targetDate = new Date(year, month - 1, day, params.hour ?? 8, params.minute ?? 0, 0);

    // If target date/time is in the past, don't schedule
    if (targetDate.getTime() <= Date.now()) {
      return false;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `📌 Task Reminder: ${params.title}`,
        body: `Scheduled for today (${params.dateStr}). Don't forget to complete it!`,
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.HIGH,
        color: '#10B981',
        data: {
          url: '/today',
          type: 'task-reminder',
          date: params.dateStr,
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: targetDate,
        channelId: DAILY_CHANNEL_ID,
      },
    });

    return true;
  } catch (err) {
    console.warn('[notifications] Failed to schedule task reminder:', err);
    return false;
  }
}

