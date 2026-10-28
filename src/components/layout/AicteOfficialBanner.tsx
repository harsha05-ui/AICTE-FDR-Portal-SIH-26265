import React from 'react'

interface AicteOfficialBannerProps {
  className?: string
  compact?: boolean
  showPortalBadge?: boolean
}

export const AicteOfficialBanner: React.FC<AicteOfficialBannerProps> = ({
  className = '',
  compact = false,
  showPortalBadge = true,
}) => {
  return (
    <header
      className={`w-full bg-white dark:bg-slate-900 border-b border-slate-200/90 dark:border-slate-800 text-slate-800 dark:text-slate-100 transition-colors select-none print:bg-white print:border-b-2 print:border-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] ${className}`}
    >
      {/* Official Government Tri-Color Micro-Accent Ribbon */}
      <div className="h-1 w-full bg-gradient-to-r from-amber-500 via-slate-200 dark:via-slate-700 to-emerald-600 shrink-0" />

      <div
        className={`max-w-7xl mx-auto flex items-center justify-between px-3 sm:px-6 lg:px-8 ${
          compact ? 'py-2 sm:py-2.5' : 'py-3 sm:py-4'
        }`}
      >
        {/* Left: Official AICTE Emblem Logo (Enlarged & Protected) */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="p-1 sm:p-1.5 rounded-2xl bg-white dark:bg-white/95 border border-slate-200/90 dark:border-slate-300 shadow-sm flex items-center justify-center transition-all hover:shadow-md">
            <img
              src="/aicte-logo.png"
              alt="All India Council for Technical Education (AICTE) Official Emblem"
              className={`object-contain drop-shadow-sm transition-transform duration-200 hover:scale-105 ${
                compact
                  ? 'w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20'
                  : 'w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28'
              }`}
            />
          </div>
        </div>

        {/* Center: Full Official Title & Institutional Hierarchy (Big, Clear & Readable) */}
        <div className="flex-1 text-center px-2 sm:px-5">
          {/* Official Bilingual Title */}
          <div className="space-y-0.5 sm:space-y-1">
            <p
              className={`font-semibold text-slate-700 dark:text-slate-300 tracking-normal ${
                compact
                  ? 'text-[11px] sm:text-xs md:text-sm'
                  : 'text-xs sm:text-sm md:text-base'
              }`}
            >
              अखिल भारतीय तकनीकी शिक्षा परिषद
            </p>

            <h1
              className={`font-extrabold tracking-tight text-[#0B4F8A] dark:text-sky-400 leading-tight ${
                compact
                  ? 'text-sm sm:text-lg md:text-xl lg:text-2xl'
                  : 'text-base sm:text-xl md:text-2xl lg:text-3xl'
              }`}
            >
              All India Council for Technical Education
            </h1>
          </div>

          {/* Ministry & Address Subtitles */}
          <div className="mt-1 space-y-0.5">
            <p
              className={`font-semibold text-slate-800 dark:text-slate-200 leading-snug ${
                compact
                  ? 'text-[11px] sm:text-xs md:text-sm'
                  : 'text-xs sm:text-sm md:text-base'
              }`}
            >
              Ministry of Education, Government of India
            </p>

            <p
              className={`text-slate-500 dark:text-slate-400 leading-snug hidden sm:block ${
                compact ? 'text-[10px] md:text-xs' : 'text-xs md:text-sm'
              }`}
            >
              Nelson Mandela Marg, Vasant Kunj, New Delhi - 110070
            </p>
          </div>

          {/* Portal Scope Badge */}
          {showPortalBadge && (
            <div className="mt-1.5 flex items-center justify-center gap-2">
              <span className="inline-flex items-center px-2.5 sm:px-3 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-[#0B4F8A] dark:text-sky-300 border border-blue-200/90 dark:border-blue-900/60 shadow-none">
                <span className="font-bold tracking-wide text-[#0B4F8A] dark:text-sky-200">सुरक्षाकोष</span>
                <span className="mx-1.5 text-blue-300 dark:text-blue-700">|</span>
                <span className="hidden sm:inline">Statutory Security Deposit & Fixed Deposit Receipt (FDR) Portal</span>
                <span className="sm:hidden">Security Deposit & FDR Portal</span>
              </span>
            </div>
          )}
        </div>

        {/* Right: National Emblem of India (Enlarged & Protected with Inversion) */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="p-1 sm:p-1.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 shadow-sm flex items-center justify-center transition-all hover:shadow-md">
            <img
              src="/national-emblem.svg"
              alt="State Emblem of India - Satyameva Jayate"
              className={`object-contain transition-transform duration-200 hover:scale-105 dark:brightness-0 dark:invert ${
                compact
                  ? 'h-14 sm:h-16 md:h-20'
                  : 'h-16 sm:h-20 md:h-24 lg:h-28'
              }`}
            />
          </div>
        </div>
      </div>
    </header>
  )
}

