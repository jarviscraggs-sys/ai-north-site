/**
 * AI Meal Analyzer Service
 * Uses GPT-4o to provide detailed nutritional analysis and glucose impact
 * predictions for meals, including restaurant-specific knowledge.
 */

import OpenAI from 'openai';
import { MealAnalysis } from '../types';
import { OPENAI_API_KEY } from '../config/keys';

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

const SYSTEM_PROMPT = `You are a diabetes nutrition expert AI. When given a meal description:

1. If it's from a specific restaurant/chain (e.g., Nando's, McDonald's, Greggs), use your knowledge of their actual menu items and published nutritional data to give accurate estimates.

2. Identify each food item and estimate:
   - Carbohydrates (grams)
   - Fat (grams)
   - Protein (grams)
   - Calories
   - Fibre (grams)
   - Glycemic Index (low/medium/high)

3. Ask clarifying questions if portion sizes are ambiguous. Return these as a "questions" array. For restaurant meals, use the options that restaurant actually offers (e.g., "Regular or Large fries?" not generic sizes). Only ask questions if genuinely uncertain — don't ask if the description is already specific enough.

4. Calculate total meal macros.

5. Predict glucose impact for a Type 1 diabetic:
   - Estimated glucose rise (mmol/L)
   - Time to peak (minutes)
   - Duration of impact (hours)
   - Whether the meal is high-fat (fat slows carb absorption, causing delayed spikes)

6. Give management tips:
   - Suggested pre-bolus time (minutes before eating)
   - Whether to consider split bolus (for high-fat meals)
   - Any other relevant advice

Always be specific with numbers. Use UK nutritional databases and restaurant-published data where possible.

Return ONLY valid JSON with this exact structure (no markdown, no explanation):
{
  "items": [{"name": "string", "portion": "string", "carbs": number, "fat": number, "protein": number, "calories": number, "fibre": number}],
  "totalCarbs": number,
  "totalFat": number,
  "totalProtein": number,
  "totalCalories": number,
  "glycemicIndex": "low" | "medium" | "high",
  "questions": [{"question": "string", "options": ["string"]}],
  "glucoseImpact": {
    "estimatedRise": number,
    "timeToPeak": number,
    "durationHours": number,
    "isHighFat": boolean,
    "delayedSpikeRisk": boolean
  },
  "managementTips": {
    "preBolus": number,
    "splitBolus": boolean,
    "splitBolus explanation": "string",
    "tips": ["string"]
  },
  "source": "string"
}`;

function parseAnalysisResponse(content: string): MealAnalysis {
  const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const raw = JSON.parse(cleaned);

  // Normalise the splitBolus explanation field name (JSON key has a space in the spec)
  const mgmtRaw = raw.managementTips ?? {};
  return {
    items: raw.items ?? [],
    totalCarbs: raw.totalCarbs ?? 0,
    totalFat: raw.totalFat ?? 0,
    totalProtein: raw.totalProtein ?? 0,
    totalCalories: raw.totalCalories ?? 0,
    glycemicIndex: raw.glycemicIndex ?? 'medium',
    questions: raw.questions ?? [],
    glucoseImpact: {
      estimatedRise: raw.glucoseImpact?.estimatedRise ?? 0,
      timeToPeak: raw.glucoseImpact?.timeToPeak ?? 60,
      durationHours: raw.glucoseImpact?.durationHours ?? 2,
      isHighFat: raw.glucoseImpact?.isHighFat ?? false,
      delayedSpikeRisk: raw.glucoseImpact?.delayedSpikeRisk ?? false,
    },
    managementTips: {
      preBolus: mgmtRaw.preBolus ?? 15,
      splitBolus: mgmtRaw.splitBolus ?? false,
      splitBolusExplanation: mgmtRaw['splitBolus explanation'] ?? mgmtRaw.splitBolusExplanation ?? '',
      tips: mgmtRaw.tips ?? [],
    },
    source: raw.source ?? 'GPT-4o estimation',
  };
}

export async function analyzeMeal(description: string): Promise<MealAnalysis> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: description },
    ],
    max_tokens: 1000,
    temperature: 0.2,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content ?? '{}';
  return parseAnalysisResponse(content);
}

export async function refineAnalysis(
  originalAnalysis: MealAnalysis,
  answers: Array<{ question: string; answer: string }>
): Promise<MealAnalysis> {
  const answersText = answers.map(a => `Q: ${a.question}\nA: ${a.answer}`).join('\n');

  const refinementPrompt = `I previously analysed a meal and had some clarifying questions. The user has answered them.

Previous analysis summary:
- Items: ${originalAnalysis.items.map(i => `${i.name} (${i.portion})`).join(', ')}
- Total carbs: ${originalAnalysis.totalCarbs}g
- Source: ${originalAnalysis.source}

User's answers to clarifying questions:
${answersText}

Please refine the nutritional analysis based on these answers and return updated JSON in the exact same format as before. Return ONLY valid JSON.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: refinementPrompt },
    ],
    max_tokens: 1000,
    temperature: 0.2,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content ?? '{}';
  return parseAnalysisResponse(content);
}
