/**
 * Hypo Prediction — GlucoMind
 *
 * Predicts hypoglycaemia BEFORE it happens using:
 * - Recent glucose trend (rate of change)
 * - Active insulin on board (IOB)
 * - User's low threshold
 *
 * Warns 20-30 minutes before a predicted low.
 */

import { getGlucoseReadings, getAllSettings } from './database';
import { calculateIOB } from './iob';
import { GlucoseReading } from '../types';

export interface HypoPrediction {
  predicted: boolean;          // Will they go low?
  currentGlucose: number;     // mmol/L
  rateOfChange: number;       // mmol/L per minute (negative = dropping)
  predictedLowIn: number;     // minutes until hitting threshold (0 if not predicted)
  predictedValue30min: number; // projected glucose in 30 min
  targetLow: number;          // user's low threshold
  iobFactor: number;          // how much IOB accelerates the drop
  severity: 'none' | 'watch' | 'warning' | 'urgent';
  message: string;
}

/**
 * Calculate rate of change from recent readings.
 * Uses last 20 minutes of data (4 readings at 5-min intervals).
 */
function calculateRateOfChange(readings: GlucoseReading[]): number | null {
  if (readings.length < 2) return null;

  // Take last 4 readings (or whatever we have)
  const recent = readings.slice(-4);
  if (recent.length < 2) return null;

  const first = recent[0];
  const last = recent[recent.length - 1];
  const timeDiffMs = last.timestamp - first.timestamp;

  if (timeDiffMs <= 0) return null;

  const timeDiffMin = timeDiffMs / 60000;
  const valueDiff = last.value - first.value;

  return valueDiff / timeDiffMin; // mmol/L per minute
}

/**
 * Predict if user will go hypoglycaemic.
 */
export async function predictHypo(): Promise<HypoPrediction> {
  const settings = await getAllSettings();
  const targetLow = settings.target_low ?? 4.0;

  // Get last 30 minutes of readings
  const thirtyMinAgo = Date.now() - 30 * 60 * 1000;
  const readings = await getGlucoseReadings(10, thirtyMinAgo);

  const defaultResult: HypoPrediction = {
    predicted: false,
    currentGlucose: 0,
    rateOfChange: 0,
    predictedLowIn: 0,
    predictedValue30min: 0,
    targetLow,
    iobFactor: 0,
    severity: 'none',
    message: '',
  };

  if (readings.length < 2) return defaultResult;

  const current = readings[readings.length - 1];
  const rateOfChange = calculateRateOfChange(readings);

  if (rateOfChange === null) return { ...defaultResult, currentGlucose: current.value };

  // Get IOB to factor in additional drop potential
  const iob = await calculateIOB();
  // Each unit of active rapid insulin can drop glucose ~1.5-2.5 mmol/L
  // Use conservative estimate: 1.5 mmol/L per unit over remaining action time
  const iobDropEstimate = iob.totalIOB * 1.5;
  // Spread over remaining action time (~2-3 hours average)
  const iobRateAdjustment = iob.clearTimeMs > 0
    ? (iobDropEstimate / (iob.clearTimeMs / 60000)) // additional drop per minute from IOB
    : 0;

  // Effective rate = observed rate + IOB-driven drop (only if not already accounted for)
  // If glucose is already falling, IOB is partially reflected in the trend
  // Add 30% of IOB adjustment as additional risk factor
  const effectiveRate = rateOfChange - (iobRateAdjustment * 0.3);

  // Project forward
  const predictedValue30min = current.value + (effectiveRate * 30);

  // Calculate time to hit low threshold
  let predictedLowIn = 0;
  if (effectiveRate < 0 && current.value > targetLow) {
    const gapToLow = current.value - targetLow;
    predictedLowIn = Math.round(gapToLow / Math.abs(effectiveRate));
  }

  // Determine severity
  let severity: HypoPrediction['severity'] = 'none';
  let message = '';
  let predicted = false;

  if (current.value <= targetLow) {
    // Already low
    severity = 'urgent';
    predicted = true;
    message = `⚠️ You're already low at ${current.value} mmol/L — eat fast carbs now!`;
  } else if (predictedLowIn > 0 && predictedLowIn <= 15) {
    // Going low within 15 min
    severity = 'urgent';
    predicted = true;
    message = `🚨 At this rate you'll be below ${targetLow} in ~${predictedLowIn} minutes. Consider eating something now.`;
  } else if (predictedLowIn > 0 && predictedLowIn <= 30) {
    // Going low within 30 min
    severity = 'warning';
    predicted = true;
    message = `⚠️ Glucose trending low — predicted to hit ${targetLow} in ~${predictedLowIn} minutes.${iob.totalIOB > 0.5 ? ` You have ${iob.totalIOB.toFixed(1)}u active insulin.` : ''}`;
  } else if (predictedValue30min < targetLow + 1.0 && effectiveRate < -0.03) {
    // Getting close — watch zone
    severity = 'watch';
    predicted = false;
    message = `📉 Glucose dropping (${(rateOfChange * 60).toFixed(1)} mmol/h). Keep an eye on it.`;
  }

  return {
    predicted,
    currentGlucose: current.value,
    rateOfChange,
    predictedLowIn,
    predictedValue30min: Math.round(predictedValue30min * 10) / 10,
    targetLow,
    iobFactor: iobRateAdjustment,
    severity,
    message,
  };
}
