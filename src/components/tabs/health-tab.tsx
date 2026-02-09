"use client";

import { useState, useEffect, useCallback } from "react";
import { Moon, Pill, Zap, Plus, Check, X, Battery, Smile, Meh, Frown, Clock, AlertTriangle } from "lucide-react";
import { BloodWorkSection } from "@/components/blood-work/blood-work-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { shouldShowSleepButton } from "@/lib/time-awareness";
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

function formatDurationMinutes(mins: number): string {
  const hours = Math.floor(mins / 60);
  const minutes = Math.round(mins % 60);
  return `${hours}h ${minutes}m`;
}

// --- Types ---
interface MedicationPreset {
  id: string;
  medication_name: string;
  schedule: string[];
  dosage: string | null;
}

export function HealthTab() {
  // Sleep state
  const [sleepState, setSleepState] = useState<SleepTrackingState>(
    { sleepStatus: "none", currentSleepId: null, bedtime: null }
  );
  const [sleepQuality, setSleepQuality] = useState(3);
  const [sleepLoading, setSleepLoading] = useState(false);
  const [sleepElapsed, setSleepElapsed] = useState("");
  const [showWakeTimePicker, setShowWakeTimePicker] = useState(false);
  const [customWakeTime, setCustomWakeTime] = useState("");
  const [lastNightSleep, setLastNightSleep] = useState<{ duration_minutes: number; quality_rating: number | null; sleep_start: string; sleep_end: string } | null>(null);

  // Meds state
  const [medPresets, setMedPresets] = useState<MedicationPreset[]>([]);
  const [medPresetsLoading, setMedPresetsLoading] = useState(true);
  const [todayMeds, setTodayMeds] = useState<Record<string, string>>({});
  const [addMedOpen, setAddMedOpen] = useState(false);
  const [newMedName, setNewMedName] = useState("");
  const [newMedDosage, setNewMedDosage] = useState("");
  const [newMedSchedule, setNewMedSchedule] = useState<string[]>(["morning"]);
  const [medLoading, setMedLoading] = useState(false);

  // Energy/Mood state
  const [energyLevel, setEnergyLevel] = useState<number | null>(null);
  const [moodLevel, setMoodLevel] = useState<number | null>(null);
  const [moodNotes, setMoodNotes] = useState("");
  const [moodLoading, setMoodLoading] = useState(false);
  const [moodAlreadyLogged, setMoodAlreadyLogged] = useState(false);

  // Load sleep state on mount
  useEffect(() => {
    setSleepState(loadSleepState());
  }, []);

  // Tick elapsed sleep time every minute
  useEffect(() => {
    if (sleepState.sleepStatus !== "sleeping" || !sleepState.bedtime) return;
    setSleepElapsed(formatElapsedSleep(sleepState.bedtime));
    const interval = setInterval(() => {
      setSleepElapsed(formatElapsedSleep(sleepState.bedtime!));
    }, 60000);
    return () => clearInterval(interval);
  }, [sleepState.sleepStatus, sleepState.bedtime]);

  // Load last night's sleep for daytime summary
  useEffect(() => {
    async function loadLastSleep() {
      try {
        const res = await fetch("/api/sleep?limit=1");
        if (res.ok) {
          const { data } = await res.json();
          if (data && data.length > 0 && data[0].sleep_end) {
            setLastNightSleep(data[0]);
          }
        }
      } catch {}
    }
    if (sleepState.sleepStatus === "none") {
      loadLastSleep();
    }
  }, [sleepState.sleepStatus]);

  // Load medication presets + today's logged meds
  useEffect(() => {
    async function loadPresets() {
      try {
        const today = new Date().toISOString().slice(0, 10);
        const [presetsRes, todayRes] = await Promise.all([
          fetch("/api/medication-presets"),
          fetch(`/api/medication?date=${today}`),
        ]);
        if (presetsRes.ok) {
          const { data: presets } = await presetsRes.json();
          setMedPresets(presets || []);

          // Match today's entries to presets by medication_name
          if (todayRes.ok) {
            const { data: entries } = await todayRes.json();
            if (entries && presets) {
              const medsMap: Record<string, string> = {};
              for (const entry of entries) {
                const preset = presets.find(
                  (p: MedicationPreset) => p.medication_name === entry.medication_name
                );
                if (preset) medsMap[preset.id] = entry.status;
              }
              setTodayMeds(medsMap);
            }
          }
        }
      } catch {}
      setMedPresetsLoading(false);
    }
    loadPresets();
  }, []);

  // Load today's mood/energy on mount
  useEffect(() => {
    async function loadTodayMood() {
      try {
        const res = await fetch("/api/energy?limit=1");
        if (res.ok) {
          const { data } = await res.json();
          if (data && data.length > 0) {
            const today = new Date().toISOString().slice(0, 10);
            const entryDate = data[0].logged_at?.slice(0, 10);
            if (entryDate === today) {
              setEnergyLevel(data[0].energy_level);
              setMoodLevel(data[0].mood_level);
              setMoodAlreadyLogged(true);
            }
          }
        }
      } catch {}
    }
    loadTodayMood();
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

  const handleWokeUpEarlier = async () => {
    if (!customWakeTime) {
      toast.error("Please select the time you woke up");
      return;
    }
    setSleepLoading(true);
    try {
      // Build a full datetime from today's date + the entered time
      const today = new Date().toISOString().slice(0, 10);
      const wakeIso = new Date(`${today}T${customWakeTime}`).toISOString();
      const bedtime = sleepState.bedtime;
      const durationMs = bedtime ? new Date(wakeIso).getTime() - new Date(bedtime).getTime() : 0;
      const durationMinutes = Math.round(durationMs / 60000);

      const res = await fetch("/api/sleep", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: sleepState.currentSleepId,
          sleep_end: wakeIso,
          duration_minutes: durationMinutes > 0 ? durationMinutes : 0,
          quality_rating: sleepQuality,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || `Failed to update (${res.status})`);
      }
      toast.success(`Sleep logged: ${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m`);
      success();
      updateSleepState({ sleepStatus: "none", currentSleepId: null, bedtime: null });
      setSleepQuality(3);
      setShowWakeTimePicker(false);
      setCustomWakeTime("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSleepLoading(false);
    }
  };

  // Check if sleep session is stale (>24h)
  const isSleepStale = sleepState.sleepStatus === "sleeping" && sleepState.bedtime
    ? (Date.now() - new Date(sleepState.bedtime).getTime()) > 24 * 60 * 60 * 1000
    : false;

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
      setMoodAlreadyLogged(true);
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

  const isSleepTime = shouldShowSleepButton();
  const hasActiveSleepSession = sleepState.sleepStatus !== "none";
  const medProgress = medPresets.length > 0
    ? Math.round((Object.keys(todayMeds).length / medPresets.length) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Health</h1>
      </div>

      {/* Sleep Card — always visible */}
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
            {sleepState.sleepStatus === "none" && (
              <p className="text-sm text-muted-foreground">
                {isSleepTime ? "Tap when you\u2019re heading to bed" : "Track your sleep nightly"}
              </p>
            )}
          </div>
        </div>

        {/* STATE: none — no active session */}
        {sleepState.sleepStatus === "none" && (
          <div className="space-y-4">
            {isSleepTime ? (
              /* After 8pm: show "Going to sleep" button */
              <Button
                onClick={handleGoingToSleep}
                disabled={sleepLoading}
                className="w-full h-14 rounded-2xl text-lg font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-[4px_4px_0px_0px_rgba(67,56,202,0.4)]"
              >
                {sleepLoading ? "Saving..." : "GOING TO SLEEP NOW"}
              </Button>
            ) : (
              /* Before 8pm: show last night's summary or placeholder */
              lastNightSleep ? (
                <div className="bg-secondary/50 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-muted-foreground">Last Night</p>
                    <p className="text-xs text-muted-foreground">
                      {formatTime(lastNightSleep.sleep_start)} — {formatTime(lastNightSleep.sleep_end)}
                    </p>
                  </div>
                  <p className="text-3xl font-bold tabular-nums">
                    {formatDurationMinutes(lastNightSleep.duration_minutes)}
                  </p>
                  {lastNightSleep.quality_rating && (
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <span key={s} className={cn("text-lg", s <= lastNightSleep.quality_rating! ? "text-yellow-500" : "text-muted-foreground/30")}>★</span>
                      ))}
                      <span className="text-xs text-muted-foreground ml-1 self-center">{qualityLabels[(lastNightSleep.quality_rating ?? 3) - 1]}</span>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">Sleep tracking available after 8pm</p>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted-foreground text-sm">Sleep tracking available after 8pm</p>
                </div>
              )
            )}
          </div>
        )}

        {/* STATE: sleeping — active session */}
        {sleepState.sleepStatus === "sleeping" && (
          <div className="space-y-4">
            {/* Stale session warning (>24h) */}
            {isSleepStale && (
              <div className="flex items-center gap-2 bg-yellow-500/20 rounded-xl p-3 text-sm">
                <AlertTriangle className="w-5 h-5 text-yellow-300 shrink-0" />
                <span className="text-white/90">Looks like you forgot to log waking up. When did you wake up?</span>
              </div>
            )}

            <div className="text-center py-4">
              <p className="text-white/80 text-sm mb-1">In bed since {sleepState.bedtime ? formatTime(sleepState.bedtime) : "..."}</p>
              <p className="text-5xl font-bold tabular-nums">{sleepElapsed || (sleepState.bedtime ? formatElapsedSleep(sleepState.bedtime) : "--")}</p>
            </div>

            <Button
              onClick={handleGoodMorning}
              className="w-full h-14 rounded-2xl text-lg font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-[4px_4px_0px_0px_rgba(223,255,0,0.4)]"
            >
              I WOKE UP NOW
            </Button>

            {/* "I woke up earlier" toggle */}
            {!showWakeTimePicker ? (
              <button
                onClick={() => setShowWakeTimePicker(true)}
                className="w-full text-center text-white/70 hover:text-white text-sm underline underline-offset-2 transition-colors"
              >
                I woke up earlier
              </button>
            ) : (
              <div className="bg-white/10 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-white/70" />
                  <p className="text-sm text-white/80">What time did you wake up?</p>
                </div>
                <input
                  type="time"
                  value={customWakeTime}
                  onChange={(e) => setCustomWakeTime(e.target.value)}
                  className="w-full h-12 rounded-xl bg-white/20 text-white text-center text-lg px-4 border border-white/20 focus:outline-none focus:ring-2 focus:ring-white/40"
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 h-10 rounded-xl bg-transparent border-white/30 text-white hover:bg-white/10"
                    onClick={() => { setShowWakeTimePicker(false); setCustomWakeTime(""); }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleWokeUpEarlier}
                    disabled={sleepLoading || !customWakeTime}
                    className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {sleepLoading ? "Saving..." : "Confirm"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STATE: woke — rating quality */}
        {sleepState.sleepStatus === "woke" && (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-lg font-semibold">Good morning!</p>
              <p className="text-muted-foreground text-sm">You slept for {sleepState.bedtime ? formatElapsedSleep(sleepState.bedtime) : "..."}</p>
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
                    {val <= sleepQuality ? "★" : "☆"}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground text-center mt-2">{qualityLabels[sleepQuality - 1]}</p>
            </div>

            {/* "I woke up earlier" option in woke state too */}
            {!showWakeTimePicker ? (
              <div className="flex flex-col gap-2">
                <Button
                  onClick={handleSaveMorning}
                  disabled={sleepLoading}
                  className="w-full h-12 rounded-xl font-bold"
                >
                  {sleepLoading ? "Saving..." : "Complete Sleep Log"}
                </Button>
                <button
                  onClick={() => setShowWakeTimePicker(true)}
                  className="w-full text-center text-muted-foreground hover:text-foreground text-sm underline underline-offset-2 transition-colors"
                >
                  I actually woke up earlier
                </button>
              </div>
            ) : (
              <div className="bg-secondary/50 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">What time did you wake up?</p>
                </div>
                <input
                  type="time"
                  value={customWakeTime}
                  onChange={(e) => setCustomWakeTime(e.target.value)}
                  className="w-full h-12 rounded-xl bg-secondary text-foreground text-center text-lg px-4 border-2 border-foreground/10 focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 h-10 rounded-xl"
                    onClick={() => { setShowWakeTimePicker(false); setCustomWakeTime(""); }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleWokeUpEarlier}
                    disabled={sleepLoading || !customWakeTime}
                    className="flex-1 h-10 rounded-xl"
                  >
                    {sleepLoading ? "Saving..." : "Confirm"}
                  </Button>
                </div>
              </div>
            )}
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

      {/* Blood Work Section */}
      <BloodWorkSection />

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
          {moodLoading ? "Saving..." : moodAlreadyLogged ? "Update Energy & Mood" : "Log Energy & Mood"}
        </Button>
      </div>
    </div>
  );
}
