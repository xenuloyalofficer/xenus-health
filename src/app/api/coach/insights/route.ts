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

    const supabase = await createClientServer()

    const now = new Date()
    const thirtyDaysAgo = new Date(now)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const fourteenDaysAgo = new Date(now)
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

    // Fetch data for analysis
    const [exerciseRes, sleepRes, weightRes, moodRes, medsRes, presetsRes] = await Promise.all([
      supabase
        .from("exercise_sessions")
        .select("exercise_type, started_at, duration_minutes")
        .eq("user_id", userId)
        .gte("started_at", thirtyDaysAgo.toISOString())
        .not("duration_minutes", "is", null)
        .order("started_at", { ascending: true }),
      supabase
        .from("sleep_entries")
        .select("sleep_start, duration_minutes, quality_rating")
        .eq("user_id", userId)
        .gte("sleep_start", thirtyDaysAgo.toISOString())
        .not("duration_minutes", "is", null)
        .order("sleep_start", { ascending: true }),
      supabase
        .from("weight_entries")
        .select("weight_kg, logged_at")
        .eq("user_id", userId)
        .gte("logged_at", thirtyDaysAgo.toISOString().slice(0, 10))
        .order("logged_at", { ascending: true }),
      supabase
        .from("mood_entries")
        .select("energy_level, mood_level, logged_at")
        .eq("user_id", userId)
        .gte("logged_at", fourteenDaysAgo.toISOString())
        .order("logged_at", { ascending: true }),
      supabase
        .from("medication_entries")
        .select("medication_name, status, logged_at")
        .eq("user_id", userId)
        .gte("logged_at", fourteenDaysAgo.toISOString()),
      supabase
        .from("medication_presets")
        .select("medication_name")
        .eq("user_id", userId)
        .eq("active", true),
    ])

    const insights: { type: string; title: string; detail: string; value?: number }[] = []

    // Exercise streaks
    const exerciseDays = new Set((exerciseRes.data || []).map((e) => e.started_at?.slice(0, 10)))
    let currentStreak = 0
    for (let d = 0; d < 30; d++) {
      const checkDate = new Date(now)
      checkDate.setDate(checkDate.getDate() - d)
      if (exerciseDays.has(checkDate.toISOString().slice(0, 10))) {
        currentStreak++
      } else if (d > 0) break
    }
    if (currentStreak >= 3) {
      insights.push({
        type: "streak",
        title: "Exercise streak",
        detail: `${currentStreak} consecutive days of exercise`,
        value: currentStreak,
      })
    }

    // Sleep averages: current week vs previous week
    const sleepData = sleepRes.data || []
    if (sleepData.length >= 4) {
      const recentSleep = sleepData.slice(-7)
      const olderSleep = sleepData.slice(0, -7)
      const avgRecent = recentSleep.reduce((s, e) => s + (e.duration_minutes || 0), 0) / recentSleep.length / 60
      if (olderSleep.length > 0) {
        const avgOlder = olderSleep.reduce((s, e) => s + (e.duration_minutes || 0), 0) / olderSleep.length / 60
        const diff = avgRecent - avgOlder
        if (Math.abs(diff) >= 0.25) {
          insights.push({
            type: diff > 0 ? "positive" : "warning",
            title: "Sleep trend",
            detail: `Average sleep ${diff > 0 ? "up" : "down"} ${Math.abs(diff).toFixed(1)} hours compared to previous period (${avgRecent.toFixed(1)}h vs ${avgOlder.toFixed(1)}h)`,
            value: +diff.toFixed(1),
          })
        }
      }
    }

    // Weight trend
    const weightData = weightRes.data || []
    if (weightData.length >= 2) {
      const first = weightData[0].weight_kg
      const last = weightData[weightData.length - 1].weight_kg
      const diff = last - first
      if (Math.abs(diff) >= 0.3) {
        insights.push({
          type: diff > 0 ? "info" : "positive",
          title: "Weight change",
          detail: `${diff > 0 ? "+" : ""}${diff.toFixed(1)} kg over ${weightData.length} entries (${first} → ${last} kg)`,
          value: +diff.toFixed(1),
        })
      }
    }

    // Medication adherence
    const totalPresets = presetsRes.data?.length || 0
    const medEntries = medsRes.data || []
    if (totalPresets > 0 && medEntries.length > 0) {
      const taken = medEntries.filter((m) => m.status === "taken").length
      const total = medEntries.length
      const rate = Math.round((taken / total) * 100)
      insights.push({
        type: rate >= 80 ? "positive" : "warning",
        title: "Medication adherence",
        detail: `${rate}% taken rate (${taken}/${total} entries over 14 days)`,
        value: rate,
      })
    }

    // Mood correlations with sleep
    const moodData = moodRes.data || []
    if (moodData.length >= 3 && sleepData.length >= 3) {
      const sleepByDate: Record<string, number> = {}
      for (const s of sleepData) {
        const d = s.sleep_start?.slice(0, 10)
        if (d && s.duration_minutes) sleepByDate[d] = s.duration_minutes / 60
      }
      const goodSleepMoods: number[] = []
      const badSleepMoods: number[] = []
      for (const m of moodData) {
        const d = m.logged_at?.slice(0, 10)
        if (!d || !sleepByDate[d]) continue
        if (sleepByDate[d] >= 7) goodSleepMoods.push(m.energy_level)
        else badSleepMoods.push(m.energy_level)
      }
      if (goodSleepMoods.length >= 2 && badSleepMoods.length >= 2) {
        const avgGood = goodSleepMoods.reduce((a, b) => a + b, 0) / goodSleepMoods.length
        const avgBad = badSleepMoods.reduce((a, b) => a + b, 0) / badSleepMoods.length
        const pctBetter = Math.round(((avgGood - avgBad) / avgBad) * 100)
        if (pctBetter > 10) {
          insights.push({
            type: "info",
            title: "Sleep-energy correlation",
            detail: `Energy is ${pctBetter}% higher on days with 7+ hours of sleep (avg ${avgGood.toFixed(1)} vs ${avgBad.toFixed(1)}/5)`,
            value: pctBetter,
          })
        }
      }
    }

    // Anomalies: unusually high or low values
    if (moodData.length >= 5) {
      const last = moodData[moodData.length - 1]
      const avgEnergy = moodData.reduce((s, m) => s + m.energy_level, 0) / moodData.length
      if (last.energy_level <= 2 && avgEnergy >= 3.5) {
        insights.push({
          type: "warning",
          title: "Energy dip",
          detail: `Latest energy (${last.energy_level}/5) is below your average (${avgEnergy.toFixed(1)}/5)`,
          value: last.energy_level,
        })
      }
    }

    return NextResponse.json({
      insights,
      summary: {
        exercise_days_30d: exerciseDays.size,
        sleep_entries_30d: sleepData.length,
        weight_entries_30d: weightData.length,
        mood_entries_14d: moodData.length,
        medication_entries_14d: medEntries.length,
      },
    })
  } catch (error) {
    console.error("[GET /api/coach/insights]", error)
    return errorResponse("Failed to compute insights", 500)
  }
}
