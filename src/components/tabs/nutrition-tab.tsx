"use client";

import { WaterTracker } from "@/components/nutrition/water-tracker";
import { NutritionSection } from "@/components/nutrition/nutrition-section";

export function NutritionTab() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Nutrition</h1>
      </div>
      <WaterTracker />
      <NutritionSection />
    </div>
  );
}
