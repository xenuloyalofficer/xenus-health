"use client";

import { useState, useEffect, useCallback } from "react";
import { Moon, Pill, Utensils, Zap, Plus, Search, Check, X, Sun, Star, Coffee, Battery, Smile, Meh, Frown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CircularProgress } from "@/components/ui/circular-progress";
import { toast } from "sonner";
import { shouldShowSleepButton, getDefaultMealType } from "@/lib/time-awareness";
import { medium, success } from "@/lib/haptics";
import { cn } from "@/lib/utils";

// --- Sleep tracking state ---
type SleepStatus = "none" | "sleeping" | "woke";

interface SleepTrackingState {
  sleepStatus: SleepStatus;
  currentSleepId: string | null;
  bedtime: string | null;
}

const SLEEP_STORAGE_KEY = "health-os-sleep-tracking";

function loadSleepState(): SleepTrackingState {
  if (typeof window === "undefined") {
    return { sleepStatus: "none", currentSleepId: null, bedtime: null };
  }
  try {
    const stored = localStorage.getItem(SLEEP_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return { sleepStatus: "none", currentSleepId: null, bedtime: null };
}

function saveSleepState(state: SleepTrackingState) {
  try {
    localStorage.setItem(SLEEP_STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatElapsedSleep(bedtime: string): string {
  const ms = Date.now() - new Date(bedtime).getTime();
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  return `${hours}h ${minutes}m`;
}

// --- Types ---
interface MedicationPreset {
  id: string;
  medication_name: string;
  schedule: string[];
  dosage: string | null;
}

interface FoodSearchItem {
  id?: string;
  name: string;
  default_portion_g: number | null;
  per_100g: { calories?: number | null; protein_g?: number | null };
  source?: string;
}

export function HealthTab() {
  // Sleep state
  const [sleepState, setSleepState] = useState<SleepTrackingState>(
    { sleepStatus: "none", currentSleepId: null, bedtime: null }
  );
  const [sleepQuality, setSleepQuality] = useState(3);
  const [sleepLoading, setSleepLoading] = useState(false);

  // Meds state
  const [medPresets, setMedPresets] = useState<MedicationPreset[]>([]);
  const [medPresetsLoading, setMedPresetsLoading] = useState(true);
  const [todayMeds, setTodayMeds] = useState<Record<string, string>>({});
  const [addMedOpen, setAddMedOpen] = useState(false);
  const [newMedName, setNewMedName] = useState("");
  const [newMedDosage, setNewMedDosage] = useState("");
  const [newMedSchedule, setNewMedSchedule] = useState<string[]>(["morning"]);
  const [medLoading, setMedLoading] = useState(false);

  // Food state
  const [foodQuery, setFoodQuery] = useState("");
  const [foodResults, setFoodResults] = useState<{ personal: FoodSearchItem[]; usda: FoodSearchItem[]; openfoodfacts: FoodSearchItem[] } | null>(null);
  const [foodSearching, setFoodSearching] = useState(false);
  const [selectedFood, setSelectedFood] = useState<FoodSearchItem | null>(null);
  const [portionG, setPortionG] = useState("");
  const [mealType, setMealType] = useState<string>(getDefaultMealType());
  const [foodLoading, setFoodLoading] = useState(false);
  const [todayCalories, setTodayCalories] = useState(0);
  const calorieGoal = 2000;

  // Energy/Mood state
  const [energyLevel, setEnergyLevel] = useState<number | null>(null);
  const [moodLevel, setMoodLevel] = useState<number | null>(null);
  const [moodNotes, setMoodNotes] = useState("");
  const [moodLoading, setMoodLoading] = useState(false);

  // Load sleep state on mount
  useEffect(() => {
    setSleepState(loadSleepState());
  }, []);

  // Load medication presets
  useEffect(() => {
    async function loadPresets() {
      try {
        const res = await fetch("/api/medication-presets");
        if (res.ok) {
          const { data } = await res.json();
          setMedPresets(data || []);
        }
      } catch {}
      setMedPresetsLoading(false);
    }
    loadPresets();
  }, []);

  // Load today's calories
  useEffect(() => {
    async function loadCalories() {
      try {
        const res = await fetch("/api/daily-summary");
        if (res.ok) {
          const { data } = await res.json();
          if (data?.food?.totals?.calories) {
            setTodayCalories(Math.round(data.food.totals.calories));
          }
        }
      } catch {}
    }
    loadCalories();
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
        body: JSON.stringify({ sleep_start: now }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || `Failed to save (${res.status})`);
      }
      const { data } = await res.json();
      updateSleepState({ sleepStatus: "sleeping", currentSleepId: data.id, bedtime: now });
      toast.success("Good night! Sleep tracked.");
      medium();
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
      const bedtime = sleepState.bedtime;
      const durationMs = bedtime ? Date.now() - new Date(bedtime).getTime() : 0;
      const durationMinutes = Math.round(durationMs / 60000);

      const res = await fetch("/api/sleep", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: sleepState.currentSleepId,
          sleep_end: now,
          duration_minutes: durationMinutes,
          quality_rating: sleepQuality,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || `Failed to update (${res.status})`);
      }
      toast.success("Good morning! Sleep log complete.");
      success();
      updateSleepState({ sleepStatus: "none", currentSleepId: null, bedtime: null });
      setSleepQuality(3);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSleepLoading(false);
    }
  };

  // --- Meds handlers ---
  const handleLogMed = async (preset: MedicationPreset, status: "taken" | "skipped") => {
    setMedLoading(true);
    try {
      const res = await fetch("/api/medication", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medication_name: preset.medication_name,
          status,
          logged_at: new Date().toISOString(),
        }),
      });
      if (!res.ok) throw new Error("Failed to log");
      setTodayMeds((prev) => ({ ...prev, [preset.id]: status }));
      toast.success(`${preset.medication_name}: ${status}`);
      medium();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to log");
    } finally {
      setMedLoading(false);
    }
  };

  const handleAddPreset = async () => {
    if (!newMedName) return;
    setMedLoading(true);
    try {
      const res = await fetch("/api/medication-presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medication_name: newMedName,
          dosage: newMedDosage || undefined,
          schedule: newMedSchedule,
        }),
      });
      if (!res.ok) throw new Error("Failed to add");
      const { data } = await res.json();
      setMedPresets((prev) => [...prev, data]);
      setNewMedName("");
      setNewMedDosage("");
      setNewMedSchedule(["morning"]);
      setAddMedOpen(false);
      toast.success("Medication added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add");
    } finally {
      setMedLoading(false);
    }
  };

  // --- Food handlers ---
  useEffect(() => {
    if (foodQuery.length < 2) {
      setFoodResults(null);
      return;
    }
    const timer = setTimeout(async () => {
      setFoodSearching(true);
      try {
        const res = await fetch(`/api/nutrition/search?q=${encodeURIComponent(foodQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setFoodResults(data);
        }
      } catch {}
      setFoodSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [foodQuery]);

  const handleSelectFood = async (item: FoodSearchItem) => {
    setSelectedFood(item);
    setPortionG(String(item.default_portion_g || 100));

    if (!item.id && (item.source === "usda" || item.source === "openfoodfacts")) {
      try {
        const res = await fetch("/api/nutrition/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item),
        });
        if (res.ok) {
          const { data } = await res.json();
          setSelectedFood({ ...item, id: data.id });
        }
      } catch {}
    }
  };

  const handleLogFood = async () => {
    if (!selectedFood?.id || !portionG) return;
    setFoodLoading(true);
    try {
      const res = await fetch("/api/nutrition/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          food_catalog_id: selectedFood.id,
          portion_g: parseFloat(portionG),
          meal_type: mealType,
        }),
      });
      if (!res.ok) throw new Error("Failed to log food");
      
      const calories = selectedFood.per_100g?.calories 
        ? Math.round(selectedFood.per_100g.calories * parseFloat(portionG) / 100)
        : 0;
      setTodayCalories(prev => prev + calories);
      
      toast.success(`${selectedFood.name} logged`);
      medium();
      setSelectedFood(null);
      setFoodQuery("");
      setFoodResults(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to log food");
    } finally {
      setFoodLoading(false);
    }
  };

  // --- Mood handler ---
  const handleMoodSubmit = async () => {
    if (energyLevel === null || moodLevel === null) {
      toast.error("Please select both energy and mood levels");
      return;
    }
    setMoodLoading(true);
    try {
      const res = await fetch("/api/energy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          energy_level: energyLevel,
          mood_level: moodLevel,
          notes: moodNotes || undefined,
          logged_at: new Date().toISOString(),
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success("Mood & energy logged");
      medium();
      setEnergyLevel(null);
      setMoodLevel(null);
      setMoodNotes("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setMoodLoading(false);
    }
  };

  const qualityLabels = ["Awful", "Poor", "OK", "Good", "Great"];
  const starLabels = ["☆", "☆", "☆", "☆", "☆"];

  const energyOptions = [
    { level: 1, icon: Battery, label: "Exhausted", color: "bg-red-500" },
    { level: 2, icon: Battery, label: "Low", color: "bg-orange-500" },
    { level: 3, icon: Battery, label: "Moderate", color: "bg-yellow-500" },
    { level: 4, icon: Battery, label: "Good", color: "bg-green-500" },
    { level: 5, icon: Zap, label: "Energized", color: "bg-primary" },
  ];

  const moodOptions = [
    { level: 1, icon: Frown, label: "Awful", color: "bg-red-500" },
    { level: 2, icon: Frown, label: "Not great", color: "bg-orange-500" },
    { level: 3, icon: Meh, label: "Okay", color: "bg-yellow-500" },
    { level: 4, icon: Smile, label: "Good", color: "bg-green-500" },
    { level: 5, icon: Smile, label: "Great", color: "bg-primary" },
  ];

  const showSleep = shouldShowSleepButton() || sleepState.sleepStatus !== "none";
  const medProgress = medPresets.length > 0 
    ? Math.round((Object.keys(todayMeds).length / medPresets.length) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Health</h1>
      </div>

      {/* Sleep Card */}
      {showSleep && (
        <div className={cn(
          "rounded-3xl border-2 p-6 shadow-[4px_4px_0px_0px_rgba(15,15,15,0.1)] transition-all",
          sleepState.sleepStatus === "sleeping" ? "bg-indigo-500 border-indigo-600 text-white" : "bg-card border-foreground/5"
        )}>
          <div className="flex items-center gap-3 mb-4">
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center",
              sleepState.sleepStatus === "sleeping" ? "bg-white/20" : "bg-indigo-100 text-indigo-600"
            )}>
              <Moon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-bold text-lg">Sleep</h2>
              {sleepState.sleepStatus === "sleeping" && (
                <p className="text-white/80 text-sm">Sleeping now</p>
              )}
            </div>
          </div>

          {sleepState.sleepStatus === "none" && (
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Tap when you&apos;re heading to bed. We&apos;ll track the time.
              </p>
              <Button
                onClick={handleGoingToSleep}
                disabled={sleepLoading}
                className="w-full h-14 rounded-2xl text-lg font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-[4px_4px_0px_0px_rgba(223,255,0,0.4)]"
              >
                {sleepLoading ? "Saving..." : "GOING TO SLEEP"}
              </Button>
            </div>
          )}

          {sleepState.sleepStatus === "sleeping" && (
            <div className="space-y-4">
              <div className="text-center py-4">
                <p className="text-white/80 text-sm mb-1">In bed since {sleepState.bedtime ? formatTime(sleepState.bedtime) : "..."}</p>
                {sleepState.bedtime && (
                  <p className="text-5xl font-bold tabular-nums">{formatElapsedSleep(sleepState.bedtime)}</p>
                )}
              </div>
              <Button
                onClick={handleGoodMorning}
                className="w-full h-14 rounded-2xl text-lg font-bold bg-white text-foreground hover:bg-white/90 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]"
              >
                GOOD MORNING
              </Button>
            </div>
          )}

          {sleepState.sleepStatus === "woke" && (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-muted-foreground text-sm">Slept for {sleepState.bedtime ? formatElapsedSleep(sleepState.bedtime) : "..."}</p>
              </div>
              <div>
                <p className="text-sm font-medium mb-3 text-center">How did you sleep?</p>
                <div className="flex gap-2 justify-center">
                  {[1, 2, 3, 4, 5].map((val) => (
                    <button
                      key={val}
                      onClick={() => setSleepQuality(val)}
                      className={cn(
                        "w-12 h-12 rounded-xl text-xl transition-all",
                        sleepQuality === val 
                          ? "bg-primary text-primary-foreground shadow-lg scale-110" 
                          : "bg-secondary hover:bg-secondary/80"
                      )}
                    >
                      {val >= sleepQuality ? "★" : "☆"}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground text-center mt-2">{qualityLabels[sleepQuality - 1]}</p>
              </div>
              <Button
                onClick={handleSaveMorning}
                disabled={sleepLoading}
                className="w-full h-12 rounded-xl font-bold"
              >
                {sleepLoading ? "Saving..." : "Complete Sleep Log"}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Food / Calories Card */}
      <div className="bg-card rounded-3xl border-2 border-foreground/5 p-6 shadow-[4px_4px_0px_0px_rgba(15,15,15,0.05)]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-orange-500 flex items-center justify-center">
              <Utensils className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-lg">Nutrition</h2>
              <p className="text-sm text-muted-foreground">{todayCalories} / {calorieGoal} cal</p>
            </div>
          </div>
          <div className="relative">
            <CircularProgress 
              value={(todayCalories / calorieGoal) * 100} 
              size={70} 
              strokeWidth={8}
              color="#f97316"
            >
              <span className="text-xs font-bold">{Math.round((todayCalories / calorieGoal) * 100)}%</span>
            </CircularProgress>
          </div>
        </div>

        {/* Food Search */}
        <div className="relative mb-3">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            className="pl-12 h-14 rounded-xl text-base"
            placeholder="Search foods..."
            value={foodQuery}
            onChange={(e) => setFoodQuery(e.target.value)}
          />
        </div>

        {foodSearching && <p className="text-sm text-muted-foreground">Searching...</p>}

        {/* Search Results */}
        {foodResults && !selectedFood && (
          <div className="max-h-48 overflow-y-auto space-y-1 -mx-2 px-2">
            {foodResults.personal.length > 0 && (
              <>
                <p className="text-xs font-bold text-muted-foreground uppercase mt-2 mb-1">Your Foods</p>
                {foodResults.personal.map((item, i) => (
                  <button
                    key={`p-${i}`}
                    className="w-full text-left p-3 rounded-xl hover:bg-secondary transition-colors flex justify-between items-center"
                    onClick={() => handleSelectFood(item)}
                  >
                    <span className="font-medium">{item.name}</span>
                    <span className="text-muted-foreground text-sm">{item.per_100g?.calories ?? "?"} cal/100g</span>
                  </button>
                ))}
              </>
            )}
            {foodResults.usda.length > 0 && (
              <>
                <p className="text-xs font-bold text-muted-foreground uppercase mt-2 mb-1">USDA Database</p>
                {foodResults.usda.map((item, i) => (
                  <button
                    key={`u-${i}`}
                    className="w-full text-left p-3 rounded-xl hover:bg-secondary transition-colors flex justify-between items-center"
                    onClick={() => handleSelectFood(item)}
                  >
                    <span className="font-medium">{item.name}</span>
                    <span className="text-muted-foreground text-sm">{item.per_100g?.calories ?? "?"} cal/100g</span>
                  </button>
                ))}
              </>
            )}
          </div>
        )}

        {/* Selected Food */}
        {selectedFood && (
          <div className="mt-3 bg-secondary/50 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-bold">{selectedFood.name}</p>
              <button onClick={() => setSelectedFood(null)} className="p-1 rounded-lg hover:bg-secondary">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex gap-2">
              <div className="flex-1">
                <Label className="text-xs">Portion (g)</Label>
                <Input
                  type="number"
                  min="1"
                  value={portionG}
                  onChange={(e) => setPortionG(e.target.value)}
                  className="h-12 rounded-xl mt-1"
                />
              </div>
              <div className="flex gap-1 pt-6">
                <Button variant="outline" size="sm" onClick={() => setPortionG("100")} className="rounded-lg">100g</Button>
                <Button variant="outline" size="sm" onClick={() => setPortionG("200")} className="rounded-lg">200g</Button>
              </div>
            </div>

            <div>
              <Label className="text-xs">Meal</Label>
              <div className="flex gap-2 mt-1">
                {["breakfast", "lunch", "dinner", "snack"].map((mt) => (
                  <button
                    key={mt}
                    onClick={() => setMealType(mt)}
                    className={cn(
                      "flex-1 py-2 rounded-xl text-sm font-medium capitalize transition-colors",
                      mealType === mt ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/80"
                    )}
                  >
                    {mt}
                  </button>
                ))}
              </div>
            </div>

            {portionG && selectedFood.per_100g?.calories != null && (
              <p className="text-center font-bold text-lg">
                = {Math.round(selectedFood.per_100g.calories * parseFloat(portionG) / 100)} calories
              </p>
            )}

            <Button onClick={handleLogFood} disabled={foodLoading} className="w-full h-12 rounded-xl font-bold">
              {foodLoading ? "Saving..." : "Log Food"}
            </Button>
          </div>
        )}
      </div>

      {/* Medications Card */}
      <div className="bg-card rounded-3xl border-2 border-foreground/5 p-6 shadow-[4px_4px_0px_0px_rgba(15,15,15,0.05)]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-red-500 flex items-center justify-center">
              <Pill className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-lg">Medications</h2>
              <p className="text-sm text-muted-foreground">{Object.keys(todayMeds).length}/{medPresets.length} taken</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setAddMedOpen(true)} className="rounded-full">
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Progress bar */}
        {medPresets.length > 0 && (
          <div className="h-2 bg-secondary rounded-full mb-4 overflow-hidden">
            <div className="h-full bg-red-500 rounded-full transition-all" style={{ width: `${medProgress}%` }} />
          </div>
        )}

        {medPresetsLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : medPresets.length === 0 ? (
          <div className="text-center py-6 space-y-3">
            <p className="text-muted-foreground">Add your medications to track them daily.</p>
            <Button onClick={() => setAddMedOpen(true)} variant="outline" className="rounded-full">
              <Plus className="h-4 w-4 mr-1" /> Add Medication
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {medPresets.map((preset) => {
              const status = todayMeds[preset.id];
              return (
                <div
                  key={preset.id}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-2xl transition-all",
                    status === "taken" ? "bg-green-100 border-2 border-green-200" : 
                    status === "skipped" ? "bg-gray-100 border-2 border-gray-200 opacity-60" : 
                    "bg-secondary/50 border-2 border-transparent"
                  )}
                >
                  <div>
                    <p className={cn("font-semibold", status === "taken" && "text-green-800", status === "skipped" && "text-gray-500 line-through")}>
                      {preset.medication_name}
                    </p>
                    {preset.dosage && (
                      <p className="text-xs text-muted-foreground">{preset.dosage}</p>
                    )}
                  </div>
                  {!status ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleLogMed(preset, "taken")}
                        disabled={medLoading}
                        className="w-10 h-10 rounded-xl bg-green-500 text-white flex items-center justify-center hover:bg-green-600 transition-colors"
                      >
                        <Check className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleLogMed(preset, "skipped")}
                        disabled={medLoading}
                        className="w-10 h-10 rounded-xl bg-gray-400 text-white flex items-center justify-center hover:bg-gray-500 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <div className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-bold",
                      status === "taken" ? "bg-green-500 text-white" : "bg-gray-400 text-white"
                    )}>
                      {status}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Medication Dialog */}
      <Dialog open={addMedOpen} onOpenChange={setAddMedOpen}>
        <DialogContent className="sm:max-w-[400px] rounded-3xl border-2">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Add Medication</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label className="font-medium">Medication Name</Label>
              <Input placeholder="e.g., Vitamin D" value={newMedName} onChange={(e) => setNewMedName(e.target.value)} className="h-12 rounded-xl mt-1.5" />
            </div>
            <div>
              <Label className="font-medium">Dosage (optional)</Label>
              <Input placeholder="e.g., 500mg" value={newMedDosage} onChange={(e) => setNewMedDosage(e.target.value)} className="h-12 rounded-xl mt-1.5" />
            </div>
            <div>
              <Label className="font-medium">Schedule</Label>
              <div className="flex gap-2 flex-wrap mt-1.5">
                {["morning", "afternoon", "evening", "night"].map((time) => (
                  <button
                    key={time}
                    onClick={() => {
                      setNewMedSchedule((prev) =>
                        prev.includes(time) ? prev.filter((t) => t !== time) : [...prev, time]
                      );
                    }}
                    className={cn(
                      "px-4 py-2 rounded-xl text-sm font-medium capitalize transition-colors",
                      newMedSchedule.includes(time) ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/80"
                    )}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>
            <Button onClick={handleAddPreset} disabled={medLoading || !newMedName} className="w-full h-12 rounded-xl">
              {medLoading ? "Saving..." : "Add Medication"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Energy / Mood Card */}
      <div className="bg-card rounded-3xl border-2 border-foreground/5 p-6 shadow-[4px_4px_0px_0px_rgba(15,15,15,0.05)]">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-yellow-500 flex items-center justify-center">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-lg">Energy & Mood</h2>
            <p className="text-sm text-muted-foreground">How are you feeling?</p>
          </div>
        </div>

        {/* Energy selector */}
        <div className="mb-6">
          <p className="text-sm font-medium mb-3">Energy Level</p>
          <div className="grid grid-cols-5 gap-2">
            {energyOptions.map((opt) => {
              const Icon = opt.icon;
              const isSelected = energyLevel === opt.level;
              return (
                <button
                  key={opt.level}
                  onClick={() => setEnergyLevel(opt.level)}
                  className={cn(
                    "flex flex-col items-center gap-1 p-2 rounded-xl transition-all min-w-0",
                    isSelected ? opt.color + " text-white shadow-lg scale-105" : "bg-secondary hover:bg-secondary/80"
                  )}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <span className="text-[10px] font-medium leading-tight">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Mood selector */}
        <div className="mb-6">
          <p className="text-sm font-medium mb-3">Mood</p>
          <div className="grid grid-cols-5 gap-2">
            {moodOptions.map((opt) => {
              const Icon = opt.icon;
              const isSelected = moodLevel === opt.level;
              return (
                <button
                  key={opt.level}
                  onClick={() => setMoodLevel(opt.level)}
                  className={cn(
                    "flex flex-col items-center gap-1 p-2 rounded-xl transition-all min-w-0",
                    isSelected ? opt.color + " text-white shadow-lg scale-105" : "bg-secondary hover:bg-secondary/80"
                  )}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <span className="text-[10px] font-medium leading-tight">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Notes */}
        <div className="mb-4">
          <Input
            placeholder="Add a note about how you're feeling..."
            value={moodNotes}
            onChange={(e) => setMoodNotes(e.target.value)}
            className="h-12 rounded-xl"
          />
        </div>

        <Button
          onClick={handleMoodSubmit}
          disabled={moodLoading || energyLevel === null || moodLevel === null}
          className="w-full h-12 rounded-xl font-bold"
        >
          {moodLoading ? "Saving..." : "Log Energy & Mood"}
        </Button>
      </div>
    </div>
  );
}
