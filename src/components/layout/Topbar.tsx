import React, { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Menu,
  Bell,
  Search,
  LogOut,
  User as UserIcon,
  CheckCheck,
  ExternalLink,
  ShieldCheck,
  Sun,
  Moon,
} from 'lucide-react'
import { Breadcrumbs } from './Breadcrumbs'
import { User, NotificationItem, UserRole } from '@/types'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

export interface TopbarProps {
  user: User | null
  notifications: NotificationItem[]
  onOpenMobile: () => void
  onOpenCommandPalette?: () => void
  onLogout: () => void
  onRoleSwitch?: (role: UserRole) => void
  onMarkNotificationRead: (id: string) => void
  onMarkAllNotificationsRead: () => void
}

export const Topbar: React.FC<TopbarProps> = ({
  user,
  notifications,
  onOpenMobile,
  onOpenCommandPalette,
  onLogout,
  onRoleSwitch,
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
}) => {
  const navigate = useNavigate()
  const [showNotifications, setShowNotifications] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark') || localStorage.getItem('aicte-theme') === 'dark'
    }
    return false
  })

  const notifRef = useRef<HTMLDivElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter((n) => !n.isRead).length

  // Synchronize theme on mount
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDark])

  const toggleTheme = () => {
    const nextDark = !isDark
    setIsDark(nextDark)
    if (nextDark) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('aicte-theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('aicte-theme', 'light')
    }
  }

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false)
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <header className="sticky top-0 z-30 h-14 bg-white border-b border-slate-200/90 flex items-center justify-between px-4 sm:px-6 select-none shrink-0">
      {/* Left: Mobile trigger & Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobile}
          className="lg:hidden p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <Breadcrumbs />
      </div>

      {/* Center/Right items */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Command Palette Trigger */}
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="hidden md:flex items-center justify-between w-60 lg:w-68 h-8 px-2.5 text-xs bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-lg text-slate-500 transition-colors shadow-none"
          title="Open Command Palette (Ctrl+K or ⌘K)"
        >
          <div className="flex items-center gap-2 truncate">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate text-slate-500 font-normal">Search commands & records...</span>
          </div>
          <kbd className="px-1.5 py-0.5 text-[10px] font-sans font-medium text-slate-400 bg-white border border-slate-200 rounded">
            ⌘K
          </kbd>
        </button>

        {/* Theme Switcher */}
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>

        {/* Notifications Popover */}
        <div ref={notifRef} className="relative">
          <button
            type="button"
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            aria-label={`View notifications, ${unreadCount} unread`}
          >
            <Bell className="w-4 h-4 text-slate-600" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-rose-600 text-white text-[10px] font-semibold rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-xl shadow-level-2 z-50 overflow-hidden fade-in-settle">
              <div className="flex items-center justify-between p-3.5 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-900">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 text-[10px] bg-rose-50 text-rose-700 border border-rose-200 font-medium rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={onMarkAllNotificationsRead}
                    className="text-[11px] text-slate-600 hover:text-slate-900 font-medium hover:underline flex items-center gap-1"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Mark all read</span>
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500">No active notifications.</div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={cn(
                        'p-3 text-xs transition-colors hover:bg-slate-50/80 flex flex-col gap-1',
                        !n.isRead && 'bg-slate-50/60'
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-slate-900 leading-snug">{n.title}</span>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap">
                          {formatDate(n.timestamp)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-normal">{n.message}</p>
                      <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-100">
                        {n.link && (
                          <Link
                            to={n.link}
                            onClick={() => {
                              onMarkNotificationRead(n.id)
                              setShowNotifications(false)
                            }}
                            className="text-[11px] text-slate-900 font-medium hover:underline flex items-center gap-1"
                          >
                            <span>Open details</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        )}
                        {!n.isRead && (
                          <button
                            type="button"
                            onClick={() => onMarkNotificationRead(n.id)}
                            className="text-[10px] text-slate-400 hover:text-slate-700 ml-auto"
                          >
                            Dismiss
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile & Role Switcher */}
        <div ref={profileRef} className="relative">
          <button
            type="button"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2.5 p-1 rounded-lg hover:bg-slate-50 transition-colors text-left"
            aria-label="User account and role menu"
          >
            <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center text-xs font-semibold">
              {user?.name ? user.name.slice(0, 2).toUpperCase() : 'AI'}
            </div>
            <div className="hidden sm:block text-xs leading-tight">
              <span className="block font-semibold text-slate-900 max-w-[140px] truncate">
                {user?.name || 'Sign In'}
              </span>
              <span className="block text-[11px] text-slate-500 capitalize">
                {user?.role?.replace('_', ' ').toLowerCase() || 'Official'}
              </span>
            </div>
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-level-2 z-50 overflow-hidden fade-in-settle">
              <div className="p-3 border-b border-slate-100 bg-slate-50/50">
                <p className="text-xs font-semibold text-slate-900 truncate">{user?.name}</p>
                <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-medium text-slate-800">
                  <ShieldCheck className="w-3 h-3 text-slate-600" />
                  <span>{user?.designation || user?.role}</span>
                </div>
              </div>

              {/* Account Actions */}
              <div className="p-1.5 border-b border-slate-100 space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowProfileMenu(false)
                    onLogout()
                    navigate('/login')
                  }}
                  className="w-full text-left px-2.5 py-2 text-xs text-slate-700 hover:bg-slate-100 rounded-lg transition-colors flex items-center justify-between group"
                >
                  <div className="flex items-center gap-2">
                    <UserIcon className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-900" />
                    <span className="font-medium">Switch Account / Role</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">Login</span>
                </button>
              </div>

              <div className="p-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowProfileMenu(false)
                    onLogout()
                    navigate('/login')
                  }}
                  className="w-full text-left px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-2 font-medium"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
