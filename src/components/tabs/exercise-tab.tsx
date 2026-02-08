"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Dumbbell, Play, Square, Plus, Check,
  Timer, Bike, Zap, Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const EXERCISE_TYPES = [
  { id: "treadmill", label: "Treadmill", icon: Timer, bgColor: "bg-blue-100", textColor: "text-blue-700" },
  { id: "vibration-plate", label: "Vibration Plate", icon: Zap, bgColor: "bg-purple-100", textColor: "text-purple-700" },
  { id: "walk", label: "Walk", icon: Activity, bgColor: "bg-green-100", textColor: "text-green-700" },
  { id: "run", label: "Run", icon: Activity, bgColor: "bg-orange-100", textColor: "text-orange-700" },
  { id: "strength", label: "Strength", icon: Dumbbell, bgColor: "bg-red-100", textColor: "text-red-700" },
  { id: "bike", label: "Bike", icon: Bike, bgColor: "bg-cyan-100", textColor: "text-cyan-700" },
  { id: "yoga", label: "Yoga", icon: Activity, bgColor: "bg-pink-100", textColor: "text-pink-700" },
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
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function ExerciseTab() {
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [completedToday, setCompletedToday] = useState<CompletedSession[]>([]);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualType, setManualType] = useState("Treadmill");
  const [manualDuration, setManualDuration] = useState("");
  const [manualDate, setManualDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [manualNotes, setManualNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load active timer from localStorage on mount
  useEffect(() => {
    const saved = loadTimer();
    if (saved) setActiveTimer(saved);
  }, []);

  // Timer tick
  useEffect(() => {
    if (activeTimer) {
      const tick = () => {
        setElapsed(Math.floor((Date.now() - activeTimer.startTime) / 1000));
      };
      tick();
      timerRef.current = setInterval(tick, 1000);
    } else {
      setElapsed(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeTimer]);

  const handleStart = useCallback((exerciseType: string) => {
    const timer: ActiveTimer = { exerciseType, startTime: Date.now() };
    setActiveTimer(timer);
    saveTimer(timer);
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
      const res = await fetch("/api/exercise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: new Date().toISOString().slice(0, 10),
          duration_minutes: durationMinutes,
          exercise_type: stoppedType,
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
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save exercise"
      );
    } finally {
      setActiveTimer(null);
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
      const res = await fetch("/api/exercise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: manualDate,
          duration_minutes: parseInt(manualDuration, 10),
          exercise_type: manualType,
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Exercise</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setManualOpen(true)}
        >
          <Plus className="h-4 w-4 mr-1" />
          Manual Entry
        </Button>
      </div>

      {/* Active Timer Banner */}
      {activeTimer && (
        <Card className="border-emerald-300 bg-emerald-50/50">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Badge className="bg-emerald-100 text-emerald-800 text-sm">
                {activeTimer.exerciseType}
              </Badge>
              <p className="text-5xl font-mono font-bold tabular-nums tracking-wider">
                {formatDuration(elapsed)}
              </p>
              <Button
                size="lg"
                className="w-full max-w-xs h-14 text-lg font-semibold bg-red-600 hover:bg-red-700 text-white"
                onClick={handleStop}
                disabled={loading}
              >
                <Square className="h-5 w-5 mr-2 fill-current" />
                {loading ? "Saving..." : "STOP"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Exercise Types Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {EXERCISE_TYPES.map((ex) => {
          const Icon = ex.icon;
          const isActive = activeTimer?.exerciseType === ex.label;
          const isDisabled = !!activeTimer && !isActive;

          return (
            <Card
              key={ex.id}
              className={`transition-all ${
                isActive ? "ring-2 ring-emerald-500 bg-emerald-50/50" : ""
              } ${isDisabled ? "opacity-50" : ""}`}
            >
              <CardContent className="pt-5 pb-4 flex flex-col items-center gap-3">
                <div className={`p-3 rounded-xl ${ex.bgColor}`}>
                  <Icon className={`h-6 w-6 ${ex.textColor}`} />
                </div>
                <p className="font-medium text-sm text-center">{ex.label}</p>
                {!activeTimer ? (
                  <Button
                    size="sm"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => handleStart(ex.label)}
                  >
                    <Play className="h-4 w-4 mr-1 fill-current" />
                    Start
                  </Button>
                ) : isActive ? (
                  <p className="text-sm font-mono font-bold text-emerald-700 tabular-nums">
                    {formatDuration(elapsed)}
                  </p>
                ) : (
                  <Button size="sm" variant="outline" disabled className="w-full">
                    Start
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Completed Today */}
      {completedToday.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">
              Completed Today
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {completedToday.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-md bg-green-100 text-green-700">
                    <Check className="h-4 w-4" />
                  </div>
                  <span className="font-medium text-sm">
                    {session.exerciseType}
                  </span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {session.durationMinutes} min
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Manual Entry Dialog */}
      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Manual Exercise Entry</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleManualSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Exercise Type</Label>
              <select
                className="w-full p-2 border rounded-md bg-background"
                value={manualType}
                onChange={(e) => setManualType(e.target.value)}
              >
                {EXERCISE_TYPES.map((ex) => (
                  <option key={ex.id} value={ex.label}>
                    {ex.label}
                  </option>
                ))}
                <option value="Swim">Swim</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Duration (minutes)</Label>
              <Input
                type="number"
                min="1"
                placeholder="30"
                value={manualDuration}
                onChange={(e) => setManualDuration(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={manualDate}
                onChange={(e) => setManualDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Input
                placeholder="e.g., felt great"
                value={manualNotes}
                onChange={(e) => setManualNotes(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Saving..." : "Save"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
