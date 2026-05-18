import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const brandLogoVariants = cva("flex items-center gap-3", {
  variants: {
    size: {
      sm: "[&_.icon]:h-8 [&_.icon]:w-8 [&_.name]:text-xl",
      default: "[&_.icon]:h-10 [&_.icon]:w-10 [&_.name]:text-3xl",
      lg: "[&_.icon]:h-12 [&_.icon]:w-12 [&_.name]:text-4xl",
    },
  },
  defaultVariants: { size: "default" },
})

interface BrandLogoProps
  extends React.ComponentProps<"div">,
    VariantProps<typeof brandLogoVariants> {}

function BrandLogo({ className, size, ...props }: BrandLogoProps) {
  return (
    <div className={cn(brandLogoVariants({ size }), className)} {...props}>
      <div className="icon flex items-center justify-center rounded bg-blue-600 shadow-lg shadow-blue-500/20">
        <div className="h-5 w-5 rounded-sm border-2 border-white" />
      </div>
      <h1 className="name font-bold tracking-tight drop-shadow-md group-data-[collapsible=icon]:hidden">
        Interprise<span className="text-blue-400">ERP</span>
      </h1>
    </div>
  )
}

export { BrandLogo, brandLogoVariants }
