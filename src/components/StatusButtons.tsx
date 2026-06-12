import { Check, ChefHat, Navigation, PackageCheck, Truck, XCircle } from 'lucide-react'
import { STATUS_FLOW, STATUS_META } from '../lib/constants'
import { cx } from '../lib/utils'
import type { OrderStatus } from '../types'

interface StatusButtonsProps {
  current: OrderStatus
  disabled?: boolean
  onChange: (status: OrderStatus) => void
}

const STATUS_ICON: Record<OrderStatus, typeof Check> = {
  new: Check,
  preparing: ChefHat,
  ready: PackageCheck,
  on_the_way: Navigation,
  delivered: Truck,
  cancelled: XCircle,
}

/** أزرار تغيير حالة الطلب عبر المسار الطبيعي + زر إلغاء */
export default function StatusButtons({
  current,
  disabled,
  onChange,
}: StatusButtonsProps) {
  const currentIndex = STATUS_FLOW.indexOf(current)

  return (
    <div className="flex flex-wrap items-center gap-2">
      {STATUS_FLOW.map((status, idx) => {
        const meta = STATUS_META[status]
        const Icon = STATUS_ICON[status]
        const isCurrent = status === current
        const isDone = currentIndex > -1 && idx < currentIndex
        return (
          <button
            key={status}
            type="button"
            disabled={disabled || isCurrent}
            onClick={() => onChange(status)}
            className={cx(
              'inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold transition-all active:scale-95 disabled:cursor-default',
              isCurrent
                ? meta.activeBtn
                : isDone
                  ? 'bg-coal-800 text-zinc-500 ring-1 ring-coal-700'
                  : 'bg-coal-800 text-zinc-200 ring-1 ring-coal-700 hover:bg-coal-700 hover:ring-brand-500/50',
            )}
          >
            <Icon className="h-4 w-4" />
            {meta.label}
          </button>
        )
      })}

      <button
        type="button"
        disabled={disabled || current === 'cancelled'}
        onClick={() => onChange('cancelled')}
        className={cx(
          'inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold transition-all active:scale-95 disabled:cursor-default disabled:opacity-50',
          current === 'cancelled'
            ? STATUS_META.cancelled.activeBtn
            : 'bg-flame-700/15 text-flame-500 ring-1 ring-flame-700/40 hover:bg-flame-700/25',
        )}
      >
        <XCircle className="h-4 w-4" />
        إلغاء
      </button>
    </div>
  )
}
