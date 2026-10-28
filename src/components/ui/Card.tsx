import React from 'react'
import { cn } from '@/lib/utils'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'solid' | 'glass'
}

export const Card: React.FC<CardProps> = ({
  className,
  children,
  ...props
}) => {
  return (
    <div
      className={cn(
        'bg-white border border-slate-200/90 rounded-xl shadow-level-1 p-5 transition-all duration-fast',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
