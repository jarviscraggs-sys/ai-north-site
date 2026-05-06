import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Animated,
  Platform,
  KeyboardAvoidingView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { setSetting, setAppState } from '../services/database';
import { requestHealthKitPermissions, isHealthKitAvailable } from '../services/healthkit';
import { testShareCredentials, saveShareCredentials } from '../services/dexcom-share';
import { testConnection as testNightscoutConnection, saveNightscoutCredentials } from '../services/nightscout';
import { testCredentials as testTidepoolCredentials, saveTidepoolCredentials } from '../services/tidepool';
import { initialSync } from '../services/sync';

// ─── Types ────────────────────────────────────────────────────────────────────

type DiabetesType = 'Type 1' | 'Type 2' | 'LADA' | 'Other';

interface OnboardingState {
  name: string;
  diabetesType: DiabetesType | null;
  yearDiagnosed: string;
  targetLow: number;
  targetHigh: number;
  rapidActing: string[];
  longActing: string[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DIABETES_TYPES: DiabetesType[] = ['Type 1', 'Type 2', 'LADA', 'Other'];

const RAPID_ACTING = ['NovoRapid', 'Humalog', 'Fiasp', 'Apidra', 'Lyumjev', 'Other'];
const LONG_ACTING = ['Tresiba', 'Lantus', 'Levemir', 'Toujeo', 'Other'];

const TOTAL_STEPS = 5;

// ─── Progress Dots ────────────────────────────────────────────────────────────

function ProgressDots({ current }: { current: number }) {
  return (
    <View style={styles.dotsContainer}>
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i === current - 1 ? styles.dotActive : i < current - 1 ? styles.dotDone : styles.dotInactive,
          ]}
        />
      ))}
    </View>
  );
}

// ─── Chip ─────────────────────────────────────────────────────────────────────

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Range Indicator ──────────────────────────────────────────────────────────

function RangeIndicator({ low, high }: { low: number; high: number }) {
  const MIN = 2;
  const MAX = 20;
  const range = MAX - MIN;
  const lowPct = ((low - MIN) / range) * 100;
  const highPct = ((high - MIN) / range) * 100;

  return (
    <View style={styles.rangeTrack}>
      <View style={[styles.rangeFill, { left: `${lowPct}%`, right: `${100 - highPct}%` }]} />
      <View style={[styles.rangeThumb, { left: `${lowPct}%` }]}>
        <Text style={styles.rangeThumbLabel}>{low.toFixed(1)}</Text>
      </View>
      <View style={[styles.rangeThumb, styles.rangeThumbHigh, { left: `${highPct}%` }]}>
        <Text style={styles.rangeThumbLabel}>{high.toFixed(1)}</Text>
      </View>
    </View>
  );
}

// ─── Stepper ──────────────────────────────────────────────────────────────────

function Stepper({
  label,
  value,
  onDecrement,
  onIncrement,
}: {
  label: string;
  value: number;
  onDecrement: () => void;
  onIncrement: () => void;
}) {
  return (
    <View style={styles.stepperRow}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <View style={styles.stepperControls}>
        <TouchableOpacity style={styles.stepperBtn} onPress={onDecrement} activeOpacity={0.7}>
          <Ionicons name="remove" size={20} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.stepperValue}>{value.toFixed(1)}</Text>
        <TouchableOpacity style={styles.stepperBtn} onPress={onIncrement} activeOpacity={0.7}>
          <Ionicons name="add" size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Step 5: data source connection states
  const [connectedSource, setConnectedSource] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [hkLoading, setHkLoading] = useState(false);
  const [nsLoading, setNsLoading] = useState(false);
  const [tpLoading, setTpLoading] = useState(false);

  const [state, setState] = useState<OnboardingState>({
    name: '',
    diabetesType: null,
    yearDiagnosed: '',
    targetLow: 4.0,
    targetHigh: 10.0,
    rapidActing: [],
    longActing: [],
  });

  function animateStep(nextStep: number) {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
    setStep(nextStep);
  }

  function goNext() {
    if (step < TOTAL_STEPS) animateStep(step + 1);
  }

  function goBack() {
    if (step > 1) animateStep(step - 1);
  }

  function toggleRapid(insulin: string) {
    setState(s => ({
      ...s,
      rapidActing: s.rapidActing.includes(insulin)
        ? s.rapidActing.filter(x => x !== insulin)
        : [...s.rapidActing, insulin],
    }));
  }

  function toggleLong(insulin: string) {
    setState(s => ({
      ...s,
      longActing: s.longActing.includes(insulin)
        ? s.longActing.filter(x => x !== insulin)
        : [...s.longActing, insulin],
    }));
  }

  function adjustLow(delta: number) {
    setState(s => {
      const next = Math.round((s.targetLow + delta) * 10) / 10;
      if (next < 2 || next >= s.targetHigh) return s;
      return { ...s, targetLow: next };
    });
  }

  function adjustHigh(delta: number) {
    setState(s => {
      const next = Math.round((s.targetHigh + delta) * 10) / 10;
      if (next > 20 || next <= s.targetLow) return s;
      return { ...s, targetHigh: next };
    });
  }

  // ─── Step 5: Connect Handlers ───────────────────────────────────────────

  async function connectHealthKit() {
    if (!isHealthKitAvailable()) {
      Alert.alert('Not Available', 'Apple Health is only available on iOS devices.');
      return;
    }
    setHkLoading(true);
    try {
      const granted = await requestHealthKitPermissions();
      if (granted) {
        await setSetting('healthkit_connected', 'true');
        setConnectedSource('apple-health');
        Alert.alert('Connected!', 'Apple Health connected. Glucose data will sync automatically.');
      } else {
        Alert.alert('Permission Denied', 'You can connect Apple Health later from Settings → Connections.');
      }
    } catch (e) {
      console.error('HealthKit error:', e);
      Alert.alert('Error', 'Could not connect to Apple Health. You can try again from Settings.');
    } finally {
      setHkLoading(false);
    }
  }

  function connectDexcomShare() {
    Alert.prompt(
      'Dexcom Share',
      'Enter your Dexcom username (NOT email — the username from the Dexcom app)',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Next',
          onPress: (username?: string) => {
            if (!username || username.trim().length === 0) {
              Alert.alert('Error', 'Please enter your Dexcom username.');
              return;
            }
            promptSharePassword(username.trim());
          },
        },
      ],
      'plain-text',
      '',
      'default'
    );
  }

  function promptSharePassword(username: string) {
    Alert.prompt(
      'Dexcom Password',
      `Enter the password for ${username}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Connect',
          onPress: async (password?: string) => {
            if (!password || password.trim().length === 0) {
              Alert.alert('Error', 'Please enter your Dexcom password.');
              return;
            }
            setShareLoading(true);
            try {
              const result = await testShareCredentials(username, password.trim());
              if (!result.success) {
                Alert.alert('Connection Failed', result.error ?? 'Could not connect. Check your username and password.');
                return;
              }
              await saveShareCredentials(username, password.trim());
              await setSetting('data_source', 'dexcom-share');
              await initialSync();
              setConnectedSource('dexcom-share');
              Alert.alert('Dexcom Share Connected ✅', `Live CGM data is now syncing! Found ${result.readings ?? 0} recent readings.`);
            } catch (err: any) {
              Alert.alert('Connection Failed', err?.message ?? 'Could not connect to Dexcom Share.');
            } finally {
              setShareLoading(false);
            }
          },
        },
      ],
      'secure-text',
      ''
    );
  }

  function connectNightscout() {
    Alert.prompt(
      'Connect Nightscout',
      'Enter your Nightscout URL (e.g. https://mysite.herokuapp.com)',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Next',
          onPress: (url?: string) => {
            if (!url || url.trim().length === 0) {
              Alert.alert('Error', 'Please enter a valid Nightscout URL.');
              return;
            }
            promptNightscoutToken(url.trim());
          },
        },
      ],
      'plain-text',
      '',
      'url'
    );
  }

  function promptNightscoutToken(url: string) {
    Alert.prompt(
      'API Token (Optional)',
      'Enter your Nightscout API secret or token, or leave blank for public sites.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Connect',
          onPress: async (token?: string) => {
            setNsLoading(true);
            try {
              const result = await testNightscoutConnection(
                url,
                token && token.trim().length > 0 ? token.trim() : undefined
              );
              if (!result.success) {
                Alert.alert('Connection Failed', result.error ?? 'Could not reach your Nightscout site.');
                return;
              }
              await saveNightscoutCredentials(
                url,
                token && token.trim().length > 0 ? token.trim() : undefined
              );
              await setSetting('data_source', 'nightscout');
              await initialSync();
              setConnectedSource('nightscout');
              Alert.alert('Nightscout Connected ✅', 'Your CGM data is now syncing from Nightscout.');
            } catch (err: any) {
              Alert.alert('Connection Failed', err?.message ?? 'Could not connect to Nightscout.');
            } finally {
              setNsLoading(false);
            }
          },
        },
      ],
      'plain-text',
      ''
    );
  }

  function connectTidepool() {
    Alert.prompt(
      'Connect Tidepool',
      'Enter your Tidepool email address',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Next',
          onPress: (email?: string) => {
            if (!email || email.trim().length === 0) {
              Alert.alert('Error', 'Please enter your Tidepool email.');
              return;
            }
            promptTidepoolPassword(email.trim());
          },
        },
      ],
      'plain-text',
      '',
      'email-address'
    );
  }

  function promptTidepoolPassword(email: string) {
    Alert.prompt(
      'Tidepool Password',
      `Enter the password for ${email}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Connect',
          onPress: async (password?: string) => {
            if (!password || password.trim().length === 0) {
              Alert.alert('Error', 'Please enter your Tidepool password.');
              return;
            }
            setTpLoading(true);
            try {
              const result = await testTidepoolCredentials(email, password.trim());
              if (!result.success || !result.session) {
                Alert.alert('Connection Failed', result.error ?? 'Could not log in to Tidepool.');
                return;
              }
              await saveTidepoolCredentials(email, password.trim(), result.session);
              await setSetting('data_source', 'tidepool');
              await initialSync();
              setConnectedSource('tidepool');
              Alert.alert('Tidepool Connected ✅', 'Your glucose data is now syncing from Tidepool.');
            } catch (err: any) {
              Alert.alert('Connection Failed', err?.message ?? 'Could not connect to Tidepool.');
            } finally {
              setTpLoading(false);
            }
          },
        },
      ],
      'secure-text',
      ''
    );
  }

  async function finishSetup() {
    if (saving) return;
    setSaving(true);
    try {
      const allInsulins = [...state.rapidActing, ...state.longActing];

      await setSetting('user_name', state.name || 'Friend');
      await setSetting('diabetes_type', state.diabetesType ?? 'Other');
      await setSetting('year_diagnosed', state.yearDiagnosed);
      await setSetting('target_low', state.targetLow.toString());
      await setSetting('target_high', state.targetHigh.toString());
      await setSetting('insulin_types', JSON.stringify(allInsulins.length > 0 ? allInsulins : ['NovoRapid', 'Tresiba']));
      await setAppState('onboarding_complete', 'true');

      router.replace('/(tabs)');
    } catch (e) {
      console.error('Finish setup error:', e);
      setSaving(false);
      Alert.alert('Error', 'Could not save settings. Please try again.');
    }
  }

  // ─── Steps ─────────────────────────────────────────────────────────────────

  function renderStep() {
    switch (step) {
      // ── Step 1: Welcome ──────────────────────────────────────────────────
      case 1:
        return (
          <View style={styles.stepContent}>
            <View style={styles.logoContainer}>
              <Ionicons name="pulse" size={80} color={Colors.primary} />
            </View>
            <Text style={styles.heading}>Welcome to GlucoMind</Text>
            <Text style={styles.subtitle}>Your AI-powered diabetes companion</Text>
            <Text style={styles.description}>
              Smart glucose tracking, personalised AI insights, and tools built for Type 1 & Type 2 diabetics.
            </Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={goNext} activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>Get Started</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          </View>
        );

      // ── Step 2: About You ────────────────────────────────────────────────
      case 2:
        return (
          <View style={styles.stepContent}>
            <Ionicons name="person-circle-outline" size={52} color={Colors.primary} style={styles.stepIcon} />
            <Text style={styles.heading}>Tell us about yourself</Text>

            <Text style={styles.fieldLabel}>Your name</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Alex"
              placeholderTextColor={Colors.textMuted}
              value={state.name}
              onChangeText={t => setState(s => ({ ...s, name: t }))}
              autoCapitalize="words"
              returnKeyType="done"
            />

            <Text style={styles.fieldLabel}>Diabetes type</Text>
            <View style={styles.chipRow}>
              {DIABETES_TYPES.map(dt => (
                <Chip
                  key={dt}
                  label={dt}
                  selected={state.diabetesType === dt}
                  onPress={() => setState(s => ({ ...s, diabetesType: dt }))}
                />
              ))}
            </View>

            <Text style={styles.fieldLabel}>Year diagnosed</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. 2018"
              placeholderTextColor={Colors.textMuted}
              value={state.yearDiagnosed}
              onChangeText={t => setState(s => ({ ...s, yearDiagnosed: t.replace(/\D/g, '') }))}
              keyboardType="number-pad"
              maxLength={4}
              returnKeyType="done"
            />

            <TouchableOpacity style={styles.primaryBtn} onPress={goNext} activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>Next</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          </View>
        );

      // ── Step 3: Target Range ─────────────────────────────────────────────
      case 3:
        return (
          <View style={styles.stepContent}>
            <Ionicons name="analytics-outline" size={52} color={Colors.primary} style={styles.stepIcon} />
            <Text style={styles.heading}>Set your glucose targets</Text>

            <RangeIndicator low={state.targetLow} high={state.targetHigh} />
            <Text style={styles.rangeNote}>
              {state.targetLow.toFixed(1)} – {state.targetHigh.toFixed(1)} mmol/L
            </Text>

            <Stepper
              label="Low target"
              value={state.targetLow}
              onDecrement={() => adjustLow(-0.1)}
              onIncrement={() => adjustLow(0.1)}
            />
            <Stepper
              label="High target"
              value={state.targetHigh}
              onDecrement={() => adjustHigh(-0.1)}
              onIncrement={() => adjustHigh(0.1)}
            />

            <View style={styles.nhsNote}>
              <Ionicons name="information-circle-outline" size={16} color={Colors.textSecondary} />
              <Text style={styles.nhsNoteText}>
                These match NHS standard targets. Adjust if your consultant has set different goals.
              </Text>
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={goNext} activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>Next</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          </View>
        );

      // ── Step 4: Insulin ──────────────────────────────────────────────────
      case 4:
        return (
          <View style={styles.stepContent}>
            <Ionicons name="medical-outline" size={52} color={Colors.primary} style={styles.stepIcon} />
            <Text style={styles.heading}>What insulin do you use?</Text>

            <Text style={styles.insulinCategory}>⚡ Rapid-acting</Text>
            <View style={styles.chipRow}>
              {RAPID_ACTING.map(ins => (
                <Chip
                  key={ins}
                  label={ins}
                  selected={state.rapidActing.includes(ins)}
                  onPress={() => toggleRapid(ins)}
                />
              ))}
            </View>

            <Text style={[styles.insulinCategory, { marginTop: 16 }]}>🌙 Long-acting / Basal</Text>
            <View style={styles.chipRow}>
              {LONG_ACTING.map(ins => (
                <Chip
                  key={ins}
                  label={ins}
                  selected={state.longActing.includes(ins)}
                  onPress={() => toggleLong(ins)}
                />
              ))}
            </View>

            <Text style={styles.skipHint}>Skip if you don't use insulin</Text>

            <TouchableOpacity style={styles.primaryBtn} onPress={goNext} activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>Next</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          </View>
        );

      // ── Step 5: Connect Data ─────────────────────────────────────────────
      case 5:
        return (
          <View style={styles.stepContent}>
            <Ionicons name="wifi-outline" size={52} color={Colors.primary} style={styles.stepIcon} />
            <Text style={styles.heading}>Connect your CGM</Text>
            <Text style={styles.subtitle}>Choose a data source for real-time glucose tracking</Text>

            {/* Dexcom Share — Recommended */}
            <View style={[
              styles.optionCard,
              connectedSource === 'dexcom-share' && styles.optionCardConnected,
            ]}>
              <View style={styles.optionCardHeader}>
                <View style={styles.optionCardLeft}>
                  <View style={[styles.optionIconWrap, { backgroundColor: '#22C55E22' }]}>
                    <Ionicons name="pulse" size={24} color="#22C55E" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={styles.optionNameRow}>
                      <Text style={styles.optionCardTitle}>Dexcom Share</Text>
                      <View style={styles.recommendedBadge}>
                        <Text style={styles.recommendedBadgeText}>Recommended</Text>
                      </View>
                    </View>
                    <Text style={styles.optionCardDesc}>
                      Live CGM data directly from your Dexcom account
                    </Text>
                  </View>
                </View>
                {connectedSource === 'dexcom-share' && (
                  <Ionicons name="checkmark-circle" size={24} color="#22C55E" />
                )}
              </View>
              {connectedSource !== 'dexcom-share' && (
                <TouchableOpacity
                  style={styles.connectBtn}
                  onPress={connectDexcomShare}
                  activeOpacity={0.8}
                  disabled={shareLoading}
                >
                  {shareLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.connectBtnText}>Connect</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>

            {/* Apple Health */}
            <View style={[
              styles.optionCard,
              connectedSource === 'apple-health' && styles.optionCardConnected,
            ]}>
              <View style={styles.optionCardHeader}>
                <View style={styles.optionCardLeft}>
                  <View style={[styles.optionIconWrap, { backgroundColor: '#FF3B5C22' }]}>
                    <Ionicons name="heart" size={24} color="#FF3B5C" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.optionCardTitle}>Apple Health</Text>
                    <Text style={styles.optionCardDesc}>
                      Reads glucose from Dexcom, Libre & other apps via HealthKit
                    </Text>
                  </View>
                </View>
                {connectedSource === 'apple-health' && (
                  <Ionicons name="checkmark-circle" size={24} color="#22C55E" />
                )}
              </View>
              {connectedSource !== 'apple-health' && (
                <TouchableOpacity
                  style={styles.connectBtn}
                  onPress={connectHealthKit}
                  activeOpacity={0.8}
                  disabled={hkLoading}
                >
                  {hkLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.connectBtnText}>Connect</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>

            {/* Nightscout */}
            <View style={[
              styles.optionCard,
              connectedSource === 'nightscout' && styles.optionCardConnected,
            ]}>
              <View style={styles.optionCardHeader}>
                <View style={styles.optionCardLeft}>
                  <View style={[styles.optionIconWrap, { backgroundColor: '#22C55E22' }]}>
                    <Ionicons name="globe-outline" size={24} color="#22C55E" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.optionCardTitle}>Nightscout</Text>
                    <Text style={styles.optionCardDesc}>
                      Open-source CGM data from your self-hosted Nightscout site
                    </Text>
                  </View>
                </View>
                {connectedSource === 'nightscout' && (
                  <Ionicons name="checkmark-circle" size={24} color="#22C55E" />
                )}
              </View>
              {connectedSource !== 'nightscout' && (
                <TouchableOpacity
                  style={styles.connectBtn}
                  onPress={connectNightscout}
                  activeOpacity={0.8}
                  disabled={nsLoading}
                >
                  {nsLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.connectBtnText}>Connect</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>

            {/* Tidepool */}
            <View style={[
              styles.optionCard,
              connectedSource === 'tidepool' && styles.optionCardConnected,
            ]}>
              <View style={styles.optionCardHeader}>
                <View style={styles.optionCardLeft}>
                  <View style={[styles.optionIconWrap, { backgroundColor: '#0EA5E922' }]}>
                    <Ionicons name="water-outline" size={24} color="#0EA5E9" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.optionCardTitle}>Tidepool</Text>
                    <Text style={styles.optionCardDesc}>
                      Sync glucose data from your Tidepool account
                    </Text>
                  </View>
                </View>
                {connectedSource === 'tidepool' && (
                  <Ionicons name="checkmark-circle" size={24} color="#22C55E" />
                )}
              </View>
              {connectedSource !== 'tidepool' && (
                <TouchableOpacity
                  style={styles.connectBtn}
                  onPress={connectTidepool}
                  activeOpacity={0.8}
                  disabled={tpLoading}
                >
                  {tpLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.connectBtnText}>Connect</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>

            {/* Skip for now */}
            <TouchableOpacity
              style={[styles.optionCard, styles.optionCardDim]}
              onPress={finishSetup}
              activeOpacity={0.7}
              disabled={saving}
            >
              <View style={styles.optionCardLeft}>
                <View style={[styles.optionIconWrap, { backgroundColor: Colors.cardBorder }]}>
                  <Ionicons name="flask-outline" size={24} color={Colors.textMuted} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.optionCardTitle, { color: Colors.textMuted }]}>Skip for now</Text>
                  <Text style={styles.optionCardDesc}>Use demo data — connect anytime later</Text>
                </View>
              </View>
            </TouchableOpacity>

            <View style={styles.nhsNote}>
              <Ionicons name="information-circle-outline" size={16} color={Colors.textSecondary} />
              <Text style={styles.nhsNoteText}>
                You can change this anytime from Settings → Connections
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, saving && styles.primaryBtnDisabled]}
              onPress={finishSetup}
              activeOpacity={0.85}
              disabled={saving}
            >
              <Text style={styles.primaryBtnText}>
                {saving ? 'Saving…' : connectedSource ? 'Finish Setup' : 'Finish Setup'}
              </Text>
              {!saving && <Ionicons name="checkmark" size={18} color="#fff" style={{ marginLeft: 8 }} />}
            </TouchableOpacity>
          </View>
        );

      default:
        return null;
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header row: back button + progress dots */}
      <View style={styles.header}>
        {step > 1 ? (
          <TouchableOpacity style={styles.backBtn} onPress={goBack} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color={Colors.textSecondary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.backBtnPlaceholder} />
        )}
        <ProgressDots current={step} />
        <View style={styles.backBtnPlaceholder} />
      </View>

      {/* Step content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          {renderStep()}
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: Colors.surface,
  },
  backBtnPlaceholder: {
    width: 40,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 24,
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  dotDone: {
    backgroundColor: Colors.primaryLight,
  },
  dotInactive: {
    backgroundColor: Colors.cardBorder,
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  stepContent: {
    flex: 1,
    paddingTop: 16,
  },

  // Welcome step
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 24,
  },
  heading: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 40,
    paddingHorizontal: 8,
  },

  stepIcon: {
    alignSelf: 'center',
    marginBottom: 20,
    marginTop: 8,
  },

  // Inputs
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
    marginTop: 20,
  },
  textInput: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
    paddingHorizontal: 16,
    fontSize: 16,
    color: Colors.textPrimary,
    backgroundColor: Colors.surface,
  },

  // Chips
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.surface,
  },
  chipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: '#fff',
  },

  // Range indicator
  rangeTrack: {
    height: 8,
    backgroundColor: Colors.cardBorder,
    borderRadius: 4,
    marginVertical: 24,
    position: 'relative',
  },
  rangeFill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  rangeThumb: {
    position: 'absolute',
    top: -14,
    width: 36,
    height: 36,
    marginLeft: -18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 18,
    shadowColor: Colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  rangeThumbHigh: {
    backgroundColor: Colors.primaryDark,
  },
  rangeThumbLabel: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  rangeNote: {
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
    color: Colors.primary,
    marginTop: 8,
    marginBottom: 8,
  },

  // Stepper
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  stepperLabel: {
    fontSize: 15,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  stepperBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
    minWidth: 40,
    textAlign: 'center',
  },

  // NHS note
  nhsNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 12,
    marginTop: 20,
    marginBottom: 8,
  },
  nhsNoteText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },

  // Insulin categories
  insulinCategory: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: 20,
    marginBottom: 10,
  },
  skipHint: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 16,
  },

  // Option cards (Step 5)
  optionCard: {
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.card,
    padding: 16,
    marginTop: 12,
  },
  optionCardConnected: {
    borderColor: '#22C55E',
    backgroundColor: '#22C55E08',
  },
  optionCardDim: {
    opacity: 0.5,
  },
  optionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  optionCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  optionCardDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  recommendedBadge: {
    backgroundColor: '#22C55E',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  recommendedBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  connectBtn: {
    marginTop: 12,
    alignSelf: 'flex-end',
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 90,
    alignItems: 'center',
  },
  connectBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },

  // Primary button
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 14,
    height: 54,
    marginTop: 32,
    shadowColor: Colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  primaryBtnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
});
