import React, { useState, useEffect, useRef } from 'react'
import {
  ShieldCheck,
  FileCheck2,
  ScanText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building2,
  Landmark,
  FileText,
  Check,
  Activity,
  ArrowRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export const AuthShowcase: React.FC = () => {
  const [activeScene, setActiveScene] = useState<number>(0)
  const [isPaused, setIsPaused] = useState(false)
  const [firstVisit, setFirstVisit] = useState(false)
  const progressTimerRef = useRef<number | null>(null)
  const [progressPercent, setProgressPercent] = useState(0)

  // Check prefers-reduced-motion
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // First visit detection
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const visited = localStorage.getItem('aicte_showcase_intro_seen')
      if (!visited) {
        setFirstVisit(true)
        localStorage.setItem('aicte_showcase_intro_seen', 'true')
      }
    }
  }, [])

  // Auto-advance scenes with progress bar
  useEffect(() => {
    if (prefersReducedMotion || isPaused) return

    const SCENE_DURATION = 5200 // 5.2s per scene
    const INTERVAL_STEP = 50
    const increment = (INTERVAL_STEP / SCENE_DURATION) * 100

    const interval = setInterval(() => {
      setProgressPercent((prev) => {
        if (prev >= 100) {
          setActiveScene((current) => (current + 1) % 4)
          return 0
        }
        return prev + increment
      })
    }, INTERVAL_STEP)

    return () => clearInterval(interval)
  }, [activeScene, isPaused, prefersReducedMotion])

  const handleStepClick = (index: number) => {
    setActiveScene(index)
    setProgressPercent(0)
  }

  const SCENES = [
    { id: 0, label: '1. Receive', title: 'Real-time Ingestion & Sync' },
    { id: 1, label: '2. Extract', title: 'Automated OCR & Field Extraction' },
    { id: 2, label: '3. Verify', title: 'Multi-Point Statutory Pre-Checks' },
    { id: 3, label: '4. Decide', title: 'Digital Sanction & Audit Trail' },
  ]

  return (
    <div
      className={cn(
        'w-full h-full flex flex-col justify-between p-6 sm:p-8 lg:p-10 select-none overflow-hidden relative',
        firstVisit ? 'animate-fade-in' : ''
      )}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
    >
      {/* Top Headline */}
      <div className="space-y-1.5 z-10">
        <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-slate-900 text-white text-[11px] font-medium tracking-tight">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-lime shrink-0" />
          <span>सुरक्षाकोष · Statutory Compliance Platform</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 leading-tight">
          Every FDR, verified and traceable.
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 max-w-lg leading-relaxed">
          Zero-leakage security deposit supervision, automated bank API reconciliation, and multi-office consensus workflows.
        </p>
      </div>

      {/* Centerpiece: Framed App Mockup Window */}
      <div className="my-5 flex-1 flex flex-col justify-center min-h-[340px] max-h-[460px] z-10">
        <div className="w-full bg-white rounded-2xl border border-slate-200/90 shadow-level-3 overflow-hidden flex flex-col h-full max-h-[440px]">
          {/* Mock Window Chrome / Topbar */}
          <div className="h-9 bg-slate-50/90 border-b border-slate-200/70 px-3 flex items-center justify-between text-xs shrink-0">
            {/* Traffic lights */}
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-300" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-300" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-300" />
            </div>

            {/* Mock address bar */}
            <div className="px-3 py-0.5 rounded-md bg-white border border-slate-200 text-[11px] text-slate-500 font-mono flex items-center gap-1.5 shadow-none">
              <span className="text-emerald-600">lock:</span>
              <span>portal.aicte.gov.in/fdrs/scrutiny-matrix</span>
            </div>

            {/* Run Chip */}
            <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              <span>SFMS Live</span>
            </div>
          </div>

          {/* Window Body Split: Mini Sidebar + Scene Canvas */}
          <div className="flex-1 flex overflow-hidden">
            {/* Mini sidebar */}
            <div className="w-12 bg-slate-50/50 border-r border-slate-100 flex flex-col items-center py-4 gap-3 shrink-0">
              <div className="w-6 h-6 rounded-md bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold">
                A
              </div>
              <div className="w-5 h-5 rounded text-slate-400 flex items-center justify-center">
                <FileCheck2 className="w-3.5 h-3.5" />
              </div>
              <div className="w-5 h-5 rounded text-slate-400 flex items-center justify-center">
                <Building2 className="w-3.5 h-3.5" />
              </div>
              <div className="w-5 h-5 rounded text-slate-400 flex items-center justify-center">
                <Clock className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Active Scene Content */}
            <div className="flex-1 p-4 sm:p-5 flex flex-col justify-center overflow-hidden bg-slate-50/20">
              {/* Scene 1: Receive */}
              {activeScene === 0 && (
                <div className="space-y-3 fade-in-settle">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div>
                      <span className="text-xs font-semibold text-slate-900 block">
                        Incoming Institutional Stream
                      </span>
                      <span className="text-[11px] text-slate-500">
                        SFMS Bank confirmations & technical deposits
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 text-[10px] font-medium border border-blue-100">
                      Syncing 24/7
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="p-2.5 rounded-lg border border-slate-200 bg-white shadow-level-1 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded bg-slate-100 text-slate-700 flex items-center justify-center text-xs font-semibold">
                          IIITM
                        </div>
                        <div>
                          <span className="text-xs font-medium text-slate-900 block">
                            IIITM Delhi · Fixed Deposit
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            FDR/SBI/2026/89011 · ₹1,00,00,000
                          </span>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-medium">
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span>Synced</span>
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg border border-slate-200 bg-white shadow-level-1 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded bg-slate-100 text-slate-700 flex items-center justify-center text-xs font-semibold">
                          VJTI
                        </div>
                        <div>
                          <span className="text-xs font-medium text-slate-900 block">
                            VJTI Mumbai · Bank Guarantee
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            BG/BOB/2026/44021 · ₹50,00,000
                          </span>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-medium">
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span>Synced</span>
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg border border-slate-200/60 bg-white/60 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-semibold">
                          COEP
                        </div>
                        <div>
                          <span className="text-xs font-medium text-slate-700 block">
                            COEP Pune · Security Extension
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            FDR/PNB/2026/78229
                          </span>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-medium animate-pulse">
                        <span>Awaiting SFMS</span>
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Scene 2: Extract */}
              {activeScene === 1 && (
                <div className="space-y-3 fade-in-settle">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2">
                      <ScanText className="w-4 h-4 text-slate-900" />
                      <span className="text-xs font-semibold text-slate-900">
                        Intelligent OCR Document Inspection
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      99.4% Confidence
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded-lg bg-white border border-slate-200">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                        FDR Certificate Number
                      </span>
                      <span className="font-mono font-medium text-slate-900">
                        FDR/SBI/2026/89011
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-white border border-slate-200">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                        Principal Deposit Amount
                      </span>
                      <span className="font-semibold text-slate-900 tabular-nums">
                        ₹1,00,00,000
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-white border border-slate-200">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                        Commercial Bank
                      </span>
                      <span className="font-medium text-slate-800">
                        State Bank of India
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-white border border-slate-200">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                        Maturity Date (Lock-in)
                      </span>
                      <span className="font-medium text-slate-800 tabular-nums">
                        2031-11-20 (5 Yrs)
                      </span>
                    </div>
                  </div>

                  <div className="p-2 rounded-md bg-slate-100 border border-slate-200/70 text-[11px] text-slate-600 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-slate-500" />
                      <span>Scanned Document p.1 verified against bank records</span>
                    </span>
                    <span className="text-[10px] font-semibold text-slate-900">Page 1 of 2</span>
                  </div>
                </div>
              )}

              {/* Scene 3: Verify */}
              {activeScene === 2 && (
                <div className="space-y-3 fade-in-settle">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-slate-900" />
                      <span className="text-xs font-semibold text-slate-900">
                        Statutory Rules Validation
                      </span>
                    </div>
                    <span className="text-[10px] font-medium text-slate-500">
                      4 of 4 Rules Evaluated
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="p-2 rounded-lg bg-white border border-slate-200 flex items-center justify-between">
                      <span className="text-slate-700">Joint account in favor of AICTE</span>
                      <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Verified
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-white border border-slate-200 flex items-center justify-between">
                      <span className="text-slate-700">5-year statutory lock-in duration</span>
                      <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Conforms
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-white border border-slate-200 flex items-center justify-between">
                      <span className="text-slate-700">IFSC & Branch validation via RBI matrix</span>
                      <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Validated
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-amber-50/70 border border-amber-200 flex items-center justify-between text-amber-900">
                      <span className="flex items-center gap-1.5 text-[11px]">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Scheduled notice: 90 days before maturity</span>
                      </span>
                      <span className="text-[10px] font-medium bg-amber-100 px-1.5 py-0.5 rounded">
                        Notice Queued
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Scene 4: Decide */}
              {activeScene === 3 && (
                <div className="space-y-3 fade-in-settle">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-semibold text-slate-900">
                        Regulatory Sanction & Audit Seal
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500">
                      SLA: 1.8 hrs (Target: 24h)
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Instrument Status</span>
                        <span className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span>Active in Regulatory Force</span>
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">Sanction Seal</span>
                        <span className="text-xs font-mono font-medium text-slate-700">
                          AICTE/NRO/2026/890
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                      <span>Audit Hash: #9d3f11...a82</span>
                      <span className="text-emerald-700 font-medium">Cryptographically Logged</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-100 p-2 rounded-lg">
                    <Activity className="w-3.5 h-3.5 text-slate-500" />
                    <span>Automatic compliance confirmation dispatched to institution & bank</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Step Indicators (Clickable) */}
      <div className="z-10">
        <div className="grid grid-cols-4 gap-2">
          {SCENES.map((scene, idx) => {
            const isActive = activeScene === idx
            return (
              <button
                key={scene.id}
                type="button"
                onClick={() => handleStepClick(idx)}
                className={cn(
                  'text-left p-2 rounded-lg transition-all relative overflow-hidden border',
                  isActive
                    ? 'bg-white border-slate-300 shadow-sm'
                    : 'bg-white/60 border-slate-200/60 hover:bg-white text-slate-500'
                )}
              >
                {/* Progress bar inside active step */}
                {isActive && !prefersReducedMotion && (
                  <div
                    className="absolute bottom-0 left-0 h-[2px] bg-slate-900 transition-all duration-75"
                    style={{ width: `${progressPercent}%` }}
                  />
                )}
                <span className="block text-[11px] font-semibold text-slate-900 truncate">
                  {scene.label}
                </span>
                <span className="block text-[10px] text-slate-400 truncate hidden sm:block">
                  {scene.title}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
