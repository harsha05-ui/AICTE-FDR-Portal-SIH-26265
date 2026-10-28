import React from 'react'
import { cn } from '@/lib/utils'

export interface TabItem {
  id: string
  label: string
  badge?: number | string
  icon?: React.ReactNode
}

export interface TabsProps {
  tabs: TabItem[]
  activeTab: string
  onChange: (id: string) => void
  className?: string
  variant?: 'underline' | 'pills'
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  className,
  variant = 'underline',
}) => {
  if (variant === 'pills') {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200/60 overflow-x-auto no-scrollbar',
          className
        )}
        role="tablist"
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(tab.id)}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-fast shrink-0 cursor-pointer',
                'focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:outline-none',
                isActive
                  ? 'bg-white text-slate-900 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              )}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={cn(
                    'px-1.5 py-0.2 text-[10px] rounded-full tabular-nums font-medium',
                    isActive ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-700'
                  )}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          )
        })}
      </div>
    )
  }

  // Underline variant (Default)
  return (
    <div
      className={cn(
        'flex items-center gap-6 border-b border-slate-200/80 overflow-x-auto no-scrollbar select-none',
        className
      )}
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={cn(
              'relative flex items-center gap-2 pb-2.5 pt-1 text-xs font-medium transition-colors duration-fast shrink-0 cursor-pointer',
              'focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:outline-none',
              isActive
                ? 'text-slate-900 font-semibold'
                : 'text-slate-500 hover:text-slate-800'
            )}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={cn(
                  'px-1.5 py-0.5 text-[10px] rounded-full tabular-nums font-medium',
                  isActive
                    ? 'bg-slate-100 text-slate-900 border border-slate-200'
                    : 'bg-slate-100 text-slate-500'
                )}
              >
                {tab.badge}
              </span>
            )}
            {/* Animated underline pill */}
            {isActive && (
              <span
                className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-slate-900 rounded-full transition-all duration-base ease-spring"
                aria-hidden="true"
              />
            )}
          </button>
        )
      })}
    </div>
  )
}
