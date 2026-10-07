import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useThemeColors } from '@/hooks/useThemeColors';
import { scheduleDaily8AMPlanNotification, setupNotificationListeners } from '@/services/notifications';
import { router } from 'expo-router';

// Prevent auto hiding before app is ready
SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function RootLayout() {
  const { isDark, colors } = useThemeColors();

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
    // Schedule 8:00 AM daily notifications for today's plans
    scheduleDaily8AMPlanNotification(8, 0).catch(() => {});

    // Listen for notification taps to navigate to Today
    const cleanupListeners = setupNotificationListeners((url) => {
      router.push(url as any);
    });

    return () => {
      cleanupListeners();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style={isDark ? 'light' : 'dark'} />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="plan/create"
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom',
              }}
            />
            <Stack.Screen
              name="plan/[id]"
              options={{
                presentation: 'card',
                animation: 'slide_from_right',
              }}
            />
          </Stack>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
