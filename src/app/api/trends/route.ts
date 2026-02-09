import { createClientServer } from "@/lib/db/server"
import { NextRequest, NextResponse } from "next/server"

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

async function getAuthUserId(supabase: Awaited<ReturnType<typeof createClientServer>>) {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return user.id
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClientServer()
    const userId = await getAuthUserId(supabase)
    if (!userId) return errorResponse("Unauthorized", 401)

    const { searchParams } = request.nextUrl
    const type = searchParams.get("type") || "all"
    const daysParam = searchParams.get("days")
    const days = daysParam ? parseInt(daysParam, 10) : 30

    const since = new Date()
    since.setDate(since.getDate() - days)
    const sinceStr = since.toISOString().slice(0, 10)

    const result: Record<string, unknown> = {}

    if (type === "all" || type === "weight") {
      const { data } = await supabase
        .from("weight_entries")
        .select("weight_kg, logged_at")
        .eq("user_id", userId)
        .gte("logged_at", sinceStr)
        .order("logged_at", { ascending: true })
      result.weight = data || []
    }

    if (type === "all" || type === "sleep") {
      const { data } = await supabase
        .from("sleep_entries")
        .select("sleep_start, sleep_end, duration_minutes, quality_rating")
        .eq("user_id", userId)
        .gte("sleep_start", since.toISOString())
        .not("duration_minutes", "is", null)
        .order("sleep_start", { ascending: true })
      result.sleep = (data || []).map((s) => ({
        date: s.sleep_start?.slice(0, 10),
        duration_hours: s.duration_minutes ? +(s.duration_minutes / 60).toFixed(1) : null,
        quality: s.quality_rating,
      }))
    }

    if (type === "all" || type === "nutrition") {
      const { data } = await supabase
        .from("food_entries")
        .select("logged_at, nutrition_snapshot")
        .eq("user_id", userId)
        .gte("logged_at", since.toISOString())
        .order("logged_at", { ascending: true })

      // Aggregate by day
      const byDay: Record<string, { calories: number; protein_g: number; fat_g: number; carbs_g: number }> = {}
      for (const entry of data || []) {
        const day = entry.logged_at?.slice(0, 10)
        if (!day) continue
        const snap = entry.nutrition_snapshot as Record<string, number> | null
        if (!snap) continue
        if (!byDay[day]) byDay[day] = { calories: 0, protein_g: 0, fat_g: 0, carbs_g: 0 }
        byDay[day].calories += snap.calories || 0
        byDay[day].protein_g += snap.protein_g || 0
        byDay[day].fat_g += snap.fat_g || 0
        byDay[day].carbs_g += snap.carbs_g || 0
      }
      result.nutrition = Object.entries(byDay).map(([date, totals]) => ({
        date,
        ...totals,
        calories: Math.round(totals.calories),
        protein_g: Math.round(totals.protein_g),
        fat_g: Math.round(totals.fat_g),
        carbs_g: Math.round(totals.carbs_g),
      }))
    }

    if (type === "all" || type === "exercise") {
      const { data } = await supabase
        .from("exercise_sessions")
        .select("exercise_type, started_at, duration_minutes, calories_burned")
        .eq("user_id", userId)
        .gte("started_at", since.toISOString())
        .not("duration_minutes", "is", null)
        .order("started_at", { ascending: true })
      result.exercise = (data || []).map((e) => ({
        date: e.started_at?.slice(0, 10),
        type: e.exercise_type,
        duration_minutes: e.duration_minutes,
        calories_burned: e.calories_burned,
      }))
    }

    if (type === "all" || type === "mood") {
      const { data } = await supabase
        .from("mood_entries")
        .select("energy_level, mood_level, logged_at")
        .eq("user_id", userId)
        .gte("logged_at", since.toISOString())
        .order("logged_at", { ascending: true })
      result.mood = (data || []).map((m) => ({
        date: m.logged_at?.slice(0, 10),
        energy: m.energy_level,
        mood: m.mood_level,
      }))
    }

    if (type === "all" || type === "water") {
      const { data } = await supabase
        .from("water_entries")
        .select("amount_ml, logged_at")
        .eq("user_id", userId)
        .gte("logged_at", since.toISOString())
        .order("logged_at", { ascending: true })

      // Aggregate by day
      const byDay: Record<string, number> = {}
      for (const entry of data || []) {
        const day = entry.logged_at?.slice(0, 10)
        if (!day) continue
        byDay[day] = (byDay[day] || 0) + entry.amount_ml
      }
      result.water = Object.entries(byDay).map(([date, total_ml]) => ({
        date,
        total_ml,
      }))
    }

    return NextResponse.json({ data: result })
  } catch (error) {
    console.error("[GET /api/trends]", error)
    return errorResponse("Failed to fetch trends", 500)
  }
}
