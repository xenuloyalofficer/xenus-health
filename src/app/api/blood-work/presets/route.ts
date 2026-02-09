import { createClientServer } from "@/lib/db/server"
import { NextResponse } from "next/server"

// --- Helpers ---

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

async function getAuthUserId(supabase: Awaited<ReturnType<typeof createClientServer>>) {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return user.id
}

// --- GET: List all marker presets (global, no user filter) ---

export async function GET() {
  try {
    const supabase = await createClientServer()
    const userId = await getAuthUserId(supabase)
    if (!userId) return errorResponse("Unauthorized", 401)

    const { data, error } = await supabase
      .from("blood_work_marker_presets")
      .select("*")
      .order("category", { ascending: true })
      .order("sort_order", { ascending: true })

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error("[GET /api/blood-work/presets]", error)
    return errorResponse("Failed to fetch marker presets", 500)
  }
}
