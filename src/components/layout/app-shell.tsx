"use client";

import { useState } from "react";
import { Home, Dumbbell, Scale, Heart, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { HomeTab } from "@/components/tabs/home-tab";
import { ExerciseTab } from "@/components/tabs/exercise-tab";
import { BodyTab } from "@/components/tabs/body-tab";
import { HealthTab } from "@/components/tabs/health-tab";
import { TrendsTab } from "@/components/tabs/trends-tab";

const tabs = [
  { id: "home", label: "Home", icon: Home },
  { id: "exercise", label: "Exercise", icon: Dumbbell },
  { id: "body", label: "Body", icon: Scale },
  { id: "health", label: "Health", icon: Heart },
  { id: "trends", label: "Trends", icon: TrendingUp },
] as const;

export type TabId = (typeof tabs)[number]["id"];

export function AppShell() {
  const [activeTab, setActiveTab] = useState<TabId>("home");

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Desktop top nav */}
      <header className="hidden md:block border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="flex items-center h-14">
            <span className="font-bold text-lg mr-8">Health OS</span>
            <nav className="flex gap-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                      activeTab === tab.id
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* Content - all tabs rendered, inactive hidden to preserve timer state */}
      <main className="flex-1 pb-20 md:pb-6">
        <div className="container mx-auto px-4 py-6 max-w-5xl">
          <div className={activeTab === "home" ? "" : "hidden"}>
            <HomeTab onNavigate={setActiveTab} />
          </div>
          <div className={activeTab === "exercise" ? "" : "hidden"}>
            <ExerciseTab />
          </div>
          <div className={activeTab === "body" ? "" : "hidden"}>
            <BodyTab />
          </div>
          <div className={activeTab === "health" ? "" : "hidden"}>
            <HealthTab />
          </div>
          <div className={activeTab === "trends" ? "" : "hidden"}>
            <TrendsTab />
          </div>
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t z-50">
        <div className="flex justify-around items-center h-16 px-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex flex-col items-center gap-1 min-w-[64px] px-3 py-2 rounded-lg transition-colors",
                  activeTab === tab.id
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              >
                <Icon className={cn("h-5 w-5", activeTab === tab.id && "stroke-[2.5]")} />
                <span className="text-xs font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
