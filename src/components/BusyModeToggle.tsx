import { Clock, Flame, Zap } from 'lucide-react'
import {
  BUSY_DELAY_OPTIONS,
  GENERAL_WAIT_TIME_OPTIONS,
  WAIT_TIME_NEEDS_CONFIRM,
} from '../lib/constants'
import { cx } from '../lib/utils'

interface BusyModeToggleProps {
  busyMode: boolean
  busyDelay: number
  generalWaitTime: number
  disabled?: boolean
  onToggle: (next: boolean) => void
  onDelayChange: (minutes: number) => void
  onWaitTimeChange: (minutes: number) => void
}

/** مفتاح تفعيل وضع الضغط + اختيار مدة التأخير + وقت الانتظار العام */
export default function BusyModeToggle({
  busyMode,
  busyDelay,
  generalWaitTime,
  disabled,
  onToggle,
  onDelayChange,
  onWaitTimeChange,
}: BusyModeToggleProps) {
  return (
    <div
      className={cx(
        'rounded-2xl border p-4 transition-colors',
        busyMode
          ? 'border-flame-600/60 bg-flame-700/10'
          : 'border-coal-700 bg-coal-800/60',
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={cx(
              'flex h-11 w-11 items-center justify-center rounded-xl',
              busyMode
                ? 'bg-flame-600 text-white'
                : 'bg-coal-700 text-zinc-400',
            )}
          >
            <Flame className="h-6 w-6" />
          </div>
          <div>
            <div className="text-lg font-extrabold leading-tight">
              وضع الضغط
            </div>
            <div
              className={cx(
                'text-sm font-semibold',
                busyMode ? 'text-flame-400' : 'text-zinc-400',
              )}
            >
              {busyMode ? 'مفعّل الآن' : 'غير مفعّل'}
            </div>
          </div>
        </div>

        {/* مفتاح التبديل */}
        <button
          type="button"
          role="switch"
          aria-checked={busyMode}
          aria-label="تفعيل وضع الضغط"
          disabled={disabled}
          onClick={() => onToggle(!busyMode)}
          className={cx(
            'relative h-9 w-16 shrink-0 rounded-full transition-colors disabled:opacity-50',
            busyMode ? 'bg-flame-600' : 'bg-coal-600',
          )}
        >
          <span
            className={cx(
              'absolute top-1 flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-md transition-all',
              // RTL: المفعّل لليسار
              busyMode ? 'left-1' : 'right-1',
            )}
          >
            {busyMode && <Zap className="h-4 w-4 text-flame-600" />}
          </span>
        </button>
      </div>

      {/* اختيار مدة التأخير */}
      <div className="mt-4">
        <div className="mb-2 text-xs font-semibold text-zinc-400">
          مدة التأخير عند الضغط
        </div>
        <div className="flex gap-2">
          {BUSY_DELAY_OPTIONS.map((minutes) => {
            const isSelected = busyDelay === minutes
            return (
              <button
                key={minutes}
                type="button"
                disabled={disabled}
                onClick={() => onDelayChange(minutes)}
                className={cx(
                  'flex-1 rounded-xl border px-3 py-2 text-base font-extrabold tabular-nums transition-all active:scale-95 disabled:opacity-50',
                  isSelected
                    ? 'border-flame-500 bg-flame-600 text-white shadow-lg shadow-flame-600/30'
                    : 'border-coal-700 bg-coal-800 text-zinc-300 hover:border-flame-600/50',
                )}
              >
                {minutes} د
              </button>
            )
          })}
        </div>
      </div>

      {/* وقت الانتظار العام */}
      <div className="mt-4 border-t border-coal-700 pt-4">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-zinc-400">
          <Clock className="h-3.5 w-3.5" />
          وقت الانتظار العام
          <span className="mr-auto font-bold text-zinc-300 tabular-nums">
            {generalWaitTime} دقيقة
          </span>
        </div>
        <div className="flex gap-2">
          {GENERAL_WAIT_TIME_OPTIONS.map((minutes) => {
            const isSelected = generalWaitTime === minutes
            const needsConfirm = WAIT_TIME_NEEDS_CONFIRM.has(minutes)
            return (
              <button
                key={minutes}
                type="button"
                disabled={disabled}
                onClick={() => onWaitTimeChange(minutes)}
                className={cx(
                  'flex-1 rounded-xl border px-3 py-2 text-base font-extrabold tabular-nums transition-all active:scale-95 disabled:opacity-50',
                  isSelected
                    ? needsConfirm
                      ? 'border-purple-400 bg-purple-500 text-white shadow-lg shadow-purple-500/30'
                      : 'border-brand-500 bg-brand-500 text-white shadow-lg shadow-brand-500/30'
                    : needsConfirm
                      ? 'border-purple-500/40 bg-purple-500/10 text-purple-200 hover:bg-purple-500/20'
                      : 'border-coal-700 bg-coal-800 text-zinc-300 hover:border-brand-500/50',
                )}
              >
                {minutes} د
              </button>
            )
          })}
        </div>
        {WAIT_TIME_NEEDS_CONFIRM.has(generalWaitTime) && (
          <p className="mt-2 text-[11px] leading-relaxed text-purple-300">
            سيتم سؤال الزبون عن الانتظار قبل تسجيل الطلب
          </p>
        )}
      </div>
    </div>
  )
}
