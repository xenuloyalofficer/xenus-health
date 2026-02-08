import { createClientServer } from "@/lib/db/client"
import { NextRequest, NextResponse } from "next/server"

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

async function getAuthUserId(supabase: Awaited<ReturnType<typeof createClientServer>>) {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return user.id
}

// --- GET: Get daily summary ---

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClientServer()
    const userId = await getAuthUserId(supabase)
    if (!userId) return errorResponse("Unauthorized", 401)

    const { searchParams } = request.nextUrl
    const date = searchParams.get("date") || new Date().toISOString().slice(0, 10)

    const { data, error } = await supabase
      .rpc("get_daily_summary", {
        p_user_id: userId,
        p_date: date,
      })

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error("[GET /api/daily-summary]", error)
    return errorResponse("Failed to fetch daily summary", 500)
  }
}
