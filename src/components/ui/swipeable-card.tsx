"use client";

import { useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Check, X, LucideIcon } from "lucide-react";

interface SwipeableCardProps {
  children: React.ReactNode;
  onComplete?: () => void;
  onSkip?: () => void;
  completed?: boolean;
  skipped?: boolean;
  className?: string;
  icon?: LucideIcon;
  label?: string;
}

export function SwipeableCard({
  children,
  onComplete,
  onSkip,
  completed,
  skipped,
  className,
  icon: Icon,
  label,
}: SwipeableCardProps) {
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    startX.current = clientX;
    setIsDragging(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging) return;
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const delta = clientX - startX.current;
    const constrained = Math.max(-100, Math.min(100, delta));
    setDragX(constrained);
  }, [isDragging]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    if (dragX > 60 && onComplete) {
      onComplete();
    } else if (dragX < -60 && onSkip) {
      onSkip();
    }
    setDragX(0);
  }, [dragX, onComplete, onSkip]);

  const status = completed ? "completed" : skipped ? "skipped" : "pending";

  return (
    <div className={cn("relative overflow-hidden rounded-3xl", className)}>
      {/* Background actions */}
      <div className="absolute inset-0 flex">
        <div className={cn(
          "flex-1 flex items-center justify-start pl-6 transition-colors",
          dragX > 0 ? "bg-green-500" : "bg-green-500/20"
        )}>
          <div className={cn(
            "w-10 h-10 rounded-full bg-white flex items-center justify-center transition-opacity",
            dragX > 0 ? "opacity-100" : "opacity-50"
          )}>
            <Check className="w-5 h-5 text-green-600" />
          </div>
        </div>
        <div className={cn(
          "flex-1 flex items-center justify-end pr-6 transition-colors",
          dragX < 0 ? "bg-gray-400" : "bg-gray-400/20"
        )}>
          <div className={cn(
            "w-10 h-10 rounded-full bg-white flex items-center justify-center transition-opacity",
            dragX < 0 ? "opacity-100" : "opacity-50"
          )}>
            <X className="w-5 h-5 text-gray-600" />
          </div>
        </div>
      </div>

      {/* Card content */}
      <div
        ref={cardRef}
        className={cn(
          "relative bg-card border-2 border-foreground/5 rounded-3xl p-4 transition-transform duration-200 ease-out shadow-[3px_3px_0px_0px_rgba(15,15,15,0.05)]",
          isDragging && "transition-none",
          status === "completed" && "border-green-500/30 bg-green-50/50",
          status === "skipped" && "border-gray-400/30 bg-gray-50/50 opacity-70"
        )}
        style={{ transform: `translateX(${dragX}px)` }}
        onMouseDown={handleTouchStart}
        onMouseMove={handleTouchMove}
        onMouseUp={handleTouchEnd}
        onMouseLeave={handleTouchEnd}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex items-center gap-3">
          {Icon && (
            <div className={cn(
              "p-2.5 rounded-2xl shrink-0",
              status === "completed" ? "bg-green-100 text-green-700" :
              status === "skipped" ? "bg-gray-100 text-gray-500" :
              "bg-primary/10 text-primary-foreground"
            )}>
              <Icon className="w-5 h-5" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            {label && (
              <p className={cn(
                "font-semibold",
                status === "completed" && "line-through text-muted-foreground"
              )}>
                {label}
              </p>
            )}
            {children}
          </div>
          {status === "completed" && (
            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center shrink-0">
              <Check className="w-4 h-4 text-white" />
            </div>
          )}
          {status === "skipped" && (
            <div className="w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center shrink-0">
              <X className="w-4 h-4 text-white" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
