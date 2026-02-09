"use client";

import { useState } from "react";
import { Home, Dumbbell, Scale, Heart, TrendingUp, Bell, User, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { HomeTab } from "@/components/tabs/home-tab";
import { ExerciseTab } from "@/components/tabs/exercise-tab";
import { BodyTab } from "@/components/tabs/body-tab";
import { HealthTab } from "@/components/tabs/health-tab";
import { TrendsTab } from "@/components/tabs/trends-tab";
import { ExerciseSessionProvider, useExerciseSession } from "@/contexts/exercise-session";

const tabs = [
  { id: "home", label: "Home", icon: Home },
  { id: "exercise", label: "Exercise", icon: Dumbbell },
  { id: "body", label: "Body", icon: Scale },
  { id: "health", label: "Health", icon: Heart },
  { id: "trends", label: "Trends", icon: TrendingUp },
] as const;

export type TabId = (typeof tabs)[number]["id"];

function formatTimerDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function ActiveSessionBar({ onNavigate }: { onNavigate: (tab: TabId) => void }) {
  const { activeTimer, elapsed } = useExerciseSession();
  if (!activeTimer) return null;

  return (
    <button
      onClick={() => onNavigate("exercise")}
      className="fixed bottom-24 md:bottom-4 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 px-4 py-2.5 bg-primary rounded-full border-2 border-foreground/10 shadow-[0_4px_20px_rgba(0,0,0,0.15)] hover:shadow-[0_6px_24px_rgba(0,0,0,0.2)] transition-all"
    >
      <Dumbbell className="w-4 h-4 text-primary-foreground" />
      <span className="text-sm font-bold text-primary-foreground">{activeTimer.exerciseType}</span>
      <span className="text-sm font-mono font-bold text-primary-foreground tabular-nums">{formatTimerDuration(elapsed)}</span>
    </button>
  );
}

export function AppShell() {
  const [activeTab, setActiveTab] = useState<TabId>("home");

  return (
    <ExerciseSessionProvider>
    <div className="min-h-screen flex flex-col bg-background">
      {/* Desktop header */}
      <header className="hidden md:block sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-foreground/5">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(15,15,15,0.15)]">
                <span className="text-xl font-bold text-primary-foreground">H</span>
              </div>
              <span className="font-bold text-xl tracking-tight">Health OS</span>
            </div>
            <div className="flex items-center gap-3">
              <button className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors">
                <Bell className="w-5 h-5" />
              </button>
              <button className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-5 h-5 text-primary-foreground" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile header */}
      <header className="md:hidden sticky top-0 z-40 bg-background/80 backdrop-blur-xl">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(15,15,15,0.15)]">
              <span className="text-sm font-bold text-primary-foreground">H</span>
            </div>
            <span className="font-bold text-lg">Health OS</span>
          </div>
          <button className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
            <Bell className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Content - all tabs rendered, inactive hidden to preserve timer state */}
      <main className="flex-1 pb-28 md:pb-6">
        <div className="container mx-auto px-4 py-4 max-w-5xl">
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

      {/* Desktop side navigation */}
      <nav className="hidden md:flex fixed left-4 top-1/2 -translate-y-1/2 flex-col gap-2 p-3 bg-card rounded-3xl border-2 border-foreground/5 shadow-[4px_4px_0px_0px_rgba(15,15,15,0.08)] z-50">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center justify-center w-12 h-12 rounded-2xl transition-all duration-200",
                isActive
                  ? "bg-primary text-primary-foreground shadow-[2px_2px_0px_0px_rgba(15,15,15,0.15)]"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
              title={tab.label}
            >
              <Icon className={cn("w-5 h-5", isActive && "stroke-[2.5]")} />
            </button>
          );
        })}
      </nav>

      {/* Active exercise session bar — visible on all pages */}
      <ActiveSessionBar onNavigate={setActiveTab} />

      {/* Mobile floating bottom navigation */}
      <nav className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-2 bg-card/95 backdrop-blur-xl rounded-full border-2 border-foreground/5 shadow-[0_8px_30px_rgba(0,0,0,0.12)] z-50">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center justify-center min-w-[52px] h-12 rounded-full transition-all duration-200",
                isActive
                  ? "bg-primary text-primary-foreground px-4 shadow-[2px_2px_0px_0px_rgba(15,15,15,0.15)]"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("w-5 h-5", isActive && "stroke-[2.5]")} />
              {isActive && (
                <span className="ml-2 text-sm font-semibold">{tab.label}</span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
    </ExerciseSessionProvider>
  );
}
