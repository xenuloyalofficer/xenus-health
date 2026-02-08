import { createClientServer } from "@/lib/db/client"
import { NextRequest, NextResponse } from "next/server"

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

export async function GET(request: NextRequest) {
  try {
    const apiKey = request.headers.get("x-api-key")
    if (!apiKey || apiKey !== process.env.COACH_API_KEY) {
      return errorResponse("Unauthorized", 401)
    }

    const { searchParams } = request.nextUrl
    const userId = searchParams.get("userId")
    if (!userId) return errorResponse("Missing userId", 400)

    const days = parseInt(searchParams.get("days") || "30", 10)
    const since = new Date()
    since.setDate(since.getDate() - days)
    const sinceStr = since.toISOString().slice(0, 10)

    const supabase = await createClientServer()

    // Fetch all data types in parallel
    const [weightRes, sleepRes, exerciseRes, foodRes, moodRes, medsRes] = await Promise.all([
      supabase
        .from("weight_entries")
        .select("weight_kg, logged_at")
        .eq("user_id", userId)
        .gte("logged_at", sinceStr)
        .order("logged_at", { ascending: true }),
      supabase
        .from("sleep_entries")
        .select("sleep_start, duration_minutes, quality_rating")
        .eq("user_id", userId)
        .gte("sleep_start", since.toISOString())
        .not("duration_minutes", "is", null)
        .order("sleep_start", { ascending: true }),
      supabase
        .from("exercise_sessions")
        .select("exercise_type, started_at, duration_minutes")
        .eq("user_id", userId)
        .gte("started_at", since.toISOString())
        .not("duration_minutes", "is", null)
        .order("started_at", { ascending: true }),
      supabase
        .from("food_entries")
        .select("logged_at, nutrition_snapshot, meal_type")
        .eq("user_id", userId)
        .gte("logged_at", since.toISOString())
        .order("logged_at", { ascending: true }),
      supabase
        .from("mood_entries")
        .select("energy_level, mood_level, logged_at")
        .eq("user_id", userId)
        .gte("logged_at", since.toISOString())
        .order("logged_at", { ascending: true }),
      supabase
        .from("medication_entries")
        .select("medication_name, status, logged_at")
        .eq("user_id", userId)
        .gte("logged_at", since.toISOString())
        .order("logged_at", { ascending: true }),
    ])

    // Aggregate nutrition by day
    const nutritionByDay: Record<string, { calories: number; protein_g: number; entries: number }> = {}
    for (const entry of foodRes.data || []) {
      const day = entry.logged_at?.slice(0, 10)
      if (!day) continue
      const snap = entry.nutrition_snapshot as Record<string, number> | null
      if (!nutritionByDay[day]) nutritionByDay[day] = { calories: 0, protein_g: 0, entries: 0 }
      nutritionByDay[day].entries++
      if (snap) {
        nutritionByDay[day].calories += snap.calories || 0
        nutritionByDay[day].protein_g += snap.protein_g || 0
      }
    }

    // Compact format optimized for LLM context
    const history = {
      period: `${days} days ending ${new Date().toISOString().slice(0, 10)}`,
      weight: (weightRes.data || []).map((w) => ({
        date: w.logged_at,
        kg: w.weight_kg,
      })),
      sleep: (sleepRes.data || []).map((s) => ({
        date: s.sleep_start?.slice(0, 10),
        hours: s.duration_minutes ? +(s.duration_minutes / 60).toFixed(1) : null,
        quality: s.quality_rating,
      })),
      exercise: (exerciseRes.data || []).map((e) => ({
        date: e.started_at?.slice(0, 10),
        type: e.exercise_type,
        minutes: e.duration_minutes,
      })),
      nutrition_daily: Object.entries(nutritionByDay)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, n]) => ({
          date,
          calories: Math.round(n.calories),
          protein_g: Math.round(n.protein_g),
          meals: n.entries,
        })),
      mood: (moodRes.data || []).map((m) => ({
        date: m.logged_at?.slice(0, 10),
        energy: m.energy_level,
        mood: m.mood_level,
      })),
      medications: (medsRes.data || []).map((m) => ({
        date: m.logged_at?.slice(0, 10),
        name: m.medication_name,
        status: m.status,
      })),
    }

    return NextResponse.json(history)
  } catch (error) {
    console.error("[GET /api/coach/history]", error)
    return errorResponse("Failed to fetch history", 500)
  }
}
