import OpenAI from 'openai';
import { OPENAI_API_KEY } from '../config/keys';
import {
  getGlucoseReadings,
  getMeals,
  getInsulinDoses,
  getCorrelations,
  getFactorsSince,
  getAllSettings,
  getDailyStats,
} from './database';
import { GlucoseReading, Meal, InsulinDose, Correlation, Factor, Settings, DailyStat } from '../types';

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

// ─── Time-of-day buckets ──────────────────────────────────────────────────────

type TimeBucket = {
  label: string;
  startHour: number;
  endHour: number;
};

const TIME_BUCKETS: TimeBucket[] = [
  { label: 'Overnight', startHour: 0, endHour: 6 },
  { label: 'Morning', startHour: 6, endHour: 10 },
  { label: 'Midday', startHour: 10, endHour: 14 },
  { label: 'Afternoon', startHour: 14, endHour: 18 },
  { label: 'Evening', startHour: 18, endHour: 21 },
  { label: 'Night', startHour: 21, endHour: 24 },
];

function getBucket(ts: number): TimeBucket | null {
  const h = new Date(ts).getHours();
  return TIME_BUCKETS.find(b => h >= b.startHour && h < b.endHour) ?? null;
}

// ─── Stats helpers ────────────────────────────────────────────────────────────

function avg(arr: number[]): number {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stddev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const mean = avg(arr);
  const variance = arr.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / arr.length;
  return Math.sqrt(variance);
}

function estimatedA1C(avgGlucoseMmol: number): number {
  // IFCC formula approximation: eA1C (%) = (avgGlucose_mmol/L * 2.59 + 46.7) / 10.929
  return Math.round(((avgGlucoseMmol * 2.59 + 46.7) / 10.929) * 10) / 10;
}

// ─── AI Summary ───────────────────────────────────────────────────────────────

async function generateAISummary(stats: {
  avgGlucose: number;
  a1c: number;
  tir: number;
  highs: number;
  lows: number;
  cv: number;
  topSpikeMeals: string[];
  topSafeMeals: string[];
  exerciseCount: number;
  avgSleepQuality: number;
  stressEvents: number;
  dailyRapidAvg: number;
  dailyBasalAvg: number;
  patientName: string;
  days: number;
}): Promise<string> {
  const prompt = `You are a diabetes care assistant generating a concise clinical summary for a patient report. Write 3-4 sentences in plain English suitable for both the patient and their care team.

Patient: ${stats.patientName}
Report period: last ${stats.days} days

Key data:
- Average glucose: ${stats.avgGlucose.toFixed(1)} mmol/L
- Estimated HbA1c: ${stats.a1c}%
- Time in range (${4}–10 mmol/L): ${stats.tir.toFixed(1)}%
- High readings (>10 mmol/L): ${stats.highs}
- Low readings (<4 mmol/L): ${stats.lows}
- Glucose variability (CV): ${stats.cv.toFixed(1)}%
- Daily rapid insulin average: ${stats.dailyRapidAvg.toFixed(1)} units
- Daily basal insulin average: ${stats.dailyBasalAvg.toFixed(1)} units
- Exercise sessions: ${stats.exerciseCount}
- Average sleep quality: ${stats.avgSleepQuality.toFixed(1)}/5
- Stress events: ${stats.stressEvents}
- Top spike-causing foods: ${stats.topSpikeMeals.join(', ') || 'insufficient data'}
- Best-tolerated foods: ${stats.topSafeMeals.join(', ') || 'insufficient data'}

Write a summary covering: (1) overall management quality, (2) what is going well, (3) the main area needing attention, and (4) one specific actionable recommendation. Be concise and clinical but human.`;

  const resp = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 250,
    temperature: 0.4,
  });

  return resp.choices[0]?.message?.content?.trim() ?? 'AI summary unavailable.';
}

// ─── HTML builder ─────────────────────────────────────────────────────────────

function html(content: string, dateRange: string, patientName: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>GlucoMind Diabetes Report</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif;
    background: #ffffff;
    color: #1A1D26;
    font-size: 13px;
    line-height: 1.5;
  }
  .page { max-width: 780px; margin: 0 auto; padding: 36px 40px; }

  /* Header */
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 3px solid #00BFA5;
    padding-bottom: 20px;
    margin-bottom: 24px;
  }
  .header-left h1 {
    font-size: 26px;
    font-weight: 800;
    color: #00BFA5;
    letter-spacing: -0.5px;
  }
  .header-left .subtitle {
    font-size: 13px;
    color: #6B7280;
    margin-top: 3px;
  }
  .header-right {
    text-align: right;
  }
  .header-right .patient-name {
    font-size: 16px;
    font-weight: 700;
    color: #1A1D26;
  }
  .header-right .date-range {
    font-size: 12px;
    color: #6B7280;
    margin-top: 3px;
  }
  .badge {
    display: inline-block;
    background: #00BFA5;
    color: #fff;
    font-size: 10px;
    font-weight: 700;
    border-radius: 4px;
    padding: 2px 7px;
    margin-top: 5px;
    letter-spacing: 0.5px;
  }

  /* Section */
  .section-title {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1.2px;
    color: #00BFA5;
    margin-bottom: 10px;
    padding-bottom: 5px;
    border-bottom: 1px solid #E8ECF0;
  }
  .section { margin-bottom: 24px; }

  /* AI Summary */
  .ai-box {
    background: #F0FDFB;
    border: 1.5px solid #00BFA5;
    border-radius: 10px;
    padding: 16px 18px;
    font-size: 13.5px;
    line-height: 1.65;
    color: #1A1D26;
  }
  .ai-label {
    font-size: 10px;
    font-weight: 700;
    color: #00BFA5;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 8px;
  }

  /* Stats grid */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }
  .stat-card {
    background: #F8F9FA;
    border: 1px solid #E8ECF0;
    border-radius: 10px;
    padding: 12px 14px;
    text-align: center;
  }
  .stat-value {
    font-size: 22px;
    font-weight: 800;
    color: #00BFA5;
    line-height: 1.1;
  }
  .stat-unit {
    font-size: 11px;
    color: #6B7280;
    margin-top: 1px;
  }
  .stat-label {
    font-size: 11px;
    color: #6B7280;
    margin-top: 4px;
    font-weight: 500;
  }
  .stat-value.red { color: #FF3B5C; }
  .stat-value.amber { color: #FFC107; }

  /* Table */
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12.5px;
  }
  thead th {
    text-align: left;
    font-weight: 600;
    color: #6B7280;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 6px 10px;
    border-bottom: 1.5px solid #E8ECF0;
  }
  tbody td {
    padding: 8px 10px;
    border-bottom: 1px solid #F3F4F6;
    color: #1A1D26;
    vertical-align: middle;
  }
  tbody tr:last-child td { border-bottom: none; }
  .tir-bar-bg {
    background: #E8ECF0;
    border-radius: 4px;
    height: 8px;
    width: 100%;
    overflow: hidden;
  }
  .tir-bar-fill {
    height: 8px;
    background: #00BFA5;
    border-radius: 4px;
  }
  .rank-num {
    display: inline-block;
    background: #00BFA5;
    color: #fff;
    font-size: 10px;
    font-weight: 700;
    border-radius: 50%;
    width: 18px;
    height: 18px;
    line-height: 18px;
    text-align: center;
    margin-right: 6px;
  }
  .rank-num.red { background: #FF3B5C; }

  /* Two-col layout */
  .two-col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }
  .sub-card {
    background: #F8F9FA;
    border: 1px solid #E8ECF0;
    border-radius: 10px;
    padding: 14px;
  }
  .sub-card-title {
    font-size: 11px;
    font-weight: 700;
    color: #00BFA5;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    margin-bottom: 10px;
  }
  .sub-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 4px 0;
    border-bottom: 1px solid #F0F0F0;
    font-size: 12.5px;
  }
  .sub-row:last-child { border-bottom: none; }
  .sub-row-label { color: #6B7280; }
  .sub-row-value { font-weight: 700; color: #1A1D26; }
  .sub-row-value.teal { color: #00BFA5; }

  /* Footer */
  .footer {
    border-top: 1px solid #E8ECF0;
    margin-top: 32px;
    padding-top: 14px;
    font-size: 10.5px;
    color: #9CA3AF;
    display: flex;
    justify-content: space-between;
  }
  .footer-disclaimer {
    font-style: italic;
  }
</style>
</head>
<body>
<div class="page">
${content}
</div>
</body>
</html>`;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export interface ReportData {
  html: string;
  dateRange: string;
}

export async function generateReport(): Promise<ReportData> {
  const DAYS = 30;
  const since = Date.now() - DAYS * 24 * 60 * 60 * 1000;

  // Fetch all data in parallel
  const [readings, meals, doses, correlations, factors, settings, dailyStats] = await Promise.all([
    getGlucoseReadings(5000, since),
    getMeals(500),
    getInsulinDoses(500),
    getCorrelations(),
    getFactorsSince(since),
    getAllSettings(),
    getDailyStats(DAYS),
  ]);

  // Filter by date range
  const recentMeals = meals.filter(m => m.timestamp > since);
  const recentDoses = doses.filter(d => d.timestamp > since);

  // ── Key stats ──────────────────────────────────────────────────────────────
  const glucoseValues = readings.map(r => r.value);
  const avgGlucose = avg(glucoseValues);
  const a1c = estimatedA1C(avgGlucose);
  const targetLow = settings.target_low;
  const targetHigh = settings.target_high;
  const inRangeCount = glucoseValues.filter(v => v >= targetLow && v <= targetHigh).length;
  const tir = glucoseValues.length ? (inRangeCount / glucoseValues.length) * 100 : 0;
  const highsCount = glucoseValues.filter(v => v > targetHigh).length;
  const lowsCount = glucoseValues.filter(v => v < targetLow).length;
  const sd = stddev(glucoseValues);
  const cv = avgGlucose > 0 ? (sd / avgGlucose) * 100 : 0;

  // ── Time-of-day breakdown ─────────────────────────────────────────────────
  const bucketData: Record<string, { values: number[]; inRange: number }> = {};
  TIME_BUCKETS.forEach(b => { bucketData[b.label] = { values: [], inRange: 0 }; });
  readings.forEach(r => {
    const bucket = getBucket(r.timestamp);
    if (bucket) {
      bucketData[bucket.label].values.push(r.value);
      if (r.value >= targetLow && r.value <= targetHigh) {
        bucketData[bucket.label].inRange++;
      }
    }
  });

  // ── Meal correlations ──────────────────────────────────────────────────────
  const mealMap: Record<number, Meal> = {};
  recentMeals.forEach(m => { mealMap[m.id] = m; });

  // Spike = biggest peak_glucose - pre_glucose delta
  interface MealScore { meal: Meal; spike: number; }
  const mealScores: MealScore[] = correlations
    .filter(c => mealMap[c.meal_id])
    .map(c => ({ meal: mealMap[c.meal_id], spike: c.peak_glucose - c.pre_glucose }));

  const spikeSort = [...mealScores].sort((a, b) => b.spike - a.spike);
  const safeSort = [...mealScores].sort((a, b) => a.spike - b.spike);

  const top5Spikes = spikeSort.slice(0, 5);
  const top5Safe = safeSort.slice(0, 5).filter(s => s.spike >= 0);

  // ── Insulin ────────────────────────────────────────────────────────────────
  const rapidDoses = recentDoses.filter(d => d.type === 'rapid');
  const basalDoses = recentDoses.filter(d => d.type === 'long');
  const totalRapid = rapidDoses.reduce((s, d) => s + d.units, 0);
  const totalBasal = basalDoses.reduce((s, d) => s + d.units, 0);
  const dailyRapidAvg = DAYS > 0 ? totalRapid / DAYS : 0;
  const dailyBasalAvg = DAYS > 0 ? totalBasal / DAYS : 0;

  // ── Factors ────────────────────────────────────────────────────────────────
  const exerciseFactors = factors.filter(f => f.type === 'exercise');
  const sleepFactors = factors.filter(f => f.type === 'sleep');
  const stressFactors = factors.filter(f => f.type === 'stress');

  const avgSleepQuality = sleepFactors.length
    ? avg(sleepFactors.map(f => {
        try { return (JSON.parse(f.value) as { quality: number }).quality; } catch { return 3; }
      }))
    : 0;

  const stressEvents = stressFactors.length;
  const exerciseCount = exerciseFactors.length;

  // ── Date formatting ────────────────────────────────────────────────────────
  const startDate = new Date(since);
  const endDate = new Date();
  const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const dateRange = `${fmt(startDate)} – ${fmt(endDate)}`;

  // ── AI Summary ─────────────────────────────────────────────────────────────
  const aiSummary = await generateAISummary({
    avgGlucose,
    a1c,
    tir,
    highs: highsCount,
    lows: lowsCount,
    cv,
    topSpikeMeals: top5Spikes.map(s => s.meal.description),
    topSafeMeals: top5Safe.map(s => s.meal.description),
    exerciseCount,
    avgSleepQuality,
    stressEvents,
    dailyRapidAvg,
    dailyBasalAvg,
    patientName: settings.user_name,
    days: DAYS,
  });

  // ── Build HTML sections ───────────────────────────────────────────────────

  const headerHtml = `
<div class="header">
  <div class="header-left">
    <h1>GlucoMind</h1>
    <div class="subtitle">Diabetes Management Report</div>
  </div>
  <div class="header-right">
    <div class="patient-name">${settings.user_name}</div>
    <div class="date-range">${dateRange}</div>
    <div class="badge">30-DAY REVIEW</div>
  </div>
</div>`;

  const aiHtml = `
<div class="section">
  <div class="section-title">AI Clinical Summary</div>
  <div class="ai-box">
    <div class="ai-label">⚕️ Generated by GlucoMind AI</div>
    ${aiSummary.replace(/\n/g, '<br/>')}
  </div>
</div>`;

  const tirColor = tir >= 70 ? '#00BFA5' : tir >= 50 ? '#FFC107' : '#FF3B5C';
  const statsHtml = `
<div class="section">
  <div class="section-title">Key Statistics</div>
  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-value">${avgGlucose > 0 ? avgGlucose.toFixed(1) : '–'}</div>
      <div class="stat-unit">mmol/L</div>
      <div class="stat-label">Average Glucose</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${avgGlucose > 0 ? a1c : '–'}${avgGlucose > 0 ? '%' : ''}</div>
      <div class="stat-unit">estimated</div>
      <div class="stat-label">HbA1c</div>
    </div>
    <div class="stat-card">
      <div class="stat-value" style="color:${tirColor}">${glucoseValues.length ? tir.toFixed(0) : '–'}${glucoseValues.length ? '%' : ''}</div>
      <div class="stat-unit">${targetLow}–${targetHigh} mmol/L</div>
      <div class="stat-label">Time in Range</div>
    </div>
    <div class="stat-card">
      <div class="stat-value ${highsCount > 10 ? 'amber' : ''}">${highsCount}</div>
      <div class="stat-unit">readings &gt;${targetHigh}</div>
      <div class="stat-label">High Events</div>
    </div>
    <div class="stat-card">
      <div class="stat-value ${lowsCount > 5 ? 'red' : ''}">${lowsCount}</div>
      <div class="stat-unit">readings &lt;${targetLow}</div>
      <div class="stat-label">Low Events</div>
    </div>
    <div class="stat-card">
      <div class="stat-value ${cv > 36 ? 'amber' : ''}">${avgGlucose > 0 ? cv.toFixed(0) : '–'}${avgGlucose > 0 ? '%' : ''}</div>
      <div class="stat-unit">CV (variability)</div>
      <div class="stat-label">Glucose Stability</div>
    </div>
  </div>
</div>`;

  const timeBucketRows = TIME_BUCKETS.map(b => {
    const d = bucketData[b.label];
    const bucketAvg = d.values.length ? avg(d.values).toFixed(1) : '–';
    const bucketTIR = d.values.length ? ((d.inRange / d.values.length) * 100).toFixed(0) : '–';
    const tirWidth = d.values.length ? Math.round((d.inRange / d.values.length) * 100) : 0;
    return `<tr>
      <td><strong>${b.label}</strong> <span style="color:#9CA3AF;font-size:11px">${b.startHour}:00–${b.endHour === 24 ? '00' : b.endHour}:00</span></td>
      <td>${bucketAvg}${d.values.length ? ' mmol/L' : ''}</td>
      <td>
        <div style="display:flex;align-items:center;gap:8px">
          <div class="tir-bar-bg" style="flex:1"><div class="tir-bar-fill" style="width:${tirWidth}%"></div></div>
          <span style="min-width:32px;font-weight:700;color:#00BFA5">${bucketTIR}${d.values.length ? '%' : ''}</span>
        </div>
      </td>
      <td style="color:#9CA3AF">${d.values.length}</td>
    </tr>`;
  }).join('');

  const timeBucketHtml = `
<div class="section">
  <div class="section-title">Time-of-Day Breakdown</div>
  <table>
    <thead>
      <tr>
        <th>Period</th>
        <th>Avg Glucose</th>
        <th>Time in Range</th>
        <th>Readings</th>
      </tr>
    </thead>
    <tbody>${timeBucketRows}</tbody>
  </table>
</div>`;

  const spikeRows = top5Spikes.length
    ? top5Spikes.map((s, i) => `<tr>
        <td><span class="rank-num red">${i + 1}</span>${s.meal.description}</td>
        <td>${s.meal.category}</td>
        <td style="color:#FF3B5C;font-weight:700">+${s.spike.toFixed(1)} mmol/L</td>
        <td>${s.meal.carbs_estimate ? s.meal.carbs_estimate + 'g' : '–'}</td>
      </tr>`).join('')
    : '<tr><td colspan="4" style="color:#9CA3AF;text-align:center;padding:16px">No correlation data for this period</td></tr>';

  const safeRows = top5Safe.length
    ? top5Safe.map((s, i) => `<tr>
        <td><span class="rank-num">${i + 1}</span>${s.meal.description}</td>
        <td>${s.meal.category}</td>
        <td style="color:#00BFA5;font-weight:700">+${s.spike.toFixed(1)} mmol/L</td>
        <td>${s.meal.carbs_estimate ? s.meal.carbs_estimate + 'g' : '–'}</td>
      </tr>`).join('')
    : '<tr><td colspan="4" style="color:#9CA3AF;text-align:center;padding:16px">No correlation data for this period</td></tr>';

  const mealsHtml = `
<div class="section">
  <div class="section-title">Meal Glucose Impact</div>
  <div style="margin-bottom:12px">
    <div class="sub-card-title" style="color:#FF3B5C;margin-bottom:8px">⚠️ Top Spike-Causing Meals</div>
    <table>
      <thead><tr><th>Meal</th><th>Category</th><th>Glucose Rise</th><th>Carbs</th></tr></thead>
      <tbody>${spikeRows}</tbody>
    </table>
  </div>
  <div style="margin-top:16px">
    <div class="sub-card-title" style="color:#00BFA5;margin-bottom:8px">✅ Best-Tolerated Meals</div>
    <table>
      <thead><tr><th>Meal</th><th>Category</th><th>Glucose Rise</th><th>Carbs</th></tr></thead>
      <tbody>${safeRows}</tbody>
    </table>
  </div>
</div>`;

  const insulinHtml = `
<div class="section">
  <div class="section-title">Insulin & Lifestyle Summary</div>
  <div class="two-col">
    <div class="sub-card">
      <div class="sub-card-title">Insulin (Daily Average)</div>
      <div class="sub-row">
        <span class="sub-row-label">Rapid-Acting</span>
        <span class="sub-row-value teal">${dailyRapidAvg > 0 ? dailyRapidAvg.toFixed(1) + ' u' : '–'}</span>
      </div>
      <div class="sub-row">
        <span class="sub-row-label">Basal / Long-Acting</span>
        <span class="sub-row-value teal">${dailyBasalAvg > 0 ? dailyBasalAvg.toFixed(1) + ' u' : '–'}</span>
      </div>
      <div class="sub-row">
        <span class="sub-row-label">Total Rapid Doses</span>
        <span class="sub-row-value">${rapidDoses.length}</span>
      </div>
      <div class="sub-row">
        <span class="sub-row-label">Total Basal Doses</span>
        <span class="sub-row-value">${basalDoses.length}</span>
      </div>
    </div>
    <div class="sub-card">
      <div class="sub-card-title">Lifestyle Factors</div>
      <div class="sub-row">
        <span class="sub-row-label">Exercise Sessions</span>
        <span class="sub-row-value teal">${exerciseCount}</span>
      </div>
      <div class="sub-row">
        <span class="sub-row-label">Avg Sleep Quality</span>
        <span class="sub-row-value">${avgSleepQuality > 0 ? avgSleepQuality.toFixed(1) + '/5' : '–'}</span>
      </div>
      <div class="sub-row">
        <span class="sub-row-label">Stress Events Logged</span>
        <span class="sub-row-value">${stressEvents}</span>
      </div>
      <div class="sub-row">
        <span class="sub-row-label">Meals Logged</span>
        <span class="sub-row-value">${recentMeals.length}</span>
      </div>
    </div>
  </div>
</div>`;

  const footerHtml = `
<div class="footer">
  <div class="footer-disclaimer">⚠️ This report is for informational purposes only and does not constitute medical advice. Always consult your diabetes care team.</div>
  <div>Generated: ${new Date().toLocaleString('en-GB')}</div>
</div>`;

  const content = [headerHtml, aiHtml, statsHtml, timeBucketHtml, mealsHtml, insulinHtml, footerHtml].join('\n');

  return {
    html: html(content, dateRange, settings.user_name),
    dateRange,
  };
}
