import { createClientServer } from "@/lib/db/server"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod/v4"
import { calculateNutritionSnapshot } from "@/lib/nutrition/types"
import type { NutritionPer100g } from "@/lib/nutrition/types"

const logSchema = z.object({
  food_catalog_id: z.string().uuid(),
  portion_g: z.number().positive().max(50000),
  meal_type: z.enum(["breakfast", "lunch", "dinner", "snack"]).optional(),
  notes: z.string().max(1000).optional(),
  logged_at: z.iso.datetime().optional(),
})

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

async function getAuthUserId(supabase: Awaited<ReturnType<typeof createClientServer>>) {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return user.id
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClientServer()
    const userId = await getAuthUserId(supabase)
    if (!userId) return errorResponse("Unauthorized", 401)

    const body = await request.json()
    const parsed = logSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      )
    }

    const { food_catalog_id, portion_g, meal_type, notes, logged_at } = parsed.data

    // Fetch the food catalog entry for nutrition data and name
    const { data: catalogItem, error: catalogError } = await supabase
      .from("food_catalog")
      .select("name, per_100g")
      .eq("id", food_catalog_id)
      .single()

    if (catalogError || !catalogItem) {
      return errorResponse("Food not found in catalog", 404)
    }

    // Calculate nutrition snapshot for this portion
    const nutritionSnapshot = calculateNutritionSnapshot(
      catalogItem.per_100g as NutritionPer100g,
      portion_g
    )

    // Insert food entry
    const { data, error } = await supabase
      .from("food_entries")
      .insert({
        user_id: userId,
        food_catalog_id,
        food_name: catalogItem.name,
        portion_g,
        meal_type: meal_type ?? null,
        nutrition_snapshot: nutritionSnapshot,
        notes: notes ?? null,
        logged_at: logged_at ?? new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error("[POST /api/nutrition/log]", error)
    return errorResponse("Failed to log food entry", 500)
  }
}
