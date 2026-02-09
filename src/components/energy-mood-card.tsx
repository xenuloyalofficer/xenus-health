"use client";

import { useState, useEffect } from "react";
import { Zap, Battery, Smile, Meh, Frown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { medium } from "@/lib/haptics";
import { cn } from "@/lib/utils";

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

export function EnergyMoodCard() {
  const [energyLevel, setEnergyLevel] = useState<number | null>(null);
  const [moodLevel, setMoodLevel] = useState<number | null>(null);
  const [moodNotes, setMoodNotes] = useState("");
  const [moodLoading, setMoodLoading] = useState(false);
  const [moodAlreadyLogged, setMoodAlreadyLogged] = useState(false);

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

  return (
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
  );
}
