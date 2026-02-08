"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

// --- Component ---

interface QuickAddDialogProps {
  type: "sleep" | "weight" | "exercise" | "food" | "energy" | "meds" | "measurements";
  trigger: React.ReactNode;
}

export function QuickAddDialog({ type, trigger }: QuickAddDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Sleep tracking state (persistent)
  const [sleepState, setSleepState] = useState<SleepTrackingState>(
    { sleepStatus: "none", currentSleepId: null, interruptions: 0, bedtime: null }
  );
  const [sleepQuality, setSleepQuality] = useState(3);

  // Weight form state
  const [weightKg, setWeightKg] = useState("");
  const [weightDate, setWeightDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  // Exercise form state
  const [exerciseType, setExerciseType] = useState("Treadmill");
  const [exerciseDistance, setExerciseDistance] = useState("");
  const [exerciseCalories, setExerciseCalories] = useState("");
  const [exerciseNotes, setExerciseNotes] = useState("");
  const [exerciseDate, setExerciseDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  // Exercise chronograph state
  const [exerciseIsRunning, setExerciseIsRunning] = useState(false);
  const [exerciseStartTime, setExerciseStartTime] = useState<Date | null>(null);
  const [exerciseElapsedSeconds, setExerciseElapsedSeconds] = useState(0);
  const exerciseTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load sleep state from localStorage on mount
  useEffect(() => {
    setSleepState(loadSleepState());
  }, []);

  // Exercise chronograph timer
  useEffect(() => {
    if (exerciseIsRunning && exerciseStartTime) {
      exerciseTimerRef.current = setInterval(() => {
        setExerciseElapsedSeconds(
          Math.floor((Date.now() - exerciseStartTime.getTime()) / 1000)
        );
      }, 1000);
    }
    return () => {
      if (exerciseTimerRef.current) clearInterval(exerciseTimerRef.current);
    };
  }, [exerciseIsRunning, exerciseStartTime]);

  const updateSleepState = useCallback((update: Partial<SleepTrackingState>) => {
    setSleepState((prev) => {
      const next = { ...prev, ...update };
      saveSleepState(next);
      return next;
    });
  }, []);

  // Food form state
  const [foodDescription, setFoodDescription] = useState("");
  const [foodCalories, setFoodCalories] = useState("");
  const [foodDate, setFoodDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  // Energy form state
  const [energyLevel, setEnergyLevel] = useState("");
  const [moodLevel, setMoodLevel] = useState("");
  const [energyNotes, setEnergyNotes] = useState("");
  const [energyDate, setEnergyDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  // Meds form state
  const [medName, setMedName] = useState("");
  const [medStatus, setMedStatus] = useState<"taken" | "skipped" | "late">("taken");
  const [medDate, setMedDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  // Measurements form state
  const [measNeck, setMeasNeck] = useState("");
  const [measChest, setMeasChest] = useState("");
  const [measLeftArm, setMeasLeftArm] = useState("");
  const [measRightArm, setMeasRightArm] = useState("");
  const [measWaist, setMeasWaist] = useState("");
  const [measHips, setMeasHips] = useState("");
  const [measLeftThigh, setMeasLeftThigh] = useState("");
  const [measRightThigh, setMeasRightThigh] = useState("");
  const [measLeftCalf, setMeasLeftCalf] = useState("");
  const [measRightCalf, setMeasRightCalf] = useState("");
  const [measWeight, setMeasWeight] = useState("");
  const [measNotes, setMeasNotes] = useState("");
  const [measDate, setMeasDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  const titles: Record<string, string> = {
    sleep: "Sleep Tracker",
    weight: "Log Weight",
    exercise: "Log Exercise",
    food: "Log Food",
    energy: "Log Energy/Mood",
    meds: "Log Medication",
    measurements: "Log Body Measurements",
  };

  const resetWeightForm = () => {
    setWeightKg("");
    setWeightDate(new Date().toISOString().slice(0, 10));
  };

  const resetExerciseForm = () => {
    setExerciseType("Treadmill");
    setExerciseDistance("");
    setExerciseCalories("");
    setExerciseNotes("");
    setExerciseDate(new Date().toISOString().slice(0, 10));
    setExerciseIsRunning(false);
    setExerciseStartTime(null);
    setExerciseElapsedSeconds(0);
    if (exerciseTimerRef.current) clearInterval(exerciseTimerRef.current);
  };

  const resetFoodForm = () => {
    setFoodDescription("");
    setFoodCalories("");
    setFoodDate(new Date().toISOString().slice(0, 10));
  };

  const resetEnergyForm = () => {
    setEnergyLevel("");
    setMoodLevel("");
    setEnergyNotes("");
    setEnergyDate(new Date().toISOString().slice(0, 10));
  };

  const resetMedsForm = () => {
    setMedName("");
    setMedStatus("taken");
    setMedDate(new Date().toISOString().slice(0, 10));
  };

  const resetMeasurementsForm = () => {
    setMeasNeck("");
    setMeasChest("");
    setMeasLeftArm("");
    setMeasRightArm("");
    setMeasWaist("");
    setMeasHips("");
    setMeasLeftThigh("");
    setMeasRightThigh("");
    setMeasLeftCalf("");
    setMeasRightCalf("");
    setMeasWeight("");
    setMeasNotes("");
    setMeasDate(new Date().toISOString().slice(0, 10));
  };

  // --- Sleep button handlers ---

  const handleGoingToSleep = async () => {
    setLoading(true);
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
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleNightWake = async () => {
    setLoading(true);
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
      toast.success(`Wake-up logged (${newCount} interruption${newCount > 1 ? "s" : ""} tonight)`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleGoodMorning = () => {
    updateSleepState({ sleepStatus: "woke" });
  };

  const handleSaveMorning = async () => {
    setLoading(true);
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
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // --- Other form submit handlers ---

  const handleWeightSubmit = async () => {
    if (!weightKg) {
      toast.error("Please enter your weight");
      return;
    }

    const res = await fetch("/api/weight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: weightDate,
        weight_kg: parseFloat(weightKg),
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error || `Failed to save (${res.status})`);
    }

    toast.success("Weight entry saved");
    resetWeightForm();
  };

  const handleExerciseSubmit = async () => {
    if (exerciseElapsedSeconds < 1 || !exerciseType) {
      toast.error("Please use the timer to record your exercise");
      return;
    }

    const durationMinutes = Math.round(exerciseElapsedSeconds / 60) || 1;

    const res = await fetch("/api/exercise", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: exerciseDate,
        duration_minutes: durationMinutes,
        exercise_type: exerciseType,
        distance_km: exerciseDistance ? parseFloat(exerciseDistance) : undefined,
        calories_burned: exerciseCalories ? parseInt(exerciseCalories, 10) : undefined,
        notes: exerciseNotes || undefined,
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error || `Failed to save (${res.status})`);
    }

    toast.success("Exercise entry saved");
    resetExerciseForm();
  };

  const handleFoodSubmit = async () => {
    if (!foodDescription) {
      toast.error("Please describe what you ate");
      return;
    }

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
    resetFoodForm();
  };

  const handleEnergySubmit = async () => {
    if (!energyLevel) {
      toast.error("Please enter your energy level");
      return;
    }

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
    resetEnergyForm();
  };

  const handleMedsSubmit = async () => {
    if (!medName) {
      toast.error("Please enter a medication name");
      return;
    }

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

    toast.success("Medication entry saved");
    resetMedsForm();
  };

  const handleMeasurementsSubmit = async () => {
    const hasAnyMeasurement = [
      measNeck, measChest, measLeftArm, measRightArm,
      measWaist, measHips, measLeftThigh, measRightThigh,
      measLeftCalf, measRightCalf, measWeight,
    ].some((v) => v !== "");

    if (!hasAnyMeasurement) {
      toast.error("Please enter at least one measurement");
      return;
    }

    const payload: Record<string, unknown> = {
      measurement_date: measDate,
    };
    if (measNeck) payload.neck_cm = parseFloat(measNeck);
    if (measChest) payload.chest_cm = parseFloat(measChest);
    if (measLeftArm) payload.left_arm_cm = parseFloat(measLeftArm);
    if (measRightArm) payload.right_arm_cm = parseFloat(measRightArm);
    if (measWaist) payload.waist_cm = parseFloat(measWaist);
    if (measHips) payload.hips_cm = parseFloat(measHips);
    if (measLeftThigh) payload.left_thigh_cm = parseFloat(measLeftThigh);
    if (measRightThigh) payload.right_thigh_cm = parseFloat(measRightThigh);
    if (measLeftCalf) payload.left_calf_cm = parseFloat(measLeftCalf);
    if (measRightCalf) payload.right_calf_cm = parseFloat(measRightCalf);
    if (measWeight) payload.weight_kg = parseFloat(measWeight);
    if (measNotes) payload.notes = measNotes;

    const res = await fetch("/api/measurements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error || `Failed to save (${res.status})`);
    }

    toast.success("Body measurements saved");
    resetMeasurementsForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (type === "weight") {
        await handleWeightSubmit();
      } else if (type === "exercise") {
        await handleExerciseSubmit();
      } else if (type === "food") {
        await handleFoodSubmit();
      } else if (type === "energy") {
        await handleEnergySubmit();
      } else if (type === "meds") {
        await handleMedsSubmit();
      } else if (type === "measurements") {
        await handleMeasurementsSubmit();
      }
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // --- Sleep form helper ---

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function renderSleepForm() {
    const qualityLabels = ["Awful", "Poor", "OK", "Good", "Great"];

    // State: not sleeping yet
    if (sleepState.sleepStatus === "none") {
      return (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            Tap when you&apos;re heading to bed. We&apos;ll track the time.
          </p>
          <Button
            type="button"
            className="w-full h-16 text-lg font-semibold bg-indigo-600 hover:bg-indigo-700 text-white"
            disabled={loading}
            onClick={handleGoingToSleep}
          >
            {loading ? "Saving..." : "GOING TO SLEEP NOW"}
          </Button>
        </div>
      );
    }

    // State: currently sleeping (middle of the night)
    if (sleepState.sleepStatus === "sleeping") {
      return (
        <div className="space-y-4">
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
            className="w-full h-14 text-base font-semibold bg-amber-500 hover:bg-amber-600 text-white"
            disabled={loading}
            onClick={handleNightWake}
          >
            {loading ? "Saving..." : "I'M AWAKE (MIDDLE OF NIGHT)"}
          </Button>

          <Button
            type="button"
            className="w-full h-16 text-lg font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
            disabled={loading}
            onClick={handleGoodMorning}
          >
            GOOD MORNING
          </Button>
        </div>
      );
    }

    // State: woke up, rate quality before saving
    if (sleepState.sleepStatus === "woke") {
      return (
        <div className="space-y-5">
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
            disabled={loading}
            onClick={handleSaveMorning}
          >
            {loading ? "Saving..." : "Complete Sleep Log"}
          </Button>
        </div>
      );
    }

    return null;
  }

  // --- Render ---

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className={type === "measurements" ? "sm:max-w-[520px]" : "sm:max-w-[425px]"}>
        <DialogHeader>
          <DialogTitle>{titles[type]}</DialogTitle>
        </DialogHeader>

        {type === "sleep" ? (
          <div className="mt-4">{renderSleepForm()}</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            {type === "weight" && (
              <>
                <div className="space-y-2">
                  <Label>Weight (kg)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="70.5"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={weightDate}
                    onChange={(e) => setWeightDate(e.target.value)}
                    required
                  />
                </div>
              </>
            )}

            {type === "exercise" && (
              <>
                <div className="space-y-2">
                  <Label>Exercise Type</Label>
                  <select
                    className="w-full p-2 border rounded"
                    value={exerciseType}
                    onChange={(e) => setExerciseType(e.target.value)}
                  >
                    <option>Treadmill</option>
                    <option>Walk</option>
                    <option>Run</option>
                    <option>Bike</option>
                    <option>Swim</option>
                    <option>Strength</option>
                    <option>Yoga</option>
                    <option>Other</option>
                  </select>
                </div>

                {/* Chronograph / Timer */}
                <div className="space-y-3">
                  <Label>Duration</Label>
                  <div className="text-center">
                    <p className="text-4xl font-mono font-bold tabular-nums tracking-wider">
                      {String(Math.floor(exerciseElapsedSeconds / 60)).padStart(2, "0")}
                      :{String(exerciseElapsedSeconds % 60).padStart(2, "0")}
                    </p>
                    {!exerciseIsRunning && exerciseElapsedSeconds > 0 && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {Math.round(exerciseElapsedSeconds / 60) || 1} min recorded
                      </p>
                    )}
                  </div>
                  {!exerciseIsRunning ? (
                    <Button
                      type="button"
                      className="w-full h-14 text-lg font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => {
                        const now = new Date();
                        setExerciseStartTime(now);
                        setExerciseElapsedSeconds(0);
                        setExerciseIsRunning(true);
                      }}
                    >
                      START
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      className="w-full h-14 text-lg font-semibold bg-red-600 hover:bg-red-700 text-white"
                      onClick={() => {
                        setExerciseIsRunning(false);
                      }}
                    >
                      STOP
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={exerciseDate}
                    onChange={(e) => setExerciseDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Distance (km, optional)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="2.5"
                    value={exerciseDistance}
                    onChange={(e) => setExerciseDistance(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Calories Burned (optional)</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="200"
                    value={exerciseCalories}
                    onChange={(e) => setExerciseCalories(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Notes (optional)</Label>
                  <Input
                    placeholder="e.g., felt great today"
                    value={exerciseNotes}
                    onChange={(e) => setExerciseNotes(e.target.value)}
                  />
                </div>
              </>
            )}

            {type === "food" && (
              <>
                <div className="space-y-2">
                  <Label>What did you eat?</Label>
                  <Input
                    placeholder="e.g., Oatmeal with berries"
                    value={foodDescription}
                    onChange={(e) => setFoodDescription(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Calories (optional)</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="350"
                    value={foodCalories}
                    onChange={(e) => setFoodCalories(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={foodDate}
                    onChange={(e) => setFoodDate(e.target.value)}
                    required
                  />
                </div>
              </>
            )}

            {type === "energy" && (
              <>
                <div className="space-y-2">
                  <Label>Energy Level (1-10)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    placeholder="7"
                    value={energyLevel}
                    onChange={(e) => setEnergyLevel(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mood (1-10, optional)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    placeholder="8"
                    value={moodLevel}
                    onChange={(e) => setMoodLevel(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Notes (optional)</Label>
                  <Input
                    placeholder="e.g., feeling rested today"
                    value={energyNotes}
                    onChange={(e) => setEnergyNotes(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={energyDate}
                    onChange={(e) => setEnergyDate(e.target.value)}
                    required
                  />
                </div>
              </>
            )}

            {type === "meds" && (
              <>
                <div className="space-y-2">
                  <Label>Medication</Label>
                  <Input
                    placeholder="e.g., Vitamin D"
                    value={medName}
                    onChange={(e) => setMedName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <select
                    className="w-full p-2 border rounded"
                    value={medStatus}
                    onChange={(e) => setMedStatus(e.target.value as "taken" | "skipped" | "late")}
                  >
                    <option value="taken">Taken</option>
                    <option value="skipped">Skipped</option>
                    <option value="late">Late</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={medDate}
                    onChange={(e) => setMedDate(e.target.value)}
                    required
                  />
                </div>
              </>
            )}

            {type === "measurements" && (
              <>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={measDate}
                    onChange={(e) => setMeasDate(e.target.value)}
                    required
                  />
                </div>

                <p className="text-xs text-muted-foreground">All measurements in cm. Fill in whichever you tracked.</p>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Neck</Label>
                    <Input type="number" step="0.1" min="0" placeholder="38.0" value={measNeck} onChange={(e) => setMeasNeck(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Chest</Label>
                    <Input type="number" step="0.1" min="0" placeholder="100.0" value={measChest} onChange={(e) => setMeasChest(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Left Arm</Label>
                    <Input type="number" step="0.1" min="0" placeholder="33.0" value={measLeftArm} onChange={(e) => setMeasLeftArm(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Right Arm</Label>
                    <Input type="number" step="0.1" min="0" placeholder="33.0" value={measRightArm} onChange={(e) => setMeasRightArm(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Waist</Label>
                    <Input type="number" step="0.1" min="0" placeholder="80.0" value={measWaist} onChange={(e) => setMeasWaist(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Hips</Label>
                    <Input type="number" step="0.1" min="0" placeholder="95.0" value={measHips} onChange={(e) => setMeasHips(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Left Thigh</Label>
                    <Input type="number" step="0.1" min="0" placeholder="55.0" value={measLeftThigh} onChange={(e) => setMeasLeftThigh(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Right Thigh</Label>
                    <Input type="number" step="0.1" min="0" placeholder="55.0" value={measRightThigh} onChange={(e) => setMeasRightThigh(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Left Calf</Label>
                    <Input type="number" step="0.1" min="0" placeholder="38.0" value={measLeftCalf} onChange={(e) => setMeasLeftCalf(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Right Calf</Label>
                    <Input type="number" step="0.1" min="0" placeholder="38.0" value={measRightCalf} onChange={(e) => setMeasRightCalf(e.target.value)} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Weight (kg, optional)</Label>
                  <Input type="number" step="0.1" min="0" placeholder="70.5" value={measWeight} onChange={(e) => setMeasWeight(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Notes (optional)</Label>
                  <Input placeholder="e.g., morning measurement, flexed" value={measNotes} onChange={(e) => setMeasNotes(e.target.value)} />
                </div>
              </>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={loading || (type === "exercise" && exerciseIsRunning)}
            >
              {loading ? "Saving..." : "Save"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
