import React, { useState, useEffect, useCallback } from 'react';
import { signOut } from '../../services/supabase';
// useRouter is already imported below, avoid duplicate
import {
  ScrollView, View, Text, StyleSheet, TextInput, Switch, TouchableOpacity, Alert, ActivityIndicator, Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/colors';
import { getAllSettings, setSetting, getSetting, getEmergencyContacts, insertEmergencyContact, deleteEmergencyContact, updateEmergencyContactEnabled } from '../../services/database';
import { Settings, CarbRatioResult, EmergencyContact } from '../../types';
import { getHealthKitStatusMessage } from '../../services/healthkit';
import { clearWidget } from '../../services/widget-bridge';
import { calculateCarbRatios, formatICR, formatISF } from '../../services/carb-ratio';
import {
  isConnected, loadTokens, clearTokens, launchDexcomAuth, exchangeCodeForTokens,
  getDevices, getLastSyncTime, DeviceRecord,
} from '../../services/dexcom';
import { initialSync } from '../../services/sync';
import Card from '../../components/Card';

export default function SettingsScreen() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saved, setSaved] = useState(false);
  const [carbRatios, setCarbRatios] = useState<CarbRatioResult | null>(null);
  const [loadingRatios, setLoadingRatios] = useState(false);
  const [manualICR, setManualICR] = useState('');
  const [manualISF, setManualISF] = useState('');
  const [ratiosSaved, setRatiosSaved] = useState(false);

  // Dexcom state
  const [dexcomConnected, setDexcomConnected] = useState(false);
  const [dexcomConnecting, setDexcomConnecting] = useState(false);
  const [dexcomDevice, setDexcomDevice] = useState<DeviceRecord | null>(null);
  const [dexcomLastSync, setDexcomLastSync] = useState<number | null>(null);
  const [useDexcomData, setUseDexcomData] = useState(false);

  // Widget state
  const [widgetEnabled, setWidgetEnabled] = useState(true);

  // Emergency contacts state
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [savingContact, setSavingContact] = useState(false);

  useEffect(() => {
    getAllSettings().then(setSettings);
    loadRatios();
    loadDexcomStatus();
    loadEmergencyContacts();
    getSetting('widget_enabled', 'true').then(v => setWidgetEnabled(v !== 'false'));
  }, []);

  const handleToggleWidget = async (value: boolean) => {
    setWidgetEnabled(value);
    await setSetting('widget_enabled', value.toString());
    if (!value) {
      await clearWidget();
    }
  };

  const loadEmergencyContacts = useCallback(async () => {
    const contacts = await getEmergencyContacts();
    setEmergencyContacts(contacts);
  }, []);

  const handleAddContact = async () => {
    if (!newContactName.trim() || !newContactPhone.trim()) {
      Alert.alert('Missing info', 'Please enter both a name and phone number.');
      return;
    }
    setSavingContact(true);
    try {
      await insertEmergencyContact({
        name: newContactName.trim(),
        phone: newContactPhone.trim(),
        enabled: true,
        created_at: Date.now(),
      });
      setNewContactName('');
      setNewContactPhone('');
      setShowAddContact(false);
      await loadEmergencyContacts();
    } finally {
      setSavingContact(false);
    }
  };

  const handleDeleteContact = (contact: EmergencyContact) => {
    Alert.alert(
      'Remove contact?',
      `Remove ${contact.name} from emergency contacts?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await deleteEmergencyContact(contact.id);
            await loadEmergencyContacts();
          },
        },
      ]
    );
  };

  const loadDexcomStatus = useCallback(async () => {
    const connected = await isConnected();
    setDexcomConnected(connected);
    const lastSync = await getLastSyncTime();
    setDexcomLastSync(lastSync);
    if (connected) {
      try {
        const resp = await getDevices();
        setDexcomDevice(resp.devices?.[0] ?? null);
      } catch {}
    }
    const storedMode = await getSetting('data_source', 'simulated');
    setUseDexcomData(storedMode === 'dexcom');
  }, []);

  const handleConnectDexcom = async () => {
    setDexcomConnecting(true);
    try {
      const code = await launchDexcomAuth();
      await exchangeCodeForTokens(code);
      // Initial sync of last 24h
      await initialSync();
      await setSetting('data_source', 'dexcom');
      setUseDexcomData(true);
      await loadDexcomStatus();
      Alert.alert('Connected ✅', 'Dexcom connected! Your last 24 hours of glucose data has been imported.');
    } catch (err: any) {
      Alert.alert('Connection Failed', err?.message ?? 'Could not connect to Dexcom. Please try again.');
    } finally {
      setDexcomConnecting(false);
    }
  };

  const handleDisconnectDexcom = () => {
    Alert.alert(
      'Disconnect Dexcom',
      'This will remove your Dexcom access tokens and switch back to demo mode.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            await clearTokens();
            await setSetting('data_source', 'simulated');
            setDexcomConnected(false);
            setDexcomDevice(null);
            setDexcomLastSync(null);
            setUseDexcomData(false);
          },
        },
      ]
    );
  };

  const handleToggleDataSource = async (value: boolean) => {
    if (value && !dexcomConnected) {
      Alert.alert('Not Connected', 'Please connect your Dexcom device first.');
      return;
    }
    setUseDexcomData(value);
    await setSetting('data_source', value ? 'dexcom' : 'simulated');
  };

  const loadRatios = async () => {
    setLoadingRatios(true);
    try {
      const [ratios, storedICR, storedISF] = await Promise.all([
        calculateCarbRatios(),
        getSetting('manual_icr', ''),
        getSetting('manual_isf', ''),
      ]);
      setCarbRatios(ratios);
      setManualICR(storedICR);
      setManualISF(storedISF);
    } catch (e) {
      console.error('Load ratios error:', e);
    } finally {
      setLoadingRatios(false);
    }
  };

  const saveRatios = async () => {
    await Promise.all([
      setSetting('manual_icr', manualICR),
      setSetting('manual_isf', manualISF),
    ]);
    setRatiosSaved(true);
    await loadRatios(); // Recalculate with new overrides
    setTimeout(() => setRatiosSaved(false), 1500);
  };

  const save = async (updates: Partial<Settings>) => {
    if (!settings) return;
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);

    // Persist each changed key
    const promises = Object.entries(updates).map(([key, value]) => {
      if (typeof value === 'boolean') return setSetting(key, value.toString());
      if (typeof value === 'number') return setSetting(key, value.toString());
      if (Array.isArray(value)) return setSetting(key, JSON.stringify(value));
      return setSetting(key, value as string);
    });
    await Promise.all(promises);

    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const router = useRouter();

  if (!settings) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Connections shortcut */}
      <TouchableOpacity
        style={connStyles.row}
        onPress={() => router.push('/connections' as any)}
        activeOpacity={0.7}
      >
        <View style={connStyles.iconWrap}>
          <Ionicons name="link" size={20} color={Colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={connStyles.label}>Connections &amp; Devices</Text>
          <Text style={connStyles.desc}>Manage HealthKit, Dexcom, and more</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
      </TouchableOpacity>

      {/* Safety / Emergency shortcut */}
      <TouchableOpacity
        style={[connStyles.row, { borderColor: '#CC000022', backgroundColor: '#CC000008' }]}
        onPress={() => router.push('/emergency-contacts' as any)}
        activeOpacity={0.7}
      >
        <View style={[connStyles.iconWrap, { backgroundColor: '#CC000022' }]}>
          <Ionicons name="warning" size={20} color="#CC0000" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[connStyles.label, { color: '#CC0000' }]}>Emergency Contacts</Text>
          <Text style={connStyles.desc}>Who to alert if you have a hypo</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
      </TouchableOpacity>

      {/* Personal */}
      <Text style={styles.sectionLabel}>Personal</Text>
      <Card>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Your Name</Text>
          <TextInput
            style={styles.input}
            value={settings.user_name}
            onChangeText={text => setSettings(s => s ? { ...s, user_name: text } : s)}
            onEndEditing={() => save({ user_name: settings.user_name })}
            placeholderTextColor={Colors.textMuted}
            keyboardAppearance="dark"
          />
        </View>
        <View style={[styles.field, styles.fieldBorder]}>
          <Text style={styles.fieldLabel}>Diagnosis Date</Text>
          <TextInput
            style={styles.input}
            value={settings.diagnosis_date}
            onChangeText={text => setSettings(s => s ? { ...s, diagnosis_date: text } : s)}
            onEndEditing={() => save({ diagnosis_date: settings.diagnosis_date })}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={Colors.textMuted}
            keyboardAppearance="dark"
          />
        </View>
      </Card>

      {/* Target Range */}
      <Text style={styles.sectionLabel}>Target Range</Text>
      <Card>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Low Target (mmol/L)</Text>
          <TextInput
            style={styles.inputNumeric}
            value={settings.target_low.toString()}
            onChangeText={text => {
              const v = parseFloat(text);
              if (!isNaN(v)) save({ target_low: v });
            }}
            keyboardType="decimal-pad"
            placeholderTextColor={Colors.textMuted}
            keyboardAppearance="dark"
          />
        </View>
        <View style={[styles.field, styles.fieldBorder]}>
          <Text style={styles.fieldLabel}>High Target (mmol/L)</Text>
          <TextInput
            style={styles.inputNumeric}
            value={settings.target_high.toString()}
            onChangeText={text => {
              const v = parseFloat(text);
              if (!isNaN(v)) save({ target_high: v });
            }}
            keyboardType="decimal-pad"
            placeholderTextColor={Colors.textMuted}
            keyboardAppearance="dark"
          />
        </View>
        <View style={styles.rangeVisual}>
          <View style={[styles.rangeBand, { flex: settings.target_low }]} />
          <View style={[styles.rangeTarget, { flex: settings.target_high - settings.target_low }]}>
            <Text style={styles.rangeTargetText}>
              {settings.target_low}–{settings.target_high} mmol/L
            </Text>
          </View>
          <View style={[styles.rangeBand, { flex: 20 - settings.target_high }]} />
        </View>
      </Card>

      {/* Insulin Types */}
      <Text style={styles.sectionLabel}>Insulin Types</Text>
      <Card>
        {['NovoRapid', 'Fiasp', 'Humalog', 'Actrapid', 'Tresiba', 'Lantus', 'Levemir'].map(type => (
          <View key={type} style={[styles.field, styles.fieldBorder]}>
            <Text style={styles.fieldLabel}>{type}</Text>
            <Switch
              value={settings.insulin_types.includes(type)}
              onValueChange={v => {
                const updated = v
                  ? [...settings.insulin_types, type]
                  : settings.insulin_types.filter(t => t !== type);
                save({ insulin_types: updated });
              }}
              trackColor={{ false: Colors.cardBorder, true: Colors.primary + '88' }}
              thumbColor={settings.insulin_types.includes(type) ? Colors.primary : Colors.textMuted}
            />
          </View>
        ))}
      </Card>

      {/* Reminders */}
      <Text style={styles.sectionLabel}>Reminders</Text>
      <Card>
        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 }}
          onPress={() => router.push('/reminders' as any)}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons name="alarm" size={20} color={Colors.primary} />
            <View>
              <Text style={styles.fieldLabel}>Daily Reminders</Text>
              <Text style={styles.fieldDesc}>Set reminders for insulin, meals, glucose checks</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
        </TouchableOpacity>
      </Card>

      {/* Notifications */}
      <Text style={styles.sectionLabel}>Notifications</Text>
      <Card>
        {[
          { key: 'notify_spike', label: 'Glucose spike detected', desc: 'Rise >3 mmol/L in 30 min' },
          { key: 'notify_high', label: 'High glucose', desc: '>13 mmol/L for 30+ min' },
          { key: 'notify_low', label: 'Low glucose', desc: '<4 mmol/L — urgent!' },
          { key: 'notify_meal_reminder', label: 'Meal reminders', desc: 'No meal logged near meal times' },
          { key: 'notify_insulin_reminder', label: 'Insulin reminders', desc: 'Ate 45 min ago, no bolus logged' },
        ].map((item, index) => (
          <View key={item.key} style={[styles.notifRow, index > 0 && styles.fieldBorder]}>
            <View style={styles.notifText}>
              <Text style={styles.fieldLabel}>{item.label}</Text>
              <Text style={styles.fieldDesc}>{item.desc}</Text>
            </View>
            <Switch
              value={settings[item.key as keyof Settings] as boolean}
              onValueChange={v => save({ [item.key]: v } as any)}
              trackColor={{ false: Colors.cardBorder, true: Colors.primary + '88' }}
              thumbColor={settings[item.key as keyof Settings] ? Colors.primary : Colors.textMuted}
            />
          </View>
        ))}
      </Card>

      {/* Lock Screen Widget */}
      <Text style={styles.sectionLabel}>Lock Screen Widget</Text>
      <Card>
        <View style={styles.notifRow}>
          <View style={styles.notifText}>
            <Text style={styles.fieldLabel}>Show Glucose on Lock Screen</Text>
            <Text style={styles.fieldDesc}>
              Display your current glucose reading and trend on your iOS home &amp; lock screen widget
            </Text>
          </View>
          <Switch
            value={widgetEnabled}
            onValueChange={handleToggleWidget}
            trackColor={{ false: Colors.cardBorder, true: Colors.primary + '88' }}
            thumbColor={widgetEnabled ? Colors.primary : Colors.textMuted}
          />
        </View>
        {widgetEnabled && (
          <View style={[styles.fieldBorder, { paddingTop: 10, paddingBottom: 4 }]}>
            <Text style={styles.fieldDesc}>
              After enabling, add the GlucoMind widget to your home screen: long-press your home screen → tap + → search "GlucoMind"
            </Text>
          </View>
        )}
      </Card>

      {/* My Ratios */}
      <Text style={styles.sectionLabel}>My Ratios</Text>
      <Card>
        {loadingRatios ? (
          <View style={styles.ratioLoading}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.ratioLoadingText}>Calculating from your data...</Text>
          </View>
        ) : carbRatios ? (
          <>
            {/* Calculated values */}
            <View style={styles.ratioRow}>
              <View style={styles.ratioInfo}>
                <Text style={styles.ratioLabel}>Insulin-to-Carb Ratio (ICR)</Text>
                <Text style={styles.ratioValue}>{formatICR(carbRatios.icr)}</Text>
                {carbRatios.dataPoints > 0 && (
                  <Text style={styles.ratioSub}>From {carbRatios.dataPoints} logged meals with insulin</Text>
                )}
              </View>
            </View>

            {/* Meal-specific ratios */}
            {(carbRatios.breakfastICR || carbRatios.lunchICR || carbRatios.dinnerICR) && (
              <View style={[styles.mealRatios, styles.fieldBorder]}>
                <Text style={styles.ratioLabel}>By Meal Time</Text>
                {carbRatios.breakfastICR && (
                  <View style={styles.mealRatioRow}>
                    <Text style={styles.mealRatioTime}>🌅 Breakfast</Text>
                    <Text style={styles.mealRatioVal}>1:{Math.round(carbRatios.breakfastICR)}</Text>
                  </View>
                )}
                {carbRatios.lunchICR && (
                  <View style={styles.mealRatioRow}>
                    <Text style={styles.mealRatioTime}>☀️ Lunch</Text>
                    <Text style={styles.mealRatioVal}>1:{Math.round(carbRatios.lunchICR)}</Text>
                  </View>
                )}
                {carbRatios.dinnerICR && (
                  <View style={styles.mealRatioRow}>
                    <Text style={styles.mealRatioTime}>🌙 Dinner</Text>
                    <Text style={styles.mealRatioVal}>1:{Math.round(carbRatios.dinnerICR)}</Text>
                  </View>
                )}
              </View>
            )}

            <View style={[styles.ratioRow, styles.fieldBorder]}>
              <View style={styles.ratioInfo}>
                <Text style={styles.ratioLabel}>Insulin Sensitivity Factor (ISF)</Text>
                <Text style={styles.ratioValue}>{formatISF(carbRatios.isf)}</Text>
                <Text style={styles.ratioSub}>Estimated from your insulin history</Text>
              </View>
            </View>

            {/* Manual override */}
            <View style={[styles.fieldBorder, { paddingTop: 12 }]}>
              <Text style={[styles.ratioLabel, { marginBottom: 10 }]}>Manual Override</Text>
              <View style={styles.overrideRow}>
                <Text style={styles.overrideLabel}>ICR (carbs per unit)</Text>
                <TextInput
                  style={styles.overrideInput}
                  placeholder={carbRatios.icr ? Math.round(carbRatios.icr).toString() : '10'}
                  placeholderTextColor={Colors.textMuted}
                  value={manualICR}
                  onChangeText={setManualICR}
                  keyboardType="decimal-pad"
                  keyboardAppearance="dark"
                />
              </View>
              <View style={[styles.overrideRow, { marginTop: 8 }]}>
                <Text style={styles.overrideLabel}>ISF (mmol/L per unit)</Text>
                <TextInput
                  style={styles.overrideInput}
                  placeholder={carbRatios.isf ? carbRatios.isf.toString() : '2.5'}
                  placeholderTextColor={Colors.textMuted}
                  value={manualISF}
                  onChangeText={setManualISF}
                  keyboardType="decimal-pad"
                  keyboardAppearance="dark"
                />
              </View>
              <TouchableOpacity style={styles.overrideSaveBtn} onPress={saveRatios}>
                {ratiosSaved ? (
                  <>
                    <Ionicons name="checkmark-circle" size={14} color={Colors.primary} />
                    <Text style={styles.overrideSaveText}>Saved!</Text>
                  </>
                ) : (
                  <Text style={styles.overrideSaveText}>Save Overrides</Text>
                )}
              </TouchableOpacity>
              <Text style={styles.ratioDisclaimer}>Always verify ratios with your diabetes team.</Text>
            </View>
          </>
        ) : null}
      </Card>

      {/* Dexcom CGM */}
      <Text style={styles.sectionLabel}>Dexcom CGM</Text>
      <Card>
        {dexcomConnected ? (
          <>
            <View style={styles.dexcomConnectedRow}>
              <View style={[styles.dexcomDot, { backgroundColor: Colors.primary }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Connected ✅</Text>
                {dexcomDevice && (
                  <Text style={styles.fieldDesc}>
                    {dexcomDevice.displayDevice} · {dexcomDevice.transmitterGeneration}
                  </Text>
                )}
                {dexcomLastSync && (
                  <Text style={styles.fieldDesc}>
                    Last sync: {new Date(dexcomLastSync).toLocaleTimeString()}
                  </Text>
                )}
              </View>
              <TouchableOpacity onPress={handleDisconnectDexcom} style={styles.disconnectBtn}>
                <Text style={styles.disconnectText}>Disconnect</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.field, styles.fieldBorder]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Use Dexcom Data</Text>
                <Text style={styles.fieldDesc}>Toggle between live CGM data and demo mode</Text>
              </View>
              <Switch
                value={useDexcomData}
                onValueChange={handleToggleDataSource}
                trackColor={{ false: Colors.cardBorder, true: Colors.primary + '88' }}
                thumbColor={useDexcomData ? Colors.primary : Colors.textMuted}
              />
            </View>
          </>
        ) : (
          <View style={styles.dexcomUnconnected}>
            <Ionicons name="bluetooth" size={32} color={Colors.textMuted} />
            <Text style={styles.dexcomUnconnectedTitle}>Not Connected</Text>
            <Text style={styles.dexcomUnconnectedDesc}>
              Connect your Dexcom CGM to see real-time glucose data in GlucoMind.
            </Text>
            <TouchableOpacity
              style={styles.connectBtn}
              onPress={handleConnectDexcom}
              disabled={dexcomConnecting}
            >
              {dexcomConnecting ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <>
                  <Ionicons name="link" size={16} color={Colors.primary} />
                  <Text style={styles.connectBtnText}>Connect Dexcom</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </Card>

      {/* Emergency Contacts */}
      <Text style={styles.sectionLabel}>Emergency Contacts</Text>
      <Card>
        <View style={ecStyles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={ecStyles.infoText}>
              Contacts receive an SMS if your glucose is critically low ({'<'}3.0 mmol/L) for 10+ minutes.
            </Text>
          </View>
        </View>

        {emergencyContacts.length === 0 ? (
          <View style={ecStyles.emptyRow}>
            <Ionicons name="people-outline" size={22} color={Colors.textMuted} />
            <Text style={ecStyles.emptyText}>No contacts added yet</Text>
          </View>
        ) : (
          emergencyContacts.map((contact, idx) => (
            <View key={contact.id} style={[ecStyles.contactRow, idx > 0 && styles.fieldBorder]}>
              <View style={ecStyles.contactInfo}>
                <Text style={ecStyles.contactName}>{contact.name}</Text>
                <Text style={ecStyles.contactPhone}>{contact.phone}</Text>
              </View>
              <Switch
                value={contact.enabled}
                onValueChange={async (v) => {
                  await updateEmergencyContactEnabled(contact.id, v);
                  await loadEmergencyContacts();
                }}
                trackColor={{ false: Colors.cardBorder, true: Colors.primary + '88' }}
                thumbColor={contact.enabled ? Colors.primary : Colors.textMuted}
              />
              <TouchableOpacity
                style={ecStyles.deleteBtn}
                onPress={() => handleDeleteContact(contact)}
              >
                <Ionicons name="trash-outline" size={16} color={Colors.red} />
              </TouchableOpacity>
            </View>
          ))
        )}

        <TouchableOpacity
          style={[ecStyles.addBtn, emergencyContacts.length > 0 && styles.fieldBorder]}
          onPress={() => setShowAddContact(true)}
        >
          <Ionicons name="add-circle" size={18} color={Colors.primary} />
          <Text style={ecStyles.addBtnText}>Add Emergency Contact</Text>
        </TouchableOpacity>
      </Card>

      {/* Reports */}
      <Text style={styles.sectionLabel}>Reports</Text>
      <Card>
        <TouchableOpacity style={rpStyles.row} onPress={() => router.push('/report' as any)} activeOpacity={0.7}>
          <View style={rpStyles.iconWrap}>
            <Ionicons name="document-text" size={20} color={Colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>Generate Diabetes Report</Text>
            <Text style={styles.fieldDesc}>30-day PDF summary for your care team</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
        </TouchableOpacity>
      </Card>

      {/* Apple Health */}
      <Text style={styles.sectionLabel}>Apple Health</Text>
      <Card>
        <View style={ahStyles.row}>
          <Ionicons name="heart" size={24} color="#FF3B5C" />
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>Connect Apple Health</Text>
            <Text style={styles.fieldDesc}>{getHealthKitStatusMessage(false)}</Text>
          </View>
          <TouchableOpacity
            style={ahStyles.comingSoonBtn}
            onPress={() =>
              Alert.alert(
                'Coming Soon',
                'Apple Health integration requires a native (bare workflow) build. This will be available in the full GlucoMind release.',
                [{ text: 'Got it' }]
              )
            }
          >
            <Text style={ahStyles.comingSoonText}>Coming soon</Text>
          </TouchableOpacity>
        </View>
      </Card>

      {/* Add Contact Modal */}
      <Modal
        visible={showAddContact}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddContact(false)}
      >
        <View style={modalStyles.overlay}>
          <View style={modalStyles.sheet}>
            <Text style={modalStyles.title}>Add Emergency Contact</Text>
            <TextInput
              style={modalStyles.input}
              placeholder="Name"
              placeholderTextColor={Colors.textMuted}
              value={newContactName}
              onChangeText={setNewContactName}
              keyboardAppearance="dark"
            />
            <TextInput
              style={modalStyles.input}
              placeholder="Phone number (e.g. +447911123456)"
              placeholderTextColor={Colors.textMuted}
              value={newContactPhone}
              onChangeText={setNewContactPhone}
              keyboardType="phone-pad"
              keyboardAppearance="dark"
            />
            <View style={modalStyles.btnRow}>
              <TouchableOpacity
                style={modalStyles.cancelBtn}
                onPress={() => setShowAddContact(false)}
              >
                <Text style={modalStyles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={modalStyles.saveBtn}
                onPress={handleAddContact}
                disabled={savingContact}
              >
                {savingContact ? (
                  <ActivityIndicator size="small" color={Colors.background} />
                ) : (
                  <Text style={modalStyles.saveText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Challenges */}
      <Text style={styles.sectionLabel}>Gamification</Text>
      <Card>
        <TouchableOpacity style={gamStyles.row} onPress={() => router.push('/challenges' as any)}>
          <View style={gamStyles.iconWrap}>
            <Ionicons name="trophy" size={20} color={Colors.amber} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>Weekly Challenges</Text>
            <Text style={styles.fieldDesc}>Personalised goals based on your diabetes data</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
        </TouchableOpacity>
      </Card>

      {/* About */}
      <Text style={styles.sectionLabel}>About</Text>
      <Card>
        <View style={styles.aboutRow}>
          <Ionicons name="pulse" size={32} color={Colors.primary} />
          <View style={styles.aboutText}>
            <Text style={styles.aboutTitle}>GlucoMind</Text>
            <Text style={styles.aboutVersion}>Prototype v1.0 · AI-powered diabetes management</Text>
          </View>
        </View>
      </Card>

      {/* Sign Out Button (at the bottom) */}
      <TouchableOpacity
        style={{
          backgroundColor: Colors.red + '22',
          borderRadius: 10,
          paddingVertical: 14,
          alignItems: 'center',
          marginTop: 16,
          borderColor: Colors.red + '44',
          borderWidth: 1,
        }}
        onPress={async () => {
          // Confirm dialog
          Alert.alert(
            'Sign Out',
            'Are you sure you want to sign out?',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Sign Out', style: 'destructive', onPress: async () => {
                await signOut();
                router.replace('/auth');
              }},
            ]
          );
        }}
      >
        <Text style={{ color: Colors.red, fontWeight: '700', fontSize: 16 }}>Sign Out</Text>
      </TouchableOpacity>

      {saved && (
        <View style={styles.savedBanner}>
          <Ionicons name="checkmark-circle" size={14} color={Colors.primary} />
          <Text style={styles.savedText}>Settings saved</Text>
        </View>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
    gap: 12,
  },
  sectionLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: 4,
    paddingHorizontal: 4,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    justifyContent: 'space-between',
  },
  fieldBorder: {
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
  },
  fieldLabel: {
    color: Colors.textPrimary,
    fontSize: 14,
    flex: 1,
  },
  fieldDesc: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 1,
  },
  input: {
    color: Colors.textPrimary,
    fontSize: 14,
    textAlign: 'right',
    flex: 1,
    paddingVertical: 4,
  },
  inputNumeric: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'right',
    minWidth: 60,
    paddingVertical: 4,
  },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  notifText: {
    flex: 1,
  },
  rangeVisual: {
    flexDirection: 'row',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 12,
  },
  rangeBand: {
    backgroundColor: Colors.outOfRange + '44',
  },
  rangeTarget: {
    backgroundColor: Colors.primary + '44',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rangeTargetText: {
    fontSize: 8,
    color: Colors.primary,
    fontWeight: '700',
  },
  aboutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  aboutText: {
    flex: 1,
  },
  aboutTitle: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  aboutVersion: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  ratioLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 8,
  },
  ratioLoadingText: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  ratioRow: {
    paddingVertical: 10,
  },
  ratioInfo: {
    flex: 1,
  },
  ratioLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  ratioValue: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 4,
  },
  ratioSub: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  mealRatios: {
    paddingVertical: 12,
    gap: 8,
  },
  mealRatioRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
  },
  mealRatioTime: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  mealRatioVal: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  overrideRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  overrideLabel: {
    color: Colors.textSecondary,
    fontSize: 13,
    flex: 1,
  },
  overrideInput: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'right',
    minWidth: 60,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.primary + '44',
  },
  overrideSaveBtn: {
    backgroundColor: Colors.primary + '22',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: Colors.primary + '44',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  overrideSaveText: {
    color: Colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  ratioDisclaimer: {
    color: Colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
  },
  savedBanner: {
    backgroundColor: Colors.primary + '22',
    borderColor: Colors.primary + '44',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  savedText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  dexcomConnectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 10,
  },
  dexcomDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  disconnectBtn: {
    backgroundColor: Colors.red + '22',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.red + '44',
  },
  disconnectText: {
    color: Colors.red,
    fontSize: 12,
    fontWeight: '600',
  },
  dexcomUnconnected: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 10,
  },
  dexcomUnconnectedTitle: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: '700',
  },
  dexcomUnconnectedDesc: {
    color: Colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  connectBtn: {
    backgroundColor: Colors.primary + '22',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.primary + '55',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  connectBtnText: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '700',
  },
});

const ecStyles = StyleSheet.create({
  headerRow: {
    paddingBottom: 10,
  },
  infoText: {
    color: Colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  emptyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: 13,
    fontStyle: 'italic',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 10,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  contactPhone: {
    color: Colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  deleteBtn: {
    padding: 4,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  addBtnText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});

const connStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.primary + '33',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.primary + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  desc: {
    color: Colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
});

const ahStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  comingSoonBtn: {
    backgroundColor: Colors.cardBorder,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  comingSoonText: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    gap: 16,
    borderTopWidth: 1,
    borderColor: Colors.cardBorder,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  input: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: Colors.textPrimary,
    fontSize: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  cancelText: {
    color: Colors.textSecondary,
    fontWeight: '600',
    fontSize: 14,
  },
  saveBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  saveText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});

const rpStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primary + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const gamStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.amber + '22',
    alignItems: 'center',
    justifyContent: 'center',
  },
});


