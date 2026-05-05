import OpenAI from 'openai';
import { OPENAI_API_KEY } from '../config/keys';
import { getCorrelations, getMeals, getFactorsSince } from './database';
import { Correlation, Meal, Factor, ExerciseValue, StressValue, IllnessValue, SleepValue, AlcoholValue, CaffeineValue, FoodScanResult } from '../types';

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

async function getRecentFactorsContext(): Promise<string> {
  try {
    const since = Date.now() - 24 * 60 * 60 * 1000; // last 24 hours
    const factors = await getFactorsSince(since);
    if (factors.length === 0) return '';

    const lines: string[] = ['Recent factors (last 24h):'];
    for (const f of factors) {
      const val = JSON.parse(f.value);
      const hoursAgo = Math.round((Date.now() - f.timestamp) / (60 * 60 * 1000));
      const when = hoursAgo === 0 ? 'just now' : `${hoursAgo}h ago`;
      switch (f.type) {
        case 'exercise': {
          const v = val as ExerciseValue;
          lines.push(`- Exercise (${when}): ${v.duration}min ${v.intensity} ${v.activityType}`);
          break;
        }
        case 'stress': {
          const v = val as StressValue;
          lines.push(`- Stress level (${when}): ${v.level}/5`);
          break;
        }
        case 'illness': {
          const v = val as IllnessValue;
          if (v.sick) lines.push(`- Illness/sick day reported (${when})`);
          break;
        }
        case 'sleep': {
          const v = val as SleepValue;
          lines.push(`- Sleep (${when}): ${v.hours}h, quality ${v.quality}/5`);
          break;
        }
        case 'alcohol': {
          const v = val as AlcoholValue;
          lines.push(`- Alcohol (${when}): ${v.units} units of ${v.type}`);
          break;
        }
        case 'caffeine': {
          const v = val as CaffeineValue;
          lines.push(`- Caffeine (${when}): ${v.cups} cup(s) of coffee/tea`);
          break;
        }
        case 'menstrual': {
          const v = val as { phase: string };
          lines.push(`- Menstrual cycle phase (${when}): ${v.phase}`);
          break;
        }
        case 'weather': {
          const v = val as { temperature?: number; condition?: string };
          if (v.temperature) lines.push(`- Temperature (${when}): ${v.temperature}°C`);
          break;
        }
      }
    }
    return lines.join('\n');
  } catch {
    return '';
  }
}

export async function getMealAdvice(
  mealDescription: string,
  carbs: number,
  currentGlucose: number
): Promise<string> {
  try {
    // Get historical correlations
    const correlations = await getCorrelations();
    const meals = await getMeals(100);

    // Find similar past meals
    const mealMap: Record<number, Meal> = {};
    meals.forEach(m => { mealMap[m.id] = m; });

    const similarCorrelations = correlations
      .filter(c => {
        const meal = mealMap[c.meal_id];
        if (!meal) return false;
        const desc = meal.description.toLowerCase();
        const query = mealDescription.toLowerCase();
        const words = query.split(' ').filter(w => w.length > 3);
        return words.some(w => desc.includes(w));
      })
      .slice(0, 3);

    let historyContext = '';
    if (similarCorrelations.length > 0) {
      historyContext = 'Historical data for similar meals:\n';
      similarCorrelations.forEach(c => {
        const meal = mealMap[c.meal_id];
        historyContext += `- ${meal?.description}: glucose went from ${c.pre_glucose} to ${c.peak_glucose} mmol/L`;
        if (c.insulin_id) historyContext += ` (insulin was logged)`;
        historyContext += '\n';
      });
    }

    const factorsContext = await getRecentFactorsContext();

    const prompt = `You are GlucoMind, an AI diabetes management assistant for a Type 1 diabetic.
The user just logged: "${mealDescription}" (estimated ${carbs}g carbs).
Current glucose: ${currentGlucose} mmol/L.
${historyContext}
${factorsContext ? factorsContext + '\n' : ''}
Provide brief, practical advice (2-3 sentences max). Include:
- Expected glucose impact (accounting for any relevant factors like recent exercise, stress, illness)
- Insulin suggestion if past data available
- Any relevant pattern you notice

Be conversational, caring but direct. Frame advice as observations based on their data ("your history suggests...", "last time you had this..."). Never prescribe specific insulin doses — suggest they discuss dose adjustments with their diabetes team.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 150,
      temperature: 0.7,
    });

    return response.choices[0]?.message?.content ?? 'Logged! Keep an eye on your glucose over the next 2 hours.';
  } catch (error) {
    console.error('AI advice error:', error);
    return `Logged! With ${carbs}g carbs, expect your glucose to rise over the next 30-60 minutes. Monitor closely.`;
  }
}

export async function getWeeklyInsight(
  avgGlucose: number,
  timeInRange: number,
  highCount: number,
  lowCount: number
): Promise<string> {
  try {
    const correlations = await getCorrelations();
    const meals = await getMeals(100);

    const mealMap: Record<number, Meal> = {};
    meals.forEach(m => { mealMap[m.id] = m; });

    // Calculate post-dinner spikes
    const dinnerCorrelations = correlations.filter(c => {
      const meal = mealMap[c.meal_id];
      return meal?.category === 'Dinner';
    });

    const avgDinnerSpike = dinnerCorrelations.length > 0
      ? dinnerCorrelations.reduce((sum, c) => sum + (c.peak_glucose - c.pre_glucose), 0) / dinnerCorrelations.length
      : 0;

    const prompt = `You are GlucoMind. Provide a weekly diabetes management insight.

This week's stats:
- Average glucose: ${avgGlucose.toFixed(1)} mmol/L (target: 4-10)
- Time in range: ${timeInRange.toFixed(0)}% (target: >70%)
- High readings (>13 mmol/L): ${highCount}
- Low readings (<4 mmol/L): ${lowCount}
- Average post-dinner spike: ${avgDinnerSpike.toFixed(1)} mmol/L

Write 2-3 sentences of actionable insight. Be encouraging but honest. Suggest one specific improvement.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 120,
      temperature: 0.7,
    });

    return response.choices[0]?.message?.content ?? `This week your average glucose was ${avgGlucose.toFixed(1)} mmol/L with ${timeInRange.toFixed(0)}% time in range. Keep monitoring your post-meal readings closely.`;
  } catch (error) {
    console.error('Weekly insight error:', error);
    return `This week: avg ${avgGlucose.toFixed(1)} mmol/L, ${timeInRange.toFixed(0)}% time in range. ${timeInRange > 70 ? 'Great work this week! 🎯' : 'Focus on post-meal spikes to improve your range.'}`;
  }
}

export async function scanFoodWithAI(imageBase64: string, productName?: string): Promise<FoodScanResult> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${imageBase64}`,
              detail: 'high',
            },
          },
          {
            type: 'text',
            text: `You are a diabetes nutrition assistant. Analyze this food photo and estimate carbohydrate content.${productName ? `\n\nIMPORTANT: The user has identified this product as: "${productName}". Use this brand/product information to give a more accurate carb estimate based on the actual product's nutritional data if you know it.` : ''}

1. What food items are visible
2. Estimated portion sizes
3. Estimated carbohydrates (grams) per item — be precise, use the named product's actual nutritional data if available
4. Total estimated carbs — this MUST equal the sum of all item carbs
5. Glycemic index estimate (low/medium/high)
6. Expected glucose impact for a Type 1 diabetic

Format your response as valid JSON only with this exact structure:
{
  "items": [
    { "name": "string", "portion": "string", "carbs": number }
  ],
  "totalCarbs": number,
  "glycemicIndex": "low" | "medium" | "high",
  "expectedImpact": "string"
}

Return ONLY the JSON, no markdown, no explanation.`,
          },
        ],
      },
    ],
    max_tokens: 500,
    temperature: 0.3,
  });

  const content = response.choices[0]?.message?.content ?? '{}';
  try {
    // Strip any markdown code fences if present
    const cleaned = content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned) as FoodScanResult;
    // Recalculate totalCarbs from items to ensure consistency
    // (GPT sometimes returns a different total than the sum of items)
    if (parsed.items && parsed.items.length > 0) {
      const recalculated = parsed.items.reduce((sum, item) => sum + (item.carbs || 0), 0);
      if (Math.abs(recalculated - parsed.totalCarbs) > 2) {
        // Significant discrepancy — use the sum of items (more reliable)
        parsed.totalCarbs = Math.round(recalculated);
      }
    }
    return parsed;
  } catch {
    throw new Error('Could not parse AI food scan response');
  }
}

export async function getPatternInsight(): Promise<string | null> {
  try {
    const correlations = await getCorrelations();
    if (correlations.length < 3) return null;

    const meals = await getMeals(100);
    const mealMap: Record<number, Meal> = {};
    meals.forEach(m => { mealMap[m.id] = m; });

    // Find the most significant correlation
    const sorted = [...correlations].sort((a, b) => (b.peak_glucose - b.pre_glucose) - (a.peak_glucose - a.pre_glucose));
    const biggest = sorted[0];
    const meal = mealMap[biggest.meal_id];

    if (!meal) return null;

    return `📊 Pattern: When you eat "${meal.description}", your glucose typically rises from ${biggest.pre_glucose} to ${biggest.peak_glucose} mmol/L. Consider adjusting your insulin timing for this meal.`;
  } catch {
    return null;
  }
}
