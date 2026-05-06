import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { insertNotification } from './database';
import type { GlucosePattern } from './patterns';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  if (!Device.isDevice) return true; // Simulator always ok

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('glucose-alerts', {
      name: 'Glucose Alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#00BFA5',
    });
  }

  return finalStatus === 'granted';
}

export async function sendSpikeAlert(glucoseValue: number): Promise<void> {
  const message = `📈 Glucose rising — ${glucoseValue} mmol/L. What did you eat?`;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: '⚠️ GlucoMind Alert',
      body: message,
      data: { type: 'spike', action: 'log_meal' },
      sound: true,
    },
    trigger: null,
  });

  await insertNotification({
    type: 'spike',
    message,
    timestamp: Date.now(),
    read: false,
  });
}

export async function sendHighAlert(glucoseValue: number): Promise<void> {
  const message = `🔴 High glucose: ${glucoseValue} mmol/L for 30+ minutes. Check your levels.`;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🚨 High Glucose',
      body: message,
      data: { type: 'high' },
      sound: true,
    },
    trigger: null,
  });

  await insertNotification({
    type: 'high',
    message,
    timestamp: Date.now(),
    read: false,
  });
}

export async function sendLowAlert(glucoseValue: number): Promise<void> {
  const message = `🔴 LOW glucose: ${glucoseValue} mmol/L. Treat immediately!`;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🚨 LOW GLUCOSE',
      body: message,
      data: { type: 'low' },
      sound: true,
    },
    trigger: null,
  });

  await insertNotification({
    type: 'low',
    message,
    timestamp: Date.now(),
    read: false,
  });
}

export async function sendInsulinReminder(minutesAgo: number): Promise<void> {
  const message = `💉 You ate ${minutesAgo} minutes ago but haven't logged insulin. Did you bolus?`;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Insulin Reminder',
      body: message,
      data: { type: 'insulin_reminder', action: 'log_insulin' },
      sound: false,
    },
    trigger: null,
  });

  await insertNotification({
    type: 'insulin_reminder',
    message,
    timestamp: Date.now(),
    read: false,
  });
}

/** Send a plain-text pattern alert (legacy / internal use) */
export async function sendPatternAlertMessage(message: string): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '💡 Pattern Detected',
      body: message,
      data: { type: 'pattern' },
      sound: false,
    },
    trigger: null,
  });

  await insertNotification({
    type: 'pattern',
    message,
    timestamp: Date.now(),
    read: false,
  });
}

/** Send a structured GlucosePattern alert notification */
export async function sendPatternAlert(pattern: GlucosePattern): Promise<void> {
  const severityEmoji =
    pattern.severity === 'alert' ? '🚨' : pattern.severity === 'warning' ? '⚠️' : '💡';

  const title = `${severityEmoji} ${pattern.title}`;
  const body = `${pattern.description} ${pattern.recommendation}`;

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: { type: 'pattern', patternType: pattern.type, severity: pattern.severity },
      sound: pattern.severity === 'alert',
    },
    trigger: null,
  });

  await insertNotification({
    type: 'pattern',
    message: `${pattern.title}: ${pattern.description}`,
    timestamp: Date.now(),
    read: false,
  });
}

/**
 * Hypo Prediction — warn BEFORE going low
 */
export async function sendHypoPredictionAlert(currentGlucose: number, predictedLowIn: number, targetLow: number, iob?: number): Promise<void> {
  const iobNote = iob && iob > 0.5 ? ` (${iob.toFixed(1)}u insulin still active)` : '';
  const message = `📉 Glucose is ${currentGlucose} mmol/L and dropping — predicted to go below ${targetLow} in ~${predictedLowIn} min${iobNote}. Consider a snack.`;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: '⚠️ Low Predicted',
      body: message,
      data: { screen: 'log-meal', action: 'hypo_prediction', prefillDesc: '15g glucose tablets', prefillCarbs: '15' },
      sound: true,
    },
    trigger: null,
  });

  await insertNotification({
    type: 'hypo_prediction',
    message,
    timestamp: Date.now(),
    read: false,
  });
}

/**
 * SMART ACTIONABLE NOTIFICATIONS (with deep links and scheduled triggers)
 */

export async function sendSpikePrompt(currentGlucose: number, riseAmount: number): Promise<void> {
  const message = `📈 Glucose rising fast (+${riseAmount.toFixed(1)}mmol/L) — Did you eat something?`;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Rapid Glucose Rise',
      body: message,
      data: { screen: 'log-meal', action: 'prompt_after_spike' },
      sound: true,
    },
    trigger: null,
  });
  await insertNotification({
    type: 'spike_prompt',
    message,
    timestamp: Date.now(),
    read: false,
  });
}

export async function sendHighWithPrompt(currentGlucose: number, hasRecentInsulin: boolean): Promise<void> {
  let message: string;
  let data: any = { type: 'high_with_prompt' };

  if (!hasRecentInsulin) {
    message = `🔴 High glucose (${currentGlucose} mmol/L) — Have you taken your correction dose?`;
    data = { ...data, screen: 'log-insulin', action: 'correction_suggested' };
  } else {
    message = `🔴 Still high (${currentGlucose} mmol/L) — Correction may not have kicked in yet. Monitor closely.`;
    // No deep link for this variant
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'High Glucose',
      body: message,
      data,
      sound: true,
    },
    trigger: null,
  });
  await insertNotification({
    type: 'high_with_prompt',
    message,
    timestamp: Date.now(),
    read: false,
  });
}

export async function sendLowWithPrompt(currentGlucose: number): Promise<void> {
  const message = `⚠️ Low glucose (${currentGlucose} mmol/L) — Take 15g fast carbs now!`;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Low Glucose',
      body: message,
      data: { screen: 'log-meal', action: 'hypo_treatment', prefillDesc: '15g glucose tablets', prefillCarbs: '15' },
      sound: true,
    },
    trigger: null,
  });
  await insertNotification({
    type: 'low_with_prompt',
    message,
    timestamp: Date.now(),
    read: false,
  });
}

export async function sendPostMealCheckPrompt(mealDescription: string, mealTimestamp: number): Promise<void> {
  const message = `🍽️ It's been 90 mins since ${mealDescription} — how's your glucose looking?`;
  // 90 min = 5400s
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Post-Meal Check',
      body: message,
      data: { screen: 'index' },
      sound: true,
    },
    trigger: {
      type: SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 90 * 60,
      repeats: false,
      channelId: Platform.OS === 'android' ? 'glucose-alerts' : undefined,
    },
  });
  await insertNotification({
    type: 'post_meal_check',
    message,
    timestamp: mealTimestamp + 90 * 60 * 1000,
    read: false,
  });
}

export async function sendMissedBoluPrompt(mealDescription: string, carbAmount: number): Promise<void> {
  const message = `💉 You logged ${carbAmount}g carbs for ${mealDescription} — did you take insulin?`;
  // 15 min = 900s
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Bolus Reminder',
      body: message,
      data: { screen: 'log-insulin', action: 'missed_bolus_check' },
      sound: true,
    },
    trigger: {
      type: SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 15 * 60,
      repeats: false,
      channelId: Platform.OS === 'android' ? 'glucose-alerts' : undefined,
    },
  });
  await insertNotification({
    type: 'missed_bolus',
    message,
    timestamp: Date.now() + 15 * 60 * 1000,
    read: false,
  });
}

export async function sendDawnPhenomenonAlert(morningGlucose: number): Promise<void> {
  const message = `🌅 Dawn phenomenon detected — woke at ${morningGlucose} mmol/L. Consider adjusting your evening basal.`;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Dawn Phenomenon',
      body: message,
      data: { screen: 'chat', action: 'dawn_phenomenon_advice' },
      sound: true,
    },
    trigger: null,
  });
  await insertNotification({
    type: 'dawn_phenomenon',
    message,
    timestamp: Date.now(),
    read: false,
  });
}

