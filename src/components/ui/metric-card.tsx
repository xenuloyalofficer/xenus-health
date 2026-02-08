"use client";

import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  value: string | number;
  label: string;
  icon?: LucideIcon;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  className?: string;
  variant?: "default" | "lime" | "dark";
  onClick?: () => void;
}

export function MetricCard({
  value,
  label,
  icon: Icon,
  trend,
  trendValue,
  className,
  variant = "default",
  onClick,
}: MetricCardProps) {
  const variants = {
    default: "bg-card border-foreground/5",
    lime: "bg-primary border-foreground/10",
    dark: "bg-foreground text-background border-foreground",
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "relative rounded-3xl border-2 p-5 shadow-[3px_3px_0px_0px_rgba(15,15,15,0.08)] transition-all duration-200",
        onClick && "cursor-pointer hover:shadow-[5px_5px_0px_0px_rgba(15,15,15,0.12)] hover:-translate-y-0.5 active:shadow-none active:translate-y-0",
        variants[variant],
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-3xl font-bold tracking-tight tabular-nums">{value}</p>
          <p className={cn(
            "text-sm font-medium mt-1",
            variant === "dark" ? "text-background/70" : "text-muted-foreground"
          )}>
            {label}
          </p>
        </div>
        {Icon && (
          <div className={cn(
            "p-2.5 rounded-2xl",
            variant === "lime" ? "bg-foreground/10" : "bg-primary/10"
          )}>
            <Icon className={cn(
              "w-5 h-5",
              variant === "lime" ? "text-foreground" : "text-primary-foreground"
            )} />
          </div>
        )}
      </div>
      {trend && trendValue && (
        <div className="mt-3 flex items-center gap-1.5">
          <span className={cn(
            "text-xs font-semibold px-2 py-0.5 rounded-full",
            trend === "up" && "bg-green-100 text-green-700",
            trend === "down" && "bg-red-100 text-red-700",
            trend === "neutral" && "bg-gray-100 text-gray-700"
          )}>
            {trend === "up" && "↑"}
            {trend === "down" && "↓"}
            {trend === "neutral" && "→"} {trendValue}
          </span>
        </div>
      )}
    </div>
  );
}
