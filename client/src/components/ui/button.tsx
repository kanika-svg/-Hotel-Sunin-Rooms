import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 transition-colors",
  {
    variants: {
      variant: {
        default:
          "rounded-full bg-white border border-slate-200 text-slate-800 hover:bg-slate-50 shadow-sm",
        destructive:
          "rounded-lg bg-destructive text-destructive-foreground border border-destructive",
        outline:
          "rounded-lg border border-slate-200 bg-transparent text-slate-700 hover:bg-slate-50",
        secondary:
          "rounded-lg border border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100",
        ghost: "rounded-lg border border-transparent hover:bg-slate-100 text-slate-700",
      },
      size: {
        default: "min-h-9 px-5 py-2",
        sm: "min-h-8 rounded-full px-4 text-xs",
        lg: "min-h-10 rounded-full px-8",
        icon: "h-9 w-9 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  },
)
Button.displayName = "Button"

export { Button, buttonVariants }
