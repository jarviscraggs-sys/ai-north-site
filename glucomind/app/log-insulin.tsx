import React, { useState, useEffect } from 'react';
import {
  ScrollView, View, Text, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform, TextInput
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { InsulinDose } from '../types';
import { insertInsulinDose, getInsulinDoses, getAllSettings } from '../services/database';
import Card from '../components/Card';

export default function LogInsulin() {
  const [insulinType, setInsulinType] = useState<'rapid' | 'long'>('rapid');
  const [units, setUnits] = useState('');
  const [insulinName, setInsulinName] = useState('NovoRapid');
  const [recentDoses, setRecentDoses] = useState<InsulinDose[]>([]);
  const [availableTypes, setAvailableTypes] = useState<string[]>(['NovoRapid', 'Tresiba']);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [customTime, setCustomTime] = useState<Date>(new Date());
  const [useCustomTime, setUseCustomTime] = useState(false);

  const rapidInsulins = ['NovoRapid', 'Fiasp', 'Humalog', 'Actrapid'];
  const longInsulins = ['Tresiba', 'Lantus', 'Levemir'];

  useEffect(() => {
    getAllSettings().then(s => {
      setAvailableTypes(s.insulin_types);
      // Set default
      const rapid = s.insulin_types.find(t => rapidInsulins.includes(t));
      const long = s.insulin_types.find(t => longInsulins.includes(t));
      if (rapid) setInsulinName(rapid);
    });

    getInsulinDoses(10).then(doses => {
      // Get recent unique doses for quick-log
      setRecentDoses(doses.slice(0, 4));
    });
  }, []);

  useEffect(() => {
    // Update insulin name when type changes
    const typeList = insulinType === 'rapid' ? rapidInsulins : longInsulins;
    const available = availableTypes.filter(t => typeList.includes(t));
    if (available.length > 0 && !available.includes(insulinName)) {
      setInsulinName(available[0]);
    }
  }, [insulinType]);

  const handleSave = async () => {
    const u = parseFloat(units);
    if (!units || isNaN(u) || u <= 0) {
      Alert.alert('Units required', 'Enter the number of units.');
      return;
    }
    setSaving(true);
    try {
      await insertInsulinDose({
        type: insulinType,
        units: u,
        timestamp: useCustomTime ? customTime.getTime() : Date.now(),
      });
      setSaved(true);
      setTimeout(() => {
        if (router.canDismiss()) {
          router.dismissAll();
        } else {
          router.replace('/(tabs)');
        }
      }, 1200);
    } catch (e) {
      console.error('Save insulin error:', e);
      Alert.alert('Error', 'Failed to save insulin dose.');
    } finally {
      setSaving(false);
    }
  };

  const commonDoses = insulinType === 'rapid' ? [2, 3, 4, 5, 6, 7, 8, 10] : [16, 18, 20, 22, 24];

  const availableForType = availableTypes.filter(t =>
    insulinType === 'rapid' ? rapidInsulins.includes(t) : longInsulins.includes(t)
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.surface }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>

        {/* Type selector */}
        <View style={styles.typeRow}>
          <TouchableOpacity
            style={[styles.typeButton, insulinType === 'rapid' && styles.typeButtonActive]}
            onPress={() => setInsulinType('rapid')}
          >
            <Ionicons name="flash" size={16} color={insulinType === 'rapid' ? Colors.background : Colors.amber} />
            <Text style={[styles.typeText, insulinType === 'rapid' && styles.typeTextActive]}>
              Rapid-acting (Bolus)
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeButton, insulinType === 'long' && styles.typeButtonActiveLong]}
            onPress={() => setInsulinType('long')}
          >
            <Ionicons name="time" size={16} color={insulinType === 'long' ? Colors.background : '#7C6FFF'} />
            <Text style={[styles.typeText, insulinType === 'long' && styles.typeTextActive]}>
              Long-acting (Basal)
            </Text>
          </TouchableOpacity>
        </View>

        {/* Insulin name */}
        {availableForType.length > 0 && (
          <Card>
            <Text style={styles.label}>Insulin Type</Text>
            <View style={styles.nameRow}>
              {availableForType.map(name => (
                <TouchableOpacity
                  key={name}
                  style={[styles.nameButton, insulinName === name && styles.nameButtonActive]}
                  onPress={() => setInsulinName(name)}
                >
                  <Text style={[styles.nameText, insulinName === name && styles.nameTextActive]}>{name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card>
        )}

        {/* Units */}
        <Card>
          <Text style={styles.label}>Units</Text>
          <View style={styles.unitsContainer}>
            <TouchableOpacity
              style={styles.unitsBtn}
              onPress={() => setUnits(prev => Math.max(0, (parseFloat(prev) || 0) - 0.5).toString())}
            >
              <Ionicons name="remove" size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
            <View style={styles.unitsDisplay}>
              <TextInput
                style={styles.unitsText}
                value={units}
                onChangeText={setUnits}
                keyboardType="decimal-pad" inputAccessoryViewID="keyboard-done"
                placeholder="0"
                placeholderTextColor={Colors.textMuted}
                keyboardAppearance="dark"
                textAlign="center"
              />
              <Text style={styles.unitsLabel}>units</Text>
            </View>
            <TouchableOpacity
              style={styles.unitsBtn}
              onPress={() => setUnits(prev => ((parseFloat(prev) || 0) + 0.5).toString())}
            >
              <Ionicons name="add" size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Quick doses */}
          <View style={styles.quickDoses}>
            {commonDoses.map(d => (
              <TouchableOpacity
                key={d}
                style={[styles.quickDose, units === d.toString() && styles.quickDoseActive]}
                onPress={() => setUnits(d.toString())}
              >
                <Text style={[styles.quickDoseText, units === d.toString() && styles.quickDoseTextActive]}>
                  {d}u
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Recent doses */}
        {recentDoses.length > 0 && (
          <Card>
            <Text style={styles.label}>Recent Doses</Text>
            {recentDoses.map(dose => (
              <TouchableOpacity
                key={dose.id}
                style={styles.recentItem}
                onPress={() => {
                  setInsulinType(dose.type);
                  setUnits(dose.units.toString());
                }}
              >
                <Ionicons name="medical" size={14} color={Colors.amber} />
                <Text style={styles.recentText}>
                  {dose.units}u {dose.type === 'rapid' ? 'Rapid' : 'Long'}
                </Text>
                <Text style={styles.recentTime}>
                  {new Date(dose.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </TouchableOpacity>
            ))}
          </Card>
        )}

        {/* Time picker — log for now or a past time */}
        <Card>
          <Text style={{ color: Colors.textPrimary, fontSize: 15, fontWeight: '600', marginBottom: 4 }}>When did you take this?</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <TouchableOpacity
              style={[styles.typeButton, !useCustomTime && styles.typeButtonActive]}
              onPress={() => setUseCustomTime(false)}
            >
              <Text style={{ color: !useCustomTime ? Colors.primary : Colors.textSecondary, fontWeight: '600', fontSize: 14 }}>Just Now</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeButton, useCustomTime && styles.typeButtonActive]}
              onPress={() => setUseCustomTime(true)}
            >
              <Text style={{ color: useCustomTime ? Colors.primary : Colors.textSecondary, fontWeight: '600', fontSize: 14 }}>Earlier Today</Text>
            </TouchableOpacity>
          </View>
          {useCustomTime && (
            <View style={{ marginTop: 12 }}>
              <TextInput
                style={{ backgroundColor: Colors.cardBorder, color: Colors.textPrimary, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, textAlign: 'center' }}
                placeholder="HH:MM (e.g. 14:30)"
                placeholderTextColor={Colors.textMuted}
                keyboardType="numbers-and-punctuation" inputAccessoryViewID="keyboard-done"
                onChangeText={(text) => {
                  const match = text.match(/^(\d{1,2}):(\d{2})$/);
                  if (match) {
                    const d = new Date();
                    d.setHours(parseInt(match[1]), parseInt(match[2]), 0, 0);
                    setCustomTime(d);
                  }
                }}
              />
              <Text style={{ color: Colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 4 }}>
                24hr format — e.g. 14:30 for 2:30 PM
              </Text>
            </View>
          )}
        </Card>

        {saved ? (
          <View style={styles.savedBanner}>
            <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
            <Text style={styles.savedText}>Insulin logged!</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonLoading]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={Colors.background} />
            ) : (
              <>
                <Ionicons name="medical" size={18} color={Colors.background} />
                <Text style={styles.saveText}>Log Insulin</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.amber + '44',
  },
  typeButtonActive: {
    backgroundColor: Colors.amber,
    borderColor: Colors.amber,
  },
  typeButtonActiveLong: {
    backgroundColor: '#7C6FFF',
    borderColor: '#7C6FFF',
  },
  typeText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  typeTextActive: {
    color: Colors.background,
  },
  label: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  nameRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  nameButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.background,
  },
  nameButtonActive: {
    backgroundColor: Colors.amber + '22',
    borderColor: Colors.amber + '66',
  },
  nameText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  nameTextActive: {
    color: Colors.amber,
    fontWeight: '700',
  },
  unitsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 16,
  },
  unitsBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  unitsDisplay: {
    alignItems: 'center',
    minWidth: 100,
  },
  unitsText: {
    fontSize: 52,
    fontWeight: '200',
    color: Colors.amber,
    letterSpacing: -2,
    textAlign: 'center',
    minWidth: 100,
  },
  unitsLabel: {
    color: Colors.textMuted,
    fontSize: 12,
    marginTop: -4,
  },
  quickDoses: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  quickDose: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  quickDoseActive: {
    backgroundColor: Colors.amber + '22',
    borderColor: Colors.amber + '66',
  },
  quickDoseText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },
  quickDoseTextActive: {
    color: Colors.amber,
    fontWeight: '700',
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  recentText: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 13,
  },
  recentTime: {
    color: Colors.textMuted,
    fontSize: 11,
  },
  saveButton: {
    backgroundColor: Colors.amber,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonLoading: {
    opacity: 0.7,
  },
  saveText: {
    color: Colors.background,
    fontWeight: '700',
    fontSize: 16,
  },
  savedBanner: {
    backgroundColor: Colors.primary + '22',
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.primary + '44',
  },
  savedText: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 16,
  },
});
