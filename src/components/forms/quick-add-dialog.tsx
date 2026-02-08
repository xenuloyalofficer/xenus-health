"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";

interface QuickAddDialogProps {
  type: "sleep" | "weight" | "exercise" | "food" | "energy" | "meds";
  trigger: React.ReactNode;
}

export function QuickAddDialog({ type, trigger }: QuickAddDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const titles: Record<string, string> = {
    sleep: "Log Sleep",
    weight: "Log Weight",
    exercise: "Log Exercise",
    food: "Log Food",
    energy: "Log Energy/Mood",
    meds: "Log Medication",
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // TODO: Connect to API
    await new Promise((r) => setTimeout(r, 500));
    setLoading(false);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{titles[type]}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {type === "sleep" && (
            <>
              <div className="space-y-2">
                <Label>Bedtime</Label>
                <Input type="datetime-local" />
              </div>
              <div className="space-y-2">
                <Label>Wake Time</Label>
                <Input type="datetime-local" />
              </div>
              <div className="space-y-2">
                <Label>Quality (1-5)</Label>
                <Input type="number" min="1" max="5" placeholder="4" />
              </div>
            </>
          )}

          {type === "weight" && (
            <div className="space-y-2">
              <Label>Weight (kg)</Label>
              <Input type="number" step="0.1" placeholder="70.5" />
            </div>
          )}

          {type === "exercise" && (
            <>
              <div className="space-y-2">
                <Label>Duration (minutes)</Label>
                <Input type="number" placeholder="30" />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Input defaultValue="Treadmill" />
              </div>
              <div className="space-y-2">
                <Label>RPE (1-10)</Label>
                <Input type="number" min="1" max="10" placeholder="6" />
              </div>
            </>
          )}

          {type === "food" && (
            <div className="space-y-2">
              <Label>What did you eat?</Label>
              <Input placeholder="e.g., Oatmeal with berries" />
            </div>
          )}

          {type === "energy" && (
            <>
              <div className="space-y-2">
                <Label>Energy Level (1-10)</Label>
                <Input type="number" min="1" max="10" placeholder="7" />
              </div>
              <div className="space-y-2">
                <Label>Mood (1-10, optional)</Label>
                <Input type="number" min="1" max="10" placeholder="8" />
              </div>
            </>
          )}

          {type === "meds" && (
            <>
              <div className="space-y-2">
                <Label>Medication</Label>
                <Input placeholder="e.g., Vitamin D" />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <select className="w-full p-2 border rounded">
                  <option>Taken</option>
                  <option>Skipped</option>
                  <option>Late</option>
                </select>
              </div>
            </>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Saving..." : "Save"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
