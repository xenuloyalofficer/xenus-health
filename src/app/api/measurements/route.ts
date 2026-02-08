import { createClientServer } from "@/lib/db/client"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod/v4"

// --- Validation ---

const measurementEntrySchema = z.object({
  measurement_date: z.iso.date({ message: "measurement_date must be an ISO 8601 date (YYYY-MM-DD)" }),
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

// --- POST: Create a body measurement entry ---

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClientServer()
    const userId = await getAuthUserId(supabase)
    if (!userId) return errorResponse("Unauthorized", 401)

    const body = await request.json()
    const parsed = measurementEntrySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      )
    }

    const {
      measurement_date,
      neck_cm, chest_cm,
      left_arm_cm, right_arm_cm,
      waist_cm, hips_cm,
      left_thigh_cm, right_thigh_cm,
      left_calf_cm, right_calf_cm,
      weight_kg, notes,
    } = parsed.data

    const { data, error } = await supabase
      .from("body_measurement_entry")
      .insert({
        user_id: userId,
        measurement_date,
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
    return errorResponse("Failed to create body measurement entry", 500)
  }
}
