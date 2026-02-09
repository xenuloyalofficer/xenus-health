import { createClientServer } from "@/lib/db/client"
import { NextRequest, NextResponse } from "next/server"

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

async function getAuthUserId(supabase: Awaited<ReturnType<typeof createClientServer>>) {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return user.id
}

interface NutritionSnapshot {
  calories?: number
  protein_g?: number
  fat_g?: number
  carbs_g?: number
  fiber_g?: number
  sugar_g?: number
  sodium_mg?: number
  [key: string]: unknown
}

interface FoodEntry {
  id: string
  food_catalog_id: string
  food_name: string
  portion_g: number
  meal_type: string | null
  nutrition_snapshot: NutritionSnapshot
  notes: string | null
  logged_at: string
  created_at: string
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClientServer()
    const userId = await getAuthUserId(supabase)
    if (!userId) return errorResponse("Unauthorized", 401)

    const { searchParams } = request.nextUrl
    const mealType = searchParams.get("meal_type")?.trim()

    // Today's date boundaries in user's timezone (use UTC day boundaries)
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString()

    let query = supabase
      .from("food_entries")
      .select("id, food_catalog_id, food_name, portion_g, meal_type, nutrition_snapshot, notes, logged_at, created_at")
      .eq("user_id", userId)
      .gte("logged_at", todayStart)
      .lt("logged_at", tomorrowStart)
      .order("logged_at", { ascending: true })

    if (mealType) {
      query = query.eq("meal_type", mealType)
    }

    const { data, error } = await query

    if (error) throw error

    const entries = (data || []) as FoodEntry[]

    // Group by meal_type
    const grouped: Record<string, FoodEntry[]> = {
      breakfast: [],
      lunch: [],
      dinner: [],
      snack: [],
    }

    let total_calories = 0
    let total_protein_g = 0
    let total_fat_g = 0
    let total_carbs_g = 0

    for (const entry of entries) {
      const key = entry.meal_type || "snack"
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(entry)

      const snap = entry.nutrition_snapshot || {}
      total_calories += snap.calories || 0
      total_protein_g += snap.protein_g || 0
      total_fat_g += snap.fat_g || 0
      total_carbs_g += snap.carbs_g || 0
    }

    return NextResponse.json({
      meals: grouped,
      totals: {
        total_calories: Math.round(total_calories),
        total_protein_g: Math.round(total_protein_g * 10) / 10,
        total_fat_g: Math.round(total_fat_g * 10) / 10,
        total_carbs_g: Math.round(total_carbs_g * 10) / 10,
      },
      entry_count: entries.length,
    })
  } catch (error) {
    console.error("[GET /api/nutrition/today]", error)
    return errorResponse("Failed to fetch today's nutrition", 500)
  }
}
