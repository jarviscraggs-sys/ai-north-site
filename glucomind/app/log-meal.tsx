import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ScrollView, View, Text, StyleSheet, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Animated,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { Meal, DoseSuggestion, MealAnalysis } from '../types';
import { insertMeal, insertInsulinDose, getMeals, getLatestGlucoseReading } from '../services/database';
import { getPersonalisedMealInsight, MealInsight } from '../services/meal-intelligence';
import { analyzeMeal, refineAnalysis } from '../services/meal-analyzer';
import { suggestDose } from '../services/carb-ratio';
import { calculateIOB, getIOBWarning } from '../services/iob';
import { IOBResult } from '../types';
import Card from '../components/Card';

const CATEGORIES: Meal['category'][] = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

const CATEGORY_COLORS: Record<string, string> = {
  Breakfast: '#FFC107',
  Lunch: '#00BFA5',
  Dinner: '#7C6FFF',
  Snack: '#FF8C69',
};

const GI_COLORS: Record<string, string> = {
  low: '#00BFA5',
  medium: '#FFC107',
  high: '#FF3B5C',
};

type Screen = 'input' | 'questions' | 'results' | 'logged';

export default function LogMeal() {
  const params = useLocalSearchParams<{ prefillCarbs?: string; prefillDesc?: string }>();
  const [screen, setScreen] = useState<Screen>('input');

  // Input state
  const [description, setDescription] = useState(params.prefillDesc ?? '');
  const [category, setCategory] = useState<Meal['category']>('Lunch');
  const [recentMeals, setRecentMeals] = useState<Meal[]>([]);

  // Time picker state
  const [useCustomTime, setUseCustomTime] = useState(false);
  const [customTime, setCustomTime] = useState<Date>(new Date());

  // AI analysis state
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<MealAnalysis | null>(null);
  const [doseSuggestion, setDoseSuggestion] = useState<DoseSuggestion | null>(null);

  // Questions state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Array<{ question: string; answer: string }>>([]);
  const [refining, setRefining] = useState(false);

  // IOB state
  const [iobResult, setIobResult] = useState<IOBResult | null>(null);
  const [iobWarning, setIobWarning] = useState<string | null>(null);

  // Meal intelligence
  const [mealInsight, setMealInsight] = useState<MealInsight | null>(null);

  // Inline insulin logging
  const [logInsulinWithMeal, setLogInsulinWithMeal] = useState(false);
  const [insulinUnits, setInsulinUnits] = useState('');
  const [insulinType, setInsulinType] = useState<'rapid' | 'long'>('rapid');

  // Logging state
  const [saving, setSaving] = useState(false);

  // Animate fade for results
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const hour = new Date().getHours();
    let autoCategory: Meal['category'] = 'Snack';
    if (hour >= 6 && hour < 10) autoCategory = 'Breakfast';
    else if (hour >= 11 && hour < 15) autoCategory = 'Lunch';
    else if (hour >= 17 && hour < 21) autoCategory = 'Dinner';
    setCategory(autoCategory);

    getMeals(20).then(meals => {
      const seen = new Set<string>();
      const unique = meals.filter(m => {
        if (seen.has(m.description)) return false;
        seen.add(m.description);
        return true;
      });
      setRecentMeals(unique.slice(0, 6));
    });

    if (params.prefillCarbs) {
      // Scanner path: pre-populate analysis with scanner data so carbs are correct
      const scannedCarbs = parseFloat(params.prefillCarbs);
      const desc = params.prefillDesc ?? 'Scanned food';
      setDescription(desc);
      // Build a minimal MealAnalysis from the scanner result
      const scanAnalysis: MealAnalysis = {
        items: [{ name: desc, portion: 'as scanned', carbs: scannedCarbs, fat: 0, protein: 0, calories: scannedCarbs * 4, fibre: 0 }],
        totalCarbs: scannedCarbs,
        totalFat: 0,
        totalProtein: 0,
        totalCalories: scannedCarbs * 4,
        glycemicIndex: 'medium',
        questions: [],
        glucoseImpact: { estimatedRise: scannedCarbs * 0.05, timeToPeak: 60, durationHours: 2, isHighFat: false, delayedSpikeRisk: false },
        managementTips: { preBolus: 0, splitBolus: false, splitBolusExplanation: '', tips: [] },
        source: 'food-scanner',
      };
      setAnalysis(scanAnalysis);
      setScreen('results');
      fadeIn();
      loadDoseSuggestion(scannedCarbs);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fadeIn = () => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  };

  const handleAnalyze = async () => {
    if (!description.trim()) {
      Alert.alert('What are you eating?', 'Please describe your meal first.');
      return;
    }
    setAnalyzing(true);
    try {
      const result = await analyzeMeal(description.trim());
      setAnalysis(result);

      if (result.questions && result.questions.length > 0) {
        setCurrentQuestionIndex(0);
        setAnswers([]);
        setScreen('questions');
      } else {
        await loadDoseSuggestion(result.totalCarbs);
        setScreen('results');
        fadeIn();
      }
    } catch (e) {
      console.error('Meal analysis error:', e);
      Alert.alert('Analysis failed', 'Could not analyse your meal. Please try again or log manually.');
    } finally {
      setAnalyzing(false);
    }
  };

  const loadDoseSuggestion = async (carbs: number) => {
    try {
      const latest = await getLatestGlucoseReading();
      const currentGlucose = latest?.value ?? 7.0;
      const dose = await suggestDose(carbs, currentGlucose, category);
      setDoseSuggestion(dose);

      // IOB check — warn if stacking risk
      const iob = await calculateIOB();
      setIobResult(iob);
      const warning = await getIOBWarning(dose.totalDose, iob);
      setIobWarning(warning);

      // Meal intelligence prediction
      try {
        const insight = await getPersonalisedMealInsight(
          description.trim(),
          carbs,
          currentGlucose,
          new Date(),
        );
        setMealInsight(insight);
      } catch (ie) {
        console.warn('Meal insight error:', ie);
      }
    } catch (e) {
      console.error('Dose suggestion error:', e);
    }
  };

  const handleAnswerQuestion = async (answer: string) => {
    if (!analysis) return;
    const question = analysis.questions[currentQuestionIndex];
    const newAnswers = [...answers, { question: question.question, answer }];
    setAnswers(newAnswers);

    if (currentQuestionIndex < analysis.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // All questions answered — refine
      setRefining(true);
      try {
        const refined = await refineAnalysis(analysis, newAnswers);
        setAnalysis(refined);
        await loadDoseSuggestion(refined.totalCarbs);
        setScreen('results');
        fadeIn();
      } catch (e) {
        console.error('Refinement error:', e);
        // Fall back to original analysis
        await loadDoseSuggestion(analysis.totalCarbs);
        setScreen('results');
        fadeIn();
      } finally {
        setRefining(false);
      }
    }
  };

  const handleConfirmLog = async () => {
    if (!analysis) return;
    setSaving(true);
    try {
      const now = useCustomTime ? customTime.getTime() : Date.now();
      const mealId = await insertMeal({
        description: description.trim(),
        carbs_estimate: analysis.totalCarbs,
        category,
        timestamp: now,
        fat: analysis.totalFat,
        protein: analysis.totalProtein,
        calories: analysis.totalCalories,
        fibre: 0, // summed from items if needed
        gi_rating: analysis.glycemicIndex,
        glucose_impact_estimate: analysis.glucoseImpact.estimatedRise,
      });

      // Log linked insulin if provided
      if (logInsulinWithMeal && insulinUnits) {
        const u = parseFloat(insulinUnits);
        if (!isNaN(u) && u > 0) {
          await insertInsulinDose({
            type: insulinType,
            units: u,
            timestamp: now,
            meal_id: mealId,
          });
        }
      }

      // Smart push: schedule post-meal check and missed bolus prompt if relevant
      try {
        const { sendPostMealCheckPrompt, sendMissedBoluPrompt } = await import('../services/notifications');
        await sendPostMealCheckPrompt(description.trim(), now);
        // Only prompt for missed bolus if they didn't log insulin with the meal
        if (analysis.totalCarbs > 30 && !logInsulinWithMeal) {
          await sendMissedBoluPrompt(description.trim(), analysis.totalCarbs);
        }
      } catch(e) {
        console.warn('Could not schedule smart notifications:', e);
      }

      setScreen('logged');
    } catch (e) {
      console.error('Save meal error:', e);
      Alert.alert('Error', 'Failed to save meal.');
    } finally {
      setSaving(false);
    }
  };

  const handleQuickLog = (meal: Meal) => {
    setDescription(meal.description);
    setScreen('input');
  };

  const handleReset = () => {
    setDescription('');
    setAnalysis(null);
    setDoseSuggestion(null);
    setMealInsight(null);
    setAnswers([]);
    setCurrentQuestionIndex(0);
    setScreen('input');
  };

  // ─── SCREENS ─────────────────────────────────────────────────────────────

  if (screen === 'logged') {
    return (
      <View style={styles.centeredScreen}>
        <View style={styles.successCircle}>
          <Ionicons name="checkmark" size={48} color={Colors.primary} />
        </View>
        <Text style={styles.successTitle}>Meal Logged!</Text>
        {analysis && (
          <Text style={styles.successSubtitle}>
            {description.trim()} — {analysis.totalCarbs}g carbs, {analysis.totalCalories} kcal
          </Text>
        )}
        <TouchableOpacity style={styles.primaryButton} onPress={() => router.back()}>
          <Text style={styles.primaryButtonText}>Done</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.ghostButton} onPress={handleReset}>
          <Text style={styles.ghostButtonText}>Log Another Meal</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (screen === 'questions' && analysis) {
    const q = analysis.questions[currentQuestionIndex];
    return (
      <View style={[styles.centeredScreen, { justifyContent: 'flex-start', paddingTop: 40 }]}>
        {refining ? (
          <View style={styles.loadingCenter}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingLabel}>Refining analysis...</Text>
          </View>
        ) : (
          <>
            <View style={styles.questionProgress}>
              <Text style={styles.questionProgressText}>
                Question {currentQuestionIndex + 1} of {analysis.questions.length}
              </Text>
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${((currentQuestionIndex + 1) / analysis.questions.length) * 100}%` as any },
                  ]}
                />
              </View>
            </View>

            <Card style={styles.questionCard}>
              <Ionicons name="help-circle" size={28} color={Colors.primary} style={{ marginBottom: 12 }} />
              <Text style={styles.questionText}>{q.question}</Text>
            </Card>

            <View style={styles.optionsGrid}>
              {q.options.map(opt => (
                <TouchableOpacity
                  key={opt}
                  style={styles.optionChip}
                  onPress={() => handleAnswerQuestion(opt)}
                >
                  <Text style={styles.optionChipText}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.skipButton}
              onPress={() => handleAnswerQuestion('Not sure')}
            >
              <Text style={styles.skipButtonText}>Skip</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    );
  }

  if (screen === 'results' && analysis) {
    return (
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: Colors.surface }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.ScrollView
          style={{ opacity: fadeAnim }}
          contentContainerStyle={styles.content}
        >
          {/* Header summary */}
          <Card style={styles.summaryCard}>
            <Text style={styles.summaryMealName} numberOfLines={2}>{description}</Text>
            <View style={styles.macroBarRow}>
              <MacroBar label="Carbs" value={analysis.totalCarbs} unit="g" color="#00BFA5" />
              <MacroBar label="Fat" value={analysis.totalFat} unit="g" color="#7C6FFF" />
              <MacroBar label="Protein" value={analysis.totalProtein} unit="g" color="#FFC107" />
              <MacroBar label="Calories" value={analysis.totalCalories} unit="kcal" color="#FF8C69" />
            </View>
            <View style={styles.giRow}>
              <View style={[styles.giBadge, { backgroundColor: GI_COLORS[analysis.glycemicIndex] + '22', borderColor: GI_COLORS[analysis.glycemicIndex] + '66' }]}>
                <Text style={[styles.giText, { color: GI_COLORS[analysis.glycemicIndex] }]}>
                  {analysis.glycemicIndex.toUpperCase()} GI
                </Text>
              </View>
              <Text style={styles.sourceText}>{analysis.source}</Text>
            </View>
          </Card>

          {/* Item breakdown */}
          {analysis.items.length > 0 && (
            <Card>
              <Text style={styles.cardTitle}>Nutrition Breakdown</Text>
              {analysis.items.map((item, idx) => (
                <View key={idx} style={[styles.itemRow, idx > 0 && styles.itemRowBorder]}>
                  <View style={styles.itemLeft}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemPortion}>{item.portion}</Text>
                  </View>
                  <View style={styles.itemRight}>
                    <NutriBit label="C" value={item.carbs} color="#00BFA5" />
                    <NutriBit label="F" value={item.fat} color="#7C6FFF" />
                    <NutriBit label="P" value={item.protein} color="#FFC107" />
                    <NutriBit label="kcal" value={item.calories} color="#FF8C69" />
                  </View>
                </View>
              ))}
            </Card>
          )}

          {/* Glucose impact */}
          <Card style={styles.glucoseCard}>
            <View style={styles.cardTitleRow}>
              <Ionicons name="trending-up" size={18} color={Colors.red} />
              <Text style={styles.cardTitle}>Glucose Impact Prediction</Text>
            </View>
            <View style={styles.impactGrid}>
              <ImpactStat
                label="Est. Rise"
                value={`+${analysis.glucoseImpact.estimatedRise.toFixed(1)}`}
                unit="mmol/L"
                color={Colors.red}
              />
              <ImpactStat
                label="Peak At"
                value={`${analysis.glucoseImpact.timeToPeak}`}
                unit="min"
                color={Colors.amber}
              />
              <ImpactStat
                label="Duration"
                value={`${analysis.glucoseImpact.durationHours}`}
                unit="hours"
                color={Colors.primary}
              />
            </View>
            {analysis.glucoseImpact.delayedSpikeRisk && (
              <View style={styles.warningBanner}>
                <Ionicons name="warning" size={14} color={Colors.amber} />
                <Text style={styles.warningText}>
                  High-fat meal — expect a delayed spike 2–4 hours after eating
                </Text>
              </View>
            )}
          </Card>

          {/* Management tips */}
          <Card style={styles.tipsCard}>
            <View style={styles.cardTitleRow}>
              <Ionicons name="bulb" size={18} color={Colors.primary} />
              <Text style={styles.cardTitle}>Management Tips</Text>
            </View>
            <View style={styles.tipRow}>
              <Ionicons name="time" size={14} color={Colors.textSecondary} />
              <Text style={styles.tipText}>
                Pre-bolus {analysis.managementTips.preBolus} minutes before eating
              </Text>
            </View>
            {analysis.managementTips.splitBolus && (
              <View style={styles.tipRow}>
                <Ionicons name="git-branch" size={14} color={Colors.amber} />
                <Text style={[styles.tipText, { color: Colors.amber }]}>
                  Consider split bolus — {analysis.managementTips.splitBolusExplanation}
                </Text>
              </View>
            )}
            {analysis.managementTips.tips.map((tip, idx) => (
              <View key={idx} style={styles.tipRow}>
                <Ionicons name="checkmark-circle" size={14} color={Colors.primary} />
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </Card>

          {/* Dose suggestion */}
          {doseSuggestion && (
            <Card style={styles.doseCard}>
              <View style={styles.doseHeader}>
                <Ionicons name="medical" size={16} color={Colors.amber} />
                <Text style={styles.doseTitle}>Suggested Bolus</Text>
                {iobResult && iobResult.totalIOB > 0 && (
                  <Text style={styles.iobBadge}>
                    IOB: {iobResult.totalIOB.toFixed(1)}u
                  </Text>
                )}
              </View>
              {iobWarning && (
                <View style={styles.iobWarningBox}>
                  <Text style={styles.iobWarningText}>{iobWarning}</Text>
                </View>
              )}
              <Text style={styles.doseBig}>{doseSuggestion.totalDose}u</Text>
              <Text style={styles.doseBreakdown}>{doseSuggestion.breakdown}</Text>
              <Text style={styles.doseDisclaimer}>{doseSuggestion.disclaimer}</Text>
            </Card>
          )}

          {/* Smart Prediction card */}
          {mealInsight && mealInsight.similarMealsCount >= 2 && (
            <SmartPredictionCard insight={mealInsight} />
          )}
          {mealInsight && mealInsight.similarMealsCount < 2 && (
            <Card style={predictionStyles.genericCard}>
              <View style={predictionStyles.header}>
                <Ionicons name="bulb-outline" size={16} color={Colors.primary} />
                <Text style={predictionStyles.title}>Smart Prediction</Text>
                <View style={predictionStyles.confidenceBadge}>
                  <Text style={predictionStyles.confidenceText}>Learning</Text>
                </View>
              </View>
              <Text style={predictionStyles.genericText}>
                Log more meals to unlock personalised spike predictions. Your history is building — keep going!
              </Text>
            </Card>
          )}

          {/* Category selector */}
          <View style={styles.categoriesRow}>
            <Text style={styles.sectionLabel}>Meal Type</Text>
            <View style={styles.categories}>
              {CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.catButton,
                    { borderColor: CATEGORY_COLORS[cat] + '66' },
                    category === cat && { backgroundColor: CATEGORY_COLORS[cat] + '33' },
                  ]}
                  onPress={() => setCategory(cat)}
                >
                  <Text style={[styles.catText, { color: CATEGORY_COLORS[cat] }]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Log insulin with this meal */}
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="medical" size={18} color={Colors.amber} />
                <Text style={styles.cardTitle}>Log Insulin</Text>
              </View>
              <TouchableOpacity
                onPress={() => setLogInsulinWithMeal(!logInsulinWithMeal)}
                style={{ paddingVertical: 4, paddingHorizontal: 12, borderRadius: 8, backgroundColor: logInsulinWithMeal ? Colors.primary + '15' : Colors.cardBorder }}
              >
                <Text style={{ color: logInsulinWithMeal ? Colors.primary : Colors.textSecondary, fontWeight: '600', fontSize: 13 }}>
                  {logInsulinWithMeal ? 'Yes' : 'No'}
                </Text>
              </TouchableOpacity>
            </View>
            {logInsulinWithMeal && (
              <View style={{ marginTop: 12, gap: 12 }}>
                {/* Type toggle */}
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    style={{ flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', backgroundColor: insulinType === 'rapid' ? Colors.amber + '15' : Colors.cardBorder, borderWidth: 1, borderColor: insulinType === 'rapid' ? Colors.amber + '44' : 'transparent' }}
                    onPress={() => setInsulinType('rapid')}
                  >
                    <Text style={{ color: insulinType === 'rapid' ? Colors.amber : Colors.textSecondary, fontWeight: '600', fontSize: 13 }}>Rapid</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{ flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', backgroundColor: insulinType === 'long' ? Colors.amber + '15' : Colors.cardBorder, borderWidth: 1, borderColor: insulinType === 'long' ? Colors.amber + '44' : 'transparent' }}
                    onPress={() => setInsulinType('long')}
                  >
                    <Text style={{ color: insulinType === 'long' ? Colors.amber : Colors.textSecondary, fontWeight: '600', fontSize: 13 }}>Long-acting</Text>
                  </TouchableOpacity>
                </View>
                {/* Units with 0.5 step */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                  <TouchableOpacity
                    style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.cardBorder, alignItems: 'center', justifyContent: 'center' }}
                    onPress={() => setInsulinUnits(prev => Math.max(0, (parseFloat(prev) || 0) - 0.5).toString())}
                  >
                    <Ionicons name="remove" size={20} color={Colors.textPrimary} />
                  </TouchableOpacity>
                  <TextInput
                    style={{ fontSize: 28, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center', minWidth: 60 }}
                    value={insulinUnits}
                    onChangeText={setInsulinUnits}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={Colors.textMuted}
                  />
                  <TouchableOpacity
                    style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary + '22', alignItems: 'center', justifyContent: 'center' }}
                    onPress={() => setInsulinUnits(prev => ((parseFloat(prev) || 0) + 0.5).toString())}
                  >
                    <Ionicons name="add" size={20} color={Colors.primary} />
                  </TouchableOpacity>
                </View>
                <Text style={{ color: Colors.textMuted, fontSize: 12, textAlign: 'center' }}>units (0.5 increments)</Text>
                {doseSuggestion && (
                  <TouchableOpacity
                    onPress={() => setInsulinUnits(doseSuggestion.totalDose.toFixed(1))}
                    style={{ alignSelf: 'center', paddingVertical: 6, paddingHorizontal: 14, borderRadius: 8, backgroundColor: Colors.primary + '15' }}
                  >
                    <Text style={{ color: Colors.primary, fontWeight: '600', fontSize: 13 }}>
                      Use suggested dose: {doseSuggestion.totalDose.toFixed(1)}u
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </Card>

          {/* When did you eat? */}
          <Card>
            <Text style={styles.cardTitle}>When did you eat?</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', backgroundColor: !useCustomTime ? Colors.primary + '15' : Colors.cardBorder, borderWidth: 1, borderColor: !useCustomTime ? Colors.primary + '44' : 'transparent' }}
                onPress={() => setUseCustomTime(false)}
              >
                <Text style={{ color: !useCustomTime ? Colors.primary : Colors.textSecondary, fontWeight: '600', fontSize: 14 }}>Just Now</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', backgroundColor: useCustomTime ? Colors.primary + '15' : Colors.cardBorder, borderWidth: 1, borderColor: useCustomTime ? Colors.primary + '44' : 'transparent' }}
                onPress={() => setUseCustomTime(true)}
              >
                <Text style={{ color: useCustomTime ? Colors.primary : Colors.textSecondary, fontWeight: '600', fontSize: 14 }}>Earlier</Text>
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

          {/* Confirm & Log */}
          <TouchableOpacity
            style={[styles.primaryButton, saving && { opacity: 0.7 }]}
            onPress={handleConfirmLog}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={Colors.background} />
            ) : (
              <>
                <Ionicons name="checkmark" size={18} color={Colors.background} />
                <Text style={styles.primaryButtonText}>Confirm & Log Meal</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.ghostButton} onPress={handleReset}>
            <Text style={styles.ghostButtonText}>← Start Over</Text>
          </TouchableOpacity>
        </Animated.ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ─── INPUT SCREEN ─────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.surface }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* Quick log from history */}
        {recentMeals.length > 0 && (
          <Card>
            <Text style={styles.sectionLabel}>Quick Log</Text>
            <View style={styles.quickGrid}>
              {recentMeals.map(meal => (
                <TouchableOpacity
                  key={meal.id}
                  style={styles.quickItem}
                  onPress={() => handleQuickLog(meal)}
                >
                  <Text style={styles.quickText} numberOfLines={2}>{meal.description}</Text>
                  <Text style={styles.quickCarbs}>{meal.carbs_estimate}g carbs</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card>
        )}

        {/* Category selector */}
        <View style={styles.categories}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.catButton,
                { borderColor: CATEGORY_COLORS[cat] + '66' },
                category === cat && { backgroundColor: CATEGORY_COLORS[cat] + '33' },
              ]}
              onPress={() => setCategory(cat)}
            >
              <Text style={[styles.catText, { color: CATEGORY_COLORS[cat] }]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Main input */}
        <Card>
          <Text style={styles.label}>What are you eating?</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. Nando's butterfly chicken with large fries and rice"
            placeholderTextColor={Colors.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            keyboardAppearance="dark"
            autoFocus
            returnKeyType="done"
          />
          <View style={styles.inputHints}>
            <Text style={styles.hintText}>💡 Be specific for better estimates — restaurant names and sizes help!</Text>
          </View>
        </Card>

        {/* Analyse button */}
        <TouchableOpacity
          style={[styles.primaryButton, analyzing && { opacity: 0.7 }]}
          onPress={handleAnalyze}
          disabled={analyzing}
        >
          {analyzing ? (
            <>
              <ActivityIndicator size="small" color={Colors.background} />
              <Text style={styles.primaryButtonText}>Analysing your meal...</Text>
            </>
          ) : (
            <>
              <Ionicons name="sparkles" size={18} color={Colors.background} />
              <Text style={styles.primaryButtonText}>Analyse with AI</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.orRow}>
          <View style={styles.orLine} />
          <Text style={styles.orText}>OR</Text>
          <View style={styles.orLine} />
        </View>

        {/* Camera scan shortcut */}
        <TouchableOpacity
          style={styles.scanButton}
          onPress={() => router.push({ pathname: '/food-scanner', params: { category } })}
        >
          <Ionicons name="camera" size={18} color={Colors.primary} />
          <Text style={styles.scanButtonText}>Scan Food with Camera</Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── SUB-COMPONENTS ──────────────────────────────────────────────────────────

function SmartPredictionCard({ insight }: { insight: import('../services/meal-intelligence').MealInsight }) {
  const confidenceColor =
    insight.confidence === 'high'   ? Colors.inRange :
    insight.confidence === 'medium' ? Colors.amber :
    Colors.textMuted;

  return (
    <Card style={predictionStyles.card}>
      <View style={predictionStyles.header}>
        <Ionicons name="analytics" size={16} color={Colors.primary} />
        <Text style={predictionStyles.title}>Smart Prediction</Text>
        <View style={[predictionStyles.confidenceBadge, { backgroundColor: confidenceColor + '22', borderColor: confidenceColor + '55' }]}>
          <Text style={[predictionStyles.confidenceText, { color: confidenceColor }]}>
            {insight.confidence.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={predictionStyles.statsRow}>
        <View style={predictionStyles.stat}>
          <Text style={[predictionStyles.statValue, { color: insight.predictedSpike > 4 ? Colors.red : Colors.amber }]}>
            +{insight.predictedSpike.toFixed(1)}
          </Text>
          <Text style={predictionStyles.statUnit}>mmol/L</Text>
          <Text style={predictionStyles.statLabel}>Expected Rise</Text>
        </View>
        <View style={predictionStyles.statDivider} />
        <View style={predictionStyles.stat}>
          <Text style={[predictionStyles.statValue, { color: Colors.primary }]}>
            {insight.predictedPeak.toFixed(1)}
          </Text>
          <Text style={predictionStyles.statUnit}>mmol/L</Text>
          <Text style={predictionStyles.statLabel}>Predicted Peak</Text>
        </View>
        <View style={predictionStyles.statDivider} />
        <View style={predictionStyles.stat}>
          <Text style={[predictionStyles.statValue, { color: Colors.textSecondary }]}>
            {insight.timeToPeak}
          </Text>
          <Text style={predictionStyles.statUnit}>min</Text>
          <Text style={predictionStyles.statLabel}>Time to Peak</Text>
        </View>
      </View>

      <View style={predictionStyles.infoRow}>
        <Ionicons name="medical-outline" size={13} color={Colors.amber} />
        <Text style={predictionStyles.infoText}>{insight.insulinSuggestion}</Text>
      </View>

      {insight.factorWarnings.map((w, i) => (
        <View key={i} style={predictionStyles.warnRow}>
          <Ionicons name="warning-outline" size={13} color={Colors.amber} />
          <Text style={predictionStyles.warnText}>{w}</Text>
        </View>
      ))}

      <Text style={predictionStyles.timingAdvice}>{insight.timingAdvice}</Text>
      <Text style={predictionStyles.sampleSize}>Based on {insight.similarMealsCount} similar meals</Text>
    </Card>
  );
}

function MacroBar({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  return (
    <View style={subStyles.macroBarItem}>
      <Text style={[subStyles.macroValue, { color }]}>{Math.round(value)}</Text>
      <Text style={subStyles.macroUnit}>{unit}</Text>
      <Text style={subStyles.macroLabel}>{label}</Text>
    </View>
  );
}

function NutriBit({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={subStyles.nutriBit}>
      <Text style={[subStyles.nutriVal, { color }]}>{Math.round(value)}</Text>
      <Text style={subStyles.nutriLabel}>{label}</Text>
    </View>
  );
}

function ImpactStat({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <View style={subStyles.impactStat}>
      <Text style={[subStyles.impactValue, { color }]}>{value}</Text>
      <Text style={subStyles.impactUnit}>{unit}</Text>
      <Text style={subStyles.impactLabel}>{label}</Text>
    </View>
  );
}

const subStyles = StyleSheet.create({
  macroBarItem: {
    alignItems: 'center',
    flex: 1,
  },
  macroValue: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  macroUnit: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '500',
  },
  macroLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  nutriBit: {
    alignItems: 'center',
    minWidth: 36,
  },
  nutriVal: {
    fontSize: 13,
    fontWeight: '700',
  },
  nutriLabel: {
    color: Colors.textMuted,
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  impactStat: {
    alignItems: 'center',
    flex: 1,
  },
  impactValue: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  impactUnit: {
    color: Colors.textMuted,
    fontSize: 11,
  },
  impactLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
});

// ─── STYLES ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  centeredScreen: {
    flex: 1,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  loadingCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingLabel: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: '500',
  },

  // Quick log
  sectionLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickItem: {
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 10,
    width: '47%',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  quickText: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: '500',
  },
  quickCarbs: {
    color: Colors.textMuted,
    fontSize: 10,
    marginTop: 3,
  },

  // Categories
  categories: {
    flexDirection: 'row',
    gap: 8,
  },
  categoriesRow: {
    gap: 8,
  },
  catButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  catText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // Text input
  label: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  textInput: {
    color: Colors.textPrimary,
    fontSize: 16,
    lineHeight: 24,
    minHeight: 80,
  },
  inputHints: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
  },
  hintText: {
    color: Colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },

  // Buttons
  primaryButton: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: Colors.background,
    fontWeight: '700',
    fontSize: 16,
  },
  ghostButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  ghostButtonText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary + '18',
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.primary + '44',
  },
  scanButtonText: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.cardBorder,
  },
  orText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
  },

  // Success screen
  successCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary + '22',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.primary,
    marginBottom: 8,
  },
  successTitle: {
    color: Colors.textPrimary,
    fontSize: 26,
    fontWeight: '800',
  },
  successSubtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },

  // Questions screen
  questionProgress: {
    width: '100%',
    marginBottom: 24,
    gap: 8,
  },
  questionProgressText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  progressBarTrack: {
    height: 4,
    backgroundColor: Colors.cardBorder,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  questionCard: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 24,
  },
  questionText: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 26,
  },
  optionsGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  optionChip: {
    backgroundColor: Colors.card,
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 1.5,
    borderColor: Colors.primary + '66',
  },
  optionChipText: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  skipButton: {
    paddingVertical: 10,
  },
  skipButtonText: {
    color: Colors.textMuted,
    fontSize: 14,
    fontWeight: '500',
  },

  // Results
  summaryCard: {
    gap: 12,
  },
  summaryMealName: {
    color: Colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 24,
  },
  macroBarRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  giRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  giBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  giText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  sourceText: {
    color: Colors.textMuted,
    fontSize: 11,
    fontStyle: 'italic',
    flex: 1,
    textAlign: 'right',
    paddingLeft: 8,
  },

  // Item breakdown
  cardTitle: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  itemRowBorder: {
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
  },
  itemLeft: {
    flex: 1,
    gap: 2,
  },
  itemName: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  itemPortion: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  itemRight: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },

  // Glucose impact
  glucoseCard: {
    borderColor: Colors.red + '33',
    borderWidth: 1,
  },
  impactGrid: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.amber + '18',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.amber + '44',
  },
  warningText: {
    color: Colors.amber,
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
    lineHeight: 18,
  },

  // Tips
  tipsCard: {
    borderColor: Colors.primary + '33',
    borderWidth: 1,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  tipText: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    flex: 1,
  },

  // Dose card
  doseCard: {
    borderColor: Colors.amber + '44',
    borderWidth: 1,
    alignItems: 'center',
    paddingVertical: 16,
  },
  doseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  doseTitle: {
    color: Colors.amber,
    fontSize: 14,
    fontWeight: '600',
  },
  doseBig: {
    color: Colors.amber,
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: -1,
  },
  doseBreakdown: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  doseDisclaimer: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 8,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingHorizontal: 10,
  },
  iobBadge: {
    backgroundColor: Colors.amber + '22',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    fontSize: 11,
    fontWeight: '700',
    color: Colors.amber,
  },
  iobWarningBox: {
    backgroundColor: Colors.amber + '1A',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.amber + '44',
    marginBottom: 8,
  },
  iobWarningText: {
    color: Colors.amber,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
  },
});

const predictionStyles = StyleSheet.create({
  card: {
    borderColor: Colors.primary + '44',
    borderWidth: 1,
    backgroundColor: Colors.primary + '08',
  },
  genericCard: {
    borderColor: Colors.primary + '33',
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  title: {
    flex: 1,
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  confidenceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.cardBorder,
  },
  confidenceText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: Colors.textMuted,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  statUnit: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  statLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.cardBorder,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: Colors.amber + '18',
    borderRadius: 8,
    padding: 8,
    marginBottom: 6,
  },
  infoText: {
    flex: 1,
    color: Colors.amber,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
  },
  warnRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 4,
    paddingHorizontal: 2,
  },
  warnText: {
    flex: 1,
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  timingAdvice: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
    fontStyle: 'italic',
  },
  sampleSize: {
    color: Colors.textMuted,
    fontSize: 10,
    marginTop: 6,
    textAlign: 'right',
  },
  genericText: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
});
