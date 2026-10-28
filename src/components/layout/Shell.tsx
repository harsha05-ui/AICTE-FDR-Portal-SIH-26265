import React, { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { CommandPalette } from './CommandPalette'
import { AicteOfficialBanner } from './AicteOfficialBanner'
import { useAuth } from '@/features/auth/AuthContext'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'

export const Shell: React.FC = () => {
  const { user, logout, switchRole } = useAuth()
  const location = useLocation()
  const queryClient = useQueryClient()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)

  // Global keyboard shortcut for Command Palette (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setCommandPaletteOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Fetch notifications
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.notifications.list(),
    refetchInterval: 30000,
  })

  // Mutations for notifications
  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.notifications.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const markAllReadMutation = useMutation({
    mutationFn: () => api.notifications.markAllRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const currentRole = user?.role || 'INSTITUTION_USER'

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col antialiased bg-canvas text-slate-900 select-none">
      {/* Command Palette */}
      <CommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />

      {/* Accessibility Skip Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 px-3.5 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-medium shadow-level-2"
      >
        Skip to main content
      </a>

      {/* Official Government of India & AICTE Banner (as referenced in official portals) */}
      <AicteOfficialBanner compact />

      <div className="flex-1 flex w-full min-h-0 overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          role={currentRole}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed(!collapsed)}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
        />

        {/* Main Application Area (Fixed 100dvh minus topbar) */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          <Topbar
            user={user}
            notifications={notifications}
            onOpenMobile={() => setMobileOpen(true)}
            onOpenCommandPalette={() => setCommandPaletteOpen(true)}
            onLogout={logout}
            onRoleSwitch={async (role) => {
              await switchRole(role)
              queryClient.invalidateQueries()
            }}
            onMarkNotificationRead={(id) => markReadMutation.mutate(id)}
            onMarkAllNotificationsRead={() => markAllReadMutation.mutate()}
          />

          <main
            id="main-content"
            className="flex-1 w-full overflow-y-auto overflow-x-hidden p-4 sm:p-5 lg:p-6"
          >
            {/* Animated route content container */}
            <div key={location.pathname} className="fade-in-settle h-full">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
