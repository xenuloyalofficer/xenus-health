import { createClientServer } from "@/lib/db/server"
import { NextRequest, NextResponse } from "next/server"
import { searchFoods, getFoodDetails, mapUSDAToFoodCatalog } from "@/lib/nutrition/usda"
import { searchByName, searchByBarcode, mapOFFToFoodCatalog } from "@/lib/nutrition/openfoodfacts"
import type { FoodCatalogInsert } from "@/lib/nutrition/types"

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

async function getAuthUserId(supabase: Awaited<ReturnType<typeof createClientServer>>) {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return user.id
}

function isBarcode(q: string): boolean {
  return /^\d{8,13}$/.test(q)
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClientServer()
    const userId = await getAuthUserId(supabase)
    if (!userId) return errorResponse("Unauthorized", 401)

    const { searchParams } = request.nextUrl
    const query = searchParams.get("q")?.trim()
    if (!query || query.length < 1) {
      return errorResponse("Query parameter 'q' is required", 400)
    }

    // 1. Personal food catalog
    const { data: personalData } = await supabase
      .rpc("get_food_suggestions", {
        p_user_id: userId,
        p_query: query,
        p_limit: 10,
      })

    const personal: FoodCatalogInsert[] = (personalData || []).map(
      (item: { id: string; name: string; default_portion_g: number; per_100g: object; times_logged: number }) => ({
        id: item.id,
        name: item.name,
        default_portion_g: item.default_portion_g,
        per_100g: item.per_100g,
        times_logged: item.times_logged,
        source: "user" as const,
      })
    )

    // 2. USDA search (only if personal results < 3)
    let usda: FoodCatalogInsert[] = []
    if (personal.length < 3 && process.env.USDA_API_KEY) {
      try {
        const usdaResults = await searchFoods(query, 5)
        // Get details for top 3 results
        const detailPromises = usdaResults.slice(0, 3).map((r) => getFoodDetails(r.fdcId))
        const details = await Promise.allSettled(detailPromises)
        usda = details
          .filter((d): d is PromiseFulfilledResult<Awaited<ReturnType<typeof getFoodDetails>>> => d.status === "fulfilled")
          .map((d) => mapUSDAToFoodCatalog(d.value))
      } catch (err) {
        console.error("[nutrition/search] USDA search failed:", err)
      }
    }

    // 3. Open Food Facts (barcode or if total < 5)
    let openfoodfacts: FoodCatalogInsert[] = []
    if (isBarcode(query)) {
      try {
        const product = await searchByBarcode(query)
        if (product) {
          openfoodfacts = [mapOFFToFoodCatalog(product)]
        }
      } catch (err) {
        console.error("[nutrition/search] OFF barcode search failed:", err)
      }
    } else if (personal.length + usda.length < 5) {
      try {
        const offResults = await searchByName(query, 5)
        openfoodfacts = offResults.map((r) => ({
          name: r.product_name + (r.brands ? ` (${r.brands})` : ""),
          name_normalized: r.product_name.toLowerCase().trim(),
          source: "openfoodfacts" as const,
          source_id: r.code,
          barcode: r.code,
          default_portion_g: 100,
          per_100g: r.per100g,
        }))
      } catch (err) {
        console.error("[nutrition/search] OFF name search failed:", err)
      }
    }

    return NextResponse.json({ personal, usda, openfoodfacts })
  } catch (error) {
    console.error("[GET /api/nutrition/search]", error)
    return errorResponse("Failed to search nutrition database", 500)
  }
}
