import { createClientServer } from "@/lib/db/server"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod/v4"

// --- Validation ---

const moodEntrySchema = z.object({
  energy_level: z.int().min(1).max(5),
  mood_level: z.int().min(1).max(5),
  notes: z.string().max(500).optional(),
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

// --- GET: List mood entries ---

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClientServer()
    const userId = await getAuthUserId(supabase)
    if (!userId) return errorResponse("Unauthorized", 401)

    const { searchParams } = request.nextUrl
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "30", 10) || 30, 1), 100)
    const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10) || 0, 0)

    const { data, error, count } = await supabase
      .from("mood_entries")
      .select("*", { count: "exact" })
      .eq("user_id", userId)
      .order("logged_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    return NextResponse.json({ data, count })
  } catch (error) {
    console.error("[GET /api/energy]", error)
    return errorResponse("Failed to fetch mood entries", 500)
  }
}

// --- POST: Create a mood entry ---

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClientServer()
    const userId = await getAuthUserId(supabase)
    if (!userId) return errorResponse("Unauthorized", 401)

    const body = await request.json()
    const parsed = moodEntrySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      )
    }

    const { energy_level, mood_level, notes, logged_at } = parsed.data

    const { data, error } = await supabase
      .from("mood_entries")
      .insert({
        user_id: userId,
        energy_level,
        mood_level,
        notes: notes ?? null,
        logged_at: logged_at ?? new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error("[POST /api/energy]", error)
    return errorResponse("Failed to create mood entry", 500)
  }
}
