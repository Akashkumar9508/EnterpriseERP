import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const pageVariants = cva(
  "min-h-screen text-white overflow-hidden",
  {
    variants: {
      variant: {
        default: "bg-[#0a0a0c] p-8",
        split: "bg-[#0a0a0c] flex",
        dashboard: "bg-[#0a0a0c] flex flex-col",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

interface PageProps
  extends React.ComponentProps<"main">,
    VariantProps<typeof pageVariants> {}

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
