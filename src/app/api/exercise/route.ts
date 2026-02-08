import { createClientServer } from "@/lib/db/client"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod/v4"

// --- Validation ---

const exerciseEntrySchema = z.object({
  date: z.iso.date({ message: "date must be an ISO 8601 date (YYYY-MM-DD)" }),
  duration_minutes: z.number().int().positive().max(1440),
  exercise_type: z.string().min(1).max(100),
  distance_km: z.number().positive().max(1000).optional(),
  calories_burned: z.number().int().positive().max(50000).optional(),
  notes: z.string().max(1000).optional(),
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

// --- POST: Create an exercise entry ---

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClientServer()
    const userId = await getAuthUserId(supabase)
    if (!userId) return errorResponse("Unauthorized", 401)

    const body = await request.json()
    const parsed = exerciseEntrySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      )
    }

    const { date, duration_minutes, exercise_type, distance_km, calories_burned, notes } = parsed.data

    const { data, error } = await supabase
      .from("exercise_entry")
      .insert({
        user_id: userId,
        date,
        duration_minutes,
        exercise_type,
        distance_km: distance_km ?? null,
        calories_burned: calories_burned ?? null,
        notes: notes ?? null,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error("[POST /api/exercise]", error)
    return errorResponse("Failed to create exercise entry", 500)
  }
}
