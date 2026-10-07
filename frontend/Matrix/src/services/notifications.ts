import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure foreground presentation behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const DAILY_NOTIFICATION_ID = 'daily-8am-plans';
export const DAILY_CHANNEL_ID = 'daily-plans';

/**
 * Configure Android notification channels and request permission
 */
export async function registerForNotificationsAsync(): Promise<boolean> {
  if (Platform.OS === 'web') {
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
    console.warn('Error setting up notifications permissions:', err);
    return false;
  }
}

/**
 * Schedules a daily recurring notification at 8:00 AM for today's plans
 */
export async function scheduleDaily8AMPlanNotification(hour: number = 8, minute: number = 0): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  try {
    const hasPermission = await registerForNotificationsAsync();
    if (!hasPermission) {
      console.log('Notification permission not granted');
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

    console.log(`Scheduled daily notification for ${hour}:${minute.toString().padStart(2, '0')}`);
    return true;
  } catch (error) {
    console.error('Failed to schedule daily notification:', error);
    return false;
  }
}

/**
 * Cancels any active daily notification
 */
export async function cancelDailyPlanNotification(): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const item of scheduled) {
      if (item.identifier === DAILY_NOTIFICATION_ID || item.content?.data?.type === 'daily-plan-reminder') {
        await Notifications.cancelScheduledNotificationAsync(item.identifier);
      }
    }
  } catch (err) {
    console.warn('Error cancelling notification:', err);
  }
}

/**
 * Sends an instant test notification to verify notification delivery
 */
export async function sendTestNotification(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  try {
    const hasPermission = await registerForNotificationsAsync();
    if (!hasPermission) return false;

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
    return true;
  } catch (err) {
    console.error('Failed to send test notification:', err);
    return false;
  }
}

/**
 * Check if the daily reminder is currently active
 */
export async function isDailyNotificationScheduled(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    return scheduled.some(
      (s) => s.identifier === DAILY_NOTIFICATION_ID || s.content?.data?.type === 'daily-plan-reminder'
    );
  } catch {
    return false;
  }
}
