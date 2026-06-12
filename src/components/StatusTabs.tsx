import { TABS } from '../lib/constants'
import { cx } from '../lib/utils'
import type { TabKey } from '../types'

interface StatusTabsProps {
  active: TabKey
  counts: Record<TabKey, number>
  onChange: (tab: TabKey) => void
}

/** تبويبات حسب الحالة مع عدّاد لكل تبويب */
export default function StatusTabs({
  active,
  counts,
  onChange,
}: StatusTabsProps) {
  return (
    <div
      className="scroll-thin flex gap-2 overflow-x-auto pb-1"
      role="tablist"
      aria-label="تصفية الطلبات حسب الحالة"
    >
      {TABS.map((tab) => {
        const isActive = active === tab.key
        const count = counts[tab.key] ?? 0
        return (
          <button
            key={tab.key}
            role="tab"
            aria-selected={isActive}
            type="button"
            onClick={() => onChange(tab.key)}
            className={cx(
              'flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-base font-bold transition-all active:scale-95',
              isActive
                ? 'bg-gradient-to-l from-brand-600 to-flame-700 text-white shadow-lg shadow-brand-600/25'
                : 'bg-coal-800/80 text-zinc-300 ring-1 ring-coal-700 hover:bg-coal-700',
            )}
          >
            {tab.label}
            <span
              className={cx(
                'min-w-6 rounded-full px-2 py-0.5 text-center text-sm font-extrabold tabular-nums',
                isActive
                  ? 'bg-white/20 text-white'
                  : 'bg-coal-900 text-zinc-400',
              )}
            >
              {count}
            </span>
          </button>
        )
      })}
    </div>
  )
}
