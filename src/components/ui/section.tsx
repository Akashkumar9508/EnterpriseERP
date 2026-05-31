import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const sectionVariants = cva("", {
  variants: {
    variant: {
      default: "p-8",
      image: "relative hidden bg-[#0f1115] lg:flex lg:w-[35%] xl:w-[40%] before:absolute before:inset-0 before:z-10 before:bg-gradient-to-r before:from-transparent before:to-[#0a0a0c]/90 before:content-[''] after:absolute after:inset-0 after:z-10 after:bg-gradient-to-t after:from-[#0a0a0c] after:to-transparent after:content-['']",
      form: "relative flex w-full flex-col items-center justify-center p-8 lg:w-[65%] xl:w-[60%]",
      field: "space-y-2",
      tagline: "absolute bottom-8 left-8 z-20 max-w-[85%] lg:max-w-md",
    },
  },
  defaultVariants: {
    variant: "default",
  },
})

interface SectionProps
  extends React.ComponentProps<"section">,
  VariantProps<typeof sectionVariants> { }

function Section({ className, variant, ...props }: SectionProps) {
  return (
    <section
      data-slot="section"
      className={cn(sectionVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Section, sectionVariants }
