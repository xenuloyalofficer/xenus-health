import { createClientServer } from "@/lib/db/client"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod/v4"

// --- Validation ---

const foodEntrySchema = z.object({
  food_catalog_id: z.string().uuid(),
  food_name: z.string().min(1).max(500),
  portion_g: z.number().positive().max(50000),
  meal_type: z.enum(["breakfast", "lunch", "dinner", "snack"]).optional(),
  nutrition_snapshot: z.object({
    calories: z.number().min(0).optional(),
    protein_g: z.number().min(0).optional(),
    fat_g: z.number().min(0).optional(),
    carbs_g: z.number().min(0).optional(),
    fiber_g: z.number().min(0).optional(),
    sugar_g: z.number().min(0).optional(),
    sodium_mg: z.number().min(0).optional(),
  }).optional(),
  notes: z.string().max(1000).optional(),
  logged_at: z.iso.datetime().optional(),
})

const quickFoodEntrySchema = z.object({
  food_name: z.string().min(1).max(500),
  portion_g: z.number().positive().max(50000).optional(),
  meal_type: z.enum(["breakfast", "lunch", "dinner", "snack"]).optional(),
  calories: z.number().min(0).optional(),
  notes: z.string().max(1000).optional(),
  logged_at: z.iso.datetime().optional(),
})

// --- Helpers ---

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

async function getAuthUserId(supabase: Awaited<ReturnType<typeof createClientServer>>) {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return user.id
}

// --- GET: List food entries ---

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClientServer()
    const userId = await getAuthUserId(supabase)
    if (!userId) return errorResponse("Unauthorized", 401)

    const { searchParams } = request.nextUrl
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "30", 10) || 30, 1), 100)
    const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10) || 0, 0)
    const date = searchParams.get("date")

    let query = supabase
      .from("food_entries")
      .select("*", { count: "exact" })
      .eq("user_id", userId)
      .order("logged_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (date) query = query.gte("logged_at", `${date}T00:00:00`).lte("logged_at", `${date}T23:59:59`)

    const { data, error, count } = await query

    if (error) throw error

    return NextResponse.json({ data, count })
  } catch (error) {
    console.error("[GET /api/food]", error)
    return errorResponse("Failed to fetch food entries", 500)
  }
}

// --- DELETE: Remove a food entry ---

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClientServer()
    const userId = await getAuthUserId(supabase)
    if (!userId) return errorResponse("Unauthorized", 401)

    const body = await request.json()
    const id = body?.id
    if (!id || typeof id !== "string") return errorResponse("Invalid id", 400)

    const { error } = await supabase
      .from("food_entries")
      .delete()
      .eq("id", id)
      .eq("user_id", userId)

    if (error) {
      if (error.code === "PGRST116") return errorResponse("Entry not found", 404)
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[DELETE /api/food]", error)
    return errorResponse("Failed to delete food entry", 500)
  }
}

// --- POST: Create a food entry ---

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClientServer()
    const userId = await getAuthUserId(supabase)
    if (!userId) return errorResponse("Unauthorized", 401)

    const body = await request.json()

    // Try full schema first (with food_catalog_id), fall back to quick entry
    const fullParsed = foodEntrySchema.safeParse(body)
    if (fullParsed.success) {
      const { food_catalog_id, food_name, portion_g, meal_type, nutrition_snapshot, notes, logged_at } = fullParsed.data

      const { data, error } = await supabase
        .from("food_entries")
        .insert({
          user_id: userId,
          food_catalog_id,
          food_name,
          portion_g,
          meal_type: meal_type ?? null,
          nutrition_snapshot: nutrition_snapshot ?? null,
          notes: notes ?? null,
          logged_at: logged_at ?? new Date().toISOString(),
        })
        .select()
        .single()

      if (error) throw error
      return NextResponse.json({ data }, { status: 201 })
    }

    // Quick entry: auto-create food_catalog entry, then log
    const quickParsed = quickFoodEntrySchema.safeParse(body)
    if (!quickParsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: quickParsed.error.issues },
        { status: 400 }
      )
    }

    const { food_name, portion_g, meal_type, calories, notes, logged_at } = quickParsed.data

    // Upsert into food_catalog
    const { data: catalogEntry, error: catalogError } = await supabase
      .from("food_catalog")
      .upsert(
        {
          user_id: userId,
          name: food_name,
          name_normalized: food_name.toLowerCase().trim(),
          source: "user",
          default_portion_g: portion_g ?? 100,
          per_100g: calories ? { calories: Math.round(calories / ((portion_g ?? 100) / 100)) } : {},
        },
        { onConflict: "id" }
      )
      .select()
      .single()

    if (catalogError) throw catalogError

    const nutritionSnapshot = calories ? { calories } : null

    const { data, error } = await supabase
      .from("food_entries")
      .insert({
        user_id: userId,
        food_catalog_id: catalogEntry.id,
        food_name,
        portion_g: portion_g ?? 100,
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
    console.error("[POST /api/food]", error)
    return errorResponse("Failed to create food entry", 500)
  }
}
