import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const pageVariants = cva(
  "min-h-screen text-foreground",
  {
    variants: {
      variant: {
        default: "bg-background p-4 md:p-6",
        split: "bg-background flex",
        dashboard: "bg-background flex flex-col",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

interface PageProps
  extends React.ComponentProps<"main">,
  VariantProps<typeof pageVariants> { }

function Page({ className, variant, ...props }: PageProps) {
  return (
    <main
      data-slot="page"
      className={cn(pageVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Page, pageVariants }
