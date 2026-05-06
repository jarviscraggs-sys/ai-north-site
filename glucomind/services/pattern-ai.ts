/**
 * LLM-Powered Pattern Analysis Service
 *
 * Periodically analyses glucose data using GPT-4o-mini to surface
 * smart, personalised insights as in-app notifications.
 *
 * Runs every ~60 minutes when the app is foregrounded.
 */

import OpenAI from 'openai';
import { OPENAI_API_KEY } from '../config/keys';
import {
  getGlucoseReadings,
  getMealsInRange,
  getInsulinDosesInRange,
  getFactorsSince,
  getAllSettings,
  getSetting,
} from './database';
import { calculateIOB } from './iob';
import { sendPatternAlert } from './notifications';
import type { GlucosePattern } from './patterns';

// ─── State ────────────────────────────────────────────────────────────────────

let lastAnalysisTime: number | null = null;
let intervalId: ReturnType<typeof setInterval> | null = null;

const COOLDOWN_MS = 55 * 60 * 1000; // 55 minutes
const MIN_READINGS = 12; // minimum readings in 6h window to bother analysing

// ─── Main Analysis ────────────────────────────────────────────────────────────

export async function runPatternAnalysis(): Promise<void> {
  try {
    // Cooldown check
    if (lastAnalysisTime && Date.now() - lastAnalysisTime < COOLDOWN_MS) {
      return;
    }

    // Setting check — respect user opt-out
    const aiEnabled = await getSetting('ai_insights_enabled', 'true');
    if (aiEnabled === 'false') return;

    // Gather data
    const now = Date.now();
    const sixHoursAgo = now - 6 * 60 * 60 * 1000;
    const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;

    const [readings, meals, insulin, factors, iob, settings] = await Promise.all([
      getGlucoseReadings(200, sixHoursAgo),
      getMealsInRange(sixHoursAgo, now),
      getInsulinDosesInRange(sixHoursAgo, now),
      getFactorsSince(twentyFourHoursAgo),
      calculateIOB(),
      getAllSettings(),
    ]);

    // Not enough data — skip silently
    if (readings.length < MIN_READINGS) return;

    // Build compact data summary for the LLM
    const glucoseSummary = readings.map(r => ({
      t: new Date(r.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      v: r.value,
      trend: r.trend,
    }));

    const mealSummary = meals.map(m => ({
      t: new Date(m.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      desc: m.description,
      carbs: m.carbs_estimate,
      cat: m.category,
    }));

    const insulinSummary = insulin.map(d => ({
      t: new Date(d.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      type: d.type,
      units: d.units,
    }));

    const factorSummary = factors.map(f => ({
      t: new Date(f.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      type: f.type,
      val: f.value,
    }));

    const dataPayload = JSON.stringify({
      glucose: glucoseSummary,
      meals: mealSummary,
      insulin: insulinSummary,
      factors: factorSummary,
      currentIOB: iob.totalIOB,
      targetRange: { low: settings.target_low, high: settings.target_high },
    });

    const userName = settings.user_name || 'there';

    // Call GPT-4o-mini
    const client = new OpenAI({ apiKey: OPENAI_API_KEY });

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 200,
      temperature: 0.3,
      messages: [
        {
          role: 'system',
          content: `You are a concise diabetes pattern analyst inside GlucoMind, a CGM companion app for ${userName}. You analyse glucose data alongside meals, insulin, and lifestyle factors.

Rules:
- Identify ONE genuinely noteworthy pattern or insight — something actionable or encouraging.
- Do NOT state the obvious (e.g. "your glucose is 6.2" when it's clearly fine).
- Be specific: reference times, values, and likely causes.
- Keep the title under 8 words and the message under 2 sentences.
- Use mmol/L. Be warm but direct.

Respond with JSON only: { "hasInsight": boolean, "title": string, "message": string, "severity": "info" | "warning" | "alert" }
If nothing noteworthy, set hasInsight to false and leave title/message empty.`,
        },
        {
          role: 'user',
          content: `Here's ${userName}'s last 6 hours of data:\n${dataPayload}`,
        },
      ],
      response_format: { type: 'json_object' },
    });

    lastAnalysisTime = Date.now();

    const content = response.choices?.[0]?.message?.content;
    if (!content) return;

    const result = JSON.parse(content) as {
      hasInsight: boolean;
      title: string;
      message: string;
      severity: 'info' | 'warning' | 'alert';
    };

    if (!result.hasInsight || !result.title || !result.message) return;

    // Build a GlucosePattern and fire the notification
    const pattern: GlucosePattern = {
      type: 'post_meal_spike', // generic type — the LLM determines the actual content
      title: result.title,
      description: result.message,
      recommendation: '', // message is self-contained
      severity: result.severity,
      detectedAt: Date.now(),
      data: { source: 'ai_analysis' },
    };

    await sendPatternAlert(pattern);
  } catch (err) {
    // Fail silently — don't disrupt the app
    console.log('[PatternAI] Analysis skipped:', err);
  }
}

// ─── Interval Management ──────────────────────────────────────────────────────

export function startPatternAnalysisInterval(): void {
  if (intervalId) return; // already running

  // Run once shortly after start (30s delay to let data load)
  setTimeout(() => {
    runPatternAnalysis().catch(() => {});
  }, 30 * 1000);

  // Then every 60 minutes
  intervalId = setInterval(() => {
    runPatternAnalysis().catch(() => {});
  }, 60 * 60 * 1000);
}

export function stopPatternAnalysisInterval(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

export function getLastAnalysisTime(): number | null {
  return lastAnalysisTime;
}
