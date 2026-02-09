import { createClientServer } from "@/lib/db/client"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod/v4"

const saveSchema = z.object({
  name: z.string().min(1).max(500),
  name_normalized: z.string().min(1).max(500),
  source: z.enum(["user", "usda", "openfoodfacts"]),
  source_id: z.string().optional(),
  barcode: z.string().optional(),
  default_portion_g: z.number().positive().optional(),
  per_100g: z.record(z.string(), z.unknown()),
})

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

async function getAuthUserId(supabase: Awaited<ReturnType<typeof createClientServer>>) {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return user.id
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClientServer()
    const userId = await getAuthUserId(supabase)
    if (!userId) return errorResponse("Unauthorized", 401)

    const body = await request.json()
    const parsed = saveSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      )
    }

    const { name, name_normalized, source, source_id, barcode, default_portion_g, per_100g } = parsed.data

    // Check if already exists for this user + source + source_id
    if (source_id) {
      const { data: existing } = await supabase
        .from("food_catalog")
        .select("id")
        .eq("user_id", userId)
        .eq("source", source)
        .eq("source_id", source_id)
        .maybeSingle()

      if (existing) {
        return NextResponse.json({ data: existing })
      }
    }

    const { data, error } = await supabase
      .from("food_catalog")
      .insert({
        user_id: userId,
        name,
        name_normalized,
        source,
        source_id: source_id ?? null,
        barcode: barcode ?? null,
        default_portion_g: default_portion_g ?? 100,
        per_100g,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error("[POST /api/nutrition/save]", error)
    return errorResponse("Failed to save food to catalog", 500)
  }
}
