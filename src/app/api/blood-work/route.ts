import { createClientServer } from "@/lib/db/server"
import { createClientAdmin } from "@/lib/db/client"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod/v4"

// --- Validation ---

const panelSchema = z.object({
  test_date: z.iso.date({ message: "must be an ISO 8601 date (YYYY-MM-DD)" }),
  lab_name: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
  results: z.array(z.object({
    marker_name: z.string().min(1).max(200),
    category: z.string().min(1).max(100),
    value: z.number(),
    unit: z.string().max(50),
    ref_range_low: z.number().optional(),
    ref_range_high: z.number().optional(),
  })).min(1, "At least one result is required"),
})

const updatePanelSchema = z.object({
  id: z.string().uuid(),
  test_date: z.iso.date().optional(),
  lab_name: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
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

function computeFlag(value: number, low?: number | null, high?: number | null): string | null {
  if (low != null && value < low) return "low"
  if (high != null && value > high) return "high"
  return null
}

// --- GET: List panels with results ---

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClientServer()
    const userId = await getAuthUserId(supabase)
    if (!userId) return errorResponse("Unauthorized", 401)

    const { searchParams } = request.nextUrl
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "20", 10) || 20, 1), 100)
    const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10) || 0, 0)

    const { data, error, count } = await supabase
      .from("blood_work_panels")
      .select("*, blood_work_results(*)", { count: "exact" })
      .eq("user_id", userId)
      .order("test_date", { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    return NextResponse.json({ data, count })
  } catch (error) {
    console.error("[GET /api/blood-work]", error)
    return errorResponse("Failed to fetch blood work panels", 500)
  }
}

// --- POST: Create panel with results ---

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClientServer()
    const userId = await getAuthUserId(supabase)
    if (!userId) return errorResponse("Unauthorized", 401)

    const body = await request.json()
    const parsed = panelSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      )
    }

    const { test_date, lab_name, notes, results } = parsed.data

    // Create panel
    const { data: panel, error: panelError } = await supabase
      .from("blood_work_panels")
      .insert({
        user_id: userId,
        test_date,
        lab_name: lab_name ?? null,
        notes: notes ?? null,
      })
      .select()
      .single()

    if (panelError) throw panelError

    // Insert results
    const resultRows = results.map((r) => ({
      user_id: userId,
      panel_id: panel.id,
      marker_name: r.marker_name,
      category: r.category,
      value: r.value,
      unit: r.unit,
      ref_range_low: r.ref_range_low ?? null,
      ref_range_high: r.ref_range_high ?? null,
      flag: computeFlag(r.value, r.ref_range_low, r.ref_range_high),
    }))

    const { data: resultsData, error: resultsError } = await supabase
      .from("blood_work_results")
      .insert(resultRows)
      .select()

    if (resultsError) throw resultsError

    return NextResponse.json({ data: { ...panel, blood_work_results: resultsData } }, { status: 201 })
  } catch (error) {
    console.error("[POST /api/blood-work]", error)
    return errorResponse("Failed to create blood work panel", 500)
  }
}

// --- PATCH: Update panel metadata ---

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClientServer()
    const userId = await getAuthUserId(supabase)
    if (!userId) return errorResponse("Unauthorized", 401)

    const body = await request.json()
    const parsed = updatePanelSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      )
    }

    const { id, ...fields } = parsed.data

    const { data, error } = await supabase
      .from("blood_work_panels")
      .update(fields)
      .eq("id", id)
      .eq("user_id", userId)
      .select("*, blood_work_results(*)")
      .single()

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error("[PATCH /api/blood-work]", error)
    return errorResponse("Failed to update blood work panel", 500)
  }
}

// --- DELETE: Delete a panel (cascades results) ---

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClientServer()
    const userId = await getAuthUserId(supabase)
    if (!userId) return errorResponse("Unauthorized", 401)

    const { searchParams } = request.nextUrl
    const id = searchParams.get("id")
    if (!id) return errorResponse("Missing id parameter", 400)

    const { error } = await supabase
      .from("blood_work_panels")
      .delete()
      .eq("id", id)
      .eq("user_id", userId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[DELETE /api/blood-work]", error)
    return errorResponse("Failed to delete blood work panel", 500)
  }
}
