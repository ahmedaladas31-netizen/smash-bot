import { AlertTriangle } from 'lucide-react'

interface BusyModeBarProps {
  delay: number
}

/** شريط علوي واضح يظهر عندما يكون وضع الضغط مفعّلاً */
export default function BusyModeBar({ delay }: BusyModeBarProps) {
  return (
    <div className="sticky top-0 z-30 flex items-center justify-center gap-2 bg-gradient-to-l from-flame-700 via-flame-600 to-brand-600 px-4 py-2.5 text-center text-sm font-extrabold text-white shadow-lg sm:text-base">
      <AlertTriangle className="h-5 w-5 shrink-0 animate-pulse" />
      <span>
        وضع الضغط مفعّل — بنستقبل الطلبات بعد{' '}
        <span className="tabular-nums">{delay}</span> دقيقة
      </span>
    </div>
  )
}
