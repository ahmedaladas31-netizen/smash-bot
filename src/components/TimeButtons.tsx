import { Timer } from 'lucide-react'
import { PREP_TIME_OPTIONS, CONFIRMED_TIMES } from '../lib/constants'
import { cx } from '../lib/utils'

interface TimeButtonsProps {
  selected: number | null
  disabled?: boolean
  onSelect: (minutes: number) => void
}

/**
 * أزرار وقت التحضير الجاهزة.
 * الأوقات الطبيعية (15-30) بلون، والأوقات التي تحتاج موافقة (40/60) بلون مختلف.
 */
export default function TimeButtons({
  selected,
  disabled,
  onSelect,
}: TimeButtonsProps) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-zinc-400">
        <Timer className="h-4 w-4" />
        حدّد وقت التحضير
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {PREP_TIME_OPTIONS.map((minutes) => {
          const isSelected = selected === minutes
          const needsApproval = !CONFIRMED_TIMES.has(minutes)
          return (
            <button
              key={minutes}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(minutes)}
              title={
                needsApproval
                  ? 'وقت يحتاج موافقة الزبون'
                  : 'وقت طبيعي — يُبلَّغ الزبون مباشرة'
              }
              className={cx(
                'rounded-xl border px-2 py-2.5 text-base font-extrabold tabular-nums transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50',
                isSelected
                  ? needsApproval
                    ? 'border-purple-400 bg-purple-500 text-white shadow-lg shadow-purple-500/30'
                    : 'border-brand-400 bg-brand-500 text-white shadow-lg shadow-brand-500/30'
                  : needsApproval
                    ? 'border-purple-500/40 bg-purple-500/10 text-purple-200 hover:bg-purple-500/20'
                    : 'border-coal-700 bg-coal-800 text-zinc-200 hover:border-brand-500/60 hover:bg-coal-700',
              )}
            >
              {minutes}
            </button>
          )
        })}
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
        <span className="text-purple-300">40 و 60</span> دقيقة تحتاج موافقة الزبون
        قبل التأكيد.
      </p>
    </div>
  )
}
