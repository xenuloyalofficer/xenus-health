"use client";

import { useState, useEffect, useCallback } from "react";
import { Droplets, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { medium } from "@/lib/haptics";
import { cn } from "@/lib/utils";

interface WaterEntry {
  id: string;
  amount_ml: number;
  logged_at: string;
}

const WATER_GOAL_ML = 2000;

const QUICK_ADD_OPTIONS = [
  { label: "+250ml", amount: 250, desc: "Glass" },
  { label: "+500ml", amount: 500, desc: "Bottle" },
  { label: "+1L", amount: 1000, desc: "Large" },
];

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function WaterTracker() {
  const [entries, setEntries] = useState<WaterEntry[]>([]);
  const [totalMl, setTotalMl] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchToday = useCallback(async () => {
    try {
      const res = await fetch("/api/water");
      if (res.ok) {
        const { data, total_ml } = await res.json();
        setEntries(data || []);
        setTotalMl(total_ml || 0);
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchToday();
  }, [fetchToday]);

  const handleAdd = async (amount: number) => {
    // Optimistic update
    const tempId = crypto.randomUUID();
    const now = new Date().toISOString();
    setEntries((prev) => [{ id: tempId, amount_ml: amount, logged_at: now }, ...prev]);
    setTotalMl((prev) => prev + amount);
    medium();

    try {
      const res = await fetch("/api/water", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount_ml: amount }),
      });
      if (!res.ok) throw new Error("Failed to save");
      const { data } = await res.json();
      // Replace temp entry with real one
      setEntries((prev) => prev.map((e) => (e.id === tempId ? data : e)));
    } catch {
      // Rollback
      setEntries((prev) => prev.filter((e) => e.id !== tempId));
      setTotalMl((prev) => prev - amount);
      toast.error("Failed to log water");
    }
  };

  const handleDelete = async (entry: WaterEntry) => {
    // Optimistic
    setEntries((prev) => prev.filter((e) => e.id !== entry.id));
    setTotalMl((prev) => prev - entry.amount_ml);

    try {
      const res = await fetch(`/api/water?id=${entry.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
    } catch {
      // Rollback
      setEntries((prev) => [entry, ...prev]);
      setTotalMl((prev) => prev + entry.amount_ml);
      toast.error("Failed to delete");
    }
  };

  const pct = Math.min(100, Math.round((totalMl / WATER_GOAL_ML) * 100));
  const goalReached = totalMl >= WATER_GOAL_ML;

  return (
    <div className="bg-card rounded-3xl border-2 border-foreground/5 p-5 shadow-[4px_4px_0px_0px_rgba(15,15,15,0.05)]">
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-2xl flex items-center justify-center",
            goalReached ? "bg-green-500" : "bg-blue-500"
          )}>
            <Droplets className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-lg tabular-nums">
              {totalMl >= 1000 ? `${(totalMl / 1000).toFixed(1)}L` : `${totalMl}ml`}
              <span className="text-sm font-normal text-muted-foreground"> / {WATER_GOAL_ML / 1000}L</span>
            </p>
          </div>
        </div>
        <span className={cn(
          "text-sm font-bold px-3 py-1 rounded-full",
          goalReached ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
        )}>
          {pct}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-3 bg-secondary rounded-full overflow-hidden mb-4">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300",
            goalReached ? "bg-green-500" : "bg-blue-500"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Quick add buttons */}
      <div className="flex gap-2 mb-3">
        {QUICK_ADD_OPTIONS.map((opt) => (
          <button
            key={opt.amount}
            onClick={() => handleAdd(opt.amount)}
            className="flex-1 flex flex-col items-center gap-0.5 py-2.5 px-2 rounded-2xl bg-blue-50 hover:bg-blue-100 border-2 border-blue-200 transition-colors"
          >
            <Plus className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-bold text-blue-700">{opt.label}</span>
            <span className="text-[10px] text-blue-500">{opt.desc}</span>
          </button>
        ))}
      </div>

      {/* Today's entries */}
      {entries.length > 0 && (
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-secondary/50 text-sm"
            >
              <span className="text-muted-foreground">{formatTime(entry.logged_at)}</span>
              <div className="flex items-center gap-2">
                <span className="font-medium tabular-nums">{entry.amount_ml}ml</span>
                <button
                  onClick={() => handleDelete(entry)}
                  className="w-6 h-6 rounded-full hover:bg-red-100 flex items-center justify-center text-muted-foreground hover:text-red-500 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
