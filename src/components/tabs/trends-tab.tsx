"use client";

import { useState, useEffect } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, AreaChart,
  ReferenceLine, Cell,
} from "recharts";
import {
  TrendingUp, TrendingDown, Minus, Moon, Dumbbell, Utensils, Zap, Scale, Activity, Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CircularProgress } from "@/components/ui/circular-progress";
import { cn } from "@/lib/utils";

interface WeightEntry {
  weight_kg: number;
  logged_at: string;
}

interface SleepEntry {
  date: string;
  duration_hours: number | null;
  quality: number | null;
}

interface NutritionDay {
  date: string;
  calories: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
}

interface ExerciseEntry {
  date: string;
  type: string;
  duration_minutes: number;
}

interface MoodEntry {
  date: string;
  energy: number;
  mood: number;
}

interface TrendsData {
  weight: WeightEntry[];
  sleep: SleepEntry[];
  nutrition: NutritionDay[];
  exercise: ExerciseEntry[];
  mood: MoodEntry[];
}

type TimeRange = 7 | 14 | 30;

function formatDateShort(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  subtext, 
  trend,
  color = "blue"
}: { 
  icon: typeof TrendingUp;
  label: string;
  value: string;
  subtext?: string;
  trend?: "up" | "down" | "neutral";
  color?: "blue" | "green" | "purple" | "orange" | "red";
}) {
  const colors = {
    blue: "bg-blue-500",
    green: "bg-green-500",
    purple: "bg-purple-500",
    orange: "bg-orange-500",
    red: "bg-red-500",
  };

  return (
    <div className="bg-card rounded-2xl border-2 border-foreground/5 p-4 shadow-[3px_3px_0px_0px_rgba(15,15,15,0.05)]">
      <div className="flex items-start justify-between">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", colors[color])}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        {trend && (
          <div className={cn(
            "flex items-center gap-1 text-xs font-bold",
            trend === "up" ? "text-green-600" : trend === "down" ? "text-red-600" : "text-gray-500"
          )}>
            {trend === "up" && <TrendingUp className="w-3 h-3" />}
            {trend === "down" && <TrendingDown className="w-3 h-3" />}
            {trend === "neutral" && <Minus className="w-3 h-3" />}
          </div>
        )}
      </div>
      <div className="mt-3">
        <p className="text-2xl font-bold tabular-nums">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
        {subtext && <p className="text-xs text-muted-foreground mt-1">{subtext}</p>}
      </div>
    </div>
  );
}

function CorrelationCard({
  icon: Icon,
  title,
  detail,
  type,
}: {
  icon: typeof TrendingUp;
  title: string;
  detail: string;
  type: "positive" | "warning" | "info";
}) {
  const colors = {
    positive: "border-green-200 bg-green-50/50 text-green-800",
    warning: "border-orange-200 bg-orange-50/50 text-orange-800",
    info: "border-blue-200 bg-blue-50/50 text-blue-800",
  };
  return (
    <div className={cn("flex items-start gap-3 p-4 rounded-2xl border-2", colors[type])}>
      <Icon className="h-5 w-5 mt-0.5 shrink-0" />
      <div>
        <p className="font-bold text-sm">{title}</p>
        <p className="text-xs opacity-80">{detail}</p>
      </div>
    </div>
  );
}

export function TrendsTab() {
  const [data, setData] = useState<TrendsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<TimeRange>(14);

  useEffect(() => {
    async function fetchTrends() {
      setLoading(true);
      try {
        const res = await fetch(`/api/trends?days=${range}`);
        if (res.ok) {
          const json = await res.json();
          setData(json.data);
        }
      } catch (err) {
        console.error("Failed to fetch trends:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchTrends();
  }, [range]);

  // Calculate stats
  const avgSleep = data?.sleep?.length 
    ? (data.sleep.reduce((acc, s) => acc + (s.duration_hours || 0), 0) / data.sleep.length).toFixed(1)
    : null;
  const totalExercise = data?.exercise?.length
    ? data.exercise.reduce((acc, e) => acc + e.duration_minutes, 0)
    : 0;
  const avgCalories = data?.nutrition?.length
    ? Math.round(data.nutrition.reduce((acc, n) => acc + n.calories, 0) / data.nutrition.length)
    : null;
  const avgMood = data?.mood?.length
    ? (data.mood.reduce((acc, m) => acc + m.mood, 0) / data.mood.length).toFixed(1)
    : null;

  // Compute correlations
  const correlations: { icon: typeof TrendingUp; title: string; detail: string; type: "positive" | "warning" | "info" }[] = [];

  if (data) {
    if (data.sleep.length >= 3 && data.exercise.length >= 2) {
      const exerciseDays = new Set(data.exercise.map((e) => e.date));
      const sleepOnExDays = data.sleep.filter((s) => exerciseDays.has(s.date) && s.duration_hours);
      const sleepOnRestDays = data.sleep.filter((s) => !exerciseDays.has(s.date) && s.duration_hours);
      if (sleepOnExDays.length >= 2 && sleepOnRestDays.length >= 2) {
        const avgEx = sleepOnExDays.reduce((s, e) => s + (e.duration_hours || 0), 0) / sleepOnExDays.length;
        const avgRest = sleepOnRestDays.reduce((s, e) => s + (e.duration_hours || 0), 0) / sleepOnRestDays.length;
        const diff = avgEx - avgRest;
        if (Math.abs(diff) >= 0.3) {
          correlations.push({
            icon: diff > 0 ? TrendingUp : TrendingDown,
            title: "Sleep vs Exercise",
            detail: `You sleep ${Math.abs(diff).toFixed(1)}h ${diff > 0 ? "more" : "less"} on exercise days`,
            type: diff > 0 ? "positive" : "info",
          });
        }
      }
    }

    if (data.weight.length >= 3) {
      const first = data.weight[0].weight_kg;
      const last = data.weight[data.weight.length - 1].weight_kg;
      const diff = last - first;
      if (Math.abs(diff) >= 0.3) {
        correlations.push({
          icon: diff > 0 ? TrendingUp : TrendingDown,
          title: `Weight ${diff > 0 ? "up" : "down"}`,
          detail: `${diff > 0 ? "+" : ""}${diff.toFixed(1)} kg over ${range} days`,
          type: diff < 0 ? "positive" : "warning",
        });
      }
    }
  }

  // Exercise streak
  const exerciseStreak = (() => {
    if (!data?.exercise?.length) return 0;
    const exerciseDates = new Set(data.exercise.map((e) => e.date));
    let streak = 0;
    const d = new Date();
    d.setDate(d.getDate() - 1); // start from yesterday
    while (true) {
      const dateStr = d.toISOString().slice(0, 10);
      if (exerciseDates.has(dateStr)) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    }
    // Check today too
    if (exerciseDates.has(new Date().toISOString().slice(0, 10))) streak++;
    return streak;
  })();

  const hasNoData = data &&
    data.weight.length === 0 &&
    data.sleep.length === 0 &&
    data.nutrition.length === 0 &&
    data.exercise.length === 0 &&
    data.mood.length === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Trends</h1>
        <div className="flex gap-1 bg-secondary rounded-full p-1">
          {([7, 14, 30] as TimeRange[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-bold transition-all",
                range === r ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {r}d
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-3xl" />
          <Skeleton className="h-48 w-full rounded-3xl" />
          <Skeleton className="h-48 w-full rounded-3xl" />
        </div>
      )}

      {hasNoData && !loading && (
        <div className="bg-card rounded-3xl border-2 border-foreground/5 p-12 text-center shadow-[4px_4px_0px_0px_rgba(15,15,15,0.05)]">
          <TrendingUp className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <p className="font-bold text-xl">No trend data yet</p>
          <p className="text-muted-foreground mt-2">Start logging your health data and your trends will appear here.</p>
        </div>
      )}

      {!loading && data && !hasNoData && (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            {avgSleep && (
              <StatCard
                icon={Moon}
                label="Avg Sleep"
                value={`${avgSleep}h`}
                color="purple"
              />
            )}
            {totalExercise > 0 && (
              <StatCard
                icon={Dumbbell}
                label="Exercise"
                value={`${totalExercise}m`}
                subtext={`${data.exercise.length} sessions`}
                color="green"
              />
            )}
            {avgCalories && (
              <StatCard
                icon={Utensils}
                label="Avg Calories"
                value={avgCalories.toLocaleString()}
                color="orange"
              />
            )}
            {avgMood && (
              <StatCard
                icon={Zap}
                label="Avg Mood"
                value={avgMood}
                subtext="out of 5"
                color="blue"
              />
            )}
          </div>

          {/* Weight Chart */}
          {data.weight.length < 2 && (
            <div className="bg-card rounded-3xl border-2 border-foreground/5 p-5 shadow-[4px_4px_0px_0px_rgba(15,15,15,0.05)]">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center"><Scale className="w-5 h-5 text-white" /></div>
                <h3 className="font-bold">Weight</h3>
              </div>
              <p className="text-sm text-muted-foreground text-center py-6">Log at least 2 weights to see your trend</p>
            </div>
          )}
          {data.weight.length >= 2 && (
            <div className="bg-card rounded-3xl border-2 border-foreground/5 p-5 shadow-[4px_4px_0px_0px_rgba(15,15,15,0.05)]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center">
                    <Scale className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold">Weight</h3>
                    <p className="text-xs text-muted-foreground">{data.weight.length} entries</p>
                  </div>
                </div>
              </div>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.weight} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                    <XAxis
                      dataKey="logged_at"
                      tickFormatter={formatDateShort}
                      tick={{ fontSize: 11, fill: "#888" }}
                      axisLine={false}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      domain={["dataMin - 0.5", "dataMax + 0.5"]}
                      tick={{ fontSize: 11, fill: "#888" }}
                      axisLine={false}
                      tickLine={false}
                      width={40}
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}
                      formatter={(value) => [`${value} kg`, "Weight"]}
                      labelFormatter={(label) => formatDateShort(String(label))}
                    />
                    <Area
                      type="monotone"
                      dataKey="weight_kg"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      fill="url(#weightGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Sleep Chart */}
          {data.sleep.length < 2 && (
            <div className="bg-card rounded-3xl border-2 border-foreground/5 p-5 shadow-[4px_4px_0px_0px_rgba(15,15,15,0.05)]">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500 flex items-center justify-center"><Moon className="w-5 h-5 text-white" /></div>
                <h3 className="font-bold">Sleep Duration</h3>
              </div>
              <p className="text-sm text-muted-foreground text-center py-6">Start tracking sleep to see patterns</p>
            </div>
          )}
          {data.sleep.length >= 2 && (
            <div className="bg-card rounded-3xl border-2 border-foreground/5 p-5 shadow-[4px_4px_0px_0px_rgba(15,15,15,0.05)]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-purple-500 flex items-center justify-center">
                    <Moon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold">Sleep Duration</h3>
                    <p className="text-xs text-muted-foreground">{data.sleep.length} nights</p>
                  </div>
                </div>
              </div>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.sleep} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDateShort}
                      tick={{ fontSize: 11, fill: "#888" }}
                      axisLine={false}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis tick={{ fontSize: 11, fill: "#888" }} axisLine={false} tickLine={false} width={30} />
                    <Tooltip
                      contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}
                      formatter={(value) => [`${value}h`, "Sleep"]}
                      labelFormatter={(label) => formatDateShort(String(label))}
                    />
                    <Bar dataKey="duration_hours" radius={[6, 6, 0, 0]}>
                      {data.sleep.map((entry, idx) => {
                        const h = entry.duration_hours || 0;
                        const color = h < 6 ? "#ef4444" : h < 7 ? "#eab308" : h <= 9 ? "#22c55e" : "#8b5cf6";
                        return <Cell key={idx} fill={color} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Nutrition Chart */}
          {data.nutrition.length < 2 && (
            <div className="bg-card rounded-3xl border-2 border-foreground/5 p-5 shadow-[4px_4px_0px_0px_rgba(15,15,15,0.05)]">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center"><Utensils className="w-5 h-5 text-white" /></div>
                <h3 className="font-bold">Nutrition</h3>
              </div>
              <p className="text-sm text-muted-foreground text-center py-6">Log food to track your nutrition</p>
            </div>
          )}
          {data.nutrition.length >= 2 && (
            <div className="bg-card rounded-3xl border-2 border-foreground/5 p-5 shadow-[4px_4px_0px_0px_rgba(15,15,15,0.05)]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center">
                    <Utensils className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold">Nutrition</h3>
                    <p className="text-xs text-muted-foreground">{data.nutrition.length} days</p>
                  </div>
                </div>
              </div>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.nutrition} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDateShort}
                      tick={{ fontSize: 11, fill: "#888" }}
                      axisLine={false}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis tick={{ fontSize: 11, fill: "#888" }} axisLine={false} tickLine={false} width={40} />
                    <Tooltip
                      contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}
                      labelFormatter={(label) => formatDateShort(String(label))}
                    />
                    <Bar dataKey="protein_g" stackId="macros" fill="#22c55e" name="Protein" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="fat_g" stackId="macros" fill="#f59e0b" name="Fat" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="carbs_g" stackId="macros" fill="#3b82f6" name="Carbs" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-6 mt-3 text-xs">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#22c55e]" />Protein</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#f59e0b]" />Fat</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#3b82f6]" />Carbs</span>
              </div>
            </div>
          )}

          {/* Exercise Chart */}
          {data.exercise.length < 2 && (
            <div className="bg-card rounded-3xl border-2 border-foreground/5 p-5 shadow-[4px_4px_0px_0px_rgba(15,15,15,0.05)]">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center"><Dumbbell className="w-5 h-5 text-white" /></div>
                <h3 className="font-bold">Exercise</h3>
              </div>
              <p className="text-sm text-muted-foreground text-center py-6">Complete your first workout to start tracking</p>
            </div>
          )}
          {data.exercise.length >= 2 && (
            <div className="bg-card rounded-3xl border-2 border-foreground/5 p-5 shadow-[4px_4px_0px_0px_rgba(15,15,15,0.05)]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center">
                    <Dumbbell className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold">Exercise</h3>
                    <p className="text-xs text-muted-foreground">
                      {data.exercise.length} sessions
                      {exerciseStreak > 0 && <> · {exerciseStreak} day streak</>}
                    </p>
                  </div>
                </div>
              </div>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.exercise} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDateShort}
                      tick={{ fontSize: 11, fill: "#888" }}
                      axisLine={false}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis tick={{ fontSize: 11, fill: "#888" }} axisLine={false} tickLine={false} width={30} />
                    <Tooltip
                      contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}
                      formatter={(value) => [`${value} min`, "Duration"]}
                      labelFormatter={(label) => formatDateShort(String(label))}
                    />
                    <Bar
                      dataKey="duration_minutes"
                      fill="#22c55e"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Mood/Energy Chart */}
          {data.mood.length < 2 && (
            <div className="bg-card rounded-3xl border-2 border-foreground/5 p-5 shadow-[4px_4px_0px_0px_rgba(15,15,15,0.05)]">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 rounded-xl bg-yellow-500 flex items-center justify-center"><Zap className="w-5 h-5 text-white" /></div>
                <h3 className="font-bold">Energy & Mood</h3>
              </div>
              <p className="text-sm text-muted-foreground text-center py-6">Log your mood to discover patterns</p>
            </div>
          )}
          {data.mood.length >= 2 && (
            <div className="bg-card rounded-3xl border-2 border-foreground/5 p-5 shadow-[4px_4px_0px_0px_rgba(15,15,15,0.05)]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-yellow-500 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold">Energy & Mood</h3>
                    <p className="text-xs text-muted-foreground">{data.mood.length} entries</p>
                  </div>
                </div>
              </div>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.mood} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDateShort}
                      tick={{ fontSize: 11, fill: "#888" }}
                      axisLine={false}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis domain={[1, 5]} tick={{ fontSize: 11, fill: "#888" }} axisLine={false} tickLine={false} width={20} />
                    <Tooltip
                      contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}
                      labelFormatter={(label) => formatDateShort(String(label))}
                    />
                    <Line
                      type="monotone"
                      dataKey="energy"
                      stroke="#f59e0b"
                      strokeWidth={3}
                      dot={{ r: 4, fill: "#f59e0b", strokeWidth: 2, stroke: "#fff" }}
                      name="Energy"
                    />
                    <Line
                      type="monotone"
                      dataKey="mood"
                      stroke="#8b5cf6"
                      strokeWidth={3}
                      dot={{ r: 4, fill: "#8b5cf6", strokeWidth: 2, stroke: "#fff" }}
                      name="Mood"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-6 mt-3 text-xs">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#f59e0b]" />Energy</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#8b5cf6]" />Mood</span>
              </div>
            </div>
          )}

          {/* Correlations */}
          {correlations.length > 0 && (
            <div>
              <h3 className="font-bold text-lg mb-3">Insights</h3>
              <div className="space-y-3">
                {correlations.map((c, i) => (
                  <CorrelationCard key={i} {...c} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
