import { createClientServer } from "@/lib/db/client"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod/v4"

// --- Validation ---

const sleepEntrySchema = z.object({
  bedtime: z.iso.datetime({ message: "bedtime must be an ISO 8601 datetime" }),
  wake_time: z.iso.datetime({ message: "wake_time must be an ISO 8601 datetime" }).optional(),
  quality: z.int().min(1).max(5).optional(),
  interruptions: z.int().min(0).max(99).optional(),
  notes: z.string().max(1000).optional(),
  sleep_date: z.iso.date().optional(),
})

const sleepUpdateSchema = sleepEntrySchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field must be provided for update" }
)

const uuidSchema = z.string().uuid("Invalid entry ID")

// --- Helpers ---

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

async function getAuthUserId(supabase: Awaited<ReturnType<typeof createClientServer>>) {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return user.id
}

// --- GET: List sleep entries ---

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClientServer()
    const userId = await getAuthUserId(supabase)
    if (!userId) return errorResponse("Unauthorized", 401)

    const { searchParams } = request.nextUrl
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "30", 10) || 30, 1), 100)
    const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10) || 0, 0)
    const from = searchParams.get("from") // ISO date string
    const to = searchParams.get("to")     // ISO date string

    let query = supabase
      .from("sleep_entry")
      .select("*", { count: "exact" })
      .eq("user_id", userId)
      .order("sleep_date", { ascending: false })
      .range(offset, offset + limit - 1)

    if (from) query = query.gte("sleep_date", from)
    if (to) query = query.lte("sleep_date", to)

    const { data, error, count } = await query

    if (error) throw error

    return NextResponse.json({ data, count })
  } catch (error) {
    console.error("[GET /api/sleep]", error)
    return errorResponse("Failed to fetch sleep entries", 500)
  }
}

// --- POST: Create a sleep entry ---

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClientServer()
    const userId = await getAuthUserId(supabase)
    if (!userId) return errorResponse("Unauthorized", 401)

    const body = await request.json()
    const parsed = sleepEntrySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      )
    }

    const { bedtime, wake_time, quality, interruptions, notes, sleep_date } = parsed.data

    // Default sleep_date to the bedtime's date if not provided
    const resolvedSleepDate = sleep_date || bedtime.slice(0, 10)

    const { data, error } = await supabase
      .from("sleep_entry")
      .insert({
        user_id: userId,
        bedtime,
        wake_time: wake_time ?? null,
        quality: quality ?? null,
        interruptions: interruptions ?? 0,
        notes: notes ?? null,
        sleep_date: resolvedSleepDate,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error("[POST /api/sleep]", error)
    return errorResponse("Failed to create sleep entry", 500)
  }
}

// --- PATCH: Update a sleep entry ---

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClientServer()
    const userId = await getAuthUserId(supabase)
    if (!userId) return errorResponse("Unauthorized", 401)

    const body = await request.json()
    const { id, ...fields } = body

    const idResult = uuidSchema.safeParse(id)
    if (!idResult.success) {
      return NextResponse.json(
        { error: "Missing or invalid id" },
        { status: 400 }
      )
    }

    const parsed = sleepUpdateSchema.safeParse(fields)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from("sleep_entry")
      .update(parsed.data)
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single()

    if (error) {
      if (error.code === "PGRST116") return errorResponse("Entry not found", 404)
      throw error
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error("[PATCH /api/sleep]", error)
    return errorResponse("Failed to update sleep entry", 500)
  }
}

// --- DELETE: Remove a sleep entry ---

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClientServer()
    const userId = await getAuthUserId(supabase)
    if (!userId) return errorResponse("Unauthorized", 401)

    const { searchParams } = request.nextUrl
    const id = searchParams.get("id")

    const idResult = uuidSchema.safeParse(id)
    if (!idResult.success) {
      return NextResponse.json(
        { error: "Missing or invalid id query parameter" },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from("sleep_entry")
      .delete()
      .eq("id", id)
      .eq("user_id", userId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[DELETE /api/sleep]", error)
    return errorResponse("Failed to delete sleep entry", 500)
  }
}
