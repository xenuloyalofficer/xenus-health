"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Dumbbell, Play, Square, Plus, Check, Timer,
  Bike, Zap, Activity, Flame, Pause, X, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { medium } from "@/lib/haptics";
import { cn } from "@/lib/utils";

const EXERCISE_TYPES = [
  { id: "treadmill", label: "Treadmill", icon: Timer, bgColor: "bg-blue-500", caloriesPerMin: 8 },
  { id: "vibration_plate", label: "Vibration Plate", icon: Zap, bgColor: "bg-purple-500", caloriesPerMin: 4 },
  { id: "walk", label: "Walk", icon: Activity, bgColor: "bg-green-500", caloriesPerMin: 4 },
  { id: "run", label: "Run", icon: Activity, bgColor: "bg-orange-500", caloriesPerMin: 12 },
  { id: "strength", label: "Strength", icon: Dumbbell, bgColor: "bg-red-500", caloriesPerMin: 6 },
  { id: "bike", label: "Bike", icon: Bike, bgColor: "bg-cyan-500", caloriesPerMin: 8 },
  { id: "yoga", label: "Yoga", icon: Activity, bgColor: "bg-pink-500", caloriesPerMin: 3 },
];

const TIMER_STORAGE_KEY = "health-os-exercise-timer";

interface ActiveTimer {
  exerciseType: string;
  startTime: number;
}

interface CompletedSession {
  id: string;
  exerciseType: string;
  durationMinutes: number;
  completedAt: string;
}

function loadTimer(): ActiveTimer | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(TIMER_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function saveTimer(timer: ActiveTimer | null) {
  try {
    if (timer) {
      localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(timer));
    } else {
      localStorage.removeItem(TIMER_STORAGE_KEY);
    }
  } catch {}
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function ExerciseTab() {
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [completedToday, setCompletedToday] = useState<CompletedSession[]>([]);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualType, setManualType] = useState("Treadmill");
  const [manualDuration, setManualDuration] = useState("");
  const [manualDate, setManualDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [manualNotes, setManualNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [showTimerOverlay, setShowTimerOverlay] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load active timer from localStorage on mount
  useEffect(() => {
    const saved = loadTimer();
    if (saved) {
      setActiveTimer(saved);
      setShowTimerOverlay(true);
    }
  }, []);

  // Timer tick
  useEffect(() => {
    if (activeTimer && !isPaused) {
      const tick = () => {
        setElapsed(Math.floor((Date.now() - activeTimer.startTime) / 1000));
      };
      tick();
      timerRef.current = setInterval(tick, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeTimer, isPaused]);

  const handleStart = useCallback((exerciseType: string) => {
    const timer: ActiveTimer = { exerciseType, startTime: Date.now() };
    setActiveTimer(timer);
    setIsPaused(false);
    setShowTimerOverlay(true);
    saveTimer(timer);
    medium();
  }, []);

  const handleStop = useCallback(async () => {
    if (!activeTimer) return;

    const durationSeconds = Math.floor(
      (Date.now() - activeTimer.startTime) / 1000
    );
    const durationMinutes = Math.max(1, Math.round(durationSeconds / 60));
    const stoppedType = activeTimer.exerciseType;

    setLoading(true);
    try {
      const typeMap: Record<string, string> = {};
      EXERCISE_TYPES.forEach((ex) => { typeMap[ex.label] = ex.id; });
      const exerciseTypeId = typeMap[stoppedType] || stoppedType.toLowerCase().replace(/\s+/g, "_");

      const res = await fetch("/api/exercise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          started_at: new Date(activeTimer.startTime).toISOString(),
          ended_at: new Date().toISOString(),
          duration_minutes: durationMinutes,
          exercise_type: exerciseTypeId,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || `Failed to save (${res.status})`);
      }

      setCompletedToday((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          exerciseType: stoppedType,
          durationMinutes,
          completedAt: new Date().toISOString(),
        },
      ]);
      toast.success(`${stoppedType} logged: ${durationMinutes} min`);
      medium();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save exercise"
      );
    } finally {
      setActiveTimer(null);
      setShowTimerOverlay(false);
      setElapsed(0);
      saveTimer(null);
      setLoading(false);
    }
  }, [activeTimer]);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualDuration) {
      toast.error("Please enter duration");
      return;
    }
    setLoading(true);
    try {
      const typeMap: Record<string, string> = {};
      EXERCISE_TYPES.forEach((ex) => { typeMap[ex.label] = ex.id; });
      const exerciseTypeId = typeMap[manualType] || manualType.toLowerCase().replace(/\s+/g, "_");

      const res = await fetch("/api/exercise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          started_at: new Date(manualDate + "T12:00:00").toISOString(),
          duration_minutes: parseInt(manualDuration, 10),
          exercise_type: exerciseTypeId,
          notes: manualNotes || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || `Failed to save (${res.status})`);
      }
      toast.success("Exercise entry saved");
      setManualOpen(false);
      setManualDuration("");
      setManualNotes("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  const activeExerciseType = EXERCISE_TYPES.find(ex => ex.label === activeTimer?.exerciseType);
  const estimatedCalories = activeExerciseType 
    ? Math.round(activeExerciseType.caloriesPerMin * (elapsed / 60))
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Exercise</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setManualOpen(true)}
          className="rounded-full"
        >
          <Plus className="h-4 w-4 mr-1" />
          Manual
        </Button>
      </div>

      {/* Active Session Card */}
      {activeTimer && (
        <div className="animate-fade-in-up">
          <div 
            onClick={() => setShowTimerOverlay(true)}
            className="bg-primary rounded-3xl border-2 border-foreground/10 p-5 shadow-[4px_4px_0px_0px_rgba(15,15,15,0.15)] cursor-pointer transition-all hover:shadow-[6px_6px_0px_0px_rgba(15,15,15,0.2)]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center",
                  activeExerciseType?.bgColor || "bg-foreground/10"
                )}>
                  {activeExerciseType && <activeExerciseType.icon className="w-7 h-7 text-white" />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-primary-foreground/70 uppercase tracking-wider">Active Session</p>
                  <p className="text-2xl font-bold text-primary-foreground tabular-nums">{formatDuration(elapsed)}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-sm font-semibold text-primary-foreground/80">{activeTimer.exerciseType}</span>
                <span className="text-xs text-primary-foreground/60">~{estimatedCalories} cal</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Start Grid */}
      <div>
        <h2 className="text-lg font-bold mb-4">Quick Start</h2>
        <div className="grid grid-cols-2 gap-4">
          {EXERCISE_TYPES.map((ex) => {
            const Icon = ex.icon;
            const isActive = activeTimer?.exerciseType === ex.label;
            const isDisabled = !!activeTimer && !isActive;

            return (
              <div
                key={ex.id}
                className={cn(
                  "bg-card rounded-3xl border-2 p-5 transition-all duration-200",
                  isActive 
                    ? "border-primary shadow-[4px_4px_0px_0px_rgba(223,255,0,0.3)]" 
                    : "border-foreground/5 shadow-[3px_3px_0px_0px_rgba(15,15,15,0.05)] hover:shadow-[5px_5px_0px_0px_rgba(15,15,15,0.08)] hover:-translate-y-0.5",
                  isDisabled && "opacity-50 grayscale"
                )}
              >
                <div className="flex flex-col items-center text-center gap-3">
                  <div className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center",
                    ex.bgColor
                  )}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-base">{ex.label}</p>
                    <p className="text-xs text-muted-foreground">~{ex.caloriesPerMin} cal/min</p>
                  </div>
                  {!activeTimer ? (
                    <Button
                      size="sm"
                      className="w-full rounded-full bg-primary hover:brightness-105 text-primary-foreground"
                      onClick={() => handleStart(ex.label)}
                    >
                      <Play className="h-4 w-4 mr-1 fill-current" />
                      Start
                    </Button>
                  ) : isActive ? (
                    <div className="text-lg font-mono font-bold text-primary tabular-nums">
                      {formatDuration(elapsed)}
                    </div>
                  ) : (
                    <Button size="sm" variant="outline" disabled className="w-full rounded-full">
                      Start
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Completed Today */}
      {completedToday.length > 0 && (
        <div>
          <h2 className="text-lg font-bold mb-4">Completed Today</h2>
          <div className="space-y-3">
            {completedToday.map((session) => {
              const exType = EXERCISE_TYPES.find(ex => ex.label === session.exerciseType);
              return (
                <div
                  key={session.id}
                  className="bg-card rounded-2xl border-2 border-green-500/20 p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center",
                      exType?.bgColor || "bg-green-100"
                    )}>
                      {exType ? <exType.icon className="w-5 h-5 text-white" /> : <Check className="w-5 h-5 text-green-600" />}
                    </div>
                    <div>
                      <p className="font-semibold">{session.exerciseType}</p>
                      <p className="text-sm text-muted-foreground">{session.durationMinutes} minutes</p>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Timer Overlay */}
      {showTimerOverlay && activeTimer && (
        <div className="fixed inset-0 z-[100] bg-background flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4">
            <button 
              onClick={() => setShowTimerOverlay(false)}
              className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
            >
              <ChevronRight className="w-6 h-6 rotate-180" />
            </button>
            <span className="font-semibold text-lg">Active Workout</span>
            <div className="w-12" />
          </div>

          {/* Main Timer Display */}
          <div className="flex-1 flex flex-col items-center justify-center px-6">
            <div className={cn(
              "w-24 h-24 rounded-3xl flex items-center justify-center mb-8",
              activeExerciseType?.bgColor || "bg-primary"
            )}>
              {activeExerciseType && <activeExerciseType.icon className="w-12 h-12 text-white" />}
            </div>
            
            <p className="text-muted-foreground font-medium mb-2">{activeTimer.exerciseType}</p>
            
            <div className="text-7xl md:text-8xl font-bold tracking-tight tabular-nums">
              {formatDuration(elapsed)}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4 mt-10 w-full max-w-sm">
              <div className="bg-card rounded-2xl border-2 border-foreground/5 p-4 text-center">
                <Flame className="w-5 h-5 text-orange-500 mx-auto mb-1" />
                <p className="text-2xl font-bold tabular-nums">{estimatedCalories}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Calories</p>
              </div>
              <div className="bg-card rounded-2xl border-2 border-foreground/5 p-4 text-center">
                <Timer className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                <p className="text-2xl font-bold tabular-nums">{Math.floor(elapsed / 60)}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Minutes</p>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="p-6 pb-10 space-y-4">
            <div className="flex gap-4">
              <button
                onClick={() => setIsPaused(!isPaused)}
                className="flex-1 h-16 rounded-2xl bg-secondary font-bold text-lg flex items-center justify-center gap-2 hover:bg-secondary/80 transition-colors"
              >
                {isPaused ? (
                  <><Play className="w-6 h-6 fill-current" /> Resume</>
                ) : (
                  <><Pause className="w-6 h-6 fill-current" /> Pause</>
                )}
              </button>
            </div>
            <Button
              size="lg"
              className="w-full h-16 text-lg font-bold bg-red-500 hover:bg-red-600 text-white rounded-2xl shadow-[4px_4px_0px_0px_rgba(220,38,38,0.3)] active:shadow-none active:translate-x-1 active:translate-y-1"
              onClick={handleStop}
              disabled={loading}
            >
              <Square className="h-6 w-6 mr-2 fill-current" />
              {loading ? "Saving..." : "STOP WORKOUT"}
            </Button>
          </div>
        </div>
      )}

      {/* Manual Entry Dialog */}
      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent className="sm:max-w-[400px] rounded-3xl border-2">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Manual Exercise Entry</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleManualSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="font-medium">Exercise Type</Label>
              <div className="grid grid-cols-2 gap-2">
                {EXERCISE_TYPES.map((ex) => (
                  <button
                    key={ex.id}
                    type="button"
                    onClick={() => setManualType(ex.label)}
                    className={cn(
                      "flex items-center gap-2 p-3 rounded-2xl border-2 transition-all",
                      manualType === ex.label
                        ? "border-primary bg-primary/10"
                        : "border-foreground/5 hover:border-foreground/10"
                    )}
                  >
                    <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", ex.bgColor)}>
                      <ex.icon className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm font-medium">{ex.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="font-medium">Duration (minutes)</Label>
              <Input
                type="number"
                min="1"
                placeholder="30"
                value={manualDuration}
                onChange={(e) => setManualDuration(e.target.value)}
                className="h-12 rounded-xl"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="font-medium">Date</Label>
              <Input
                type="date"
                value={manualDate}
                onChange={(e) => setManualDate(e.target.value)}
                className="h-12 rounded-xl"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="font-medium">Notes (optional)</Label>
              <Input
                placeholder="e.g., felt great"
                value={manualNotes}
                onChange={(e) => setManualNotes(e.target.value)}
                className="h-12 rounded-xl"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full h-12 rounded-xl" 
              disabled={loading}
            >
              {loading ? "Saving..." : "Save Exercise"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
