/**
 * Reminders Screen — GlucoMind
 *
 * Create and manage recurring daily reminders (insulin, meals, glucose checks).
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  ScrollView, View, Text, StyleSheet, TouchableOpacity,
  Alert, TextInput, Switch,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import {
  Reminder, getReminders, createReminder, toggleReminder, deleteReminder,
} from '../services/reminders';
import Card from '../components/Card';

const REMINDER_TYPES = [
  { value: 'insulin', label: '💉 Insulin', icon: 'medical' },
  { value: 'meal', label: '🍽️ Meal', icon: 'restaurant' },
  { value: 'check', label: '📊 Check Glucose', icon: 'pulse' },
  { value: 'custom', label: '⏰ Custom', icon: 'alarm' },
] as const;

export default function RemindersScreen() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [showCreate, setShowCreate] = useState(false);

  // New reminder form
  const [newTitle, setNewTitle] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [newHour, setNewHour] = useState('21');
  const [newMinute, setNewMinute] = useState('00');
  const [newType, setNewType] = useState<'insulin' | 'meal' | 'check' | 'custom'>('insulin');
  const [newInsulinName, setNewInsulinName] = useState('Tresiba');
  const [newInsulinUnits, setNewInsulinUnits] = useState('');
  const [newInsulinType, setNewInsulinType] = useState<'rapid' | 'long'>('long');

  const loadReminders = useCallback(async () => {
    const r = await getReminders();
    setReminders(r);
  }, []);

  useEffect(() => {
    loadReminders();
  }, [loadReminders]);

  const handleCreate = async () => {
    const h = parseInt(newHour);
    const m = parseInt(newMinute);
    if (isNaN(h) || h < 0 || h > 23 || isNaN(m) || m < 0 || m > 59) {
      Alert.alert('Invalid Time', 'Enter a valid time in 24hr format (0-23 hours, 0-59 minutes).');
      return;
    }

    const title = newTitle.trim() || (newType === 'insulin' ? 'Insulin Reminder' : newType === 'meal' ? 'Meal Reminder' : newType === 'check' ? 'Check Glucose' : 'Reminder');
    let message = newMessage.trim();

    // Auto-generate message for insulin reminders
    if (newType === 'insulin' && !message) {
      const units = newInsulinUnits ? `${newInsulinUnits} units ` : '';
      message = `Time to take ${units}${newInsulinName}`;
    }
    if (!message) message = title;

    await createReminder({
      title,
      message,
      hour: h,
      minute: m,
      enabled: true,
      type: newType,
      insulinName: newType === 'insulin' ? newInsulinName : undefined,
      insulinUnits: newType === 'insulin' && newInsulinUnits ? parseFloat(newInsulinUnits) : undefined,
      insulinType: newType === 'insulin' ? newInsulinType : undefined,
    });

    setShowCreate(false);
    resetForm();
    loadReminders();
    Alert.alert('Reminder Set ✅', `You'll be reminded daily at ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  };

  const resetForm = () => {
    setNewTitle('');
    setNewMessage('');
    setNewHour('21');
    setNewMinute('00');
    setNewType('insulin');
    setNewInsulinName('Tresiba');
    setNewInsulinUnits('');
    setNewInsulinType('long');
  };

  const handleDelete = (r: Reminder) => {
    Alert.alert('Delete Reminder', `Delete "${r.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => { await deleteReminder(r.id); loadReminders(); },
      },
    ]);
  };

  const formatTime = (h: number, m: number) =>
    `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

  return (
    <ScrollView keyboardDismissMode="on-drag" style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Reminders</Text>
        <TouchableOpacity onPress={() => setShowCreate(!showCreate)}>
          <Ionicons name={showCreate ? 'close' : 'add-circle'} size={28} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <Text style={styles.subtitle}>
        Set daily reminders for insulin, meals, and glucose checks
      </Text>

      {/* Create new reminder form */}
      {showCreate && (
        <Card style={styles.createCard}>
          <Text style={styles.sectionTitle}>New Reminder</Text>

          {/* Type selector */}
          <View style={styles.typeRow}>
            {REMINDER_TYPES.map(t => (
              <TouchableOpacity
                key={t.value}
                style={[styles.typeChip, newType === t.value && styles.typeChipActive]}
                onPress={() => setNewType(t.value as any)}
              >
                <Text style={[styles.typeChipText, newType === t.value && styles.typeChipTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Time picker */}
          <Text style={styles.fieldLabel}>Time (24hr)</Text>
          <View style={styles.timeRow}>
            <TextInput
              style={styles.timeInput}
              value={newHour}
              onChangeText={setNewHour}
              keyboardType="number-pad" inputAccessoryViewID="keyboard-done"
              maxLength={2}
              placeholder="21"
              placeholderTextColor={Colors.textMuted} returnKeyType="done"
            />
            <Text style={styles.timeSep}>:</Text>
            <TextInput
              style={styles.timeInput}
              value={newMinute}
              onChangeText={setNewMinute}
              keyboardType="number-pad" inputAccessoryViewID="keyboard-done"
              maxLength={2}
              placeholder="00"
              placeholderTextColor={Colors.textMuted} returnKeyType="done"
            />
          </View>

          {/* Insulin-specific fields */}
          {newType === 'insulin' && (
            <View style={{ gap: 10, marginTop: 8 }}>
              <Text style={styles.fieldLabel}>Insulin</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  style={[styles.typeChip, newInsulinType === 'long' && styles.typeChipActive]}
                  onPress={() => setNewInsulinType('long')}
                >
                  <Text style={[styles.typeChipText, newInsulinType === 'long' && styles.typeChipTextActive]}>Long-acting</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeChip, newInsulinType === 'rapid' && styles.typeChipActive]}
                  onPress={() => setNewInsulinType('rapid')}
                >
                  <Text style={[styles.typeChipText, newInsulinType === 'rapid' && styles.typeChipTextActive]}>Rapid</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.input}
                value={newInsulinName}
                onChangeText={setNewInsulinName}
                placeholder="Insulin name (e.g. Tresiba)"
                placeholderTextColor={Colors.textMuted} returnKeyType="done"
              />
              <TextInput
                style={styles.input}
                value={newInsulinUnits}
                onChangeText={setNewInsulinUnits}
                placeholder="Units (e.g. 30)"
                placeholderTextColor={Colors.textMuted} returnKeyType="done"
                keyboardType="decimal-pad" inputAccessoryViewID="keyboard-done"
              />
            </View>
          )}

          {/* Custom title/message */}
          <Text style={[styles.fieldLabel, { marginTop: 10 }]}>Title (optional)</Text>
          <TextInput
            style={styles.input}
            value={newTitle}
            onChangeText={setNewTitle}
            placeholder={newType === 'insulin' ? 'Night-time insulin' : 'Reminder'}
            placeholderTextColor={Colors.textMuted} returnKeyType="done"
          />
          <Text style={styles.fieldLabel}>Message (optional)</Text>
          <TextInput
            style={styles.input}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder={newType === 'insulin' ? 'Take 30 units Tresiba' : 'Custom message'}
            placeholderTextColor={Colors.textMuted} returnKeyType="done"
          />

          <TouchableOpacity style={styles.createBtn} onPress={handleCreate}>
            <Ionicons name="alarm" size={18} color={Colors.background} />
            <Text style={styles.createBtnText}>Set Reminder</Text>
          </TouchableOpacity>
        </Card>
      )}

      {/* Existing reminders */}
      {reminders.length === 0 && !showCreate && (
        <Card style={styles.emptyCard}>
          <Ionicons name="alarm-outline" size={48} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>No reminders set</Text>
          <Text style={styles.emptyText}>
            Tap + to create a reminder for insulin, meals, or glucose checks
          </Text>
        </Card>
      )}

      {reminders.map(r => (
        <Card key={r.id} style={{ opacity: r.enabled ? 1 : 0.5 }}>
          <TouchableOpacity
            onLongPress={() => handleDelete(r)}
            style={styles.reminderRow}
          >
            <View style={styles.reminderLeft}>
              <Text style={styles.reminderTime}>{formatTime(r.hour, r.minute)}</Text>
              <View>
                <Text style={styles.reminderTitle}>{r.title}</Text>
                <Text style={styles.reminderMessage}>{r.message}</Text>
                {r.insulinName && (
                  <Text style={styles.reminderMeta}>
                    {r.insulinUnits ? `${r.insulinUnits}u ` : ''}{r.insulinName} ({r.insulinType})
                  </Text>
                )}
              </View>
            </View>
            <Switch
              value={r.enabled}
              onValueChange={async (val) => {
                await toggleReminder(r.id, val);
                loadReminders();
              }}
              trackColor={{ true: Colors.primary + '66', false: Colors.cardBorder }}
              thumbColor={r.enabled ? Colors.primary : Colors.textMuted}
            />
          </TouchableOpacity>
        </Card>
      ))}

      {reminders.length > 0 && (
        <Text style={styles.hintText}>Long-press a reminder to delete it</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  backBtn: { padding: 4 },
  title: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  subtitle: { color: Colors.textMuted, fontSize: 13, marginBottom: 8 },
  createCard: { gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  typeChip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: Colors.cardBorder },
  typeChipActive: { backgroundColor: Colors.primary + '15', borderWidth: 1, borderColor: Colors.primary + '44' },
  typeChipText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  typeChipTextActive: { color: Colors.primary },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginTop: 4 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timeInput: {
    backgroundColor: Colors.cardBorder, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 24, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center', width: 70,
  },
  timeSep: { fontSize: 24, fontWeight: '700', color: Colors.textPrimary },
  input: {
    backgroundColor: Colors.cardBorder, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 15, color: Colors.textPrimary,
  },
  createBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, marginTop: 8,
  },
  createBtnText: { color: Colors.background, fontWeight: '700', fontSize: 15 },
  emptyCard: { alignItems: 'center', gap: 8, paddingVertical: 32 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  emptyText: { color: Colors.textMuted, fontSize: 13, textAlign: 'center' },
  reminderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reminderLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  reminderTime: { fontSize: 22, fontWeight: '700', color: Colors.primary, minWidth: 60 },
  reminderTitle: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  reminderMessage: { fontSize: 13, color: Colors.textSecondary },
  reminderMeta: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  hintText: { color: Colors.textMuted, fontSize: 11, textAlign: 'center', marginTop: 4 },
});
