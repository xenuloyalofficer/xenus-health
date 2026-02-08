"use client";

import { useState, useEffect } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  TrendingUp, TrendingDown, Minus, Moon, Dumbbell, Utensils, Zap, Scale,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

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
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${colors[type]}`}>
      <Icon className="h-5 w-5 mt-0.5 shrink-0" />
      <div>
        <p className="font-medium text-sm">{title}</p>
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

  // Compute correlations client-side
  const correlations: { icon: typeof TrendingUp; title: string; detail: string; type: "positive" | "warning" | "info" }[] = [];

  if (data) {
    // Sleep vs Exercise correlation
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
            detail: `You sleep ${Math.abs(diff).toFixed(1)}h ${diff > 0 ? "more" : "less"} on exercise days (${avgEx.toFixed(1)}h vs ${avgRest.toFixed(1)}h)`,
            type: diff > 0 ? "positive" : "info",
          });
        }
      }
    }

    // Mood vs Sleep
    if (data.mood.length >= 3 && data.sleep.length >= 3) {
      const sleepByDate: Record<string, number> = {};
      data.sleep.forEach((s) => {
        if (s.duration_hours) sleepByDate[s.date] = s.duration_hours;
      });
      const goodSleep: number[] = [];
      const badSleep: number[] = [];
      data.mood.forEach((m) => {
        const sh = sleepByDate[m.date];
        if (sh === undefined) return;
        if (sh >= 7) goodSleep.push(m.energy);
        else badSleep.push(m.energy);
      });
      if (goodSleep.length >= 2 && badSleep.length >= 1) {
        const avgGood = goodSleep.reduce((a, b) => a + b, 0) / goodSleep.length;
        const avgBad = badSleep.reduce((a, b) => a + b, 0) / badSleep.length;
        const pct = Math.round(((avgGood - avgBad) / Math.max(avgBad, 1)) * 100);
        if (pct > 10) {
          correlations.push({
            icon: TrendingUp,
            title: "Mood vs Sleep",
            detail: `Energy is ${pct}% higher on days with 7+ hours of sleep`,
            type: "positive",
          });
        }
      }
    }

    // Weight trend
    if (data.weight.length >= 3) {
      const first = data.weight[0].weight_kg;
      const last = data.weight[data.weight.length - 1].weight_kg;
      const diff = last - first;
      if (Math.abs(diff) >= 0.3) {
        correlations.push({
          icon: diff > 0 ? TrendingUp : TrendingDown,
          title: `Weight ${diff > 0 ? "up" : "down"}`,
          detail: `${diff > 0 ? "+" : ""}${diff.toFixed(1)} kg over ${range} days (${first} → ${last} kg)`,
          type: diff < 0 ? "positive" : "warning",
        });
      }
    }
  }

  const hasNoData = data &&
    data.weight.length === 0 &&
    data.sleep.length === 0 &&
    data.nutrition.length === 0 &&
    data.exercise.length === 0 &&
    data.mood.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Trends</h2>
        <div className="flex gap-1">
          {([7, 14, 30] as TimeRange[]).map((r) => (
            <Button
              key={r}
              size="sm"
              variant={range === r ? "default" : "outline"}
              onClick={() => setRange(r)}
              className="text-xs"
            >
              {r}d
            </Button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      )}

      {hasNoData && !loading && (
        <Card>
          <CardContent className="py-12 text-center">
            <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="font-medium text-lg">No trend data yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Start logging your health data and your trends will appear here.
            </p>
          </CardContent>
        </Card>
      )}

      {!loading && data && !hasNoData && (
        <>
          {/* Weight Chart */}
          {data.weight.length >= 2 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Scale className="h-4 w-4" />
                  Weight
                  <Badge variant="secondary" className="text-xs ml-auto">{data.weight.length} entries</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={data.weight}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="logged_at"
                      tickFormatter={formatDateShort}
                      tick={{ fontSize: 11 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      domain={["dataMin - 0.5", "dataMax + 0.5"]}
                      tick={{ fontSize: 11 }}
                      width={40}
                    />
                    <Tooltip
                      formatter={(value) => [`${value} kg`, "Weight"]}
                      labelFormatter={(label) => formatDateShort(String(label))}
                    />
                    <Line
                      type="monotone"
                      dataKey="weight_kg"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Sleep Chart */}
          {data.sleep.length >= 2 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Moon className="h-4 w-4" />
                  Sleep Duration
                  <Badge variant="secondary" className="text-xs ml-auto">{data.sleep.length} nights</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data.sleep}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDateShort}
                      tick={{ fontSize: 11 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis tick={{ fontSize: 11 }} width={30} />
                    <Tooltip
                      formatter={(value) => [`${value}h`, "Sleep"]}
                      labelFormatter={(label) => formatDateShort(String(label))}
                    />
                    <Bar
                      dataKey="duration_hours"
                      fill="#818cf8"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Nutrition Chart */}
          {data.nutrition.length >= 2 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Utensils className="h-4 w-4" />
                  Daily Nutrition
                  <Badge variant="secondary" className="text-xs ml-auto">{data.nutrition.length} days</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data.nutrition}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDateShort}
                      tick={{ fontSize: 11 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis tick={{ fontSize: 11 }} width={40} />
                    <Tooltip labelFormatter={(label) => formatDateShort(String(label))} />
                    <Bar dataKey="protein_g" stackId="macros" fill="#22c55e" name="Protein" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="fat_g" stackId="macros" fill="#f59e0b" name="Fat" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="carbs_g" stackId="macros" fill="#3b82f6" name="Carbs" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-4 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#22c55e]" />Protein</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#f59e0b]" />Fat</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#3b82f6]" />Carbs</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Exercise Chart */}
          {data.exercise.length >= 2 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Dumbbell className="h-4 w-4" />
                  Exercise Sessions
                  <Badge variant="secondary" className="text-xs ml-auto">{data.exercise.length} sessions</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={data.exercise}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDateShort}
                      tick={{ fontSize: 11 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis tick={{ fontSize: 11 }} width={30} />
                    <Tooltip
                      formatter={(value) => [`${value} min`, "Duration"]}
                      labelFormatter={(label) => formatDateShort(String(label))}
                    />
                    <Bar
                      dataKey="duration_minutes"
                      fill="#10b981"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Mood/Energy Chart */}
          {data.mood.length >= 2 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Energy & Mood
                  <Badge variant="secondary" className="text-xs ml-auto">{data.mood.length} entries</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={data.mood}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDateShort}
                      tick={{ fontSize: 11 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis domain={[1, 5]} tick={{ fontSize: 11 }} width={20} />
                    <Tooltip labelFormatter={(label) => formatDateShort(String(label))} />
                    <Line
                      type="monotone"
                      dataKey="energy"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      name="Energy"
                    />
                    <Line
                      type="monotone"
                      dataKey="mood"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      name="Mood"
                    />
                  </LineChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-4 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />Energy</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#8b5cf6]" />Mood</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Correlations */}
          {correlations.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Correlations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {correlations.map((c, i) => (
                  <CorrelationCard key={i} {...c} />
                ))}
              </CardContent>
            </Card>
          )}

          {correlations.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center">
                <Minus className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Keep logging for a few more days to discover correlations in your data.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
