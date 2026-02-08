"use client";

import { useState, useEffect, useCallback } from "react";
import { Moon, Pill, Utensils, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

// --- Sleep tracking state (persisted in localStorage) ---

type SleepStatus = "none" | "sleeping" | "woke";

interface SleepTrackingState {
  sleepStatus: SleepStatus;
  currentSleepId: string | null;
  interruptions: number;
  bedtime: string | null;
}

const SLEEP_STORAGE_KEY = "health-os-sleep-tracking";

function loadSleepState(): SleepTrackingState {
  if (typeof window === "undefined") {
    return { sleepStatus: "none", currentSleepId: null, interruptions: 0, bedtime: null };
  }
  try {
    const stored = localStorage.getItem(SLEEP_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return { sleepStatus: "none", currentSleepId: null, interruptions: 0, bedtime: null };
}

function saveSleepState(state: SleepTrackingState) {
  try {
    localStorage.setItem(SLEEP_STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// --- Component ---

export function HealthTab() {
  // Sleep state
  const [sleepState, setSleepState] = useState<SleepTrackingState>(
    { sleepStatus: "none", currentSleepId: null, interruptions: 0, bedtime: null }
  );
  const [sleepQuality, setSleepQuality] = useState(3);
  const [sleepLoading, setSleepLoading] = useState(false);

  // Meds state
  const [medName, setMedName] = useState("");
  const [medStatus, setMedStatus] = useState<"taken" | "skipped" | "late">("taken");
  const [medDate, setMedDate] = useState(new Date().toISOString().slice(0, 10));
  const [medLoading, setMedLoading] = useState(false);

  // Food state
  const [foodDescription, setFoodDescription] = useState("");
  const [foodCalories, setFoodCalories] = useState("");
  const [foodDate, setFoodDate] = useState(new Date().toISOString().slice(0, 10));
  const [foodLoading, setFoodLoading] = useState(false);

  // Energy state
  const [energyLevel, setEnergyLevel] = useState("");
  const [moodLevel, setMoodLevel] = useState("");
  const [energyNotes, setEnergyNotes] = useState("");
  const [energyDate, setEnergyDate] = useState(new Date().toISOString().slice(0, 10));
  const [energyLoading, setEnergyLoading] = useState(false);

  // Load sleep state on mount
  useEffect(() => {
    setSleepState(loadSleepState());
  }, []);

  const updateSleepState = useCallback((update: Partial<SleepTrackingState>) => {
    setSleepState((prev) => {
      const next = { ...prev, ...update };
      saveSleepState(next);
      return next;
    });
  }, []);

  // --- Sleep handlers ---

  const handleGoingToSleep = async () => {
    setSleepLoading(true);
    try {
      const now = new Date().toISOString();
      const res = await fetch("/api/sleep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bedtime: now }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || `Failed to save (${res.status})`);
      }
      const { data } = await res.json();
      updateSleepState({
        sleepStatus: "sleeping",
        currentSleepId: data.id,
        interruptions: 0,
        bedtime: now,
      });
      toast.success("Good night! Sleep tracked.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSleepLoading(false);
    }
  };

  const handleNightWake = async () => {
    setSleepLoading(true);
    try {
      const newCount = sleepState.interruptions + 1;
      const res = await fetch("/api/sleep", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: sleepState.currentSleepId,
          interruptions: newCount,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || `Failed to update (${res.status})`);
      }
      updateSleepState({ interruptions: newCount });
      toast.success(
        `Wake-up logged (${newCount} interruption${newCount > 1 ? "s" : ""} tonight)`
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSleepLoading(false);
    }
  };

  const handleGoodMorning = () => {
    updateSleepState({ sleepStatus: "woke" });
  };

  const handleSaveMorning = async () => {
    setSleepLoading(true);
    try {
      const now = new Date().toISOString();
      const res = await fetch("/api/sleep", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: sleepState.currentSleepId,
          wake_time: now,
          quality: sleepQuality,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || `Failed to update (${res.status})`);
      }
      toast.success("Good morning! Sleep log complete.");
      updateSleepState({
        sleepStatus: "none",
        currentSleepId: null,
        interruptions: 0,
        bedtime: null,
      });
      setSleepQuality(3);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSleepLoading(false);
    }
  };

  // --- Meds handler ---

  const handleMedsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medName) {
      toast.error("Please enter a medication name");
      return;
    }
    setMedLoading(true);
    try {
      const res = await fetch("/api/medication", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medication_name: medName,
          status: medStatus,
          date: medDate,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || `Failed to save (${res.status})`);
      }
      toast.success("Medication logged");
      setMedName("");
      setMedStatus("taken");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setMedLoading(false);
    }
  };

  // --- Food handler ---

  const handleFoodSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foodDescription) {
      toast.error("Please describe what you ate");
      return;
    }
    setFoodLoading(true);
    try {
      const res = await fetch("/api/food", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          food_description: foodDescription,
          calories: foodCalories ? parseInt(foodCalories, 10) : undefined,
          date: foodDate,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || `Failed to save (${res.status})`);
      }
      toast.success("Food entry saved");
      setFoodDescription("");
      setFoodCalories("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setFoodLoading(false);
    }
  };

  // --- Energy handler ---

  const handleEnergySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!energyLevel) {
      toast.error("Please enter your energy level");
      return;
    }
    setEnergyLoading(true);
    try {
      const res = await fetch("/api/energy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          energy_level: parseInt(energyLevel, 10),
          mood_level: moodLevel ? parseInt(moodLevel, 10) : undefined,
          notes: energyNotes || undefined,
          date: energyDate,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || `Failed to save (${res.status})`);
      }
      toast.success("Energy entry saved");
      setEnergyLevel("");
      setMoodLevel("");
      setEnergyNotes("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setEnergyLoading(false);
    }
  };

  // --- Sleep quality labels ---

  const qualityLabels = ["Awful", "Poor", "OK", "Good", "Great"];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Health</h2>

      {/* Sleep Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Moon className="h-5 w-5" />
              Sleep
            </CardTitle>
            {sleepState.sleepStatus !== "none" && (
              <Badge variant="secondary" className="text-xs">
                {sleepState.sleepStatus === "sleeping" ? "Sleeping" : "Rate quality"}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* State: not sleeping */}
          {sleepState.sleepStatus === "none" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Tap when you&apos;re heading to bed. We&apos;ll track the time.
              </p>
              <Button
                type="button"
                className="w-full h-14 text-lg font-semibold bg-indigo-600 hover:bg-indigo-700 text-white"
                disabled={sleepLoading}
                onClick={handleGoingToSleep}
              >
                {sleepLoading ? "Saving..." : "GOING TO SLEEP NOW"}
              </Button>
            </div>
          )}

          {/* State: sleeping */}
          {sleepState.sleepStatus === "sleeping" && (
            <div className="space-y-3">
              <div className="text-center space-y-1">
                <p className="text-sm text-muted-foreground">
                  In bed since {sleepState.bedtime ? formatTime(sleepState.bedtime) : "..."}
                </p>
                {sleepState.interruptions > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {sleepState.interruptions} wake-up{sleepState.interruptions > 1 ? "s" : ""} tonight
                  </p>
                )}
              </div>
              <Button
                type="button"
                className="w-full h-12 text-base font-semibold bg-amber-500 hover:bg-amber-600 text-white"
                disabled={sleepLoading}
                onClick={handleNightWake}
              >
                {sleepLoading ? "Saving..." : "I'M AWAKE (MIDDLE OF NIGHT)"}
              </Button>
              <Button
                type="button"
                className="w-full h-14 text-lg font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={sleepLoading}
                onClick={handleGoodMorning}
              >
                GOOD MORNING
              </Button>
            </div>
          )}

          {/* State: woke, rate quality */}
          {sleepState.sleepStatus === "woke" && (
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <p className="text-sm text-muted-foreground">
                  In bed since {sleepState.bedtime ? formatTime(sleepState.bedtime) : "..."}
                </p>
                {sleepState.interruptions > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {sleepState.interruptions} interruption{sleepState.interruptions > 1 ? "s" : ""}
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <Label className="text-center block">How did you sleep?</Label>
                <div className="flex gap-2 justify-center">
                  {[1, 2, 3, 4, 5].map((val) => (
                    <Button
                      key={val}
                      type="button"
                      variant={sleepQuality === val ? "default" : "outline"}
                      className={`h-12 w-12 text-lg font-bold ${
                        sleepQuality === val
                          ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                          : ""
                      }`}
                      onClick={() => setSleepQuality(val)}
                    >
                      {val}
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  {qualityLabels[sleepQuality - 1]}
                </p>
              </div>

              <Button
                type="button"
                className="w-full h-12 text-base font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={sleepLoading}
                onClick={handleSaveMorning}
              >
                {sleepLoading ? "Saving..." : "Complete Sleep Log"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Medications Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Pill className="h-5 w-5" />
            Medications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleMedsSubmit} className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Medication</Label>
                <Input
                  placeholder="e.g., Vitamin D"
                  value={medName}
                  onChange={(e) => setMedName(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Status</Label>
                <select
                  className="h-9 px-3 border rounded-md bg-background text-sm"
                  value={medStatus}
                  onChange={(e) => setMedStatus(e.target.value as "taken" | "skipped" | "late")}
                >
                  <option value="taken">Taken</option>
                  <option value="skipped">Skipped</option>
                  <option value="late">Late</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 items-end">
              <div className="space-y-1">
                <Label className="text-xs">Date</Label>
                <Input
                  type="date"
                  value={medDate}
                  onChange={(e) => setMedDate(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={medLoading}>
                {medLoading ? "..." : "Log"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Food Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Utensils className="h-5 w-5" />
            Food
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleFoodSubmit} className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">What did you eat?</Label>
              <Input
                placeholder="e.g., Oatmeal with berries"
                value={foodDescription}
                onChange={(e) => setFoodDescription(e.target.value)}
              />
            </div>
            <div className="flex gap-3 items-end">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Calories (optional)</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="350"
                  value={foodCalories}
                  onChange={(e) => setFoodCalories(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Date</Label>
                <Input
                  type="date"
                  value={foodDate}
                  onChange={(e) => setFoodDate(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={foodLoading}>
                {foodLoading ? "..." : "Log"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Energy/Mood Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Energy / Mood
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleEnergySubmit} className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Energy (1-10)</Label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  placeholder="7"
                  value={energyLevel}
                  onChange={(e) => setEnergyLevel(e.target.value)}
                />
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Mood (1-10)</Label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  placeholder="8"
                  value={moodLevel}
                  onChange={(e) => setMoodLevel(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Notes (optional)</Label>
              <Input
                placeholder="e.g., feeling rested today"
                value={energyNotes}
                onChange={(e) => setEnergyNotes(e.target.value)}
              />
            </div>
            <div className="flex gap-3 items-end">
              <div className="space-y-1">
                <Label className="text-xs">Date</Label>
                <Input
                  type="date"
                  value={energyDate}
                  onChange={(e) => setEnergyDate(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={energyLoading}>
                {energyLoading ? "..." : "Log"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
