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

// --- GET: Search food catalog ---

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClientServer()
    const userId = await getAuthUserId(supabase)
    if (!userId) return errorResponse("Unauthorized", 401)

    const { searchParams } = request.nextUrl
    const query = searchParams.get("q")?.trim()
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "10", 10) || 10, 1), 50)

    if (!query || query.length < 1) {
      return errorResponse("Query parameter 'q' is required", 400)
    }

    const { data, error } = await supabase
      .rpc("get_food_suggestions", {
        p_user_id: userId,
        p_query: query,
        p_limit: limit,
      })

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error("[GET /api/food/search]", error)
    return errorResponse("Failed to search food catalog", 500)
  }
}
