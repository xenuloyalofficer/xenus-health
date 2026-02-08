import { createClientServer } from "@/lib/db/client"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod/v4"

// --- Validation ---

const medicationEntrySchema = z.object({
  medication_name: z.string().min(1).max(200),
  status: z.enum(["taken", "skipped", "late"]),
  scheduled_time: z.enum(["morning", "afternoon", "evening", "night"]).optional(),
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

// --- GET: List medication entries ---

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
      .from("medication_entries")
      .select("*", { count: "exact" })
      .eq("user_id", userId)
      .order("logged_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (date) query = query.gte("logged_at", `${date}T00:00:00`).lte("logged_at", `${date}T23:59:59`)

    const { data, error, count } = await query

    if (error) throw error

    return NextResponse.json({ data, count })
  } catch (error) {
    console.error("[GET /api/medication]", error)
    return errorResponse("Failed to fetch medication entries", 500)
  }
}

// --- POST: Create a medication entry ---

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClientServer()
    const userId = await getAuthUserId(supabase)
    if (!userId) return errorResponse("Unauthorized", 401)

    const body = await request.json()
    const parsed = medicationEntrySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      )
    }

    const { medication_name, status, scheduled_time, notes, logged_at } = parsed.data

    const { data, error } = await supabase
      .from("medication_entries")
      .insert({
        user_id: userId,
        medication_name,
        status,
        scheduled_time: scheduled_time ?? null,
        notes: notes ?? null,
        logged_at: logged_at ?? new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error("[POST /api/medication]", error)
    return errorResponse("Failed to create medication entry", 500)
  }
}
