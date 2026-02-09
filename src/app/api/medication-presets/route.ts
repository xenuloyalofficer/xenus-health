import { createClientServer } from "@/lib/db/server"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod/v4"

const presetSchema = z.object({
  medication_name: z.string().min(1).max(200),
  schedule: z.array(z.enum(["morning", "afternoon", "evening", "night"])).default([]),
  dosage: z.string().max(100).optional(),
  active: z.boolean().default(true),
})

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

async function getAuthUserId(supabase: Awaited<ReturnType<typeof createClientServer>>) {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return user.id
}

export async function GET() {
  try {
    const supabase = await createClientServer()
    const userId = await getAuthUserId(supabase)
    if (!userId) return errorResponse("Unauthorized", 401)

    const { data, error } = await supabase
      .from("medication_presets")
      .select("*")
      .eq("user_id", userId)
      .eq("active", true)
      .order("created_at", { ascending: true })

    if (error) throw error
    return NextResponse.json({ data })
  } catch (error) {
    console.error("[GET /api/medication-presets]", error)
    return errorResponse("Failed to fetch medication presets", 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClientServer()
    const userId = await getAuthUserId(supabase)
    if (!userId) return errorResponse("Unauthorized", 401)

    const body = await request.json()
    const parsed = presetSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from("medication_presets")
      .insert({
        user_id: userId,
        medication_name: parsed.data.medication_name,
        schedule: parsed.data.schedule,
        dosage: parsed.data.dosage ?? null,
        active: parsed.data.active,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error("[POST /api/medication-presets]", error)
    return errorResponse("Failed to create medication preset", 500)
  }
}

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

    const { data, error } = await supabase
      .from("medication_presets")
      .update(fields)
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ data })
  } catch (error) {
    console.error("[PATCH /api/medication-presets]", error)
    return errorResponse("Failed to update medication preset", 500)
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClientServer()
    const userId = await getAuthUserId(supabase)
    if (!userId) return errorResponse("Unauthorized", 401)

    const { searchParams } = request.nextUrl
    const id = searchParams.get("id")
    if (!id) return errorResponse("Missing id parameter", 400)

    const { error } = await supabase
      .from("medication_presets")
      .update({ active: false })
      .eq("id", id)
      .eq("user_id", userId)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[DELETE /api/medication-presets]", error)
    return errorResponse("Failed to delete medication preset", 500)
  }
}
