"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock, Dumbbell } from "lucide-react";

export function NextTreadmill() {
  const [logOpen, setLogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // TODO: Connect to API
    await new Promise((r) => setTimeout(r, 500));
    setLoading(false);
    setLogOpen(false);
  };

  return (
    <>
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-blue-600" />
            Next Treadmill Session
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Clock className="h-6 w-6 text-blue-700" />
              </div>
              <div>
                <p className="font-bold text-lg">30 minutes</p>
                <p className="text-sm text-muted-foreground">Standard pace • RPE 5-6</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => alert("Treadmill session started! Timer: 30:00")}>
                Start Session
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setLogOpen(true)}>
                Log Session
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={logOpen} onOpenChange={setLogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Log Treadmill Session</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleLogSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Duration (minutes)</Label>
              <Input type="number" defaultValue="30" />
            </div>
            <div className="space-y-2">
              <Label>Speed (km/h)</Label>
              <Input type="number" step="0.1" placeholder="6.5" />
            </div>
            <div className="space-y-2">
              <Label>Incline (%)</Label>
              <Input type="number" placeholder="2" />
            </div>
            <div className="space-y-2">
              <Label>RPE (1-10)</Label>
              <Input type="number" min="1" max="10" defaultValue="6" />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Saving..." : "Save Session"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
