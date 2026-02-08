import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition-all duration-150 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-primary/50 active:scale-[0.97]",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:brightness-105 shadow-[3px_3px_0px_0px_rgba(15,15,15,0.15)] active:shadow-none active:translate-x-[3px] active:translate-y-[3px]",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 shadow-[3px_3px_0px_0px_rgba(255,68,68,0.3)] active:shadow-none active:translate-x-[3px] active:translate-y-[3px]",
        outline:
          "border-2 border-foreground/20 bg-transparent hover:bg-foreground/5 shadow-[3px_3px_0px_0px_rgba(15,15,15,0.08)] active:shadow-none active:translate-x-[3px] active:translate-y-[3px]",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-[3px_3px_0px_0px_rgba(15,15,15,0.08)] active:shadow-none active:translate-x-[3px] active:translate-y-[3px]",
        ghost:
          "hover:bg-foreground/5",
        link: "text-primary underline-offset-4 hover:underline",
        lime: "bg-primary text-primary-foreground hover:brightness-105 rounded-full px-8 shadow-[4px_4px_0px_0px_rgba(15,15,15,0.2)] active:shadow-none active:translate-x-[4px] active:translate-y-[4px]",
        "lime-outline": "border-2 border-primary text-primary hover:bg-primary/10 rounded-full px-8",
      },
      size: {
        default: "h-12 px-6 py-3 rounded-2xl text-sm",
        xs: "h-8 gap-1 rounded-xl px-3 text-xs",
        sm: "h-10 rounded-xl gap-1.5 px-4 text-sm",
        lg: "h-14 rounded-2xl px-8 text-base",
        icon: "size-12 rounded-2xl",
        "icon-xs": "size-8 rounded-xl [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-10 rounded-xl",
        "icon-lg": "size-14 rounded-2xl",
        pill: "h-14 px-8 rounded-full text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
