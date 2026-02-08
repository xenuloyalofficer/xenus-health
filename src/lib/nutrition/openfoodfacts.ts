import { NutritionPer100g, FoodCatalogInsert } from "./types"

const BASE_URL = "https://world.openfoodfacts.org/api/v2"
const USER_AGENT = "HealthOS/1.0 (personal-use)"

// Simple throttle: track last request time
let lastRequestTime = 0
const MIN_INTERVAL = 6000 // 10 requests per minute = 1 every 6 seconds

async function throttledFetch(url: string): Promise<Response> {
  const now = Date.now()
  const wait = Math.max(0, MIN_INTERVAL - (now - lastRequestTime))
  if (wait > 0) await new Promise((r) => setTimeout(r, wait))
  lastRequestTime = Date.now()

  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
  })
  return res
}

export interface OFFProduct {
  code: string
  product_name: string
  brands?: string
  nutriments: Record<string, number>
  serving_size?: string
  serving_quantity?: number
}

export interface OFFSearchResult {
  code: string
  product_name: string
  brands?: string
  per100g: NutritionPer100g
}

function parseNutriments(n: Record<string, number>): NutritionPer100g {
  return {
    calories: n["energy-kcal_100g"] ?? null,
    protein_g: n["proteins_100g"] ?? null,
    fat_g: n["fat_100g"] ?? null,
    carbs_g: n["carbohydrates_100g"] ?? null,
    fiber_g: n["fiber_100g"] ?? null,
    sugar_g: n["sugars_100g"] ?? null,
    sodium_mg: n["sodium_100g"] != null ? n["sodium_100g"] * 1000 : null, // OFF stores in g
    saturated_fat_g: n["saturated-fat_100g"] ?? null,
    cholesterol_mg: n["cholesterol_100g"] != null ? n["cholesterol_100g"] * 1000 : null,
    potassium_mg: n["potassium_100g"] != null ? n["potassium_100g"] * 1000 : null,
    vitamins: {
      a_ug: n["vitamin-a_100g"] != null ? n["vitamin-a_100g"] * 1e6 : null,
      c_mg: n["vitamin-c_100g"] != null ? n["vitamin-c_100g"] * 1000 : null,
      d_ug: n["vitamin-d_100g"] != null ? n["vitamin-d_100g"] * 1e6 : null,
      e_mg: n["vitamin-e_100g"] != null ? n["vitamin-e_100g"] * 1000 : null,
      k_ug: n["vitamin-k_100g"] != null ? n["vitamin-k_100g"] * 1e6 : null,
      b1_mg: n["vitamin-b1_100g"] != null ? n["vitamin-b1_100g"] * 1000 : null,
      b2_mg: n["vitamin-b2_100g"] != null ? n["vitamin-b2_100g"] * 1000 : null,
      b3_mg: n["vitamin-b3_100g"] != null ? n["vitamin-b3_100g"] * 1000 : null,
      b6_mg: n["vitamin-b6_100g"] != null ? n["vitamin-b6_100g"] * 1000 : null,
      b12_ug: n["vitamin-b12_100g"] != null ? n["vitamin-b12_100g"] * 1e6 : null,
      folate_ug: n["vitamin-b9_100g"] != null ? n["vitamin-b9_100g"] * 1e6 : null,
    },
    minerals: {
      calcium_mg: n["calcium_100g"] != null ? n["calcium_100g"] * 1000 : null,
      iron_mg: n["iron_100g"] != null ? n["iron_100g"] * 1000 : null,
      magnesium_mg: n["magnesium_100g"] != null ? n["magnesium_100g"] * 1000 : null,
      zinc_mg: n["zinc_100g"] != null ? n["zinc_100g"] * 1000 : null,
      phosphorus_mg: n["phosphorus_100g"] != null ? n["phosphorus_100g"] * 1000 : null,
      selenium_ug: n["selenium_100g"] != null ? n["selenium_100g"] * 1e6 : null,
    },
  }
}

export async function searchByBarcode(barcode: string): Promise<OFFProduct | null> {
  const res = await throttledFetch(`${BASE_URL}/product/${barcode}`)
  if (!res.ok) return null

  const json = await res.json()
  if (json.status !== 1 || !json.product) return null

  const p = json.product
  return {
    code: p.code || barcode,
    product_name: p.product_name || "Unknown",
    brands: p.brands,
    nutriments: p.nutriments || {},
    serving_size: p.serving_size,
    serving_quantity: p.serving_quantity,
  }
}

export async function searchByName(query: string, pageSize = 10): Promise<OFFSearchResult[]> {
  const params = new URLSearchParams({
    search_terms: query,
    page_size: String(pageSize),
    json: "true",
    fields: "code,product_name,brands,nutriments,serving_size,serving_quantity",
  })

  const res = await throttledFetch(`${BASE_URL}/search?${params}`)
  if (!res.ok) return []

  const json = await res.json()
  const products = json.products || []

  return products
    .filter((p: { product_name?: string }) => p.product_name)
    .map((p: { code: string; product_name: string; brands?: string; nutriments: Record<string, number> }) => ({
      code: p.code,
      product_name: p.product_name,
      brands: p.brands,
      per100g: parseNutriments(p.nutriments || {}),
    }))
}

export function mapOFFToFoodCatalog(product: OFFProduct): FoodCatalogInsert {
  return {
    name: product.brands
      ? `${product.product_name} (${product.brands})`
      : product.product_name,
    name_normalized: (product.product_name || "").toLowerCase().trim(),
    source: "openfoodfacts",
    source_id: product.code,
    barcode: product.code,
    default_portion_g: product.serving_quantity || 100,
    per_100g: parseNutriments(product.nutriments),
  }
}
