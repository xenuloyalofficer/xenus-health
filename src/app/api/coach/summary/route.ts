import { createClientServer } from "@/lib/db/server"
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

    const date = searchParams.get("date") || new Date().toISOString().slice(0, 10)

    const supabase = await createClientServer()
    const { data, error } = await supabase.rpc("get_daily_summary", {
      p_user_id: userId,
      p_date: date,
    })

    if (error) throw error

    // Add human-readable fields
    const summary = data as Record<string, unknown> | null
    const readable: Record<string, unknown> = { date, raw: summary }

    if (summary) {
      const sleep = summary.sleep as { duration_minutes?: number; quality_rating?: number } | null
      if (sleep?.duration_minutes) {
        const h = Math.floor(sleep.duration_minutes / 60)
        const m = Math.round(sleep.duration_minutes % 60)
        readable.sleep_readable = `${h}h ${m}m, quality ${sleep.quality_rating || "not rated"}/5`
      }

      const food = summary.food as { totals?: { calories?: number; protein_g?: number } } | null
      if (food?.totals?.calories) {
        readable.nutrition_readable = `${Math.round(food.totals.calories)} calories, ${Math.round(food.totals.protein_g || 0)}g protein`
      }

      const mood = summary.mood as { energy_level?: number; mood_level?: number } | null
      if (mood) {
        const energyLabels = ["", "exhausted", "low", "moderate", "good", "energized"]
        const moodLabels = ["", "awful", "not great", "okay", "good", "great"]
        readable.mood_readable = `Energy: ${energyLabels[mood.energy_level || 0] || mood.energy_level}/5, Mood: ${moodLabels[mood.mood_level || 0] || mood.mood_level}/5`
      }

      const exercise = summary.exercise as { type: string; duration_minutes: number }[] | null
      if (exercise && exercise.length > 0) {
        readable.exercise_readable = exercise.map((e) => `${e.type} ${e.duration_minutes}min`).join(", ")
      }

      const meds = summary.meds as { name: string; status: string }[] | null
      if (meds && meds.length > 0) {
        const taken = meds.filter((m) => m.status === "taken").length
        readable.medication_readable = `${taken}/${meds.length} medications taken`
      }
    }

    return NextResponse.json(readable)
  } catch (error) {
    console.error("[GET /api/coach/summary]", error)
    return errorResponse("Failed to fetch summary", 500)
  }
}
