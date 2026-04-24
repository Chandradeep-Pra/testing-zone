import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl text-sm font-bold whitespace-nowrap outline-none focus-visible:ring-[3px] focus-visible:ring-primary/40 disabled:pointer-events-none disabled:opacity-50 select-none transition-colors duration-150 ease-in-out [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        default:
          "bg-[#0d9488] text-white border-b-4 border-[#0f766e] hover:bg-[#14b8a6] active:border-b-0 active:translate-y-[4px] active:mb-[4px]",
        primary:
          "bg-[#0d9488] text-white border-b-4 border-[#0f766e] hover:bg-[#14b8a6] active:border-b-0 active:translate-y-[4px] active:mb-[4px]",
        destructive:
          "bg-[#ef4444] text-white border-b-4 border-[#b91c1c] hover:bg-[#f87171] active:border-b-0 active:translate-y-[4px] active:mb-[4px]",
        outline:
          "bg-transparent text-slate-300 border-2 border-[#27272a] border-b-4 hover:bg-[#27272a] hover:text-white active:border-b-2 active:translate-y-[2px] active:mb-[2px]",
        secondary:
          "bg-[#27272a] text-slate-300 border-b-4 border-[#3f3f46] hover:bg-[#3f3f46] hover:text-white active:border-b-0 active:translate-y-[4px] active:mb-[4px]",
        ghost:
          "text-slate-300 hover:bg-[#27272a] hover:text-white active:bg-[#3f3f46]",
        link: "text-[#2dd4bf] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-12 px-6 py-3 has-[>svg]:px-5",
        xs: "h-8 gap-1.5 rounded-xl border-b-2 px-3 text-xs has-[>svg]:px-2.5 [&_svg:not([class*='size-'])]:size-4 active:translate-y-[2px] active:mb-[2px]",
        sm: "h-10 gap-2 rounded-xl border-b-[3px] px-4 text-sm has-[>svg]:px-3 active:translate-y-[3px] active:mb-[3px]",
        lg: "h-14 rounded-2xl border-b-[5px] px-8 text-lg has-[>svg]:px-6 active:translate-y-[5px] active:mb-[5px]",
        icon: "size-12 rounded-2xl",
        "icon-xs": "size-8 rounded-xl border-b-2 active:translate-y-[2px] active:mb-[2px] [&_svg:not([class*='size-'])]:size-4",
        "icon-sm": "size-10 rounded-xl border-b-[3px] active:translate-y-[3px] active:mb-[3px]",
        "icon-lg": "size-14 rounded-2xl border-b-[5px] active:translate-y-[5px] active:mb-[5px]",
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
