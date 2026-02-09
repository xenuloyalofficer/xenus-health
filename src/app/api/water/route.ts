import { createClientServer } from "@/lib/db/server"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod/v4"

const waterEntrySchema = z.object({
  amount_ml: z.int().min(1).max(10000),
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

// --- GET: Today's water entries + total ---

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClientServer()
    const userId = await getAuthUserId(supabase)
    if (!userId) return errorResponse("Unauthorized", 401)

    const { searchParams } = request.nextUrl
    const date = searchParams.get("date") || new Date().toISOString().slice(0, 10)

    const { data, error } = await supabase
      .from("water_entries")
      .select("*")
      .eq("user_id", userId)
      .gte("logged_at", `${date}T00:00:00`)
      .lte("logged_at", `${date}T23:59:59`)
      .order("logged_at", { ascending: false })

    if (error) throw error

    const total_ml = (data || []).reduce((sum, e) => sum + e.amount_ml, 0)

    return NextResponse.json({ data, total_ml })
  } catch (error) {
    console.error("[GET /api/water]", error)
    return errorResponse("Failed to fetch water entries", 500)
  }
}

// --- POST: Add water entry ---

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClientServer()
    const userId = await getAuthUserId(supabase)
    if (!userId) return errorResponse("Unauthorized", 401)

    const body = await request.json()
    const parsed = waterEntrySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      )
    }

    const { amount_ml, logged_at } = parsed.data

    const { data, error } = await supabase
      .from("water_entries")
      .insert({
        user_id: userId,
        amount_ml,
        logged_at: logged_at ?? new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error("[POST /api/water]", error)
    return errorResponse("Failed to create water entry", 500)
  }
}

// --- DELETE: Remove a water entry ---

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClientServer()
    const userId = await getAuthUserId(supabase)
    if (!userId) return errorResponse("Unauthorized", 401)

    const { searchParams } = request.nextUrl
    const id = searchParams.get("id")
    if (!id) return errorResponse("Missing id parameter", 400)

    const { error } = await supabase
      .from("water_entries")
      .delete()
      .eq("id", id)
      .eq("user_id", userId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[DELETE /api/water]", error)
    return errorResponse("Failed to delete water entry", 500)
  }
}
