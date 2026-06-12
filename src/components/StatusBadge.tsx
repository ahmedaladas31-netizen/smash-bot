import { STATUS_META } from '../lib/constants'
import { cx } from '../lib/utils'
import type { OrderStatus } from '../types'

interface StatusBadgeProps {
  status: OrderStatus
  className?: string
}

/** شارة تعرض الحالة الحالية بلون مميز */
export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const meta = STATUS_META[status]
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold',
        meta.badge,
        className,
      )}
    >
      <span className={cx('h-2 w-2 rounded-full', meta.dot)} />
      {meta.label}
    </span>
  )
}
