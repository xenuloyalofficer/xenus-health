"use client";

import { format } from "date-fns";
import {
  Activity, Moon, Dumbbell, Utensils, Pill, Zap, Ruler,
  ChevronRight, Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { TrendsSnapshot } from "@/components/dashboard/trends-snapshot";
import { InsightsPreview } from "@/components/dashboard/insights-preview";
import type { TabId } from "@/components/layout/app-shell";

const checklistItems = [
  { id: "sleep", label: "Sleep", icon: Moon, status: "logged", detail: "7h 23m", tab: "health" as TabId },
  { id: "weight", label: "Weight", icon: Activity, status: "optional", detail: null, tab: "body" as TabId },
  { id: "meds", label: "Meds", icon: Pill, status: "pending", detail: "Morning dose", tab: "health" as TabId },
  { id: "exercise", label: "Exercise", icon: Dumbbell, status: "pending", detail: "Treadmill 30m", tab: "exercise" as TabId },
  { id: "food", label: "Food", icon: Utensils, status: "partial", detail: "2 entries", tab: "health" as TabId },
  { id: "energy", label: "Energy/Mood", icon: Zap, status: "pending", detail: null, tab: "health" as TabId },
  { id: "measurements", label: "Measurements", icon: Ruler, status: "optional", detail: "Weekly", tab: "body" as TabId },
];

interface HomeTabProps {
  onNavigate: (tab: TabId) => void;
}

export function HomeTab({ onNavigate }: HomeTabProps) {
  const today = new Date();
  const momentumScore = 72;

  return (
    <div className="space-y-6">
      {/* Greeting + Momentum */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Good morning, Maria!</h1>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Simplified Checklist */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold">Today&apos;s Checklist</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {checklistItems.map((item) => {
                const Icon = item.icon;
                const isLogged = item.status === "logged";
                const isOptional = item.status === "optional";
                const isPartial = item.status === "partial";

                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.tab)}
                    className="flex items-center justify-between w-full p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-md ${
                        isLogged ? "bg-green-100 text-green-700"
                          : isOptional ? "bg-gray-100 text-gray-500"
                          : isPartial ? "bg-amber-100 text-amber-700"
                          : "bg-blue-100 text-blue-700"
                      }`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{item.label}</p>
                        {item.detail && (
                          <p className="text-xs text-muted-foreground">{item.detail}</p>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                );
              })}

              <div className="pt-2">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Completion</span>
                  <span className="font-medium">33%</span>
                </div>
                <Progress value={33} className="h-2" />
              </div>
            </CardContent>
          </Card>

          {/* Next Treadmill - simplified, links to Exercise tab */}
          <Card className="border-blue-200 bg-blue-50/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-100 rounded-lg">
                    <Clock className="h-5 w-5 text-blue-700" />
                  </div>
                  <div>
                    <p className="font-bold">Next: Treadmill 30m</p>
                    <p className="text-sm text-muted-foreground">Standard pace</p>
                  </div>
                </div>
                <Button size="sm" onClick={() => onNavigate("exercise")}>
                  Go
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <TrendsSnapshot />
          <InsightsPreview />
        </div>
      </div>
    </div>
  );
}
