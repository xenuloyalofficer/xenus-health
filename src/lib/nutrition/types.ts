export interface NutritionPer100g {
  calories?: number | null
  protein_g?: number | null
  fat_g?: number | null
  carbs_g?: number | null
  fiber_g?: number | null
  sugar_g?: number | null
  sodium_mg?: number | null
  saturated_fat_g?: number | null
  cholesterol_mg?: number | null
  potassium_mg?: number | null
  vitamins?: {
    a_ug?: number | null
    c_mg?: number | null
    d_ug?: number | null
    e_mg?: number | null
    k_ug?: number | null
    b1_mg?: number | null
    b2_mg?: number | null
    b3_mg?: number | null
    b6_mg?: number | null
    b12_ug?: number | null
    folate_ug?: number | null
  }
  minerals?: {
    calcium_mg?: number | null
    iron_mg?: number | null
    magnesium_mg?: number | null
    zinc_mg?: number | null
    phosphorus_mg?: number | null
    selenium_ug?: number | null
  }
}

export interface FoodCatalogInsert {
  name: string
  name_normalized: string
  source: "user" | "usda" | "openfoodfacts"
  source_id?: string | null
  barcode?: string | null
  default_portion_g?: number | null
  per_100g: NutritionPer100g
  user_id?: string
}

export interface FoodCatalogItem {
  id: string
  name: string
  default_portion_g: number | null
  per_100g: NutritionPer100g
  times_logged: number
  source: string
  source_id?: string | null
  barcode?: string | null
}

export function calculateNutritionSnapshot(
  per100g: NutritionPer100g,
  portionG: number
): NutritionPer100g {
  const factor = portionG / 100
  const scale = (v: number | null | undefined) => (v != null ? Math.round(v * factor * 10) / 10 : null)

  return {
    calories: scale(per100g.calories),
    protein_g: scale(per100g.protein_g),
    fat_g: scale(per100g.fat_g),
    carbs_g: scale(per100g.carbs_g),
    fiber_g: scale(per100g.fiber_g),
    sugar_g: scale(per100g.sugar_g),
    sodium_mg: scale(per100g.sodium_mg),
    saturated_fat_g: scale(per100g.saturated_fat_g),
    cholesterol_mg: scale(per100g.cholesterol_mg),
    potassium_mg: scale(per100g.potassium_mg),
  }
}
