import * as React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'shimmer' | 'none';
}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, variant = 'text', width, height, animation = 'pulse', ...props }, ref) => {
    const baseClasses = 'bg-secondary-200 relative overflow-hidden';
    
    const variantClasses = {
      text: 'rounded-md h-4',
      circular: 'rounded-full',
      rectangular: 'rounded-lg',
    };
    
    const animationClasses = {
      pulse: 'animate-pulse',
      shimmer: 'after:absolute after:inset-0 after:bg-gradient-to-r after:from-transparent after:via-white/20 after:to-transparent after:animate-shimmer',
      none: '',
    };
    
    const style: React.CSSProperties = {
      width: width || (variant === 'circular' ? '40px' : '100%'),
      height: height || (variant === 'circular' ? '40px' : variant === 'rectangular' ? '100px' : undefined),
    };
    
    return (
      <div
        ref={ref}
        className={cn(
          baseClasses,
          variantClasses[variant],
          animationClasses[animation],
          className
        )}
        style={style}
        {...props}
      />
    );
  }
);

Skeleton.displayName = 'Skeleton';

interface SkeletonTextProps {
  lines?: number;
  className?: string;
}

const SkeletonText: React.FC<SkeletonTextProps> = ({ lines = 3, className }) => {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          width={i === lines - 1 ? '80%' : '100%'}
        />
      ))}
    </div>
  );
};

interface SkeletonCardProps {
  showMedia?: boolean;
  className?: string;
}

const SkeletonCard: React.FC<SkeletonCardProps> = ({ showMedia = true, className }) => {
  return (
    <div className={cn('rounded-xl border border-secondary-200 p-4', className)}>
      {showMedia && (
        <Skeleton variant="rectangular" height={200} className="mb-4" />
      )}
      <div className="space-y-3">
        <Skeleton variant="text" width="60%" height={24} />
        <SkeletonText lines={2} />
        <div className="flex items-center gap-2 pt-2">
          <Skeleton variant="circular" width={32} height={32} />
          <Skeleton variant="text" width={100} />
        </div>
      </div>
    </div>
  );
};

export { Skeleton, SkeletonText, SkeletonCard };