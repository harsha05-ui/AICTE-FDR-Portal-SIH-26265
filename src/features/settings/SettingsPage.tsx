import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Save,
  RotateCcw,
  HelpCircle,
  Play,
  Zap,
} from 'lucide-react'
import { api } from '@/lib/api-client'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/feedback/Toast'
import { formatDate } from '@/lib/format'

export const SettingsPage: React.FC = () => {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [editedSettings, setEditedSettings] = useState<Record<string, string>>({})
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [maturityResult, setMaturityResult] = useState<{
    instrumentsChecked: number
    remindersGenerated: number
    maturedCount: number
    expiringCount: number
    escalationsCount: number
  } | null>(null)

  const { data: settings = [] } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.settings.list(),
  })

  const maturityMutation = useMutation({
    mutationFn: () => api.admin.runMaturityCheck(),
    onSuccess: (data) => {
      setMaturityResult(data.stats)
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      toast({
        title: 'Maturity engine executed',
        description: `Evaluated ${data.stats.instrumentsChecked} instruments. Generated ${data.stats.remindersGenerated} reminders, flagged ${data.stats.maturedCount} matured.`,
        type: 'success',
      })
    },
    onError: (err: any) => {
      toast({
        title: 'Execution failed',
        description: err.message || 'Failed to run maturity check engine.',
        type: 'danger',
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: any }) =>
      api.settings.update(key, value),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      setSavingKey(null)
      toast({
        title: 'Settings updated',
        description: `Key "${updated.key}" has been updated.`,
        type: 'success',
      })
    },
    onError: (err: any) => {
      setSavingKey(null)
      toast({
        title: 'Update failed',
        description: err.message || 'Invalid configuration payload.',
        type: 'danger',
      })
    },
  })

  const handleValueChange = (key: string, val: string) => {
    setEditedSettings((prev) => ({ ...prev, [key]: val }))
  }

  const handleSave = (key: string, originalVal: any) => {
    const raw = editedSettings[key] !== undefined ? editedSettings[key] : JSON.stringify(originalVal, null, 2)
    let parsed: any
    try {
      parsed = JSON.parse(raw)
    } catch {
      parsed = raw
    }
    setSavingKey(key)
    updateMutation.mutate({ key, value: parsed })
  }

  const handleReset = (key: string) => {
    setEditedSettings((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  const handbookDefaults: Record<string, string> = {
    REMINDER_THRESHOLDS: '[90, 60, 30, 15, 7, 0]',
    ESCALATION_SLA_HOURS: '{\n  "REGIONAL_OFFICE": 168,\n  "APPROVAL_BUREAU": 120,\n  "GRIEVANCE_CELL": 120,\n  "VIGILANCE_CELL": 168,\n  "COMPETENT_AUTHORITY": 72\n}',
    ADAPTER_MODE: '"SANDBOX_SIMULATION"',
    MINIMUM_DEPOSIT_LOCKIN_YEARS: '5',
    DEFAULT_INTEREST_RATE_FLOOR: '6.5',
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Portal Settings"
        description="Approval Process Handbook (APH) compliance parameters, reminder schedules, multi-office SLAs, and gateway modes."
        action={
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-canvas text-ink-700 border border-line">
              Admin access
            </span>
          </div>
        }
      />

      {/* Automated Maturity & Escalation Engine Card */}
      <Card className="p-4 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800 border border-line shadow-level-1 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-ink-900">
                Automated Maturity & Escalation Engine
              </h3>
              <p className="text-xs text-ink-500 mt-0.5 max-w-2xl leading-relaxed">
                Simulates the national nightly AICTE cron job. Scans all active institutional deposits against APH lock-in periods, dispatches automated regulatory reminder letters, and triggers overdue escalations.
              </p>
            </div>
          </div>
          <Button
            variant="primary"
            size="default"
            loading={maturityMutation.isPending}
            onClick={() => maturityMutation.mutate()}
            leftIcon={<Play className="w-4 h-4 fill-current" />}
            className="bg-amber-600 hover:bg-amber-700 text-white font-medium shadow-sm"
          >
            Run Maturity Engine
          </Button>
        </div>

        {maturityResult && (
          <div className="mt-3 pt-3 border-t border-line grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            <div className="p-2.5 rounded-lg bg-surface border border-line text-center">
              <span className="text-[11px] text-ink-500 block">Instruments Checked</span>
              <span className="text-base font-semibold font-mono text-ink-900">
                {maturityResult.instrumentsChecked}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-surface border border-line text-center">
              <span className="text-[11px] text-ink-500 block">Reminders Queued</span>
              <span className="text-base font-semibold font-mono text-amber-600">
                {maturityResult.remindersGenerated}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-surface border border-line text-center">
              <span className="text-[11px] text-ink-500 block">Matured Deposits</span>
              <span className="text-base font-semibold font-mono text-rose-600">
                {maturityResult.maturedCount}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-surface border border-line text-center">
              <span className="text-[11px] text-ink-500 block">Expiring in 30d</span>
              <span className="text-base font-semibold font-mono text-amber-500">
                {maturityResult.expiringCount}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-surface border border-line text-center">
              <span className="text-[11px] text-ink-500 block">Escalations Flagged</span>
              <span className="text-base font-semibold font-mono text-indigo-600">
                {maturityResult.escalationsCount}
              </span>
            </div>
          </div>
        )}
      </Card>

      {/* Handbook Reference Banner */}
      <div className="p-3.5 bg-surface border border-line rounded-md text-xs flex items-start gap-3">
        <div className="w-7 h-7 rounded-full bg-canvas border border-line flex items-center justify-center text-ink-700 shrink-0 mt-0.5">
          <HelpCircle className="w-3.5 h-3.5" />
        </div>
        <div>
          <span className="font-medium text-ink-900 block">AICTE Approval Process Handbook (APH) policy rules</span>
          <p className="text-ink-500 mt-0.5 leading-relaxed">
            Policy values below dictate automated reminder intervals, workflow SLA deadlines, and bank verification simulation. Changes take effect on the next evaluation cycle.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3.5">
        {settings.map((setting) => {
          const currentValStr =
            editedSettings[setting.key] !== undefined
              ? editedSettings[setting.key]
              : typeof setting.value === 'object'
              ? JSON.stringify(setting.value, null, 2)
              : String(setting.value)

          const isModified = editedSettings[setting.key] !== undefined
          const sample = handbookDefaults[setting.key]

          return (
            <Card key={setting.key} className="p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2.5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-medium text-xs text-ink-900">{setting.key}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-canvas text-ink-700 border border-line">
                      {setting.category || 'POLICY'}
                    </span>
                  </div>
                  <p className="text-xs text-ink-500 mt-0.5">{setting.description || 'System setting'}</p>
                </div>

                <div className="text-[11px] text-ink-500 font-mono tabular-nums">
                  Updated: {formatDate(setting.updatedAt)}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
                <div className="lg:col-span-8 space-y-2">
                  <label className="text-xs font-medium text-ink-700 block">
                    Configuration value
                  </label>
                  <textarea
                    rows={typeof setting.value === 'object' ? 5 : 2}
                    value={currentValStr}
                    onChange={(e) => handleValueChange(setting.key, e.target.value)}
                    className="w-full font-mono text-xs bg-canvas p-2.5 rounded-md border border-line focus:border-ink-900 focus:outline-none"
                  />
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      variant="primary"
                      size="compact"
                      loading={savingKey === setting.key}
                      onClick={() => handleSave(setting.key, setting.value)}
                      leftIcon={<Save className="w-3.5 h-3.5" />}
                    >
                      Save configuration
                    </Button>
                    {isModified && (
                      <Button
                        variant="ghost"
                        size="compact"
                        onClick={() => handleReset(setting.key)}
                        leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                      >
                        Reset
                      </Button>
                    )}
                  </div>
                </div>

                <div className="lg:col-span-4 bg-canvas p-3 rounded-md border border-line space-y-1.5 text-xs">
                  <span className="text-[10px] font-mono font-medium text-ink-500 block">
                    APH reference value
                  </span>
                  {sample ? (
                    <pre className="font-mono text-[11px] text-ink-900 bg-surface p-2 rounded border border-line overflow-x-auto">
                      {sample}
                    </pre>
                  ) : (
                    <p className="text-[11px] text-ink-500">Custom portal setting.</p>
                  )}
                  <p className="text-[10px] text-ink-500">
                    Use valid JSON for array or object keys.
                  </p>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
