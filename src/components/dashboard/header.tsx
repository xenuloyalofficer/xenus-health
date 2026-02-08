"use client";

import { format } from "date-fns";
import { Activity, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export function DashboardHeader() {
  const today = new Date();
  const momentumScore = 72;
  
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Good morning, Maria! 👋</h1>
          <p className="text-muted-foreground">{format(today, "EEEE, MMMM do, yyyy")}</p>
        </div>
        
        <Card className="p-4 min-w-[200px]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Activity className="h-5 w-5 text-green-700" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Momentum</span>
                <span className="text-sm font-bold">{momentumScore}/100</span>
              </div>
              <Progress value={momentumScore} className="h-2 mt-2" />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
