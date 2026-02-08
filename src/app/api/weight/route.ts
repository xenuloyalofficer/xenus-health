import { createClientServer } from "@/lib/db/client"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod/v4"

// --- Validation ---

const weightEntrySchema = z.object({
  date: z.iso.date({ message: "date must be an ISO 8601 date (YYYY-MM-DD)" }),
  weight_kg: z.number().positive().max(700),
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

// --- POST: Create a weight entry ---

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClientServer()
    const userId = await getAuthUserId(supabase)
    if (!userId) return errorResponse("Unauthorized", 401)

    const body = await request.json()
    const parsed = weightEntrySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      )
    }

    const { date, weight_kg, notes } = parsed.data

    const { data, error } = await supabase
      .from("weight_entry")
      .insert({
        user_id: userId,
        date,
        weight_kg,
        notes: notes ?? null,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error("[POST /api/weight]", error)
    return errorResponse("Failed to create weight entry", 500)
  }
}
