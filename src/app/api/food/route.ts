import { createClientServer } from "@/lib/db/client"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod/v4"

// --- Validation ---

const foodEntrySchema = z.object({
  food_description: z.string().min(1).max(500),
  calories: z.number().int().min(0).max(50000).optional(),
  date: z.iso.date().optional(),
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

// --- POST: Create a food entry ---

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClientServer()
    const userId = await getAuthUserId(supabase)
    if (!userId) return errorResponse("Unauthorized", 401)

    const body = await request.json()
    const parsed = foodEntrySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      )
    }

    const { food_description, calories, date } = parsed.data

    const resolvedDate = date || new Date().toISOString().slice(0, 10)

    const { data, error } = await supabase
      .from("food_entry")
      .insert({
        user_id: userId,
        food_description,
        calories,
        date: resolvedDate,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (error) {
    console.error("[POST /api/food]", error)
    return errorResponse("Failed to create food entry", 500)
  }
}
