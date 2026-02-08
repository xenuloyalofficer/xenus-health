import { createClientServer } from "@/lib/db/client"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod/v4"

// --- Validation ---

const exerciseSessionSchema = z.object({
  exercise_type: z.enum(["treadmill", "vibration_plate", "walk", "run", "strength", "bike", "yoga"]),
  started_at: z.iso.datetime({ message: "started_at must be an ISO 8601 datetime" }),
  ended_at: z.iso.datetime({ message: "ended_at must be an ISO 8601 datetime" }).optional(),
  duration_minutes: z.number().positive().max(1440).optional(),
  calories_burned: z.number().positive().max(50000).optional(),
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

// --- GET: List exercise sessions ---

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClientServer()
    const userId = await getAuthUserId(supabase)
    if (!userId) return errorResponse("Unauthorized", 401)

    const { searchParams } = request.nextUrl
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "30", 10) || 30, 1), 100)
    const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10) || 0, 0)
    const from = searchParams.get("from")
    const to = searchParams.get("to")

    let query = supabase
      .from("exercise_sessions")
      .select("*", { count: "exact" })
      .eq("user_id", userId)
      .order("started_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (from) query = query.gte("started_at", from)
    if (to) query = query.lte("started_at", to)

    const { data, error, count } = await query

    if (error) throw error

    return NextResponse.json({ data, count })
  } catch (error) {
    console.error("[GET /api/exercise]", error)
    return errorResponse("Failed to fetch exercise sessions", 500)
  }
}

// --- POST: Create an exercise session ---

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClientServer()
    const userId = await getAuthUserId(supabase)
    if (!userId) return errorResponse("Unauthorized", 401)

    const body = await request.json()
    const parsed = exerciseSessionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      )
    }

    const { exercise_type, started_at, ended_at, duration_minutes, calories_burned, notes } = parsed.data

    const { data, error } = await supabase
      .from("exercise_sessions")
      .insert({
        user_id: userId,
        exercise_type,
        started_at,
        ended_at: ended_at ?? null,
        duration_minutes: duration_minutes ?? null,
        calories_burned: calories_burned ?? null,
        notes: notes ?? null,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error("[POST /api/exercise]", error)
    return errorResponse("Failed to create exercise session", 500)
  }
}

// --- PATCH: Update an exercise session (e.g. end it) ---

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClientServer()
    const userId = await getAuthUserId(supabase)
    if (!userId) return errorResponse("Unauthorized", 401)

    const body = await request.json()
    const { id, ...fields } = body

    if (!id || typeof id !== "string") {
      return errorResponse("Missing or invalid id", 400)
    }

    const updateSchema = exerciseSessionSchema.partial().refine(
      (data) => Object.keys(data).length > 0,
      { message: "At least one field must be provided for update" }
    )

    const parsed = updateSchema.safeParse(fields)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from("exercise_sessions")
      .update(parsed.data)
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single()

    if (error) {
      if (error.code === "PGRST116") return errorResponse("Session not found", 404)
      throw error
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error("[PATCH /api/exercise]", error)
    return errorResponse("Failed to update exercise session", 500)
  }
}
