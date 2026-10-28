import React from 'react'
import { cn } from '@/lib/utils'

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'rectangular' | 'circular' | 'text'
}

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'rectangular',
  className,
  ...props
}) => {
  const variantClasses = {
    rectangular: 'rounded-sm',
    circular: 'rounded-full',
    text: 'h-4 rounded-sm',
  }[variant]

  return (
    <div
      className={cn('skeleton-shimmer', variantClasses, className)}
      aria-hidden="true"
      {...props}
    />
  )
}
