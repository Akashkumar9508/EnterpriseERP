import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const inputVariants = cva(
  "w-full min-w-0 transition-all outline-none placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "h-8 rounded-none border border-input bg-transparent px-2.5 py-1 text-xs dark:bg-input/30 focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50",
        erp: "h-auto rounded-xl border border-black/10 bg-black/5 px-4 py-4 pl-12 text-base text-black hover:bg-black/10 focus:ring-0 focus-visible:ring-0 focus-visible:border-black/20 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 dark:focus-visible:border-white/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

interface InputProps
  extends React.ComponentProps<"input">,
  VariantProps<typeof inputVariants> { }

function Input({ className, type, variant, ...props }: InputProps) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(inputVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Input, inputVariants }
