/**
 * AI Chat Tab — GlucoMind
 *
 * Full chat interface powered by GPT-4o.
 * Messages are persisted in SQLite (chat_messages table).
 *
 * System prompt is dynamically built from:
 *  - Last 24h glucose summary
 *  - Recent meals & insulin doses
 *  - Recent lifestyle factors
 *  - Current IOB
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import OpenAI from 'openai';
import { Colors } from '../../constants/colors';
import {
  getChatHistory, insertChatMessage, clearChatHistory,
  getGlucoseReadings, getMeals, getInsulinDoses,
  getFactorsSince, getAllSettings, getCorrelations,
  getDailyStats, getFactors, getInsulinDosesInRange,
  getMealsInRange, getGlucoseReadingsInRange,
  getMealById, updateMeal, deleteMeal,
  getInsulinDoseById, updateInsulinDose, deleteInsulinDose,
} from '../../services/database';
import { calculateIOB } from '../../services/iob';
import { ChatMessage, GlucoseReading, Meal, Correlation } from '../../types';
import { OPENAI_API_KEY } from '../../config/keys';
import { APP_KNOWLEDGE } from '../../constants/app-knowledge';

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

// ─── Context Builder ──────────────────────────────────────────────────────────

// ─── Deep Memory Helpers ──────────────────────────────────────────────────────

function glucoseStatsForReadings(readings: GlucoseReading[], targetLow: number, targetHigh: number) {
  if (readings.length === 0) return null;
  const values = readings.map(r => r.value);
  const avg = values.reduce((s, v) => s + v, 0) / values.length;
  const inRange = values.filter(v => v >= targetLow && v <= targetHigh).length;
  const tir = Math.round((inRange / values.length) * 100);
  const high = values.filter(v => v > 13).length;
  const low = values.filter(v => v < 4).length;
  const min = Math.min(...values);
  const max = Math.max(...values);
  // Coefficient of variation (glucose variability)
  const stdDev = Math.sqrt(values.reduce((s, v) => s + (v - avg) ** 2, 0) / values.length);
  const cv = (stdDev / avg) * 100;
  // Estimated A1C (DCCT formula)
  const eA1C = (avg + 2.59) / 1.59;
  return { avg, tir, high, low, min, max, cv, eA1C, count: values.length };
}

function categorizeMealTime(timestamp: number): string {
  const h = new Date(timestamp).getHours();
  if (h >= 5 && h < 11) return 'Breakfast';
  if (h >= 11 && h < 15) return 'Lunch';
  if (h >= 15 && h < 18) return 'Snack';
  if (h >= 18 && h < 22) return 'Dinner';
  return 'Late-night';
}

function buildMealCorrelationSummary(meals: Meal[], correlations: Correlation[]): string {
  if (correlations.length === 0) return 'No meal→glucose correlations recorded yet.';

  const mealMap: Record<number, Meal> = {};
  meals.forEach(m => { mealMap[m.id] = m; });

  // Group by meal description (normalized)
  const groups: Record<string, { spikes: number[]; count: number; desc: string }> = {};
  for (const c of correlations) {
    const meal = mealMap[c.meal_id];
    if (!meal) continue;
    const key = meal.description.toLowerCase().trim();
    if (!groups[key]) groups[key] = { spikes: [], count: 0, desc: meal.description };
    groups[key].spikes.push(c.peak_glucose - c.pre_glucose);
    groups[key].count++;
  }

  // Sort by average spike descending
  const sorted = Object.values(groups)
    .filter(g => g.count >= 1)
    .map(g => ({
      desc: g.desc,
      count: g.count,
      avgSpike: g.spikes.reduce((s, v) => s + v, 0) / g.spikes.length,
    }))
    .sort((a, b) => b.avgSpike - a.avgSpike);

  const lines: string[] = [];
  const worst = sorted.slice(0, 5);
  const best = sorted.filter(g => g.avgSpike <= 2).slice(0, 5);

  if (worst.length > 0) {
    lines.push('Biggest spike meals:');
    worst.forEach(g => lines.push(`  - "${g.desc}" → avg +${g.avgSpike.toFixed(1)} mmol/L (${g.count}x)`));
  }
  if (best.length > 0) {
    lines.push('Best tolerated meals:');
    best.forEach(g => lines.push(`  - "${g.desc}" → avg +${g.avgSpike.toFixed(1)} mmol/L (${g.count}x)`));
  }

  return lines.join('\n');
}

function buildTimeOfDayAnalysis(readings: GlucoseReading[], targetLow: number, targetHigh: number): string {
  const buckets: Record<string, number[]> = {
    'Overnight (00-06)': [],
    'Morning (06-10)': [],
    'Midday (10-14)': [],
    'Afternoon (14-18)': [],
    'Evening (18-22)': [],
    'Night (22-00)': [],
  };

  for (const r of readings) {
    const h = new Date(r.timestamp).getHours();
    if (h < 6) buckets['Overnight (00-06)'].push(r.value);
    else if (h < 10) buckets['Morning (06-10)'].push(r.value);
    else if (h < 14) buckets['Midday (10-14)'].push(r.value);
    else if (h < 18) buckets['Afternoon (14-18)'].push(r.value);
    else if (h < 22) buckets['Evening (18-22)'].push(r.value);
    else buckets['Night (22-00)'].push(r.value);
  }

  const lines: string[] = [];
  for (const [label, values] of Object.entries(buckets)) {
    if (values.length === 0) continue;
    const avg = values.reduce((s, v) => s + v, 0) / values.length;
    const inRange = values.filter(v => v >= targetLow && v <= targetHigh).length;
    const tir = Math.round((inRange / values.length) * 100);
    const flag = tir < 50 ? ' ⚠️' : tir >= 80 ? ' ✅' : '';
    lines.push(`  ${label}: avg ${avg.toFixed(1)}, TIR ${tir}%${flag}`);
  }

  return lines.length > 0 ? lines.join('\n') : 'Not enough data for time-of-day analysis.';
}

async function buildSystemPrompt(): Promise<string> {
  try {
    const now = Date.now();
    const h24 = 24 * 60 * 60 * 1000;
    const d7 = 7 * h24;
    const d30 = 30 * h24;

    // Parallel fetch — deep data pull
    const [
      readings24h, readings7d, readings30d,
      recentMeals, allMeals30d,
      recentInsulin, allInsulin7d,
      factors24h, factors7d,
      iobResult, settings,
      correlations, dailyStats,
    ] = await Promise.all([
      getGlucoseReadings(5000, now - h24),
      getGlucoseReadings(20000, now - d7),
      getGlucoseReadings(50000, now - d30),
      getMeals(20),
      getMealsInRange(now - d30, now),
      getInsulinDoses(20),
      getInsulinDosesInRange(now - d7, now),
      getFactorsSince(now - h24),
      getFactorsSince(now - d7),
      calculateIOB(),
      getAllSettings(),
      getCorrelations(),
      getDailyStats(30),
    ]);

    // ── 24h Glucose Summary ──
    const stats24 = glucoseStatsForReadings(readings24h, settings.target_low, settings.target_high);
    const latest = readings24h.length > 0 ? readings24h[readings24h.length - 1] : null;
    let glucose24hSummary = 'No glucose readings in last 24h.';
    if (stats24 && latest) {
      glucose24hSummary =
        `Last 24h: ${stats24.count} readings, avg ${stats24.avg.toFixed(1)} mmol/L, ` +
        `TIR ${stats24.tir}%, range ${stats24.min.toFixed(1)}–${stats24.max.toFixed(1)}, ` +
        `CV ${stats24.cv.toFixed(0)}%, highs: ${stats24.high}, lows: ${stats24.low}. ` +
        `Latest: ${latest.value.toFixed(1)} mmol/L (${latest.trend}).`;
    }

    // ── 7-Day Trend ──
    const stats7 = glucoseStatsForReadings(readings7d, settings.target_low, settings.target_high);
    let trend7dSummary = 'Not enough 7-day data.';
    if (stats7) {
      trend7dSummary =
        `7-day: avg ${stats7.avg.toFixed(1)}, TIR ${stats7.tir}%, ` +
        `CV ${stats7.cv.toFixed(0)}%, est. A1C ${stats7.eA1C.toFixed(1)}%, ` +
        `${stats7.high} highs, ${stats7.low} lows.`;
    }

    // ── 30-Day Trend ──
    const stats30 = glucoseStatsForReadings(readings30d, settings.target_low, settings.target_high);
    let trend30dSummary = 'Not enough 30-day data.';
    if (stats30) {
      trend30dSummary =
        `30-day: avg ${stats30.avg.toFixed(1)}, TIR ${stats30.tir}%, ` +
        `est. A1C ${stats30.eA1C.toFixed(1)}%, ` +
        `${stats30.high} highs, ${stats30.low} lows.`;
    }

    // ── TIR Trend (daily stats) ──
    let tirTrend = '';
    if (dailyStats.length >= 3) {
      const recent3 = dailyStats.slice(0, 3);
      const older3 = dailyStats.slice(Math.max(0, dailyStats.length - 3));
      const recentAvgTIR = recent3.reduce((s, d) => s + d.tir_percentage, 0) / recent3.length;
      const olderAvgTIR = older3.reduce((s, d) => s + d.tir_percentage, 0) / older3.length;
      const diff = recentAvgTIR - olderAvgTIR;
      tirTrend = `TIR trend: recent 3 days avg ${recentAvgTIR.toFixed(0)}% vs earlier ${olderAvgTIR.toFixed(0)}% (${diff > 0 ? '↑ improving' : diff < -5 ? '↓ declining' : '→ stable'}).`;
    }

    // ── Time of Day Analysis (7d) ──
    const timeOfDayAnalysis = buildTimeOfDayAnalysis(readings7d, settings.target_low, settings.target_high);

    // ── Meal Correlations ──
    const mealCorrelations = buildMealCorrelationSummary(allMeals30d, correlations);

    // ── Per-Meal-Time Breakdown ──
    const mealTimeGroups: Record<string, { carbs: number[]; spikes: number[] }> = {};
    for (const c of correlations) {
      const meal = allMeals30d.find(m => m.id === c.meal_id);
      if (!meal) continue;
      const slot = categorizeMealTime(meal.timestamp);
      if (!mealTimeGroups[slot]) mealTimeGroups[slot] = { carbs: [], spikes: [] };
      mealTimeGroups[slot].carbs.push(meal.carbs_estimate);
      mealTimeGroups[slot].spikes.push(c.peak_glucose - c.pre_glucose);
    }
    const mealTimeLines: string[] = [];
    for (const [slot, data] of Object.entries(mealTimeGroups)) {
      if (data.spikes.length === 0) continue;
      const avgCarbs = data.carbs.reduce((s, v) => s + v, 0) / data.carbs.length;
      const avgSpike = data.spikes.reduce((s, v) => s + v, 0) / data.spikes.length;
      mealTimeLines.push(`  ${slot}: avg ${avgCarbs.toFixed(0)}g carbs → avg +${avgSpike.toFixed(1)} mmol/L spike (${data.spikes.length} meals)`);
    }

    // ── Recent Meals (last 20) — include IDs so AI can reference them for edits ──
    const mealLines = recentMeals.slice(0, 10).map(m => {
      const h = Math.round((now - m.timestamp) / 3600000);
      const extras: string[] = [];
      if (m.gi_rating) extras.push(`GI:${m.gi_rating}`);
      if (m.fat) extras.push(`${m.fat}g fat`);
      if (m.protein) extras.push(`${m.protein}g protein`);
      return `- [id:${m.id}] ${m.description} (${m.carbs_estimate}g carbs${extras.length ? ', ' + extras.join(', ') : ''}, ${h}h ago)`;
    });

    // ── Recent Insulin — include IDs ──
    const insulinLines = recentInsulin.slice(0, 10).map(d => {
      const h = Math.round((now - d.timestamp) / 3600000);
      return `- [id:${d.id}] ${d.units}u ${d.type} (${h}h ago)`;
    });

    // ── 7d Insulin totals ──
    let insulinSummary7d = '';
    if (allInsulin7d.length > 0) {
      const rapid = allInsulin7d.filter(d => d.type === 'rapid');
      const basal = allInsulin7d.filter(d => d.type === 'long');
      const rapidTotal = rapid.reduce((s, d) => s + d.units, 0);
      const basalTotal = basal.reduce((s, d) => s + d.units, 0);
      insulinSummary7d = `7-day insulin: ${rapidTotal.toFixed(0)}u rapid (avg ${(rapidTotal / 7).toFixed(1)}u/day), ${basalTotal.toFixed(0)}u basal (avg ${(basalTotal / 7).toFixed(1)}u/day).`;
    }

    // ── Recent Factors (24h detailed + 7d summary) ──
    const factorLines24 = factors24h.slice(0, 10).map(f => {
      const h = Math.round((now - f.timestamp) / 3600000);
      const val = JSON.parse(f.value);
      let detail: string = f.type;
      try {
        if (f.type === 'exercise') detail = `Exercise: ${val.duration}min ${val.intensity} ${val.activityType || ''}`;
        else if (f.type === 'stress') detail = `Stress: ${val.level}/5`;
        else if (f.type === 'sleep') detail = `Sleep: ${val.hours}h, quality ${val.quality}/5`;
        else if (f.type === 'illness' && val.sick) detail = 'Illness/sick day';
        else if (f.type === 'alcohol') detail = `Alcohol: ${val.units} units`;
        else if (f.type === 'caffeine') detail = `Caffeine: ${val.cups} cups`;
      } catch {}
      return `- ${detail} (${h}h ago)`;
    });

    // 7d factor summary counts
    const factorCounts: Record<string, number> = {};
    factors7d.forEach(f => { factorCounts[f.type] = (factorCounts[f.type] || 0) + 1; });
    const factorSummary7d = Object.entries(factorCounts).map(([k, v]) => `${k}: ${v}x`).join(', ');

    return `You are GlucoMind AI — a deeply knowledgeable, empathetic diabetes management assistant \
for a Type 1 diabetic named ${settings.user_name}. You have access to their FULL diabetes data history \
and should analyse it thoroughly when answering questions.

═══ PRIORITY RULES ═══
1. If the user asks about their glucose, patterns, lows, highs, spikes, overnight, or anything data-related → ANALYSE THEIR DATA below. Reference specific readings, times, meals, insulin, and factors.
2. Only explain app features (points, settings, navigation) if the user specifically asks about how the app works.
3. NEVER answer a data question with a feature explanation. If unsure, default to data analysis.

${APP_KNOWLEDGE}

═══ CURRENT STATE ═══
GLUCOSE NOW: ${latest ? `${latest.value.toFixed(1)} mmol/L (${latest.trend})` : 'No recent reading'}
IOB: ${iobResult.totalIOB.toFixed(1)}u active insulin${iobResult.isHigh ? ' ⚠️ HIGH — stacking risk' : ''}
TARGET: ${settings.target_low}–${settings.target_high} mmol/L

═══ GLUCOSE HISTORY ═══
${glucose24hSummary}
${trend7dSummary}
${trend30dSummary}
${tirTrend}

═══ TIME-OF-DAY PATTERNS (7 days) ═══
${timeOfDayAnalysis}

═══ MEAL → GLUCOSE CORRELATIONS (all history) ═══
${mealCorrelations}
${mealTimeLines.length > 0 ? '\nPer-meal-time breakdown:\n' + mealTimeLines.join('\n') : ''}

═══ RECENT MEALS (last 10) ═══
${mealLines.length ? mealLines.join('\n') : 'None logged'}

═══ RECENT INSULIN ═══
${insulinLines.length ? insulinLines.join('\n') : 'None logged'}
${insulinSummary7d}

═══ LIFESTYLE FACTORS (24h) ═══
${factorLines24.length ? factorLines24.join('\n') : 'None logged'}
${factorSummary7d ? `7-day factor summary: ${factorSummary7d}` : ''}

═══ GUIDELINES ═══
- You have deep knowledge of this patient's patterns — USE IT. Reference specific meals, times, and trends.
- When asked "how can I improve?", analyse the data: find their weakest time periods, worst meals, and give specific actionable advice.
- Flag stacking risk if IOB is high when discussing dosing.
- Reference historical correlations: "Last time you had X, your glucose went to Y."
- Be concise (2–4 sentences) unless the user wants detail — then go deep.
- Use mmol/L throughout.
- Be warm, direct, and genuinely helpful — like a knowledgeable friend who happens to be a diabetes expert.

═══ LOG EDITING ═══
You can edit and delete meal and insulin entries using tool calls. Each meal/insulin entry has an [id:N] tag.
- When the user asks to correct a meal (e.g. "that bread was actually 42g carbs"), use update_meal with the correct meal_id.
- When the user asks to remove an entry, use delete_meal or delete_insulin.
- ALWAYS confirm what you changed after making the edit (e.g. "Done — I've updated your sourdough bread to 42g carbs").
- If you're unsure which entry they mean, ask them to clarify before making changes.
- Never silently change entries — always tell the user what you did.

═══ COMPLIANCE & SAFETY ═══
- NEVER prescribe specific insulin doses (e.g. never say "take 4 units now"). Instead say "your history suggests you may need a correction — discuss the right dose with your diabetes team".
- NEVER diagnose conditions. Say "it looks like you may be experiencing dawn phenomenon" not "you have dawn phenomenon".
- NEVER tell users to change their basal insulin regimen without strongly recommending they discuss with their DSN/consultant.
- Frame insights as patterns and observations: "your data suggests...", "based on your history...", "it looks like..."
- For any dosing questions, always end with: "Check with your diabetes team before making changes to your regimen."
- GlucoMind provides educational insights and pattern analysis — not medical advice. Always remind users their diabetes team is the authority on treatment decisions.
- If someone describes a medical emergency (severe hypo, DKA symptoms), tell them to call 999 or seek immediate medical help — do not try to manage it through the app.

═══ REMINDER ═══
Always re-read the user's ACTUAL question before answering. If they ask about glucose, lows, highs, patterns, meals, or insulin — use the data sections above, not app feature docs.`;
  } catch (e) {
    console.error('buildSystemPrompt error', e);
    return `You are GlucoMind AI, a helpful diabetes management assistant for a Type 1 diabetic. \
Use mmol/L. Be concise, practical, and warm.`;
  }
}

// ─── Tool Definitions ─────────────────────────────────────────────────────────

const chatTools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'update_meal',
      description: 'Update a meal entry in the user\'s food log. Use when the user asks to correct or change a logged meal (e.g. wrong carbs, wrong description). Always confirm what you\'re changing.',
      parameters: {
        type: 'object',
        properties: {
          meal_id: { type: 'number', description: 'The ID of the meal to update' },
          description: { type: 'string', description: 'New meal description (optional)' },
          carbs: { type: 'number', description: 'New carbs in grams (optional)' },
          fat: { type: 'number', description: 'New fat in grams (optional)' },
          protein: { type: 'number', description: 'New protein in grams (optional)' },
          calories: { type: 'number', description: 'New calories (optional)' },
        },
        required: ['meal_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_meal',
      description: 'Delete a meal entry from the user\'s food log. Use when the user asks to remove a logged meal.',
      parameters: {
        type: 'object',
        properties: {
          meal_id: { type: 'number', description: 'The ID of the meal to delete' },
        },
        required: ['meal_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_insulin',
      description: 'Update an insulin dose entry. Use when the user says they logged the wrong dose or type.',
      parameters: {
        type: 'object',
        properties: {
          dose_id: { type: 'number', description: 'The ID of the insulin dose to update' },
          units: { type: 'number', description: 'New units (optional)' },
          type: { type: 'string', enum: ['rapid', 'long'], description: 'New insulin type (optional)' },
        },
        required: ['dose_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_insulin',
      description: 'Delete an insulin dose entry. Use when the user asks to remove a logged dose.',
      parameters: {
        type: 'object',
        properties: {
          dose_id: { type: 'number', description: 'The ID of the insulin dose to delete' },
        },
        required: ['dose_id'],
      },
    },
  },
];

async function executeToolCall(name: string, args: any): Promise<string> {
  try {
    switch (name) {
      case 'update_meal': {
        const meal = await getMealById(args.meal_id);
        if (!meal) return JSON.stringify({ error: 'Meal not found with that ID' });
        const updates: any = {};
        if (args.description !== undefined) updates.description = args.description;
        if (args.carbs !== undefined) updates.carbs_estimate = args.carbs;
        if (args.fat !== undefined) updates.fat = args.fat;
        if (args.protein !== undefined) updates.protein = args.protein;
        if (args.calories !== undefined) updates.calories = args.calories;
        await updateMeal(args.meal_id, updates);
        const updated = await getMealById(args.meal_id);
        return JSON.stringify({ success: true, meal: updated });
      }
      case 'delete_meal': {
        const meal = await getMealById(args.meal_id);
        if (!meal) return JSON.stringify({ error: 'Meal not found with that ID' });
        await deleteMeal(args.meal_id);
        return JSON.stringify({ success: true, deleted: meal.description });
      }
      case 'update_insulin': {
        const dose = await getInsulinDoseById(args.dose_id);
        if (!dose) return JSON.stringify({ error: 'Insulin dose not found with that ID' });
        const updates: any = {};
        if (args.units !== undefined) updates.units = args.units;
        if (args.type !== undefined) updates.type = args.type;
        await updateInsulinDose(args.dose_id, updates);
        const updated = await getInsulinDoseById(args.dose_id);
        return JSON.stringify({ success: true, dose: updated });
      }
      case 'delete_insulin': {
        const dose = await getInsulinDoseById(args.dose_id);
        if (!dose) return JSON.stringify({ error: 'Insulin dose not found with that ID' });
        await deleteInsulinDose(args.dose_id);
        return JSON.stringify({ success: true, deleted: `${dose.units}u ${dose.type}` });
      }
      default:
        return JSON.stringify({ error: `Unknown function: ${name}` });
    }
  } catch (e: any) {
    return JSON.stringify({ error: e.message ?? 'Unknown error' });
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface UIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

function dbToUI(msg: ChatMessage): UIMessage {
  return { ...msg, id: msg.id.toString() };
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

interface BubbleProps {
  msg: UIMessage;
}

function Bubble({ msg }: BubbleProps) {
  const isUser = msg.role === 'user';
  const time = new Date(msg.timestamp).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <View style={[bubbleStyles.row, isUser ? bubbleStyles.rowUser : bubbleStyles.rowAI]}>
      {!isUser && (
        <View style={bubbleStyles.aiAvatar}>
          <Ionicons name="pulse" size={14} color={Colors.primary} />
        </View>
      )}
      <View
        style={[
          bubbleStyles.bubble,
          isUser ? bubbleStyles.bubbleUser : bubbleStyles.bubbleAI,
        ]}
      >
        <Text style={[bubbleStyles.text, isUser ? bubbleStyles.textUser : bubbleStyles.textAI]}>
          {msg.content}
        </Text>
        <Text style={[bubbleStyles.time, isUser ? bubbleStyles.timeUser : bubbleStyles.timeAI]}>
          {time}
        </Text>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<UIMessage>>(null);

  // Load history on mount
  useEffect(() => {
    (async () => {
      const history = await getChatHistory(100);
      setMessages(history.map(dbToUI));
    })();
  }, []);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;

    setInput('');
    setSending(true);

    // Optimistically add user message
    const userMsg: UIMessage = {
      id: `tmp-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      // Persist user message
      const userId = await insertChatMessage({ role: 'user', content: text, timestamp: userMsg.timestamp });
      const savedUserMsg: UIMessage = { ...userMsg, id: userId.toString() };
      setMessages(prev => prev.map(m => (m.id === userMsg.id ? savedUserMsg : m)));

      // Build system prompt with live context
      const systemPrompt = await buildSystemPrompt();

      // Build message history for API (last 20 messages)
      const history = await getChatHistory(20);
      const apiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
        ...history.slice(-19).map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      ];

      let response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: apiMessages,
        max_tokens: 800,
        temperature: 0.5,
        tools: chatTools,
      });

      // Handle tool calls (may chain up to 3 times for multi-step edits)
      let message = response.choices[0]?.message;
      let toolLoops = 0;
      while (message?.tool_calls && message.tool_calls.length > 0 && toolLoops < 3) {
        toolLoops++;
        // Add assistant message with tool calls
        apiMessages.push(message as any);

        // Execute each tool call and add results
        for (const toolCall of message.tool_calls) {
          const args = JSON.parse(toolCall.function.arguments);
          const result = await executeToolCall(toolCall.function.name, args);
          apiMessages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: result,
          } as any);
        }

        // Get follow-up response
        response = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: apiMessages,
          max_tokens: 800,
          temperature: 0.7,
          tools: chatTools,
        });
        message = response.choices[0]?.message;
      }

      const replyContent =
        message?.content ??
        "I'm having trouble connecting right now. Please try again.";

      const aiTs = Date.now();
      const aiId = await insertChatMessage({ role: 'assistant', content: replyContent, timestamp: aiTs });
      const aiMsg: UIMessage = {
        id: aiId.toString(),
        role: 'assistant',
        content: replyContent,
        timestamp: aiTs,
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err: any) {
      console.error('Chat error:', err);
      const errMsg: UIMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, I couldn\'t reach the AI right now. Check your connection and try again.',
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setSending(false);
    }
  }, [input, sending]);

  const handleClearChat = () => {
    Alert.alert(
      'Clear chat history?',
      'This will permanently delete all messages.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await clearChatHistory();
            setMessages([]);
          },
        },
      ]
    );
  };

  const renderItem = useCallback(({ item }: { item: UIMessage }) => <Bubble msg={item} />, []);
  const keyExtractor = useCallback((item: UIMessage) => item.id, []);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      {/* Header actions */}
      <View style={styles.headerActions}>
        <TouchableOpacity onPress={() => router.navigate('/')} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.contextNote}>
          <Ionicons name="information-circle" size={11} color={Colors.textMuted} />
          {' '}Deep memory: 30 days of your data
        </Text>
        <TouchableOpacity onPress={handleClearChat} style={styles.clearBtn}>
          <Ionicons name="trash-outline" size={16} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Message list */}
      {messages.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconRing}>
            <Ionicons name="chatbubble-ellipses" size={32} color={Colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>GlucoMind AI</Text>
          <Text style={styles.emptySubtitle}>
            Ask me anything about your glucose, meals, insulin, or diabetes management.
            I have context of your last 24 hours of data.
          </Text>
          <View style={styles.suggestionGrid}>
            {[
              'Why was my glucose high this morning?',
              'How much insulin for 60g carbs?',
              "What's my best meal this week?",
              'Tips for overnight control?',
            ].map(suggestion => (
              <TouchableOpacity
                key={suggestion}
                style={styles.suggestionChip}
                onPress={() => setInput(suggestion)}
              >
                <Text style={styles.suggestionText}>{suggestion}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        />
      )}

      {/* Typing indicator */}
      {sending && (
        <View style={styles.typingRow}>
          <View style={styles.aiAvatar}>
            <Ionicons name="pulse" size={12} color={Colors.primary} />
          </View>
          <View style={styles.typingBubble}>
            <ActivityIndicator size="small" color={Colors.primary} />
          </View>
        </View>
      )}

      {/* Input bar */}
      <View style={[styles.inputBar, { paddingBottom: insets.bottom + 8 }]}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Ask GlucoMind AI..."
          placeholderTextColor={Colors.textMuted}
          multiline
          maxLength={500}
          keyboardAppearance="light"
          returnKeyType="send"
          onSubmitEditing={sendMessage}
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnDisabled]}
          onPress={sendMessage}
          disabled={!input.trim() || sending}
        >
          <Ionicons name="arrow-up" size={18} color={Colors.background} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
    gap: 8,
  },
  backBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: Colors.primary + '15',
  },
  contextNote: {
    flex: 1,
    color: Colors.textMuted,
    fontSize: 11,
  },
  clearBtn: {
    padding: 4,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  emptyIconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primary + '1A',
    borderWidth: 1,
    borderColor: Colors.primary + '44',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  suggestionGrid: {
    width: '100%',
    gap: 8,
    marginTop: 8,
  },
  suggestionChip: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  suggestionText: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  messageList: {
    padding: 16,
    paddingBottom: 8,
    gap: 8,
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  aiAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary + '22',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.primary + '44',
  },
  typingBubble: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 10,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
    backgroundColor: Colors.surface,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: Colors.textPrimary,
    fontSize: 14,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: Colors.textMuted,
  },
});

const bubbleStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginVertical: 2,
  },
  rowUser: {
    justifyContent: 'flex-end',
  },
  rowAI: {
    justifyContent: 'flex-start',
  },
  aiAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary + '22',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.primary + '44',
    marginBottom: 2,
  },
  bubble: {
    maxWidth: '78%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 4,
  },
  bubbleUser: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleAI: {
    backgroundColor: Colors.card,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  text: {
    fontSize: 14,
    lineHeight: 20,
  },
  textUser: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  textAI: {
    color: Colors.textPrimary,
  },
  time: {
    fontSize: 10,
    alignSelf: 'flex-end',
  },
  timeUser: {
    color: 'rgba(255,255,255,0.7)',
  },
  timeAI: {
    color: Colors.textMuted,
  },
});
