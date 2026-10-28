import React, { ElementType, forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface GlassSurfaceProps extends React.HTMLAttributes<HTMLElement> {
  variant?: 'chrome' | 'card' | 'overlay'
  as?: ElementType
}

export const GlassSurface = forwardRef<HTMLElement, GlassSurfaceProps>(
  ({ variant = 'card', as: Component = 'div', className, children, ...props }, ref) => {
    const variantClass = {
      chrome: 'glass--chrome',
      card: 'glass--card',
      overlay: 'glass--overlay',
    }[variant]

    return (
      <Component
        ref={ref}
        className={cn('glass', variantClass, className)}
        {...props}
      >
        {children}
      </Component>
    )
  }
)

GlassSurface.displayName = 'GlassSurface'
