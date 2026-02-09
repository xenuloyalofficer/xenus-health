"use client";

import { useState, useEffect, useCallback } from "react";
import { Utensils, Search, X, Minus, Plus, Trash2, Pencil, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CircularProgress } from "@/components/ui/circular-progress";
import { toast } from "sonner";
import { getDefaultMealType } from "@/lib/time-awareness";
import { medium, success } from "@/lib/haptics";
import { cn } from "@/lib/utils";

// --- Types ---

interface NutritionSnapshot {
  calories?: number | null;
  protein_g?: number | null;
  fat_g?: number | null;
  carbs_g?: number | null;
  [key: string]: unknown;
}

interface FoodEntry {
  id: string;
  food_catalog_id: string;
  food_name: string;
  portion_g: number;
  meal_type: string | null;
  nutrition_snapshot: NutritionSnapshot;
  notes: string | null;
  logged_at: string;
}

interface FoodSearchItem {
  id?: string;
  name: string;
  name_normalized?: string;
  default_portion_g: number | null;
  per_100g: NutritionSnapshot;
  source?: string;
  source_id?: string | null;
  barcode?: string | null;
  times_logged?: number;
}

interface TodayData {
  meals: Record<string, FoodEntry[]>;
  totals: {
    total_calories: number;
    total_protein_g: number;
    total_fat_g: number;
    total_carbs_g: number;
  };
  entry_count: number;
}

const DEFAULT_GOALS = { calories: 2000, protein_g: 150, fat_g: 65, carbs_g: 250 };
const GOALS_STORAGE_KEY = "health-os-nutrition-goals";

function loadGoals(): typeof DEFAULT_GOALS {
  if (typeof window === "undefined") return DEFAULT_GOALS;
  try {
    const stored = localStorage.getItem(GOALS_STORAGE_KEY);
    if (stored) return { ...DEFAULT_GOALS, ...JSON.parse(stored) };
  } catch {}
  return DEFAULT_GOALS;
}

function saveGoals(goals: typeof DEFAULT_GOALS) {
  try { localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(goals)); } catch {}
}

const MEAL_ORDER = ["breakfast", "lunch", "dinner", "snack"] as const;
const MEAL_LABELS: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snacks",
};
const MEAL_ICONS: Record<string, string> = {
  breakfast: "🌅",
  lunch: "☀️",
  dinner: "🌙",
  snack: "🍿",
};

export function NutritionSection() {
  // Goals state
  const [goals, setGoals] = useState(DEFAULT_GOALS);
  const [showGoals, setShowGoals] = useState(false);

  // Load goals from localStorage
  useEffect(() => { setGoals(loadGoals()); }, []);

  // Today's data
  const [todayData, setTodayData] = useState<TodayData | null>(null);
  const [todayLoading, setTodayLoading] = useState(true);

  // Search state
  const [foodQuery, setFoodQuery] = useState("");
  const [foodResults, setFoodResults] = useState<{
    personal: FoodSearchItem[];
    usda: FoodSearchItem[];
    openfoodfacts: FoodSearchItem[];
  } | null>(null);
  const [foodSearching, setFoodSearching] = useState(false);

  // Selection / logging state
  const [selectedFood, setSelectedFood] = useState<FoodSearchItem | null>(null);
  const [portionG, setPortionG] = useState(100);
  const [mealType, setMealType] = useState<string>(getDefaultMealType());
  const [foodLoading, setFoodLoading] = useState(false);

  // Recent foods
  const [recentFoods, setRecentFoods] = useState<FoodSearchItem[]>([]);

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Edit entry state
  const [editingEntry, setEditingEntry] = useState<FoodEntry | null>(null);
  const [editEntryPortionG, setEditEntryPortionG] = useState(100);
  const [editEntryMealType, setEditEntryMealType] = useState<string>("breakfast");
  const [editEntrySaving, setEditEntrySaving] = useState(false);

  // Custom food form state
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customPortionDefault, setCustomPortionDefault] = useState("100");
  const [customCal, setCustomCal] = useState("");
  const [customProtein, setCustomProtein] = useState("");
  const [customFat, setCustomFat] = useState("");
  const [customCarbs, setCustomCarbs] = useState("");
  const [customFiber, setCustomFiber] = useState("");
  const [customSugar, setCustomSugar] = useState("");
  const [customSodium, setCustomSodium] = useState("");
  const [customSaving, setCustomSaving] = useState(false);

  // Edit nutrition state (for portion screen)
  const [editingNutrition, setEditingNutrition] = useState(false);
  const [editCal, setEditCal] = useState("");
  const [editProtein, setEditProtein] = useState("");
  const [editFat, setEditFat] = useState("");
  const [editCarbs, setEditCarbs] = useState("");

  // --- Load today's data ---
  const loadTodayData = useCallback(async () => {
    try {
      const res = await fetch("/api/nutrition/today");
      if (res.ok) {
        const data: TodayData = await res.json();
        setTodayData(data);
      }
    } catch {
      // silent fail
    } finally {
      setTodayLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTodayData();
  }, [loadTodayData]);

  // --- Load recent foods from recent entries ---
  const loadRecentFoods = useCallback(async () => {
    try {
      const res = await fetch("/api/food?limit=20");
      if (res.ok) {
        const { data } = await res.json();
        if (data && data.length > 0) {
          // Deduplicate by food_catalog_id, keep most recent
          const seen = new Set<string>();
          const unique: FoodSearchItem[] = [];
          for (const entry of data as FoodEntry[]) {
            if (!entry.food_catalog_id || seen.has(entry.food_catalog_id)) continue;
            seen.add(entry.food_catalog_id);
            unique.push({
              id: entry.food_catalog_id,
              name: entry.food_name,
              default_portion_g: entry.portion_g,
              per_100g: entry.nutrition_snapshot
                ? {
                    calories: entry.nutrition_snapshot.calories != null && entry.portion_g > 0
                      ? Math.round(((entry.nutrition_snapshot.calories as number) / entry.portion_g) * 100)
                      : null,
                    protein_g: entry.nutrition_snapshot.protein_g != null && entry.portion_g > 0
                      ? Math.round(((entry.nutrition_snapshot.protein_g as number) / entry.portion_g) * 100 * 10) / 10
                      : null,
                  }
                : {},
              source: "user",
            });
            if (unique.length >= 8) break;
          }
          setRecentFoods(unique);
        }
      }
    } catch {
      // silent fail
    }
  }, []);

  useEffect(() => {
    loadRecentFoods();
  }, [loadRecentFoods]);

  // --- Debounced food search ---
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
      } catch {
        // silent
      }
      setFoodSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [foodQuery]);

  // --- Handlers ---

  const handleSelectFood = async (item: FoodSearchItem) => {
    setSelectedFood(item);
    setPortionG(item.default_portion_g || 100);
    setFoodResults(null);
    setFoodQuery("");

    // If external food, save to catalog first
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
      } catch {
        // silent
      }
    }
  };

  const handleLogFood = async () => {
    if (!selectedFood?.id || portionG <= 0) return;
    setFoodLoading(true);
    try {
      const res = await fetch("/api/nutrition/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          food_catalog_id: selectedFood.id,
          portion_g: portionG,
          meal_type: mealType,
        }),
      });
      if (!res.ok) throw new Error("Failed to log food");

      toast.success(`${selectedFood.name} logged`);
      success();
      setSelectedFood(null);
      setFoodQuery("");
      setFoodResults(null);
      setPortionG(100);
      // Refresh today's data
      await loadTodayData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to log food");
    } finally {
      setFoodLoading(false);
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    setDeletingId(entryId);
    try {
      const res = await fetch("/api/food", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: entryId }),
      });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Entry removed");
      medium();
      await loadTodayData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  };

  const handleEditEntry = (entry: FoodEntry) => {
    setEditingEntry(entry);
    setEditEntryPortionG(entry.portion_g);
    setEditEntryMealType(entry.meal_type || "snack");
  };

  const handleSaveEditEntry = async () => {
    if (!editingEntry) return;
    setEditEntrySaving(true);
    try {
      // Recalculate nutrition snapshot based on new portion
      const ratio = editEntryPortionG / editingEntry.portion_g;
      const oldSnap = editingEntry.nutrition_snapshot || {};
      const newSnap: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(oldSnap)) {
        newSnap[key] = typeof val === "number" ? Math.round(val * ratio * 10) / 10 : val;
      }

      const res = await fetch("/api/food", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingEntry.id,
          portion_g: editEntryPortionG,
          meal_type: editEntryMealType,
          nutrition_snapshot: newSnap,
        }),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast.success("Entry updated");
      medium();
      setEditingEntry(null);
      await loadTodayData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setEditEntrySaving(false);
    }
  };

  const handleQuickLog = async (item: FoodSearchItem) => {
    if (!item.id) return;
    setFoodLoading(true);
    try {
      const res = await fetch("/api/nutrition/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          food_catalog_id: item.id,
          portion_g: item.default_portion_g || 100,
          meal_type: getDefaultMealType(),
        }),
      });
      if (!res.ok) throw new Error("Failed to log");
      toast.success(`${item.name} logged`);
      success();
      await loadTodayData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to log");
    } finally {
      setFoodLoading(false);
    }
  };

  // --- Custom food handlers ---

  const resetCustomForm = () => {
    setCustomName("");
    setCustomPortionDefault("100");
    setCustomCal("");
    setCustomProtein("");
    setCustomFat("");
    setCustomCarbs("");
    setCustomFiber("");
    setCustomSugar("");
    setCustomSodium("");
    setShowCustomForm(false);
  };

  const handleSaveCustomFood = async () => {
    if (!customName || !customCal || !customProtein || !customFat || !customCarbs) {
      toast.error("Name, calories, protein, fat, and carbs are required");
      return;
    }
    setCustomSaving(true);
    try {
      const per_100g = {
        calories: parseFloat(customCal) || 0,
        protein_g: parseFloat(customProtein) || 0,
        fat_g: parseFloat(customFat) || 0,
        carbs_g: parseFloat(customCarbs) || 0,
        fiber_g: customFiber ? parseFloat(customFiber) : null,
        sugar_g: customSugar ? parseFloat(customSugar) : null,
        sodium_mg: customSodium ? parseFloat(customSodium) : null,
      };
      const defaultPortion = parseInt(customPortionDefault) || 100;

      const res = await fetch("/api/nutrition/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: customName,
          name_normalized: customName.toLowerCase().trim(),
          source: "user",
          default_portion_g: defaultPortion,
          per_100g,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      const { data } = await res.json();

      toast.success(`${customName} saved`);
      medium();

      // Open portion/log flow with the new food
      const newFood: FoodSearchItem = {
        id: data.id,
        name: customName,
        default_portion_g: defaultPortion,
        per_100g,
        source: "user",
      };
      setSelectedFood(newFood);
      setPortionG(defaultPortion);
      resetCustomForm();
      setFoodQuery("");
      setFoodResults(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save food");
    } finally {
      setCustomSaving(false);
    }
  };

  const handleOpenEditNutrition = () => {
    if (!selectedFood) return;
    setEditCal(String(selectedFood.per_100g?.calories ?? ""));
    setEditProtein(String(selectedFood.per_100g?.protein_g ?? ""));
    setEditFat(String(selectedFood.per_100g?.fat_g ?? ""));
    setEditCarbs(String(selectedFood.per_100g?.carbs_g ?? ""));
    setEditingNutrition(true);
  };

  const handleSaveEditNutrition = async () => {
    if (!selectedFood?.id) return;
    const updatedPer100g: NutritionSnapshot = {
      ...selectedFood.per_100g,
      calories: parseFloat(editCal) || 0,
      protein_g: parseFloat(editProtein) || 0,
      fat_g: parseFloat(editFat) || 0,
      carbs_g: parseFloat(editCarbs) || 0,
    };
    // Update local state immediately
    setSelectedFood({ ...selectedFood, per_100g: updatedPer100g });
    setEditingNutrition(false);
    medium();

    // Persist to database
    try {
      const res = await fetch("/api/nutrition/save", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedFood.id, per_100g: updatedPer100g }),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success("Nutrition saved");
    } catch {
      toast.error("Nutrition updated locally but failed to save to database");
    }
  };

  // --- Computed values ---
  const totals = todayData?.totals ?? {
    total_calories: 0,
    total_protein_g: 0,
    total_fat_g: 0,
    total_carbs_g: 0,
  };
  const calPct = Math.min(Math.round((totals.total_calories / goals.calories) * 100), 100);
  const proteinPct = Math.min(Math.round((totals.total_protein_g / goals.protein_g) * 100), 100);
  const fatPct = Math.min(Math.round((totals.total_fat_g / goals.fat_g) * 100), 100);
  const carbsPct = Math.min(Math.round((totals.total_carbs_g / goals.carbs_g) * 100), 100);

  // Preview nutrition for selected food at current portion
  const previewCal = selectedFood?.per_100g?.calories != null
    ? Math.round((selectedFood.per_100g.calories as number) * portionG / 100)
    : 0;
  const previewProtein = selectedFood?.per_100g?.protein_g != null
    ? Math.round((selectedFood.per_100g.protein_g as number) * portionG / 100 * 10) / 10
    : 0;
  const previewFat = selectedFood?.per_100g?.fat_g != null
    ? Math.round((selectedFood.per_100g.fat_g as number) * portionG / 100 * 10) / 10
    : 0;
  const previewCarbs = selectedFood?.per_100g?.carbs_g != null
    ? Math.round((selectedFood.per_100g.carbs_g as number) * portionG / 100 * 10) / 10
    : 0;

  const hasEntries = todayData && todayData.entry_count > 0;

  return (
    <div className="bg-card rounded-3xl border-2 border-foreground/5 p-6 shadow-[4px_4px_0px_0px_rgba(15,15,15,0.05)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-orange-500 flex items-center justify-center">
            <Utensils className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-lg">Nutrition</h2>
            <p className="text-sm text-muted-foreground">
              {totals.total_calories} / {goals.calories} cal
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowGoals(!showGoals)}
          className={cn(
            "w-9 h-9 rounded-full flex items-center justify-center transition-colors",
            showGoals ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/80"
          )}
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Goals Settings */}
      {showGoals && (
        <div className="bg-secondary/50 rounded-2xl p-4 mb-5 space-y-3">
          <p className="text-sm font-semibold">Daily Goals</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Calories</Label>
              <Input
                type="number"
                value={goals.calories}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10) || 0;
                  const updated = { ...goals, calories: v };
                  setGoals(updated);
                  saveGoals(updated);
                }}
                className="h-10 rounded-xl mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Protein (g)</Label>
              <Input
                type="number"
                value={goals.protein_g}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10) || 0;
                  const updated = { ...goals, protein_g: v };
                  setGoals(updated);
                  saveGoals(updated);
                }}
                className="h-10 rounded-xl mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Fat (g)</Label>
              <Input
                type="number"
                value={goals.fat_g}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10) || 0;
                  const updated = { ...goals, fat_g: v };
                  setGoals(updated);
                  saveGoals(updated);
                }}
                className="h-10 rounded-xl mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Carbs (g)</Label>
              <Input
                type="number"
                value={goals.carbs_g}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10) || 0;
                  const updated = { ...goals, carbs_g: v };
                  setGoals(updated);
                  saveGoals(updated);
                }}
                className="h-10 rounded-xl mt-1"
              />
            </div>
          </div>
        </div>
      )}

      {/* Today's Summary */}
      <div className="flex items-center gap-6 mb-6">
        {/* Calorie ring */}
        <div className="shrink-0">
          <CircularProgress
            value={calPct}
            size={100}
            strokeWidth={10}
            color="#f97316"
          >
            <div className="text-center">
              <span className="text-lg font-bold">{totals.total_calories}</span>
              <p className="text-[10px] text-muted-foreground leading-none">cal</p>
            </div>
          </CircularProgress>
        </div>

        {/* Macro bars */}
        <div className="flex-1 space-y-3">
          {/* Protein */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium">Protein</span>
              <span className="text-muted-foreground">{totals.total_protein_g}g / {goals.protein_g}g</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${proteinPct}%` }}
              />
            </div>
          </div>
          {/* Fat */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium">Fat</span>
              <span className="text-muted-foreground">{totals.total_fat_g}g / {goals.fat_g}g</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-yellow-500 rounded-full transition-all duration-500"
                style={{ width: `${fatPct}%` }}
              />
            </div>
          </div>
          {/* Carbs */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium">Carbs</span>
              <span className="text-muted-foreground">{totals.total_carbs_g}g / {goals.carbs_g}g</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-orange-400 rounded-full transition-all duration-500"
                style={{ width: `${carbsPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Search & Log */}
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            className="pl-12 h-14 rounded-xl text-base"
            placeholder="Search foods..."
            value={foodQuery}
            onChange={(e) => setFoodQuery(e.target.value)}
          />
          {foodQuery && (
            <button
              onClick={() => { setFoodQuery(""); setFoodResults(null); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-secondary"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
        <button
          onClick={() => { setShowCustomForm(true); setFoodResults(null); setSelectedFood(null); }}
          className="w-14 h-14 rounded-xl bg-secondary hover:bg-secondary/80 flex items-center justify-center transition-colors shrink-0"
          title="Create custom food"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {foodSearching && (
        <p className="text-sm text-muted-foreground mb-2">Searching...</p>
      )}

      {/* Search Results Dropdown */}
      {foodResults && !selectedFood && (
        <div className="max-h-56 overflow-y-auto space-y-1 mb-3 -mx-1 px-1">
          {foodResults.personal.length > 0 && (
            <>
              <p className="text-xs font-bold text-muted-foreground uppercase mt-1 mb-1 px-1">Your Foods</p>
              {foodResults.personal.map((item, i) => (
                <button
                  key={`p-${i}`}
                  className="w-full text-left p-3 rounded-xl hover:bg-secondary transition-colors flex justify-between items-center gap-2"
                  onClick={() => handleSelectFood(item)}
                >
                  <div className="min-w-0">
                    <span className="font-medium block truncate">{item.name}</span>
                    {item.times_logged != null && item.times_logged > 0 && (
                      <span className="text-xs text-muted-foreground">logged {item.times_logged}x</span>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-medium">{item.per_100g?.calories ?? "?"}</span>
                    <span className="text-xs text-muted-foreground ml-0.5">cal</span>
                  </div>
                </button>
              ))}
            </>
          )}
          {foodResults.usda.length > 0 && (
            <>
              <p className="text-xs font-bold text-muted-foreground uppercase mt-2 mb-1 px-1">USDA Database</p>
              {foodResults.usda.map((item, i) => (
                <button
                  key={`u-${i}`}
                  className="w-full text-left p-3 rounded-xl hover:bg-secondary transition-colors flex justify-between items-center gap-2"
                  onClick={() => handleSelectFood(item)}
                >
                  <span className="font-medium truncate min-w-0">{item.name}</span>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-medium">{item.per_100g?.calories ?? "?"}</span>
                    <span className="text-xs text-muted-foreground ml-0.5">cal</span>
                  </div>
                </button>
              ))}
            </>
          )}
          {foodResults.openfoodfacts.length > 0 && (
            <>
              <p className="text-xs font-bold text-muted-foreground uppercase mt-2 mb-1 px-1">Open Food Facts</p>
              {foodResults.openfoodfacts.map((item, i) => (
                <button
                  key={`o-${i}`}
                  className="w-full text-left p-3 rounded-xl hover:bg-secondary transition-colors flex justify-between items-center gap-2"
                  onClick={() => handleSelectFood(item)}
                >
                  <span className="font-medium truncate min-w-0">{item.name}</span>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-medium">{item.per_100g?.calories ?? "?"}</span>
                    <span className="text-xs text-muted-foreground ml-0.5">cal</span>
                  </div>
                </button>
              ))}
            </>
          )}
          {/* Create custom food link — always shown, prominent when no results */}
          {foodResults.personal.length === 0 && foodResults.usda.length === 0 && foodResults.openfoodfacts.length === 0 && (
            <p className="text-sm text-muted-foreground text-center pt-4 pb-1">No foods found</p>
          )}
          <button
            onClick={() => {
              setCustomName(foodQuery);
              setShowCustomForm(true);
              setFoodResults(null);
            }}
            className="w-full text-left p-3 rounded-xl hover:bg-secondary transition-colors flex items-center gap-2 text-primary font-medium text-sm"
          >
            <Plus className="w-4 h-4" />
            Create custom food{foodQuery ? ` "${foodQuery}"` : ""}
          </button>
        </div>
      )}

      {/* Custom Food Form */}
      {showCustomForm && !selectedFood && (
        <div className="bg-secondary/50 rounded-2xl p-4 space-y-3 mb-4">
          <div className="flex items-center justify-between">
            <p className="font-bold">Create Custom Food</p>
            <button onClick={resetCustomForm} className="p-1.5 rounded-lg hover:bg-secondary shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div>
            <Label className="text-xs font-medium">Food Name *</Label>
            <Input
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="e.g., Smoked Salmon"
              className="h-11 rounded-xl mt-1"
            />
          </div>

          <div>
            <Label className="text-xs font-medium">Default Portion (g)</Label>
            <Input
              type="number"
              min="1"
              value={customPortionDefault}
              onChange={(e) => setCustomPortionDefault(e.target.value)}
              className="h-11 rounded-xl mt-1"
            />
          </div>

          <p className="text-xs font-bold text-muted-foreground uppercase pt-1">Nutrition per 100g</p>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs font-medium">Calories *</Label>
              <Input
                type="number"
                min="0"
                value={customCal}
                onChange={(e) => setCustomCal(e.target.value)}
                placeholder="kcal"
                className="h-10 rounded-lg mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-medium">Protein (g) *</Label>
              <Input
                type="number"
                min="0"
                step="0.1"
                value={customProtein}
                onChange={(e) => setCustomProtein(e.target.value)}
                className="h-10 rounded-lg mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-medium">Fat (g) *</Label>
              <Input
                type="number"
                min="0"
                step="0.1"
                value={customFat}
                onChange={(e) => setCustomFat(e.target.value)}
                className="h-10 rounded-lg mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-medium">Carbs (g) *</Label>
              <Input
                type="number"
                min="0"
                step="0.1"
                value={customCarbs}
                onChange={(e) => setCustomCarbs(e.target.value)}
                className="h-10 rounded-lg mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Fiber (g)</Label>
              <Input
                type="number"
                min="0"
                step="0.1"
                value={customFiber}
                onChange={(e) => setCustomFiber(e.target.value)}
                className="h-10 rounded-lg mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Sugar (g)</Label>
              <Input
                type="number"
                min="0"
                step="0.1"
                value={customSugar}
                onChange={(e) => setCustomSugar(e.target.value)}
                className="h-10 rounded-lg mt-1"
              />
            </div>
            <div className="col-span-2">
              <Label className="text-xs font-medium text-muted-foreground">Sodium (mg)</Label>
              <Input
                type="number"
                min="0"
                value={customSodium}
                onChange={(e) => setCustomSodium(e.target.value)}
                className="h-10 rounded-lg mt-1"
              />
            </div>
          </div>

          <Button
            onClick={handleSaveCustomFood}
            disabled={customSaving || !customName || !customCal || !customProtein || !customFat || !customCarbs}
            className="w-full h-12 rounded-xl font-bold"
          >
            {customSaving ? "Saving..." : "Save Food"}
          </Button>
        </div>
      )}

      {/* Portion Input & Log (inline, not modal) */}
      {selectedFood && (
        <div className="bg-secondary/50 rounded-2xl p-4 space-y-4 mb-4">
          <div className="flex items-center justify-between">
            <p className="font-bold truncate pr-2">{selectedFood.name}</p>
            <button onClick={() => setSelectedFood(null)} className="p-1.5 rounded-lg hover:bg-secondary shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Portion with stepper */}
          <div>
            <Label className="text-xs font-medium">Portion (grams)</Label>
            <div className="flex items-center gap-2 mt-1.5">
              <button
                onClick={() => setPortionG(Math.max(10, portionG - 10))}
                className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors shrink-0"
              >
                <Minus className="w-4 h-4" />
              </button>
              <Input
                type="number"
                min="1"
                value={portionG}
                onChange={(e) => setPortionG(Math.max(1, parseInt(e.target.value) || 0))}
                className="h-11 rounded-xl text-center text-lg font-bold flex-1"
              />
              <button
                onClick={() => setPortionG(portionG + 10)}
                className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors shrink-0"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick portion buttons */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPortionG(100)} className="rounded-lg flex-1">100g</Button>
            <Button variant="outline" size="sm" onClick={() => setPortionG(200)} className="rounded-lg flex-1">200g</Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPortionG(selectedFood.default_portion_g || 100)}
              className="rounded-lg flex-1"
            >
              Serving ({selectedFood.default_portion_g || 100}g)
            </Button>
          </div>

          {/* Real-time nutrition preview */}
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="bg-background rounded-xl p-2">
              <p className="text-lg font-bold text-orange-500">{previewCal}</p>
              <p className="text-[10px] text-muted-foreground">cal</p>
            </div>
            <div className="bg-background rounded-xl p-2">
              <p className="text-lg font-bold text-blue-500">{previewProtein}g</p>
              <p className="text-[10px] text-muted-foreground">protein</p>
            </div>
            <div className="bg-background rounded-xl p-2">
              <p className="text-lg font-bold text-yellow-500">{previewFat}g</p>
              <p className="text-[10px] text-muted-foreground">fat</p>
            </div>
            <div className="bg-background rounded-xl p-2">
              <p className="text-lg font-bold text-orange-400">{previewCarbs}g</p>
              <p className="text-[10px] text-muted-foreground">carbs</p>
            </div>
          </div>

          {/* Edit nutrition inline */}
          {!editingNutrition ? (
            <button
              onClick={handleOpenEditNutrition}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Pencil className="w-3 h-3" />
              Edit nutrition
            </button>
          ) : (
            <div className="bg-background rounded-xl p-3 space-y-2">
              <p className="text-xs font-bold text-muted-foreground uppercase">Edit per 100g</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px]">Calories</Label>
                  <Input type="number" min="0" value={editCal} onChange={(e) => setEditCal(e.target.value)} className="h-9 rounded-lg text-sm" />
                </div>
                <div>
                  <Label className="text-[10px]">Protein (g)</Label>
                  <Input type="number" min="0" step="0.1" value={editProtein} onChange={(e) => setEditProtein(e.target.value)} className="h-9 rounded-lg text-sm" />
                </div>
                <div>
                  <Label className="text-[10px]">Fat (g)</Label>
                  <Input type="number" min="0" step="0.1" value={editFat} onChange={(e) => setEditFat(e.target.value)} className="h-9 rounded-lg text-sm" />
                </div>
                <div>
                  <Label className="text-[10px]">Carbs (g)</Label>
                  <Input type="number" min="0" step="0.1" value={editCarbs} onChange={(e) => setEditCarbs(e.target.value)} className="h-9 rounded-lg text-sm" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditingNutrition(false)} className="flex-1 rounded-lg">Cancel</Button>
                <Button size="sm" onClick={handleSaveEditNutrition} className="flex-1 rounded-lg">Apply</Button>
              </div>
            </div>
          )}

          {/* Meal type selector */}
          <div>
            <Label className="text-xs font-medium">Meal</Label>
            <div className="flex gap-2 mt-1.5">
              {MEAL_ORDER.map((mt) => (
                <button
                  key={mt}
                  onClick={() => setMealType(mt)}
                  className={cn(
                    "flex-1 py-2.5 rounded-xl text-sm font-medium capitalize transition-colors",
                    mealType === mt
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary hover:bg-secondary/80"
                  )}
                >
                  {mt}
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={handleLogFood}
            disabled={foodLoading || !selectedFood.id}
            className="w-full h-12 rounded-xl font-bold"
          >
            {foodLoading ? "Saving..." : `Log Food — ${previewCal} cal`}
          </Button>
        </div>
      )}

      {/* Recent Foods — horizontal scroll */}
      {recentFoods.length > 0 && !selectedFood && !foodResults && (
        <div className="mb-4">
          <p className="text-xs font-bold text-muted-foreground uppercase mb-2">Quick Add</p>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
            {recentFoods.map((item, i) => (
              <button
                key={`r-${i}`}
                onClick={() => handleQuickLog(item)}
                disabled={foodLoading}
                className="shrink-0 bg-secondary/70 hover:bg-secondary rounded-xl px-3 py-2 text-left transition-colors max-w-[140px]"
              >
                <p className="text-xs font-medium truncate">{item.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {item.per_100g?.calories ?? "?"}cal · {item.default_portion_g || 100}g
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Today's Entries by Meal */}
      {todayLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 bg-secondary/30 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : hasEntries ? (
        <div className="space-y-4">
          {MEAL_ORDER.map((meal) => {
            const entries = todayData?.meals[meal];
            if (!entries || entries.length === 0) return null;

            const mealCals = entries.reduce(
              (sum, e) => sum + (e.nutrition_snapshot?.calories ?? 0),
              0
            );

            return (
              <div key={meal}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{MEAL_ICONS[meal]}</span>
                    <span className="text-sm font-bold">{MEAL_LABELS[meal]}</span>
                  </div>
                  <span className="text-xs text-muted-foreground font-medium">
                    {Math.round(mealCals)} cal
                  </span>
                </div>
                <div className="space-y-1">
                  {entries.map((entry) => (
                    editingEntry?.id === entry.id ? (
                      <div key={entry.id} className="bg-secondary/50 rounded-xl p-3 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold truncate pr-2">{entry.food_name}</p>
                          <button onClick={() => setEditingEntry(null)} className="p-1 rounded-lg hover:bg-secondary shrink-0">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div>
                          <Label className="text-xs font-medium">Portion (g)</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <button
                              onClick={() => setEditEntryPortionG(Math.max(10, editEntryPortionG - 10))}
                              className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center hover:bg-secondary/80 shrink-0"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <Input
                              type="number"
                              min="1"
                              value={editEntryPortionG}
                              onChange={(e) => setEditEntryPortionG(Math.max(1, parseInt(e.target.value) || 0))}
                              className="h-9 rounded-lg text-center font-bold flex-1"
                            />
                            <button
                              onClick={() => setEditEntryPortionG(editEntryPortionG + 10)}
                              className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center hover:bg-secondary/80 shrink-0"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs font-medium">Meal</Label>
                          <div className="flex gap-1.5 mt-1">
                            {MEAL_ORDER.map((mt) => (
                              <button
                                key={mt}
                                onClick={() => setEditEntryMealType(mt)}
                                className={cn(
                                  "flex-1 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors",
                                  editEntryMealType === mt
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-secondary hover:bg-secondary/80"
                                )}
                              >
                                {mt}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => setEditingEntry(null)} className="flex-1 rounded-lg">
                            Cancel
                          </Button>
                          <Button size="sm" onClick={handleSaveEditEntry} disabled={editEntrySaving} className="flex-1 rounded-lg">
                            {editEntrySaving ? "Saving..." : "Save"}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-secondary/50 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{entry.food_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {entry.portion_g}g · {Math.round(entry.nutrition_snapshot?.calories ?? 0)} cal
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          <button
                            onClick={() => handleEditEntry(entry)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteEntry(entry.id)}
                            disabled={deletingId === entry.id}
                            className="p-1.5 rounded-lg text-muted-foreground hover:bg-red-100 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-6">
          <p className="text-muted-foreground text-sm">No food logged today</p>
          <p className="text-xs text-muted-foreground mt-1">Search or tap Quick Add above</p>
        </div>
      )}
    </div>
  );
}
