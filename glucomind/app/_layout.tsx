import { useEffect, useState, useCallback } from 'react';
import { Stack, useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { initDatabase, getAppState, getSetting } from '../services/database';
// Demo data removed — using real HealthKit data only
import { requestNotificationPermissions } from '../services/notifications';
import { registerBackgroundSync } from '../services/background-sync';
import { initRemindersTable, rescheduleAllReminders } from '../services/reminders';
import { registerPushToken } from '../services/push-registration';
import { Colors } from '../constants/colors';
import { KeyboardDoneBar } from '../components/DismissKeyboard';
import { getCurrentUser, fetchProfile } from '../services/supabase';

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [initialRoute, setInitialRoute] = useState<'auth' | 'tabs' | 'onboarding' | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function init() {
      try {
        await initDatabase();
        // No demo data — real HealthKit data only
        await requestNotificationPermissions();
        await registerBackgroundSync();
        await initRemindersTable();
        await rescheduleAllReminders();

        // Register push token with server (non-blocking)
        registerPushToken().catch(() => {});

        const user = await getCurrentUser();
        if (!user) {
          setInitialRoute('auth');
          return;
        }
        // Check onboarding status
        const profile = await fetchProfile();
        if (!profile || profile.onboarding_done === false) {
          setInitialRoute('onboarding');
        } else {
          setInitialRoute('tabs');
        }
      } catch (e) {
        console.error('Init error:', e);
        setInitialRoute('tabs'); // fail open
      } finally {
        setReady(true);
      }
    }
    init();
  }, []);


  // Handle notification deep links (both warm and cold launch)
  const handleNotificationRoute = useCallback((data: any) => {
    if (!data?.screen) return;
    // Small delay to ensure navigator is mounted
    setTimeout(() => {
      switch (data.screen) {
        case 'log-meal':
          router.push({
            pathname: '/log-meal',
            params: {
              prefillDesc: data.prefillDesc ?? '',
              prefillCarbs: data.prefillCarbs ?? '',
            },
          });
          break;
        case 'log-insulin':
          router.push('/log-insulin');
          break;
        case 'chat':
          router.push('/(tabs)/chat');
          break;
        case 'index':
          router.push('/(tabs)');
          break;
      }
    }, 300);
  }, [router]);

  // Listener for taps when app is already open (warm launch)
  useEffect(() => {
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      handleNotificationRoute(response.notification.request.content.data);
    });
    return () => responseListener.remove();
  }, [handleNotificationRoute]);

  // Handle cold launch — app opened by tapping a notification when fully closed
  useEffect(() => {
    if (!ready) return;
    Notifications.getLastNotificationResponseAsync().then(response => {
      if (response) {
        handleNotificationRoute(response.notification.request.content.data);
      }
    });
  }, [ready, handleNotificationRoute]);

  // Navigate once ready — small timeout ensures navigator is mounted
  useEffect(() => {
    if (!ready) return;
    if (initialRoute === 'auth') {
      const t = setTimeout(() => router.replace('/auth'), 100);
      return () => clearTimeout(t);
    }
    if (initialRoute === 'onboarding') {
      const t = setTimeout(() => router.replace('/onboarding'), 100);
      return () => clearTimeout(t);
    }
  }, [ready, initialRoute]);

  if (!ready) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <StatusBar style="dark" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.textPrimary,
          headerTitleStyle: { fontWeight: '600', color: Colors.textPrimary },
          contentStyle: { backgroundColor: Colors.background },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen
          name="log-meal"
          options={{ title: 'Log Meal', presentation: 'modal', headerStyle: { backgroundColor: Colors.surface } }}
        />
        <Stack.Screen
          name="log-insulin"
          options={{ title: 'Log Insulin', presentation: 'modal', headerStyle: { backgroundColor: Colors.surface } }}
        />
        <Stack.Screen
          name="log-activity"
          options={{ title: 'Log Activity', presentation: 'modal', headerStyle: { backgroundColor: Colors.surface } }}
        />
        <Stack.Screen
          name="report"
          options={{ title: 'Diabetes Report', presentation: 'modal', headerStyle: { backgroundColor: Colors.surface } }}
        />
        <Stack.Screen
          name="connections"
          options={{ title: 'Connections', headerStyle: { backgroundColor: Colors.background } }}
        />
        <Stack.Screen
          name="challenges"
          options={{ title: 'Weekly Challenges', headerStyle: { backgroundColor: Colors.background } }}
        />
        <Stack.Screen
          name="log-factors"
          options={{ title: 'Log Factors', presentation: 'modal', headerStyle: { backgroundColor: Colors.surface } }}
        />
        <Stack.Screen
          name="food-scanner"
          options={{ title: 'Food Scanner', presentation: 'modal', headerStyle: { backgroundColor: Colors.surface } }}
        />
        <Stack.Screen
          name="sos"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="emergency-contacts"
          options={{ title: 'Emergency Contacts', headerStyle: { backgroundColor: Colors.background } }}
        />
        <Stack.Screen
          name="reminders"
          options={{ title: 'Reminders', presentation: 'modal', headerStyle: { backgroundColor: Colors.surface } }}
        />
      </Stack>
      <KeyboardDoneBar />
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
