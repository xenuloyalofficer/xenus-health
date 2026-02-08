"use client";

import { useState } from "react";
import { Scale, Ruler } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export function BodyTab() {
  // Weight form
  const [weightKg, setWeightKg] = useState("");
  const [weightDate, setWeightDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [weightLoading, setWeightLoading] = useState(false);

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
          date: weightDate,
          weight_kg: parseFloat(weightKg),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || `Failed to save (${res.status})`);
      }
      toast.success("Weight saved");
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
      // Reset
      setMeasNeck(""); setMeasChest(""); setMeasLeftArm(""); setMeasRightArm("");
      setMeasWaist(""); setMeasHips(""); setMeasLeftThigh(""); setMeasRightThigh("");
      setMeasLeftCalf(""); setMeasRightCalf(""); setMeasWeight(""); setMeasNotes("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setMeasLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Body</h2>

      {/* Weight Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Weight
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleWeightSubmit} className="flex gap-3 items-end">
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Weight (kg)</Label>
              <Input
                type="number"
                step="0.1"
                placeholder="70.5"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Date</Label>
              <Input
                type="date"
                className="w-auto"
                value={weightDate}
                onChange={(e) => setWeightDate(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={weightLoading}>
              {weightLoading ? "..." : "Save"}
            </Button>
          </form>

          {/* Trend placeholder */}
          <div>
            <p className="text-sm text-muted-foreground mb-2">7-day trend</p>
            <Skeleton className="h-32 w-full" />
          </div>
        </CardContent>
      </Card>

      {/* Measurements Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Ruler className="h-5 w-5" />
            Body Measurements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleMeasurementsSubmit} className="space-y-4">
            <div className="flex gap-3 items-end">
              <div className="space-y-1">
                <Label className="text-xs">Date</Label>
                <Input
                  type="date"
                  value={measDate}
                  onChange={(e) => setMeasDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              All measurements in cm. Fill in whichever you tracked.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Neck</Label>
                <Input type="number" step="0.1" min="0" placeholder="38.0" value={measNeck} onChange={(e) => setMeasNeck(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Chest</Label>
                <Input type="number" step="0.1" min="0" placeholder="100.0" value={measChest} onChange={(e) => setMeasChest(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Left Arm</Label>
                <Input type="number" step="0.1" min="0" placeholder="33.0" value={measLeftArm} onChange={(e) => setMeasLeftArm(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Right Arm</Label>
                <Input type="number" step="0.1" min="0" placeholder="33.0" value={measRightArm} onChange={(e) => setMeasRightArm(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Waist</Label>
                <Input type="number" step="0.1" min="0" placeholder="80.0" value={measWaist} onChange={(e) => setMeasWaist(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Hips</Label>
                <Input type="number" step="0.1" min="0" placeholder="95.0" value={measHips} onChange={(e) => setMeasHips(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Left Thigh</Label>
                <Input type="number" step="0.1" min="0" placeholder="55.0" value={measLeftThigh} onChange={(e) => setMeasLeftThigh(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Right Thigh</Label>
                <Input type="number" step="0.1" min="0" placeholder="55.0" value={measRightThigh} onChange={(e) => setMeasRightThigh(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Left Calf</Label>
                <Input type="number" step="0.1" min="0" placeholder="38.0" value={measLeftCalf} onChange={(e) => setMeasLeftCalf(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Right Calf</Label>
                <Input type="number" step="0.1" min="0" placeholder="38.0" value={measRightCalf} onChange={(e) => setMeasRightCalf(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Weight (kg, optional)</Label>
              <Input type="number" step="0.1" min="0" placeholder="70.5" value={measWeight} onChange={(e) => setMeasWeight(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Notes (optional)</Label>
              <Input placeholder="e.g., morning measurement, flexed" value={measNotes} onChange={(e) => setMeasNotes(e.target.value)} />
            </div>

            <Button type="submit" className="w-full" disabled={measLoading}>
              {measLoading ? "Saving..." : "Save Measurements"}
            </Button>
          </form>

          {/* History placeholder */}
          <div className="mt-4">
            <p className="text-sm text-muted-foreground mb-2">Measurement history</p>
            <Skeleton className="h-24 w-full" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
