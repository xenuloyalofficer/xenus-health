"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Activity, Moon, Dumbbell, Utensils, Pill, Zap, Ruler,
  ChevronRight, Clock, TrendingUp, TrendingDown, Minus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getGreeting, getTimeOfDay } from "@/lib/time-awareness";
import type { TabId } from "@/components/layout/app-shell";

interface DailySummary {
  sleep: { duration_minutes: number; quality_rating: number } | null
  weight: { weight_kg: number } | null
  exercise: { type: string; duration_minutes: number; calories_burned: number }[]
  food: { entries: unknown[]; totals: { calories: number; protein_g: number; fat_g: number; carbs_g: number } }
  meds: { name: string; status: string; time: string }[]
  mood: { energy_level: number; mood_level: number } | null
  measurements: Record<string, unknown> | null
  checklist: { completion_pct: number; momentum_score: number } | null
}

interface WeeklyTrends {
  sleep: { avg_duration_minutes: number; entries: number; trend: string } | null
  weight: { weight_kg: number; logged_at: string }[]
  exercise: { sessions_count: number; active_days: number } | null
  nutrition: { avg_calories: number; avg_protein_g: number } | null
  mood: { avg_energy: number; avg_mood: number } | null
  momentum: { date: string; momentum_score: number }[]
}

interface ChecklistItem {
  id: string
  label: string
  icon: typeof Moon
  status: "logged" | "pending" | "partial" | "optional"
  detail: string | null
  tab: TabId
}

function buildChecklist(summary: DailySummary | null): ChecklistItem[] {
  if (!summary) {
    return [
      { id: "sleep", label: "Sleep", icon: Moon, status: "pending", detail: null, tab: "health" },
      { id: "weight", label: "Weight", icon: Activity, status: "optional", detail: null, tab: "body" },
      { id: "meds", label: "Meds", icon: Pill, status: "pending", detail: null, tab: "health" },
      { id: "exercise", label: "Exercise", icon: Dumbbell, status: "pending", detail: null, tab: "exercise" },
      { id: "food", label: "Food", icon: Utensils, status: "pending", detail: null, tab: "health" },
      { id: "energy", label: "Energy/Mood", icon: Zap, status: "pending", detail: null, tab: "health" },
      { id: "measurements", label: "Measurements", icon: Ruler, status: "optional", detail: "Weekly", tab: "body" },
    ]
  }

  const sleepDuration = summary.sleep?.duration_minutes
  const sleepDetail = sleepDuration
    ? `${Math.floor(sleepDuration / 60)}h ${Math.round(sleepDuration % 60)}m`
    : null

  return [
    {
      id: "sleep", label: "Sleep", icon: Moon,
      status: summary.sleep ? "logged" : "pending",
      detail: sleepDetail,
      tab: "health",
    },
    {
      id: "weight", label: "Weight", icon: Activity,
      status: summary.weight ? "logged" : "optional",
      detail: summary.weight ? `${summary.weight.weight_kg} kg` : null,
      tab: "body",
    },
    {
      id: "meds", label: "Meds", icon: Pill,
      status: summary.meds.length > 0 ? "logged" : "pending",
      detail: summary.meds.length > 0 ? `${summary.meds.length} logged` : null,
      tab: "health",
    },
    {
      id: "exercise", label: "Exercise", icon: Dumbbell,
      status: summary.exercise.length > 0 ? "logged" : "pending",
      detail: summary.exercise.length > 0
        ? `${summary.exercise.length} session${summary.exercise.length > 1 ? "s" : ""}`
        : null,
      tab: "exercise",
    },
    {
      id: "food", label: "Food", icon: Utensils,
      status: summary.food.entries.length > 0 ? (summary.food.entries.length >= 3 ? "logged" : "partial") : "pending",
      detail: summary.food.entries.length > 0
        ? `${summary.food.entries.length} entries, ${Math.round(summary.food.totals.calories)} cal`
        : null,
      tab: "health",
    },
    {
      id: "energy", label: "Energy/Mood", icon: Zap,
      status: summary.mood ? "logged" : "pending",
      detail: summary.mood ? `Energy ${summary.mood.energy_level}/5, Mood ${summary.mood.mood_level}/5` : null,
      tab: "health",
    },
    {
      id: "measurements", label: "Measurements", icon: Ruler,
      status: summary.measurements ? "logged" : "optional",
      detail: summary.measurements ? "Logged" : "Weekly",
      tab: "body",
    },
  ]
}

function computeCompletionPct(items: ChecklistItem[]): number {
  const required = items.filter((i) => i.status !== "optional")
  if (required.length === 0) return 0
  const done = required.filter((i) => i.status === "logged" || i.status === "partial")
  return Math.round((done.length / required.length) * 100)
}

function TrendIcon({ trend }: { trend: string }) {
  if (trend === "up") return <TrendingUp className="h-4 w-4 text-green-600" />
  if (trend === "down") return <TrendingDown className="h-4 w-4 text-red-600" />
  return <Minus className="h-4 w-4 text-gray-500" />
}

interface HomeTabProps {
  onNavigate: (tab: TabId) => void;
}

export function HomeTab({ onNavigate }: HomeTabProps) {
  const [summary, setSummary] = useState<DailySummary | null>(null)
  const [trends, setTrends] = useState<WeeklyTrends | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const [summaryRes, trendsRes] = await Promise.allSettled([
          fetch("/api/daily-summary").then((r) => r.json()),
          fetch("/api/weekly-trends").then((r) => r.json()),
        ])

        if (summaryRes.status === "fulfilled" && summaryRes.value?.data) {
          setSummary(summaryRes.value.data)
        }
        if (trendsRes.status === "fulfilled" && trendsRes.value?.data) {
          setTrends(trendsRes.value.data)
        }
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const today = new Date()
  const greeting = getGreeting("Maria")
  const timeOfDay = getTimeOfDay()
  const checklistItems = buildChecklist(summary)
  const completionPct = computeCompletionPct(checklistItems)
  const momentumScore = summary?.checklist?.momentum_score ?? 0

  // Determine next action based on time of day
  const nextAction = checklistItems.find((item) => {
    if (item.status === "logged") return false
    if (item.status === "optional" && item.id !== "measurements") return false
    if (timeOfDay === "morning" && ["sleep", "meds", "weight", "food"].includes(item.id)) return true
    if (timeOfDay === "afternoon" && ["food", "exercise", "energy"].includes(item.id)) return true
    if (timeOfDay === "evening" && ["food", "measurements", "energy"].includes(item.id)) return true
    if (timeOfDay === "night" && ["sleep", "energy"].includes(item.id)) return true
    return true // fallback: first pending item
  })

  // Momentum color
  const momentumColor = momentumScore >= 71 ? "text-green-600" : momentumScore >= 51 ? "text-yellow-600" : momentumScore >= 31 ? "text-orange-600" : "text-red-600"

  return (
    <div className="space-y-6">
      {/* Greeting + Momentum */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{greeting}</h1>
          <p className="text-muted-foreground">{format(today, "EEEE, MMMM do, yyyy")}</p>
        </div>
        <Card className="p-4 min-w-[200px]">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${momentumScore >= 71 ? "bg-green-100" : momentumScore >= 51 ? "bg-yellow-100" : momentumScore >= 31 ? "bg-orange-100" : "bg-red-100"}`}>
              <Activity className={`h-5 w-5 ${momentumColor}`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Momentum</span>
                <span className={`text-sm font-bold ${momentumColor}`}>{Math.round(momentumScore)}/100</span>
              </div>
              <Progress value={momentumScore} className="h-2 mt-2" />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Checklist */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold">Today&apos;s Checklist</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {loading ? (
                Array.from({ length: 7 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))
              ) : (
                checklistItems.map((item) => {
                  const Icon = item.icon;
                  const isLogged = item.status === "logged";
                  const isOptional = item.status === "optional";
                  const isPartial = item.status === "partial";

                  return (
                    <button
                      key={item.id}
                      onClick={() => onNavigate(item.tab)}
                      className="flex items-center justify-between w-full p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded-md ${
                          isLogged ? "bg-green-100 text-green-700"
                            : isOptional ? "bg-gray-100 text-gray-500"
                            : isPartial ? "bg-amber-100 text-amber-700"
                            : "bg-blue-100 text-blue-700"
                        }`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className={`font-medium text-sm ${isLogged ? "line-through text-muted-foreground" : ""}`}>{item.label}</p>
                          {item.detail && (
                            <p className="text-xs text-muted-foreground">{item.detail}</p>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  );
                })
              )}

              <div className="pt-2">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Completion</span>
                  <span className="font-medium">{completionPct}%</span>
                </div>
                <Progress value={completionPct} className="h-2" />
              </div>
            </CardContent>
          </Card>

          {/* Next Action Card */}
          {nextAction && (
            <Card className="border-blue-200 bg-blue-50/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-100 rounded-lg">
                      <Clock className="h-5 w-5 text-blue-700" />
                    </div>
                    <div>
                      <p className="font-bold">Next: {nextAction.label}</p>
                      <p className="text-sm text-muted-foreground">
                        {nextAction.detail || "Tap to get started"}
                      </p>
                    </div>
                  </div>
                  <Button size="sm" onClick={() => onNavigate(nextAction.tab)}>
                    Go
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {!nextAction && !loading && (
            <Card className="border-green-200 bg-green-50/50">
              <CardContent className="pt-6 text-center">
                <p className="font-bold text-green-700">All done today!</p>
                <p className="text-sm text-muted-foreground">Great work keeping up with your health.</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Trends */}
        <div className="space-y-6">
          {/* Weekly Trends */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">This Week</CardTitle>
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => onNavigate("trends")}>
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <>
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </>
              ) : (
                <>
                  {/* Sleep trend */}
                  {trends?.sleep && (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-3">
                        <Moon className="h-5 w-5 text-indigo-600" />
                        <div>
                          <p className="text-sm font-medium">Sleep</p>
                          <p className="text-xs text-muted-foreground">
                            {trends.sleep.avg_duration_minutes
                              ? `${Math.floor(trends.sleep.avg_duration_minutes / 60)}h ${Math.round(trends.sleep.avg_duration_minutes % 60)}m avg`
                              : "No data"}
                          </p>
                        </div>
                      </div>
                      <TrendIcon trend={trends.sleep.trend || "stable"} />
                    </div>
                  )}

                  {/* Exercise trend */}
                  {trends?.exercise && (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-3">
                        <Dumbbell className="h-5 w-5 text-emerald-600" />
                        <div>
                          <p className="text-sm font-medium">Exercise</p>
                          <p className="text-xs text-muted-foreground">
                            {trends.exercise.sessions_count} sessions, {trends.exercise.active_days} active days
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Nutrition trend */}
                  {trends?.nutrition && trends.nutrition.avg_calories > 0 && (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-3">
                        <Utensils className="h-5 w-5 text-amber-600" />
                        <div>
                          <p className="text-sm font-medium">Nutrition</p>
                          <p className="text-xs text-muted-foreground">
                            {Math.round(trends.nutrition.avg_calories)} cal/day, {trends.nutrition.avg_protein_g}g protein
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Mood trend */}
                  {trends?.mood && trends.mood.avg_energy > 0 && (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-3">
                        <Zap className="h-5 w-5 text-yellow-600" />
                        <div>
                          <p className="text-sm font-medium">Mood/Energy</p>
                          <p className="text-xs text-muted-foreground">
                            Energy {trends.mood.avg_energy}/5, Mood {trends.mood.avg_mood}/5
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Weight trend */}
                  {trends?.weight && trends.weight.length > 0 && (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-3">
                        <Activity className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="text-sm font-medium">Weight</p>
                          <p className="text-xs text-muted-foreground">
                            Latest: {trends.weight[trends.weight.length - 1].weight_kg} kg
                            {trends.weight.length >= 2 && (
                              <> ({(trends.weight[trends.weight.length - 1].weight_kg - trends.weight[0].weight_kg) > 0 ? "+" : ""}
                              {(trends.weight[trends.weight.length - 1].weight_kg - trends.weight[0].weight_kg).toFixed(1)} kg)</>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* No trends data */}
                  {!trends?.sleep && !trends?.exercise && !trends?.nutrition?.avg_calories && (
                    <div className="text-center py-6 text-muted-foreground">
                      <p className="text-sm">Start logging to see your weekly trends here.</p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Momentum Trend */}
          {trends?.momentum && trends.momentum.length > 1 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold">Momentum Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-1 h-20">
                  {trends.momentum.map((m) => (
                    <div
                      key={m.date}
                      className="flex-1 rounded-t-sm"
                      style={{
                        height: `${Math.max(m.momentum_score, 5)}%`,
                        backgroundColor: m.momentum_score >= 71 ? "#22c55e" : m.momentum_score >= 51 ? "#eab308" : m.momentum_score >= 31 ? "#f97316" : "#ef4444",
                      }}
                      title={`${m.date}: ${Math.round(m.momentum_score)}`}
                    />
                  ))}
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>{trends.momentum[0]?.date?.slice(5)}</span>
                  <span>{trends.momentum[trends.momentum.length - 1]?.date?.slice(5)}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
