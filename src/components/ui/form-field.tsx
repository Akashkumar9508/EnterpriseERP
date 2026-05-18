import * as React from 'react';
import { Label as LabelPrimitive } from 'radix-ui';
import { Input, inputVariants } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { VariantProps } from 'class-variance-authority';

interface FormFieldProps
  extends React.ComponentProps<'input'>,
    VariantProps<typeof inputVariants> {
  /** Label text shown above the input */
  label: string;
  /** Optional lucide-react (or any) icon rendered on the left inside the input */
  icon?: React.ReactNode;
  /** Optional content rendered on the right side of the label row (e.g. "Forgot password?" link) */
  labelRight?: React.ReactNode;
  /** Extra class for the wrapper div */
  wrapperClassName?: string;
}

const FormField = React.forwardRef<HTMLInputElement, FormFieldProps>(
  (
    {
      label,
      icon,
      labelRight,
      wrapperClassName,
      variant,
      className,
      id,
      children,
      ...props
    },
    ref
  ) => {
    // Auto-generate an id from the label when not provided so Label ↔ input are linked
    const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className={cn('flex flex-col gap-2', wrapperClassName)}>
        {/* Label row */}
        <div className="flex items-center justify-between">
          <LabelPrimitive.Root
            htmlFor={inputId}
            className="text-base leading-none select-none text-zinc-200"
          >
            {label}
          </LabelPrimitive.Root>
          {labelRight}
        </div>

        {/* Input wrapper */}
        <div className="relative">
          {icon && (
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
              {icon}
            </span>
          )}
          <Input
            ref={ref}
            id={inputId}
            variant={variant}
            className={className}
            {...props}
          />
          {children}
        </div>
      </div>
    );
  }
);

FormField.displayName = 'FormField';

export { FormField };
