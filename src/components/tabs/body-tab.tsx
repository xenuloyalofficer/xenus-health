"use client";

import { useState, useEffect } from "react";
import { Scale, Ruler, TrendingDown, TrendingUp, ChevronDown, ChevronUp } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { medium } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import { MetricCard } from "@/components/ui/metric-card";

interface WeightEntry {
  weight_kg: number;
  logged_at: string;
}

interface MeasurementEntry {
  measured_at: string;
  neck_cm?: number | null;
  chest_cm?: number | null;
  waist_cm?: number | null;
  hips_cm?: number | null;
  left_arm_cm?: number | null;
  right_arm_cm?: number | null;
  left_thigh_cm?: number | null;
  right_thigh_cm?: number | null;
  left_calf_cm?: number | null;
  right_calf_cm?: number | null;
  weight_kg?: number | null;
}

function formatDateShort(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function BodyTab() {
  // Weight form
  const [weightKg, setWeightKg] = useState("");
  const [weightDate, setWeightDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [weightLoading, setWeightLoading] = useState(false);

  // Weight history for chart
  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>([]);
  const [weightHistoryLoading, setWeightHistoryLoading] = useState(true);

  // Measurement history
  const [measHistory, setMeasHistory] = useState<MeasurementEntry[]>([]);
  const [measHistoryLoading, setMeasHistoryLoading] = useState(true);
  const [showAllMeasurements, setShowAllMeasurements] = useState(false);

  // Load weight history
  useEffect(() => {
    async function loadWeight() {
      try {
        const res = await fetch("/api/trends?type=weight&days=30");
        if (res.ok) {
          const { data } = await res.json();
          setWeightHistory(data.weight || []);
        }
      } catch {}
      setWeightHistoryLoading(false);
    }
    loadWeight();
  }, []);

  // Load measurement history
  useEffect(() => {
    async function loadMeas() {
      try {
        const res = await fetch("/api/measurements");
        if (res.ok) {
          const { data } = await res.json();
          setMeasHistory((data || []).slice(0, 5));
        }
      } catch {}
      setMeasHistoryLoading(false);
    }
    loadMeas();
  }, []);

  // Measurements form
  const [measDate, setMeasDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
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
  const [measLoading, setMeasLoading] = useState(false);
  const [showMeasForm, setShowMeasForm] = useState(false);

  const latestWeight = weightHistory[weightHistory.length - 1]?.weight_kg;
  const firstWeight = weightHistory[0]?.weight_kg;
  const weightChange = latestWeight && firstWeight ? latestWeight - firstWeight : 0;
  const weightTrend = weightChange < 0 ? "down" : weightChange > 0 ? "up" : "neutral";

  const handleWeightSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!weightKg) {
      toast.error("Please enter your weight");
      return;
    }
    setWeightLoading(true);
    try {
      const res = await fetch("/api/weight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          logged_at: weightDate,
          weight_kg: parseFloat(weightKg),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || `Failed to save (${res.status})`);
      }
      toast.success("Weight saved");
      medium();
      setWeightHistory((prev) => [...prev, { weight_kg: parseFloat(weightKg), logged_at: weightDate }]);
      setWeightKg("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setWeightLoading(false);
    }
  };

  const handleMeasurementsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const fields = [
      measNeck, measChest, measLeftArm, measRightArm,
      measWaist, measHips, measLeftThigh, measRightThigh,
      measLeftCalf, measRightCalf, measWeight,
    ];
    if (!fields.some((v) => v !== "")) {
      toast.error("Please enter at least one measurement");
      return;
    }

    setMeasLoading(true);
    try {
      const payload: Record<string, unknown> = {
        measured_at: measDate,
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
      medium();
      // Reset
      setMeasNeck(""); setMeasChest(""); setMeasLeftArm(""); setMeasRightArm("");
      setMeasWaist(""); setMeasHips(""); setMeasLeftThigh(""); setMeasRightThigh("");
      setMeasLeftCalf(""); setMeasRightCalf(""); setMeasWeight(""); setMeasNotes("");
      setShowMeasForm(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setMeasLoading(false);
    }
  };

  const latestMeas = measHistory[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Body</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="rounded-full" onClick={() => setShowMeasForm(!showMeasForm)}>
            <Ruler className="h-4 w-4 mr-1" />
            Measure
          </Button>
        </div>
      </div>

      {/* Weight Section - Large Metric Display */}
      <div className="bg-card rounded-3xl border-2 border-foreground/5 p-6 shadow-[4px_4px_0px_0px_rgba(15,15,15,0.05)]">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-500 flex items-center justify-center">
              <Scale className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Weight</p>
              <p className="text-4xl font-bold tracking-tight tabular-nums">
                {latestWeight ? latestWeight.toFixed(1) : "--"}
                <span className="text-xl text-muted-foreground font-medium ml-1">kg</span>
              </p>
            </div>
          </div>
          {weightChange !== 0 && (
            <div className={cn(
              "flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold",
              weightTrend === "down" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
            )}>
              {weightTrend === "down" ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
              {Math.abs(weightChange).toFixed(1)} kg
            </div>
          )}
        </div>

        {/* Weight Chart */}
        <div className="h-40 -mx-2">
          {weightHistoryLoading ? (
            <div className="h-full w-full bg-secondary/50 rounded-2xl animate-pulse" />
          ) : weightHistory.length >= 2 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weightHistory} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                <XAxis
                  dataKey="logged_at"
                  tickFormatter={formatDateShort}
                  tick={{ fontSize: 10, fill: "#888" }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={["dataMin - 0.5", "dataMax + 0.5"]}
                  tick={{ fontSize: 10, fill: "#888" }}
                  axisLine={false}
                  tickLine={false}
                  width={40}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}
                  formatter={(value) => [`${value} kg`, "Weight"]}
                  labelFormatter={(label) => formatDateShort(String(label))}
                />
                <Line
                  type="monotone"
                  dataKey="weight_kg"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "#3b82f6", strokeWidth: 2, stroke: "#fff" }}
                  activeDot={{ r: 6, fill: "#DFFF00", stroke: "#3b82f6", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
              Log at least 2 weights to see your trend
            </div>
          )}
        </div>

        {/* Quick Weight Entry */}
        <form onSubmit={handleWeightSubmit} className="mt-4 pt-4 border-t border-foreground/5">
          <div className="flex gap-3 items-end">
            <div className="flex-1 space-y-1.5">
              <Label className="text-sm font-medium">Log Weight</Label>
              <Input
                type="number"
                step="0.1"
                placeholder="70.5"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                className="h-12 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Date</Label>
              <Input
                type="date"
                value={weightDate}
                onChange={(e) => setWeightDate(e.target.value)}
                className="h-12 rounded-xl w-auto"
              />
            </div>
            <Button type="submit" disabled={weightLoading} className="h-12 rounded-xl">
              {weightLoading ? "..." : "Save"}
            </Button>
          </div>
        </form>
      </div>

      {/* Measurements Summary */}
      {latestMeas && (
        <div className="bg-card rounded-3xl border-2 border-foreground/5 p-6 shadow-[4px_4px_0px_0px_rgba(15,15,15,0.05)]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-500 flex items-center justify-center">
                <Ruler className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Measurements</p>
                <p className="text-sm text-muted-foreground">
                  Last: {formatDateShort(latestMeas.measured_at)}
                </p>
              </div>
            </div>
            <button 
              onClick={() => setShowAllMeasurements(!showAllMeasurements)}
              className="p-2 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors"
            >
              {showAllMeasurements ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
          </div>

          {/* Key Measurements Grid */}
          <div className="grid grid-cols-3 gap-3">
            {latestMeas.waist_cm && (
              <div className="bg-secondary/50 rounded-2xl p-4 text-center">
                <p className="text-2xl font-bold tabular-nums">{latestMeas.waist_cm}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Waist cm</p>
              </div>
            )}
            {latestMeas.hips_cm && (
              <div className="bg-secondary/50 rounded-2xl p-4 text-center">
                <p className="text-2xl font-bold tabular-nums">{latestMeas.hips_cm}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Hips cm</p>
              </div>
            )}
            {latestMeas.chest_cm && (
              <div className="bg-secondary/50 rounded-2xl p-4 text-center">
                <p className="text-2xl font-bold tabular-nums">{latestMeas.chest_cm}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Chest cm</p>
              </div>
            )}
            {!latestMeas.waist_cm && !latestMeas.hips_cm && !latestMeas.chest_cm && (
              <div className="col-span-3 text-center py-4 text-muted-foreground text-sm">
                No key measurements recorded
              </div>
            )}
          </div>

          {/* All Measurements */}
          {showAllMeasurements && (
            <div className="mt-4 pt-4 border-t border-foreground/5 grid grid-cols-2 gap-3">
              {latestMeas.neck_cm && (
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-muted-foreground">Neck</span>
                  <span className="font-semibold">{latestMeas.neck_cm} cm</span>
                </div>
              )}
              {latestMeas.left_arm_cm && (
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-muted-foreground">Left Arm</span>
                  <span className="font-semibold">{latestMeas.left_arm_cm} cm</span>
                </div>
              )}
              {latestMeas.right_arm_cm && (
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-muted-foreground">Right Arm</span>
                  <span className="font-semibold">{latestMeas.right_arm_cm} cm</span>
                </div>
              )}
              {latestMeas.left_thigh_cm && (
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-muted-foreground">Left Thigh</span>
                  <span className="font-semibold">{latestMeas.left_thigh_cm} cm</span>
                </div>
              )}
              {latestMeas.right_thigh_cm && (
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-muted-foreground">Right Thigh</span>
                  <span className="font-semibold">{latestMeas.right_thigh_cm} cm</span>
                </div>
              )}
              {latestMeas.left_calf_cm && (
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-muted-foreground">Left Calf</span>
                  <span className="font-semibold">{latestMeas.left_calf_cm} cm</span>
                </div>
              )}
              {latestMeas.right_calf_cm && (
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-muted-foreground">Right Calf</span>
                  <span className="font-semibold">{latestMeas.right_calf_cm} cm</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Measurement History */}
      {measHistory.length > 1 && (
        <div>
          <h2 className="text-lg font-bold mb-3">Recent Measurements</h2>
          <div className="space-y-2">
            {measHistory.slice(1).map((m, i) => {
              const parts: string[] = [];
              if (m.waist_cm) parts.push(`Waist: ${m.waist_cm}cm`);
              if (m.hips_cm) parts.push(`Hips: ${m.hips_cm}cm`);
              if (m.chest_cm) parts.push(`Chest: ${m.chest_cm}cm`);
              if (m.weight_kg) parts.push(`Weight: ${m.weight_kg}kg`);
              if (parts.length === 0) {
                if (m.neck_cm) parts.push(`Neck: ${m.neck_cm}cm`);
              }
              return (
                <div key={i} className="bg-card rounded-2xl border-2 border-foreground/5 p-4 flex items-center justify-between">
                  <span className="font-semibold text-sm">{formatDateShort(m.measured_at)}</span>
                  <span className="text-sm text-muted-foreground">{parts.join(" · ") || "Logged"}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Measurement Form */}
      {showMeasForm && (
        <div className="bg-card rounded-3xl border-2 border-primary/20 p-6 shadow-[4px_4px_0px_0px_rgba(223,255,0,0.2)]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Ruler className="w-5 h-5 text-primary-foreground" />
            </div>
            <h3 className="font-bold text-lg">New Measurements</h3>
          </div>
          
          <form onSubmit={handleMeasurementsSubmit} className="space-y-4">
            <div>
              <Label className="font-medium">Date</Label>
              <Input
                type="date"
                value={measDate}
                onChange={(e) => setMeasDate(e.target.value)}
                className="h-12 rounded-xl mt-1.5"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Neck (cm)</Label>
                <Input type="number" step="0.1" placeholder="38" value={measNeck} onChange={(e) => setMeasNeck(e.target.value)} className="h-12 rounded-xl mt-1" />
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Chest (cm)</Label>
                <Input type="number" step="0.1" placeholder="100" value={measChest} onChange={(e) => setMeasChest(e.target.value)} className="h-12 rounded-xl mt-1" />
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Waist (cm)</Label>
                <Input type="number" step="0.1" placeholder="80" value={measWaist} onChange={(e) => setMeasWaist(e.target.value)} className="h-12 rounded-xl mt-1" />
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Hips (cm)</Label>
                <Input type="number" step="0.1" placeholder="95" value={measHips} onChange={(e) => setMeasHips(e.target.value)} className="h-12 rounded-xl mt-1" />
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">L. Arm (cm)</Label>
                <Input type="number" step="0.1" placeholder="33" value={measLeftArm} onChange={(e) => setMeasLeftArm(e.target.value)} className="h-12 rounded-xl mt-1" />
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">R. Arm (cm)</Label>
                <Input type="number" step="0.1" placeholder="33" value={measRightArm} onChange={(e) => setMeasRightArm(e.target.value)} className="h-12 rounded-xl mt-1" />
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">L. Thigh (cm)</Label>
                <Input type="number" step="0.1" placeholder="55" value={measLeftThigh} onChange={(e) => setMeasLeftThigh(e.target.value)} className="h-12 rounded-xl mt-1" />
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">R. Thigh (cm)</Label>
                <Input type="number" step="0.1" placeholder="55" value={measRightThigh} onChange={(e) => setMeasRightThigh(e.target.value)} className="h-12 rounded-xl mt-1" />
              </div>
            </div>

            <div>
              <Label className="text-xs font-medium text-muted-foreground">Notes (optional)</Label>
              <Input placeholder="e.g., morning measurement" value={measNotes} onChange={(e) => setMeasNotes(e.target.value)} className="h-12 rounded-xl mt-1" />
            </div>

            <div className="flex gap-3">
              <Button type="button" variant="outline" className="flex-1 h-12 rounded-xl" onClick={() => setShowMeasForm(false)}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1 h-12 rounded-xl" disabled={measLoading}>
                {measLoading ? "Saving..." : "Save Measurements"}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
