import { createClientServer } from "@/lib/db/server"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod/v4"

// --- Validation ---

const measurementSchema = z.object({
  measured_at: z.iso.date({ message: "measured_at must be an ISO 8601 date (YYYY-MM-DD)" }),
  neck_cm: z.number().positive().max(200).optional(),
  chest_cm: z.number().positive().max(300).optional(),
  left_arm_cm: z.number().positive().max(200).optional(),
  right_arm_cm: z.number().positive().max(200).optional(),
  waist_cm: z.number().positive().max(300).optional(),
  hips_cm: z.number().positive().max(300).optional(),
  left_thigh_cm: z.number().positive().max(200).optional(),
  right_thigh_cm: z.number().positive().max(200).optional(),
  left_calf_cm: z.number().positive().max(200).optional(),
  right_calf_cm: z.number().positive().max(200).optional(),
  weight_kg: z.number().positive().max(700).optional(),
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

// --- GET: List body measurements ---

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClientServer()
    const userId = await getAuthUserId(supabase)
    if (!userId) return errorResponse("Unauthorized", 401)

    const { searchParams } = request.nextUrl
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "30", 10) || 30, 1), 100)
    const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10) || 0, 0)

    const { data, error, count } = await supabase
      .from("body_measurements")
      .select("*", { count: "exact" })
      .eq("user_id", userId)
      .order("measured_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    return NextResponse.json({ data, count })
  } catch (error) {
    console.error("[GET /api/measurements]", error)
    return errorResponse("Failed to fetch body measurements", 500)
  }
}

// --- POST: Create a body measurement entry ---

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClientServer()
    const userId = await getAuthUserId(supabase)
    if (!userId) return errorResponse("Unauthorized", 401)

    const body = await request.json()
    const parsed = measurementSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      )
    }

    const {
      measured_at,
      neck_cm, chest_cm,
      left_arm_cm, right_arm_cm,
      waist_cm, hips_cm,
      left_thigh_cm, right_thigh_cm,
      left_calf_cm, right_calf_cm,
      weight_kg, notes,
    } = parsed.data

    const { data, error } = await supabase
      .from("body_measurements")
      .insert({
        user_id: userId,
        measured_at,
        neck_cm: neck_cm ?? null,
        chest_cm: chest_cm ?? null,
        left_arm_cm: left_arm_cm ?? null,
        right_arm_cm: right_arm_cm ?? null,
        waist_cm: waist_cm ?? null,
        hips_cm: hips_cm ?? null,
        left_thigh_cm: left_thigh_cm ?? null,
        right_thigh_cm: right_thigh_cm ?? null,
        left_calf_cm: left_calf_cm ?? null,
        right_calf_cm: right_calf_cm ?? null,
        weight_kg: weight_kg ?? null,
        notes: notes ?? null,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error("[POST /api/measurements]", error)
    return errorResponse("Failed to create body measurement", 500)
  }
}
