import { NutritionPer100g, FoodCatalogInsert } from "./types"

const BASE_URL = "https://api.nal.usda.gov/fdc/v1"

function getApiKey(): string {
  const key = process.env.USDA_API_KEY
  if (!key) throw new Error("USDA_API_KEY environment variable is not set")
  return key
}

// Nutrient number → field mapping
const NUTRIENT_MAP: Record<number, { key: string; nested?: string }> = {
  1008: { key: "calories" },
  1003: { key: "protein_g" },
  1004: { key: "fat_g" },
  1005: { key: "carbs_g" },
  1079: { key: "fiber_g" },
  2000: { key: "sugar_g" },
  1093: { key: "sodium_mg" },
  1258: { key: "saturated_fat_g" },
  1253: { key: "cholesterol_mg" },
  1092: { key: "potassium_mg" },
  // Vitamins
  1106: { key: "a_ug", nested: "vitamins" },
  1162: { key: "c_mg", nested: "vitamins" },
  1114: { key: "d_ug", nested: "vitamins" },
  1109: { key: "e_mg", nested: "vitamins" },
  1185: { key: "k_ug", nested: "vitamins" },
  1165: { key: "b1_mg", nested: "vitamins" },
  1166: { key: "b2_mg", nested: "vitamins" },
  1167: { key: "b3_mg", nested: "vitamins" },
  1175: { key: "b6_mg", nested: "vitamins" },
  1178: { key: "b12_ug", nested: "vitamins" },
  1177: { key: "folate_ug", nested: "vitamins" },
  // Minerals
  1087: { key: "calcium_mg", nested: "minerals" },
  1089: { key: "iron_mg", nested: "minerals" },
  1090: { key: "magnesium_mg", nested: "minerals" },
  1095: { key: "zinc_mg", nested: "minerals" },
  1091: { key: "phosphorus_mg", nested: "minerals" },
  1103: { key: "selenium_ug", nested: "minerals" },
}

// Simple in-memory cache for search results
const searchCache = new Map<string, { data: USDASearchResult[]; ts: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export interface USDASearchResult {
  fdcId: number
  description: string
  dataType: string
  brandOwner?: string
}

export interface USDAFoodDetails {
  fdcId: number
  description: string
  dataType: string
  per100g: NutritionPer100g
  servingSize?: number
  servingSizeUnit?: string
}

async function fetchWithRetry(url: string, retries = 1): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url)
    if (res.ok) return res
    if ((res.status === 429 || res.status >= 500) && attempt < retries) {
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)))
      continue
    }
    throw new Error(`USDA API error: ${res.status} ${res.statusText}`)
  }
  throw new Error("USDA API request failed after retries")
}

export async function searchFoods(query: string, pageSize = 10): Promise<USDASearchResult[]> {
  const cacheKey = `${query}:${pageSize}`
  const cached = searchCache.get(cacheKey)
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data

  const apiKey = getApiKey()
  const params = new URLSearchParams({
    api_key: apiKey,
    query,
    dataType: "Foundation,SR Legacy",
    pageSize: String(pageSize),
  })

  const res = await fetchWithRetry(`${BASE_URL}/foods/search?${params}`)
  const json = await res.json()

  const results: USDASearchResult[] = (json.foods || []).map(
    (f: { fdcId: number; description: string; dataType: string; brandOwner?: string }) => ({
      fdcId: f.fdcId,
      description: f.description,
      dataType: f.dataType,
      brandOwner: f.brandOwner,
    })
  )

  searchCache.set(cacheKey, { data: results, ts: Date.now() })
  return results
}

export async function getFoodDetails(fdcId: number): Promise<USDAFoodDetails> {
  const apiKey = getApiKey()
  const res = await fetchWithRetry(`${BASE_URL}/food/${fdcId}?api_key=${apiKey}`)
  const json = await res.json()

  const per100g: NutritionPer100g = {
    vitamins: {},
    minerals: {},
  }

  const nutrients = json.foodNutrients || []
  for (const n of nutrients) {
    const nutrientNumber = n.nutrient?.number ? parseInt(n.nutrient.number) : n.number
    const mapping = NUTRIENT_MAP[nutrientNumber]
    if (!mapping) continue

    const value = n.amount ?? null
    if (value == null) continue

    if (mapping.nested === "vitamins") {
      (per100g.vitamins as Record<string, number | null>)[mapping.key] = value
    } else if (mapping.nested === "minerals") {
      (per100g.minerals as Record<string, number | null>)[mapping.key] = value
    } else {
      (per100g as Record<string, unknown>)[mapping.key] = value
    }
  }

  return {
    fdcId: json.fdcId,
    description: json.description,
    dataType: json.dataType,
    per100g,
    servingSize: json.servingSize,
    servingSizeUnit: json.servingSizeUnit,
  }
}

export function mapUSDAToFoodCatalog(food: USDAFoodDetails): FoodCatalogInsert {
  return {
    name: food.description,
    name_normalized: food.description.toLowerCase().trim(),
    source: "usda",
    source_id: food.fdcId.toString(),
    default_portion_g: food.servingSize || 100,
    per_100g: food.per100g,
  }
}
