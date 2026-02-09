import { createClientServer } from "@/lib/db/server"
import { NextResponse } from "next/server"

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

async function getAuthUserId(supabase: Awaited<ReturnType<typeof createClientServer>>) {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return user.id
}

// --- GET: Get weekly trends ---

export async function GET() {
  try {
    const supabase = await createClientServer()
    const userId = await getAuthUserId(supabase)
    if (!userId) return errorResponse("Unauthorized", 401)

    const { data, error } = await supabase
      .rpc("get_weekly_trends", {
        p_user_id: userId,
      })

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error("[GET /api/weekly-trends]", error)
    return errorResponse("Failed to fetch weekly trends", 500)
  }
}
