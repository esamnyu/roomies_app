import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const inputVariants = cva(
  'flex w-full rounded-lg border bg-white px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-secondary-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all',
  {
    variants: {
      inputSize: {
        sm: 'h-9 text-sm',
        md: 'h-11',
        lg: 'h-12 text-lg',
      },
      variant: {
        default: 'border-secondary-300',
        error: 'border-error-DEFAULT focus-visible:ring-error-DEFAULT',
        success: 'border-success-DEFAULT focus-visible:ring-success-DEFAULT',
      },
    },
    defaultVariants: {
      inputSize: 'md',
      variant: 'default',
    },
  }
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  error?: boolean;
  success?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, inputSize, variant, leftIcon, rightIcon, error, success, ...props }, ref) => {
    const computedVariant = error ? 'error' : success ? 'success' : variant;
    
    if (leftIcon || rightIcon) {
      return (
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-500">
              {leftIcon}
            </div>
          )}
          <input
            type={type}
            className={cn(
              inputVariants({ inputSize, variant: computedVariant }),
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              className
            )}
            ref={ref}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-500">
              {rightIcon}
            </div>
          )}
        </div>
      );
    }
    
    return (
      <input
        type={type}
        className={cn(inputVariants({ inputSize, variant: computedVariant }), className)}
        ref={ref}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';

export { Input, inputVariants };