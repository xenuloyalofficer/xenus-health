"use client";

import { useState, useEffect, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  ReferenceLine,
} from "recharts";
import {
  FlaskConical, Plus, ChevronRight, ChevronLeft, ArrowUpRight, ArrowDownRight,
  TrendingUp, TrendingDown, Calendar, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { medium, success } from "@/lib/haptics";
import { cn } from "@/lib/utils";

// --- Types ---

interface MarkerPreset {
  id: string;
  category: string;
  marker_name: string;
  unit: string;
  ref_range_low: number | null;
  ref_range_high: number | null;
  sort_order: number;
}

interface BloodWorkResult {
  id: string;
  marker_name: string;
  category: string;
  value: number;
  unit: string;
  ref_range_low: number | null;
  ref_range_high: number | null;
  flag: string | null;
}

interface BloodWorkPanel {
  id: string;
  test_date: string;
  lab_name: string | null;
  notes: string | null;
  blood_work_results: BloodWorkResult[];
}

// --- Helpers ---

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatDateShort(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
}

function flagColor(flag: string | null) {
  if (flag === "high") return "text-red-600 bg-red-50 border-red-200";
  if (flag === "low") return "text-orange-600 bg-orange-50 border-orange-200";
  return "text-green-600 bg-green-50 border-green-200";
}

function flagBadge(flag: string | null) {
  if (flag === "high") return { label: "HIGH", bg: "bg-red-500" };
  if (flag === "low") return { label: "LOW", bg: "bg-orange-500" };
  return { label: "Normal", bg: "bg-green-500" };
}

function computeFlag(value: number, low: number | null, high: number | null): string | null {
  if (low != null && value < low) return "low";
  if (high != null && value > high) return "high";
  return null;
}

// Group results by category
function groupByCategory(results: BloodWorkResult[]) {
  const groups: Record<string, BloodWorkResult[]> = {};
  for (const r of results) {
    if (!groups[r.category]) groups[r.category] = [];
    groups[r.category].push(r);
  }
  return groups;
}

const CATEGORY_ORDER = ["Lipid Panel", "Metabolic", "Liver", "Blood Count", "Thyroid", "Other"];
const CATEGORY_COLORS: Record<string, string> = {
  "Lipid Panel": "#ef4444",
  "Metabolic": "#f59e0b",
  "Liver": "#8b5cf6",
  "Blood Count": "#3b82f6",
  "Thyroid": "#06b6d4",
  "Other": "#10b981",
};

// --- Main Component ---

export function BloodWorkSection() {
  const [panels, setPanels] = useState<BloodWorkPanel[]>([]);
  const [presets, setPresets] = useState<MarkerPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [detailPanel, setDetailPanel] = useState<BloodWorkPanel | null>(null);
  const [chartMarker, setChartMarker] = useState<string | null>(null);

  // Load data
  useEffect(() => {
    async function load() {
      try {
        const [panelsRes, presetsRes] = await Promise.all([
          fetch("/api/blood-work?limit=50"),
          fetch("/api/blood-work/presets"),
        ]);
        if (panelsRes.ok) {
          const { data } = await panelsRes.json();
          setPanels(data || []);
        }
        if (presetsRes.ok) {
          const { data } = await presetsRes.json();
          setPresets(data || []);
        }
      } catch {}
      setLoading(false);
    }
    load();
  }, []);

  // Group presets by category for the add form
  const presetsByCategory = useMemo(() => {
    const groups: Record<string, MarkerPreset[]> = {};
    for (const p of presets) {
      if (!groups[p.category]) groups[p.category] = [];
      groups[p.category].push(p);
    }
    return groups;
  }, [presets]);

  // Get marker history for chart
  const markerHistory = useMemo(() => {
    if (!chartMarker) return [];
    const points: { date: string; value: number; ref_low: number | null; ref_high: number | null }[] = [];
    // Sort panels chronologically for the chart
    const sorted = [...panels].sort(
      (a, b) => new Date(a.test_date).getTime() - new Date(b.test_date).getTime()
    );
    for (const panel of sorted) {
      const result = panel.blood_work_results.find((r) => r.marker_name === chartMarker);
      if (result) {
        points.push({
          date: panel.test_date,
          value: result.value,
          ref_low: result.ref_range_low,
          ref_high: result.ref_range_high,
        });
      }
    }
    return points;
  }, [chartMarker, panels]);

  const handleDelete = async (panelId: string) => {
    try {
      const res = await fetch(`/api/blood-work?id=${panelId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setPanels((prev) => prev.filter((p) => p.id !== panelId));
      setDetailPanel(null);
      toast.success("Panel deleted");
      medium();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  // Compute summary stats from latest panel
  const latestPanel = panels[0] ?? null;
  const flaggedCount = latestPanel?.blood_work_results.filter((r) => r.flag).length ?? 0;
  const normalCount = latestPanel ? latestPanel.blood_work_results.length - flaggedCount : 0;

  return (
    <>
      {/* Blood Work Card */}
      <div className="bg-card rounded-3xl border-2 border-foreground/5 p-6 shadow-[4px_4px_0px_0px_rgba(15,15,15,0.05)]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-500 flex items-center justify-center">
              <FlaskConical className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-lg">Blood Work</h2>
              <p className="text-sm text-muted-foreground">
                {panels.length > 0
                  ? `${panels.length} panel${panels.length !== 1 ? "s" : ""} tracked`
                  : "Track your lab results"}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setAddOpen(true)} className="rounded-full">
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-20 bg-secondary/30 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : panels.length === 0 ? (
          <div className="text-center py-6 space-y-3">
            <p className="text-muted-foreground">Add your lab results to track trends over time.</p>
            <Button onClick={() => setAddOpen(true)} variant="outline" className="rounded-full">
              <Plus className="h-4 w-4 mr-1" /> Add Lab Panel
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Latest panel summary */}
            {latestPanel && (
              <div className="bg-secondary/30 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">Latest Panel</p>
                  <p className="text-xs text-muted-foreground">{formatDate(latestPanel.test_date)}</p>
                </div>
                <div className="flex gap-3">
                  <div className="flex-1 bg-green-50 border-2 border-green-200 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-green-600 tabular-nums">{normalCount}</p>
                    <p className="text-xs text-green-600 font-medium">Normal</p>
                  </div>
                  <div className="flex-1 bg-red-50 border-2 border-red-200 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-red-600 tabular-nums">{flaggedCount}</p>
                    <p className="text-xs text-red-600 font-medium">Flagged</p>
                  </div>
                </div>
                {/* Quick flagged markers */}
                {flaggedCount > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {latestPanel.blood_work_results
                      .filter((r) => r.flag)
                      .map((r) => {
                        const badge = flagBadge(r.flag);
                        return (
                          <button
                            key={r.id}
                            onClick={() => setChartMarker(r.marker_name)}
                            className={cn(
                              "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
                              flagColor(r.flag),
                              "hover:opacity-80"
                            )}
                          >
                            {r.flag === "high" ? (
                              <ArrowUpRight className="w-3 h-3" />
                            ) : (
                              <ArrowDownRight className="w-3 h-3" />
                            )}
                            {r.marker_name}: {r.value}
                          </button>
                        );
                      })}
                  </div>
                )}
              </div>
            )}

            {/* Marker history chart */}
            {chartMarker && markerHistory.length >= 2 && (
              <div className="bg-secondary/30 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold">{chartMarker} Trend</p>
                  <button
                    onClick={() => setChartMarker(null)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Close
                  </button>
                </div>
                <div className="h-40 -mx-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={markerHistory} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tickFormatter={formatDateShort}
                        tick={{ fontSize: 10, fill: "#888" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        domain={["dataMin - 5", "dataMax + 5"]}
                        tick={{ fontSize: 10, fill: "#888" }}
                        axisLine={false}
                        tickLine={false}
                        width={40}
                      />
                      <Tooltip
                        contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}
                        formatter={(value) => [`${value} ${markerHistory[0]?.ref_low != null ? "" : ""}`, chartMarker]}
                        labelFormatter={(label) => formatDate(String(label))}
                      />
                      {/* Reference range lines */}
                      {markerHistory[0]?.ref_high != null && (
                        <ReferenceLine
                          y={markerHistory[0].ref_high}
                          stroke="#ef4444"
                          strokeDasharray="4 4"
                          strokeOpacity={0.6}
                          label={{ value: "High", position: "right", fontSize: 9, fill: "#ef4444" }}
                        />
                      )}
                      {markerHistory[0]?.ref_low != null && markerHistory[0].ref_low > 0 && (
                        <ReferenceLine
                          y={markerHistory[0].ref_low}
                          stroke="#f59e0b"
                          strokeDasharray="4 4"
                          strokeOpacity={0.6}
                          label={{ value: "Low", position: "right", fontSize: 9, fill: "#f59e0b" }}
                        />
                      )}
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#8b5cf6"
                        strokeWidth={3}
                        dot={{ r: 5, fill: "#8b5cf6", strokeWidth: 2, stroke: "#fff" }}
                        activeDot={{ r: 7, fill: "#DFFF00", stroke: "#8b5cf6", strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Panel list */}
            <div className="space-y-2">
              {panels.map((panel) => {
                const flagged = panel.blood_work_results.filter((r) => r.flag).length;
                return (
                  <button
                    key={panel.id}
                    onClick={() => setDetailPanel(panel)}
                    className="w-full flex items-center justify-between p-4 rounded-2xl bg-secondary/50 border-2 border-transparent hover:border-primary/20 transition-all text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{formatDate(panel.test_date)}</p>
                        <p className="text-xs text-muted-foreground">
                          {panel.blood_work_results.length} markers
                          {flagged > 0 && (
                            <span className="text-red-500 font-medium"> · {flagged} flagged</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Panel Detail Dialog */}
      {detailPanel && (
        <PanelDetailDialog
          panel={detailPanel}
          onClose={() => setDetailPanel(null)}
          onDelete={handleDelete}
          onChartMarker={(m) => { setChartMarker(m); setDetailPanel(null); }}
        />
      )}

      {/* Add Panel Dialog */}
      {addOpen && (
        <AddPanelDialog
          presetsByCategory={presetsByCategory}
          open={addOpen}
          onClose={() => setAddOpen(false)}
          onSaved={(newPanel) => {
            setPanels((prev) => [newPanel, ...prev]);
            setAddOpen(false);
          }}
        />
      )}
    </>
  );
}

// --- Panel Detail Dialog ---

function PanelDetailDialog({
  panel,
  onClose,
  onDelete,
  onChartMarker,
}: {
  panel: BloodWorkPanel;
  onClose: () => void;
  onDelete: (id: string) => void;
  onChartMarker: (marker: string) => void;
}) {
  const grouped = groupByCategory(panel.blood_work_results);
  const sortedCategories = CATEGORY_ORDER.filter((c) => grouped[c]);
  // Add any categories not in the predefined order
  for (const c of Object.keys(grouped)) {
    if (!sortedCategories.includes(c)) sortedCategories.push(c);
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto rounded-3xl border-2">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Lab Results — {formatDate(panel.test_date)}
          </DialogTitle>
        </DialogHeader>

        {panel.lab_name && (
          <p className="text-sm text-muted-foreground">{panel.lab_name}</p>
        )}
        {panel.notes && (
          <p className="text-sm text-muted-foreground italic">{panel.notes}</p>
        )}

        <div className="space-y-5 mt-2">
          {sortedCategories.map((category) => (
            <div key={category}>
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: CATEGORY_COLORS[category] || "#6b7280" }}
                />
                <h3 className="font-bold text-sm">{category}</h3>
              </div>
              <div className="space-y-1.5">
                {grouped[category].map((r) => {
                  const badge = flagBadge(r.flag);
                  return (
                    <button
                      key={r.id}
                      onClick={() => onChartMarker(r.marker_name)}
                      className={cn(
                        "w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all text-left",
                        flagColor(r.flag),
                        "hover:opacity-80"
                      )}
                    >
                      <div>
                        <p className="font-medium text-sm">{r.marker_name}</p>
                        <p className="text-xs opacity-70">
                          Ref: {r.ref_range_low ?? "—"} – {r.ref_range_high ?? "—"} {r.unit}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg tabular-nums">{r.value}</p>
                        <span className={cn(
                          "inline-block px-2 py-0.5 rounded-full text-[10px] font-bold text-white",
                          badge.bg
                        )}>
                          {badge.label}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mt-4">
          <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl">
            Close
          </Button>
          <Button
            variant="outline"
            onClick={() => onDelete(panel.id)}
            className="rounded-xl text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// --- Add Panel Dialog ---

function AddPanelDialog({
  presetsByCategory,
  open,
  onClose,
  onSaved,
}: {
  presetsByCategory: Record<string, MarkerPreset[]>;
  open: boolean;
  onClose: () => void;
  onSaved: (panel: BloodWorkPanel) => void;
}) {
  const [testDate, setTestDate] = useState(new Date().toISOString().slice(0, 10));
  const [labName, setLabName] = useState("");
  const [notes, setNotes] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const categories = CATEGORY_ORDER.filter((c) => presetsByCategory[c]);
  // Add any extra categories
  for (const c of Object.keys(presetsByCategory)) {
    if (!categories.includes(c)) categories.push(c);
  }

  const filledCount = Object.values(values).filter((v) => v.trim() !== "").length;

  const handleSave = async () => {
    const results: { marker_name: string; category: string; value: number; unit: string; ref_range_low?: number; ref_range_high?: number }[] = [];

    for (const category of categories) {
      for (const preset of presetsByCategory[category] || []) {
        const val = values[preset.marker_name]?.trim();
        if (val && !isNaN(parseFloat(val))) {
          results.push({
            marker_name: preset.marker_name,
            category: preset.category,
            value: parseFloat(val),
            unit: preset.unit,
            ref_range_low: preset.ref_range_low ?? undefined,
            ref_range_high: preset.ref_range_high ?? undefined,
          });
        }
      }
    }

    if (results.length === 0) {
      toast.error("Please enter at least one marker value");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/blood-work", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          test_date: testDate,
          lab_name: labName || undefined,
          notes: notes || undefined,
          results,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || `Failed to save (${res.status})`);
      }
      const { data } = await res.json();
      onSaved(data);
      toast.success(`Lab panel saved with ${results.length} markers`);
      success();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto rounded-3xl border-2">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Add Lab Panel</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Date & Lab */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="font-medium text-sm">Test Date</Label>
              <Input
                type="date"
                value={testDate}
                onChange={(e) => setTestDate(e.target.value)}
                className="h-12 rounded-xl mt-1"
              />
            </div>
            <div>
              <Label className="font-medium text-sm">Lab (optional)</Label>
              <Input
                placeholder="Lab name"
                value={labName}
                onChange={(e) => setLabName(e.target.value)}
                className="h-12 rounded-xl mt-1"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label className="font-medium text-sm">Notes (optional)</Label>
            <Input
              placeholder="Fasting, follow-up, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-12 rounded-xl mt-1"
            />
          </div>

          {/* Category tabs */}
          <div>
            <Label className="font-medium text-sm mb-2 block">Markers ({filledCount} entered)</Label>
            <div className="flex gap-2 flex-wrap mb-3">
              {categories.map((cat) => {
                const catPresets = presetsByCategory[cat] || [];
                const catFilled = catPresets.filter((p) => values[p.marker_name]?.trim()).length;
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-medium transition-colors border-2",
                      activeCategory === cat
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-secondary hover:bg-secondary/80 border-transparent"
                    )}
                  >
                    {cat}
                    {catFilled > 0 && (
                      <span className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-green-500 text-white text-[9px] font-bold">
                        {catFilled}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Marker inputs for active category */}
            {activeCategory && presetsByCategory[activeCategory] && (
              <div className="space-y-2 bg-secondary/30 rounded-2xl p-3">
                {presetsByCategory[activeCategory].map((preset) => (
                  <div key={preset.marker_name} className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{preset.marker_name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        Ref: {preset.ref_range_low ?? "—"}–{preset.ref_range_high ?? "—"} {preset.unit}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="number"
                        inputMode="decimal"
                        step="any"
                        placeholder="—"
                        value={values[preset.marker_name] || ""}
                        onChange={(e) =>
                          setValues((prev) => ({ ...prev, [preset.marker_name]: e.target.value }))
                        }
                        className="w-24 h-10 rounded-xl text-right text-base font-medium tabular-nums"
                      />
                      <span className="text-xs text-muted-foreground w-12 text-right">{preset.unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button
            onClick={handleSave}
            disabled={saving || filledCount === 0}
            className="w-full h-12 rounded-xl font-bold"
          >
            {saving ? "Saving..." : `Save Panel (${filledCount} markers)`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
