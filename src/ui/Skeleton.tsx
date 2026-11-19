import type { HTMLAttributes } from 'react';

export type SkeletonVariant = 'block' | 'text';

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: SkeletonVariant;
  lines?: number;
}

const shimmerClasses =
  'relative overflow-hidden bg-surface-sunken rounded-sm before:absolute before:inset-0 before:-translate-x-full before:animate-shimmer before:bg-gradient-to-r before:from-transparent before:via-white/50 before:to-transparent motion-reduce:before:animate-none';

export function Skeleton({
  variant = 'block',
  lines = 3,
  className = '',
  ...props
}: SkeletonProps) {
  if (variant === 'text') {
    const lineCount = Math.max(1, lines);
    return (
      <div
        role="status"
        aria-label="Loading..."
        className={`flex flex-col gap-2 ${className}`.trim()}
        {...props}
      >
        {Array.from({ length: lineCount }).map((_, index) => (
          <div
            key={index}
            className={`h-4 ${shimmerClasses} ${
              index === lineCount - 1 && lineCount > 1 ? 'w-3/4' : 'w-full'
            }`}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-label="Loading..."
      className={`${shimmerClasses} min-h-6 ${className}`.trim()}
      {...props}
    />
  );
}
