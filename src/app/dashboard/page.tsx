import type { Metadata } from "next";
import { DashboardHeader } from "@/components/dashboard/header";
import { TodayChecklist } from "@/components/dashboard/today-checklist";
import { NextTreadmill } from "@/components/dashboard/next-treadmill";
import { TrendsSnapshot } from "@/components/dashboard/trends-snapshot";
import { InsightsPreview } from "@/components/dashboard/insights-preview";

export const metadata: Metadata = {
  title: "Dashboard | Health OS",
  description: "Your health cockpit",
};

export default function DashboardPage() {
  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <DashboardHeader />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Left Column */}
        <div className="space-y-6">
          <TodayChecklist />
          <NextTreadmill />
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
