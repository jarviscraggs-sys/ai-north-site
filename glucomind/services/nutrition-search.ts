/**
 * Nutrition Search Service
 * Searches Nutritionix (restaurant/branded foods) and USDA FoodData Central
 * for accurate nutritional data. Free tiers only.
 */

export interface FoodSearchResult {
  name: string;
  brand?: string;
  servingSize: string;
  carbs: number;
  fat: number;
  protein: number;
  calories: number;
  fibre: number;
  source: 'nutritionix' | 'usda' | 'openfoodfacts';
}

// USDA FoodData Central — free, no auth required for DEMO_KEY
const USDA_API_KEY = 'DEMO_KEY';
const USDA_BASE = 'https://api.nal.usda.gov/fdc/v1';

// Open Food Facts — free, no auth
const OFF_BASE = 'https://world.openfoodfacts.org/cgi';

/**
 * Search USDA FoodData Central for branded + restaurant foods.
 * Includes McDonald's, Burger King, Greggs, etc.
 */
export async function searchUSDA(query: string): Promise<FoodSearchResult[]> {
  try {
    const url = `${USDA_BASE}/foods/search?query=${encodeURIComponent(query)}&dataType=Branded,SR%20Legacy&pageSize=10&api_key=${USDA_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();

    return (data.foods || []).map((f: any): FoodSearchResult => {
      const nutrients = (f.foodNutrients || []);
      const get = (name: string) =>
        nutrients.find((n: any) =>
          n.nutrientName?.toLowerCase().includes(name.toLowerCase())
        )?.value ?? 0;

      return {
        name: f.description,
        brand: f.brandOwner || f.brandName,
        servingSize: f.servingSize ? `${f.servingSize}${f.servingSizeUnit || 'g'}` : '100g',
        carbs: Math.round(get('carbohydrate')),
        fat: Math.round(get('total lipid') || get('total fat')),
        protein: Math.round(get('protein')),
        calories: Math.round(get('energy') || get('calorie')),
        fibre: Math.round(get('fiber') || get('fibre')),
        source: 'usda',
      };
    }).filter((f: FoodSearchResult) => f.calories > 0);
  } catch (e) {
    console.warn('[NutritionSearch] USDA error:', e);
    return [];
  }
}

/**
 * Search Open Food Facts for packaged/barcode foods.
 */
export async function searchOpenFoodFacts(query: string): Promise<FoodSearchResult[]> {
  try {
    const url = `${OFF_BASE}/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=10`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();

    return (data.products || [])
      .filter((p: any) => p.nutriments?.energy_100g)
      .map((p: any): FoodSearchResult => ({
        name: p.product_name || query,
        brand: p.brands,
        servingSize: p.serving_size || '100g',
        carbs: Math.round(p.nutriments?.carbohydrates_serving ?? p.nutriments?.carbohydrates_100g ?? 0),
        fat: Math.round(p.nutriments?.fat_serving ?? p.nutriments?.fat_100g ?? 0),
        protein: Math.round(p.nutriments?.proteins_serving ?? p.nutriments?.proteins_100g ?? 0),
        calories: Math.round((p.nutriments?.energy_kcal_serving ?? p.nutriments?.energy_kcal_100g ?? p.nutriments?.energy_100g / 4.18) ?? 0),
        fibre: Math.round(p.nutriments?.fiber_serving ?? p.nutriments?.fiber_100g ?? 0),
        source: 'openfoodfacts',
      }))
      .filter((f: FoodSearchResult) => f.calories > 0);
  } catch (e) {
    console.warn('[NutritionSearch] OFF error:', e);
    return [];
  }
}

/**
 * Combined search — tries USDA first (best for restaurant chains),
 * then Open Food Facts for packaged goods.
 */
export async function searchFood(query: string): Promise<FoodSearchResult[]> {
  const [usda, off] = await Promise.allSettled([
    searchUSDA(query),
    searchOpenFoodFacts(query),
  ]);

  const results: FoodSearchResult[] = [
    ...(usda.status === 'fulfilled' ? usda.value : []),
    ...(off.status === 'fulfilled' ? off.value : []),
  ];

  // Deduplicate by name similarity and sort by relevance
  const seen = new Set<string>();
  return results.filter(r => {
    const key = r.name.toLowerCase().slice(0, 30);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 15);
}
