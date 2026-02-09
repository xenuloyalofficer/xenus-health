"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Activity, Moon, Dumbbell, Utensils, Pill, Zap, Ruler,
  ChevronRight, Clock, TrendingUp, TrendingDown, Minus, Flame,
  ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CircularProgress } from "@/components/ui/circular-progress";
import { MetricCard } from "@/components/ui/metric-card";
import { SwipeableCard } from "@/components/ui/swipeable-card";
import { getGreeting, getTimeOfDay } from "@/lib/time-awareness";
import { cn } from "@/lib/utils";
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
  const [showAllTrends, setShowAllTrends] = useState(false)

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

  // Calculate real momentum score per Prompt 11 formula
  const momentumScore = (() => {
    // Step 1: Today's completion (40% weight)
    const todayPct = completionPct

    // Step 2: 7-day average (40% weight)
    const momentumHistory = trends?.momentum || []
    let avg7d = todayPct // fallback if no history
    if (momentumHistory.length > 0) {
      const last7 = momentumHistory.slice(-7)
      avg7d = last7.reduce((sum, m) => sum + m.momentum_score, 0) / last7.length
    }

    // Step 3: Streak bonus (20% weight)
    // Count consecutive days (backward from yesterday) where score > 40%
    let streakDays = 0
    if (momentumHistory.length > 0) {
      // Sort by date descending, skip today
      const todayStr = new Date().toISOString().slice(0, 10)
      const sorted = [...momentumHistory]
        .filter((m) => m.date !== todayStr)
        .sort((a, b) => b.date.localeCompare(a.date))

      for (const m of sorted) {
        if (m.momentum_score > 40) {
          streakDays++
        } else {
          break
        }
      }
    }
    // Include today if it's above 40%
    if (todayPct > 40) streakDays++
    const streakBonus = Math.min(streakDays * 15, 100)

    // Final score
    const score = (todayPct * 0.4) + (avg7d * 0.4) + (streakBonus * 0.2)
    return Math.round(Math.min(100, Math.max(0, score)))
  })()

  // Determine next action based on time of day
  const nextAction = checklistItems.find((item) => {
    if (item.status === "logged") return false
    if (item.status === "optional" && item.id !== "measurements") return false
    if (timeOfDay === "morning" && ["sleep", "meds", "weight", "food"].includes(item.id)) return true
    if (timeOfDay === "afternoon" && ["food", "exercise", "energy"].includes(item.id)) return true
    if (timeOfDay === "evening" && ["food", "measurements", "energy"].includes(item.id)) return true
    if (timeOfDay === "night" && ["sleep", "energy"].includes(item.id)) return true
    return true
  })

  // Calculate metrics for grid
  const sleepValue = summary?.sleep
    ? `${Math.floor(summary.sleep.duration_minutes / 60)}h ${Math.round(summary.sleep.duration_minutes % 60)}m`
    : "--"
  const weightValue = summary?.weight
    ? `${summary.weight.weight_kg}kg`
    : "--"
  const exerciseValue = summary?.exercise?.length
    ? `${summary.exercise.reduce((acc, ex) => acc + ex.duration_minutes, 0)}m`
    : "--"
  const caloriesValue = summary?.food?.totals?.calories
    ? Math.round(summary.food.totals.calories).toLocaleString()
    : "--"

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-fade-in-up stagger-1">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{greeting}</h1>
        <p className="text-muted-foreground font-medium mt-1">{format(today, "EEEE, MMMM do")}</p>
      </div>

      {/* Momentum Score - Large Circular Gauge */}
      <div className="flex justify-center animate-fade-in-up stagger-2">
        <div className="relative">
          <CircularProgress
            value={momentumScore}
            size={200}
            strokeWidth={16}
            color={
              momentumScore <= 20 ? "#9ca3af" :
              momentumScore <= 40 ? "#ef4444" :
              momentumScore <= 60 ? "#f97316" :
              momentumScore <= 80 ? "#eab308" :
              "#DFFF00"
            }
            trackColor="rgba(0, 0, 0, 0.05)"
          >
            <div className="text-center">
              <p className="text-5xl font-bold tracking-tight tabular-nums">{Math.round(momentumScore)}</p>
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mt-1">Momentum</p>
              <p className="text-xs text-muted-foreground mt-0.5">of 100</p>
            </div>
          </CircularProgress>
        </div>
      </div>

      {/* Today's Summary Toggle */}
      <div className="flex items-center justify-between animate-fade-in-up stagger-3">
        <h2 className="text-xl font-bold">Today&apos;s Summary</h2>
        <button 
          onClick={() => setShowAllTrends(!showAllTrends)}
          className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          {showAllTrends ? "Less" : "More"}
          <ChevronDown className={cn("w-4 h-4 transition-transform", showAllTrends && "rotate-180")} />
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-4 animate-fade-in-up stagger-3">
        <MetricCard
          value={sleepValue}
          label="Sleep"
          icon={Moon}
          variant={summary?.sleep ? "default" : "default"}
          onClick={() => onNavigate("health")}
        />
        <MetricCard
          value={weightValue}
          label="Weight"
          icon={Activity}
          onClick={() => onNavigate("body")}
        />
        <MetricCard
          value={exerciseValue}
          label="Exercise"
          icon={Dumbbell}
          onClick={() => onNavigate("exercise")}
        />
        <MetricCard
          value={caloriesValue}
          label="Calories"
          icon={Flame}
          onClick={() => onNavigate("health")}
        />
      </div>

      {/* Next Action Card */}
      {nextAction && (
        <div className="animate-fade-in-up stagger-4">
          <div 
            onClick={() => onNavigate(nextAction.tab)}
            className="bg-primary rounded-3xl border-2 border-foreground/10 p-5 shadow-[4px_4px_0px_0px_rgba(15,15,15,0.15)] cursor-pointer transition-all hover:shadow-[6px_6px_0px_0px_rgba(15,15,15,0.2)] hover:-translate-y-0.5 active:shadow-none active:translate-y-0"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-foreground/10 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-primary-foreground/70 uppercase tracking-wider">Next Action</p>
                  <p className="text-xl font-bold text-primary-foreground">{nextAction.label}</p>
                  <p className="text-sm text-primary-foreground/80">
                    {nextAction.detail || "Tap to get started"}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-6 h-6 text-primary-foreground" />
            </div>
          </div>
        </div>
      )}

      {!nextAction && !loading && (
        <div className="animate-fade-in-up stagger-4">
          <div className="bg-green-500 rounded-3xl border-2 border-foreground/10 p-5 shadow-[4px_4px_0px_0px_rgba(15,15,15,0.15)]">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-xl font-bold text-white">All done today!</p>
                <p className="text-sm text-white/80">Great work keeping up with your health.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Checklist */}
      <div className="animate-fade-in-up stagger-5">
        <h2 className="text-xl font-bold mb-4">Today&apos;s Checklist</h2>
        <div className="space-y-3">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-3xl" />
            ))
          ) : (
            checklistItems.slice(0, showAllTrends ? undefined : 5).map((item) => (
              <SwipeableCard
                key={item.id}
                icon={item.icon}
                label={item.label}
                completed={item.status === "logged"}
                skipped={false}
                onClick={() => onNavigate(item.tab)}
                onComplete={() => onNavigate(item.tab)}
              >
                {item.detail && (
                  <p className="text-sm text-muted-foreground">{item.detail}</p>
                )}
              </SwipeableCard>
            ))
          )}
        </div>
        
        {/* Completion progress */}
        <div className="mt-4 bg-card rounded-2xl border-2 border-foreground/5 p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold text-muted-foreground">Daily Completion</span>
            <span className="text-sm font-bold">{completionPct}%</span>
          </div>
          <div className="h-3 bg-secondary rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-500 rounded-full"
              style={{ width: `${completionPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Weekly Trends Preview */}
      {showAllTrends && trends && (
        <div className="animate-fade-in-up">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">This Week</h2>
            <Button variant="ghost" size="sm" onClick={() => onNavigate("trends")}>
              View All
            </Button>
          </div>
          
          <div className="space-y-3">
            {trends?.sleep && (
              <div className="bg-card rounded-2xl border-2 border-foreground/5 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-indigo-100 text-indigo-700">
                    <Moon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold">Sleep</p>
                    <p className="text-sm text-muted-foreground">
                      {trends.sleep.avg_duration_minutes
                        ? `${Math.floor(trends.sleep.avg_duration_minutes / 60)}h ${Math.round(trends.sleep.avg_duration_minutes % 60)}m avg`
                        : "No data"}
                    </p>
                  </div>
                </div>
                <TrendIcon trend={trends.sleep.trend || "stable"} />
              </div>
            )}

            {trends?.exercise && (
              <div className="bg-card rounded-2xl border-2 border-foreground/5 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700">
                    <Dumbbell className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold">Exercise</p>
                    <p className="text-sm text-muted-foreground">
                      {trends.exercise.sessions_count} sessions, {trends.exercise.active_days} active days
                    </p>
                  </div>
                </div>
              </div>
            )}

            {trends?.weight && trends.weight.length > 0 && (
              <div className="bg-card rounded-2xl border-2 border-foreground/5 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-100 text-blue-700">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold">Weight</p>
                    <p className="text-sm text-muted-foreground">
                      Latest: {trends.weight[trends.weight.length - 1].weight_kg} kg
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Momentum Trend Mini Chart */}
          {trends?.momentum && trends.momentum.length > 1 && (
            <div className="mt-4 bg-card rounded-2xl border-2 border-foreground/5 p-4">
              <p className="font-semibold mb-3">Momentum Trend</p>
              <div className="flex items-end gap-1 h-16">
                {trends.momentum.map((m) => (
                  <div
                    key={m.date}
                    className="flex-1 rounded-t-md transition-all"
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
            </div>
          )}
        </div>
      )}
    </div>
  );
}
