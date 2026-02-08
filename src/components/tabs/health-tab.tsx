"use client";

import { useState, useEffect, useCallback } from "react";
import { Moon, Pill, Utensils, Zap, Plus, Search, Check, X, BatteryLow, BatteryMedium, BatteryFull, BatteryCharging, Smile, Meh, Frown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { shouldShowSleepButton, getDefaultMealType } from "@/lib/time-awareness";
import { medium, success } from "@/lib/haptics";

// --- Sleep tracking state (persisted in localStorage) ---

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

// --- Medication preset type ---

interface MedicationPreset {
  id: string;
  medication_name: string;
  schedule: string[];
  dosage: string | null;
}

// --- Food search result type ---

interface FoodSearchItem {
  id?: string;
  name: string;
  default_portion_g: number | null;
  per_100g: { calories?: number | null; protein_g?: number | null };
  source?: string;
  source_id?: string;
  name_normalized?: string;
  barcode?: string;
}

// --- Component ---

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

  // Energy/Mood state
  const [energyLevel, setEnergyLevel] = useState<number | null>(null);
  const [moodLevel, setMoodLevel] = useState<number | null>(null);
  const [moodNotes, setMoodNotes] = useState("");
  const [moodNotesOpen, setMoodNotesOpen] = useState(false);
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

    // If from external source, save to catalog first
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

  // --- Energy/Mood handler ---

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
      setMoodNotesOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setMoodLoading(false);
    }
  };

  // --- Sleep quality labels ---
  const qualityLabels = ["Awful", "Poor", "OK", "Good", "Great"];

  // --- Energy icons/labels ---
  const energyOptions = [
    { level: 1, icon: BatteryLow, label: "Exhausted", color: "text-red-500 bg-red-50 border-red-200" },
    { level: 2, icon: BatteryLow, label: "Low", color: "text-orange-500 bg-orange-50 border-orange-200" },
    { level: 3, icon: BatteryMedium, label: "Moderate", color: "text-yellow-500 bg-yellow-50 border-yellow-200" },
    { level: 4, icon: BatteryFull, label: "Good", color: "text-green-500 bg-green-50 border-green-200" },
    { level: 5, icon: BatteryCharging, label: "Energized", color: "text-emerald-500 bg-emerald-50 border-emerald-200" },
  ];

  const moodOptions = [
    { level: 1, icon: Frown, label: "Awful", color: "text-red-500 bg-red-50 border-red-200" },
    { level: 2, icon: Frown, label: "Not great", color: "text-orange-500 bg-orange-50 border-orange-200" },
    { level: 3, icon: Meh, label: "Okay", color: "text-yellow-500 bg-yellow-50 border-yellow-200" },
    { level: 4, icon: Smile, label: "Good", color: "text-green-500 bg-green-50 border-green-200" },
    { level: 5, icon: Smile, label: "Great", color: "text-emerald-500 bg-emerald-50 border-emerald-200" },
  ];

  const showSleep = shouldShowSleepButton() || sleepState.sleepStatus !== "none";

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Health</h2>

      {/* Sleep Card */}
      {showSleep && (
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

            {sleepState.sleepStatus === "sleeping" && (
              <div className="space-y-3">
                <div className="text-center space-y-1">
                  <p className="text-sm text-muted-foreground">
                    In bed since {sleepState.bedtime ? formatTime(sleepState.bedtime) : "..."}
                  </p>
                  {sleepState.bedtime && (
                    <p className="text-2xl font-mono font-bold">
                      {formatElapsedSleep(sleepState.bedtime)}
                    </p>
                  )}
                </div>
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

            {sleepState.sleepStatus === "woke" && (
              <div className="space-y-4">
                <div className="text-center space-y-1">
                  <p className="text-sm text-muted-foreground">
                    Slept for {sleepState.bedtime ? formatElapsedSleep(sleepState.bedtime) : "..."}
                  </p>
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
                          sleepQuality === val ? "bg-indigo-600 hover:bg-indigo-700 text-white" : ""
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
      )}

      {/* Medications Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Pill className="h-5 w-5" />
              Medications
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => setAddMedOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {medPresetsLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : medPresets.length === 0 ? (
            <div className="text-center py-6 space-y-3">
              <p className="text-sm text-muted-foreground">
                Add your medications once, then log them daily with a tap.
              </p>
              <Button variant="outline" onClick={() => setAddMedOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> Set Up Medications
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {medPresets.map((preset) => {
                const status = todayMeds[preset.id];
                return (
                  <div
                    key={preset.id}
                    className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                      status === "taken" ? "bg-green-50" : status === "skipped" ? "bg-gray-50" : "bg-muted/50"
                    }`}
                  >
                    <div>
                      <p className={`font-medium text-sm ${status === "taken" ? "text-green-700" : status === "skipped" ? "text-gray-500 line-through" : ""}`}>
                        {preset.medication_name}
                      </p>
                      {preset.dosage && (
                        <p className="text-xs text-muted-foreground">{preset.dosage}</p>
                      )}
                    </div>
                    {!status ? (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-3 text-green-700 border-green-200 hover:bg-green-50"
                          onClick={() => handleLogMed(preset, "taken")}
                          disabled={medLoading}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-3 text-gray-500 border-gray-200 hover:bg-gray-50"
                          onClick={() => handleLogMed(preset, "skipped")}
                          disabled={medLoading}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Badge variant={status === "taken" ? "default" : "secondary"} className="text-xs">
                        {status}
                      </Badge>
                    )}
                  </div>
                );
              })}
              <p className="text-xs text-muted-foreground text-center pt-1">
                {Object.keys(todayMeds).length}/{medPresets.length} logged
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Medication Dialog */}
      <Dialog open={addMedOpen} onOpenChange={setAddMedOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Add Medication</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Medication Name</Label>
              <Input placeholder="e.g., Vitamin D" value={newMedName} onChange={(e) => setNewMedName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Dosage (optional)</Label>
              <Input placeholder="e.g., 500mg" value={newMedDosage} onChange={(e) => setNewMedDosage(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Schedule</Label>
              <div className="flex gap-2 flex-wrap">
                {["morning", "afternoon", "evening", "night"].map((time) => (
                  <Button
                    key={time}
                    type="button"
                    size="sm"
                    variant={newMedSchedule.includes(time) ? "default" : "outline"}
                    onClick={() => {
                      setNewMedSchedule((prev) =>
                        prev.includes(time) ? prev.filter((t) => t !== time) : [...prev, time]
                      );
                    }}
                  >
                    {time}
                  </Button>
                ))}
              </div>
            </div>
            <Button className="w-full" onClick={handleAddPreset} disabled={medLoading || !newMedName}>
              {medLoading ? "Saving..." : "Add Medication"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Food Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Utensils className="h-5 w-5" />
            Food
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search foods..."
              value={foodQuery}
              onChange={(e) => setFoodQuery(e.target.value)}
            />
          </div>

          {/* Search Results */}
          {foodSearching && <p className="text-xs text-muted-foreground">Searching...</p>}

          {foodResults && !selectedFood && (
            <div className="max-h-60 overflow-y-auto space-y-1">
              {foodResults.personal.length > 0 && (
                <>
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Your Foods</p>
                  {foodResults.personal.map((item, i) => (
                    <button
                      key={`p-${i}`}
                      className="w-full text-left p-2 rounded-md hover:bg-muted text-sm flex justify-between"
                      onClick={() => handleSelectFood(item)}
                    >
                      <span>{item.name}</span>
                      <span className="text-muted-foreground text-xs">
                        {item.per_100g?.calories ?? "?"} cal/100g
                      </span>
                    </button>
                  ))}
                </>
              )}
              {foodResults.usda.length > 0 && (
                <>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mt-2">USDA Database</p>
                  {foodResults.usda.map((item, i) => (
                    <button
                      key={`u-${i}`}
                      className="w-full text-left p-2 rounded-md hover:bg-muted text-sm flex justify-between"
                      onClick={() => handleSelectFood(item)}
                    >
                      <span>{item.name}</span>
                      <span className="text-muted-foreground text-xs">
                        {item.per_100g?.calories ?? "?"} cal/100g
                      </span>
                    </button>
                  ))}
                </>
              )}
              {foodResults.openfoodfacts.length > 0 && (
                <>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mt-2">Open Food Facts</p>
                  {foodResults.openfoodfacts.map((item, i) => (
                    <button
                      key={`o-${i}`}
                      className="w-full text-left p-2 rounded-md hover:bg-muted text-sm flex justify-between"
                      onClick={() => handleSelectFood(item)}
                    >
                      <span>{item.name}</span>
                      <span className="text-muted-foreground text-xs">
                        {item.per_100g?.calories ?? "?"} cal/100g
                      </span>
                    </button>
                  ))}
                </>
              )}
              {foodResults.personal.length === 0 && foodResults.usda.length === 0 && foodResults.openfoodfacts.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-3">No results found</p>
              )}
            </div>
          )}

          {/* Selected Food - Log Panel */}
          {selectedFood && (
            <div className="border rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-medium text-sm">{selectedFood.name}</p>
                <Button variant="ghost" size="sm" onClick={() => setSelectedFood(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="text-xs text-muted-foreground">
                Per 100g: {selectedFood.per_100g?.calories ?? "?"} cal, {selectedFood.per_100g?.protein_g ?? "?"}g protein
              </div>
              <div className="flex gap-2 items-end">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Portion (g)</Label>
                  <div className="flex gap-1">
                    <Input
                      type="number"
                      min="1"
                      value={portionG}
                      onChange={(e) => setPortionG(e.target.value)}
                    />
                    <Button variant="outline" size="sm" onClick={() => setPortionG("100")}>100g</Button>
                    <Button variant="outline" size="sm" onClick={() => setPortionG("200")}>200g</Button>
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Meal</Label>
                <div className="flex gap-1">
                  {["breakfast", "lunch", "dinner", "snack"].map((mt) => (
                    <Button
                      key={mt}
                      size="sm"
                      variant={mealType === mt ? "default" : "outline"}
                      onClick={() => setMealType(mt)}
                      className="capitalize text-xs"
                    >
                      {mt}
                    </Button>
                  ))}
                </div>
              </div>
              {portionG && selectedFood.per_100g?.calories != null && (
                <p className="text-sm font-medium">
                  = {Math.round(selectedFood.per_100g.calories * parseFloat(portionG) / 100)} calories
                </p>
              )}
              <Button className="w-full" onClick={handleLogFood} disabled={foodLoading}>
                {foodLoading ? "Saving..." : "Log Food"}
              </Button>
            </div>
          )}
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
        <CardContent className="space-y-4">
          {/* Energy selector */}
          <div className="space-y-2">
            <Label className="text-sm">How&apos;s your energy?</Label>
            <div className="flex gap-2 justify-center">
              {energyOptions.map((opt) => {
                const Icon = opt.icon;
                const isSelected = energyLevel === opt.level;
                return (
                  <button
                    key={opt.level}
                    onClick={() => setEnergyLevel(opt.level)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all min-w-[56px] ${
                      isSelected ? opt.color + " border-current scale-110" : "border-transparent hover:bg-muted"
                    }`}
                  >
                    <Icon className={`h-7 w-7 ${isSelected ? "" : "text-muted-foreground"}`} />
                    <span className="text-[10px] font-medium">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mood selector */}
          <div className="space-y-2">
            <Label className="text-sm">How&apos;s your mood?</Label>
            <div className="flex gap-2 justify-center">
              {moodOptions.map((opt) => {
                const Icon = opt.icon;
                const isSelected = moodLevel === opt.level;
                return (
                  <button
                    key={opt.level}
                    onClick={() => setMoodLevel(opt.level)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all min-w-[56px] ${
                      isSelected ? opt.color + " border-current scale-110" : "border-transparent hover:bg-muted"
                    }`}
                  >
                    <Icon className={`h-7 w-7 ${isSelected ? "" : "text-muted-foreground"}`} />
                    <span className="text-[10px] font-medium">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes toggle */}
          {!moodNotesOpen ? (
            <button
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setMoodNotesOpen(true)}
            >
              Add a note...
            </button>
          ) : (
            <Input
              placeholder="How are you feeling?"
              value={moodNotes}
              onChange={(e) => setMoodNotes(e.target.value)}
            />
          )}

          <Button
            className="w-full"
            onClick={handleMoodSubmit}
            disabled={moodLoading || energyLevel === null || moodLevel === null}
          >
            {moodLoading ? "Saving..." : "Log Energy & Mood"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
