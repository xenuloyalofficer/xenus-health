import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground",
        "border-2 border-foreground/10 bg-secondary h-12 w-full min-w-0 rounded-xl px-4 py-2 text-base font-medium",
        "shadow-[2px_2px_0px_0px_rgba(15,15,15,0.05)]",
        "transition-all outline-none",
        "focus-visible:border-primary/50 focus-visible:bg-background focus-visible:shadow-[3px_3px_0px_0px_rgba(223,255,0,0.2)]",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Input }
