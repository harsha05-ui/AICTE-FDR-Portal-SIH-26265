import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, CheckCheck, ExternalLink } from 'lucide-react'
import { api } from '@/lib/api-client'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/feedback/EmptyState'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'

export const NotificationListPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.notifications.list(),
  })

  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.notifications.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const markAllReadMutation = useMutation({
    mutationFn: () => api.notifications.markAllRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const filtered = notifications.filter((n) => {
    if (filter === 'unread') return !n.isRead
    return true
  })

  const unreadCount = notifications.filter((n) => !n.isRead).length

  return (
    <div className="space-y-4">
      <PageHeader
        title="Notifications"
        description="Statutory maturity notices, discrepancy flags, verification milestones, and decision updates."
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="default"
              disabled={unreadCount === 0}
              leftIcon={<CheckCheck className="w-4 h-4" />}
              onClick={() => markAllReadMutation.mutate()}
            >
              Mark all read
            </Button>
          </div>
        }
      />

      <div className="flex items-center gap-1.5 pb-2 border-b border-line">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={cn(
            'px-3 py-1 text-xs font-medium rounded-md transition-colors',
            filter === 'all'
              ? 'bg-ink-900 text-white'
              : 'text-ink-700 hover:bg-canvas'
          )}
        >
          All notifications ({notifications.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter('unread')}
          className={cn(
            'px-3 py-1 text-xs font-medium rounded-md transition-colors',
            filter === 'unread'
              ? 'bg-ink-900 text-white'
              : 'text-ink-700 hover:bg-canvas'
          )}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications"
          description="All regulatory alerts, maturity warnings and notifications have been acknowledged."
        />
      ) : (
        <div className="space-y-2.5">
          {filtered.map((item) => (
            <Card
              key={item.id}
              className={cn(
                'p-4 transition-all duration-fast flex flex-col sm:flex-row sm:items-start justify-between gap-3',
                !item.isRead ? 'border-line bg-surface shadow-sm' : 'bg-canvas/50 border-line/70'
              )}
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-xs text-ink-900">{item.title}</span>
                  <span
                    className={cn(
                      'px-2 py-0.5 text-[10px] font-medium rounded-full border inline-flex items-center gap-1',
                      item.urgency === 'urgent'
                        ? 'bg-rose-50 text-rose-800 border-rose-200'
                        : item.urgency === 'high'
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : 'bg-canvas text-ink-700 border-line'
                    )}
                  >
                    <span className={cn('w-1 h-1 rounded-full', item.urgency === 'urgent' ? 'bg-rose-600' : item.urgency === 'high' ? 'bg-amber-600' : 'bg-ink-500')} />
                    <span>{item.urgency} urgency</span>
                  </span>
                  {!item.isRead && (
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-primary shrink-0" />
                  )}
                </div>

                <p className="text-xs text-ink-700 max-w-3xl leading-relaxed">{item.message}</p>
                <div className="text-[11px] text-ink-500 font-mono tabular-nums">
                  {formatDateTime(item.timestamp)}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0">
                {item.link && (
                  <Button
                    variant="secondary"
                    size="compact"
                    rightIcon={<ExternalLink className="w-3.5 h-3.5" />}
                    onClick={() => {
                      if (!item.isRead) markReadMutation.mutate(item.id)
                    }}
                  >
                    <Link to={item.link}>Open</Link>
                  </Button>
                )}
                {!item.isRead && (
                  <Button
                    variant="ghost"
                    size="compact"
                    onClick={() => markReadMutation.mutate(item.id)}
                  >
                    Mark read
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
