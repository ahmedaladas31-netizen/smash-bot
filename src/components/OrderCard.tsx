import { useState } from 'react'
import {
  Bell,
  Clock,
  MapPin,
  MessageCircle,
  Phone,
  ShoppingBag,
  Store,
  Truck,
  User,
  XCircle,
} from 'lucide-react'
import StatusBadge from './StatusBadge'
import StatusButtons from './StatusButtons'
import QuickReplies from './QuickReplies'
import { STATUS_META } from '../lib/constants'
import {
  cx,
  displayPhone,
  formatFullTime,
  formatRelativeTime,
  formatShekel,
  parseItems,
  phoneToWaLink,
} from '../lib/utils'
import type { QuickReply } from '../lib/constants'
import type { Order, OrderStatus } from '../types'

interface OrderCardProps {
  order: Order
  /** طلب وصل للتو → تمييز بصري لافت */
  isNew?: boolean
  /** طلب أُلغي للتو → وميض أحمر + بانر المراجعة */
  isCancelledFlash?: boolean
  onStatusChange: (id: string, status: OrderStatus) => Promise<void>
  onAcknowledge: (id: string) => Promise<void>
  onAcknowledgeCancel?: () => void
  onQuickReply: (
    id: string,
    phone: string | null,
    reply: QuickReply,
  ) => Promise<void>
}

export default function OrderCard({
  order,
  isNew,
  isCancelledFlash,
  onStatusChange,
  onAcknowledge,
  onAcknowledgeCancel,
  onQuickReply,
}: OrderCardProps) {
  const [pending, setPending] = useState(false)
  const meta = STATUS_META[order.status]
  const parsed = parseItems(order.items)
  const asked = Boolean(order.customer_asked)
  const isDelivery =
    parsed.delivery_type.includes('توصيل') ||
    parsed.delivery_type.includes('دليفري')

  const run = async (fn: () => Promise<void>) => {
    setPending(true)
    try {
      await fn()
    } catch (e) {
      console.error('[OrderCard] فشل تنفيذ العملية:', e)
      alert('تعذّر تنفيذ العملية، حاول مرة أخرى.')
    } finally {
      setPending(false)
    }
  }

  return (
    <article
      className={cx(
        'relative overflow-hidden rounded-2xl border border-coal-700 bg-coal-800/80 shadow-xl ring-1 ring-black/20 backdrop-blur-sm',
        'border-r-4',
        meta.cardAccent,
        isNew && !isCancelledFlash && 'animate-flash-new',
        asked && !isCancelledFlash && 'ring-2 ring-amber-400 ring-offset-2 ring-offset-coal-950',
        isCancelledFlash &&
          'animate-flash-cancelled ring-2 ring-red-500 ring-offset-2 ring-offset-coal-950',
      )}
    >
      {/* تنبيه: الطلب أُلغي من قبل الزبون */}
      {isCancelledFlash && (
        <div className="flex items-center justify-between gap-2 bg-red-600/25 px-4 py-2.5 text-red-200">
          <div className="flex items-center gap-2 text-sm font-extrabold">
            <XCircle className="h-5 w-5 shrink-0 text-red-400" />
            أُلغي من قبل الزبون
          </div>
          <button
            type="button"
            onClick={() => onAcknowledgeCancel?.()}
            className="shrink-0 rounded-lg bg-red-500/30 px-3 py-1 text-xs font-bold text-red-100 transition-colors hover:bg-red-500/50"
          >
            تمت المراجعة ✓
          </button>
        </div>
      )}

      {/* تنبيه: الزبون يسأل عن طلبه */}
      {asked && (
        <div className="flex items-center justify-between gap-2 bg-amber-500/20 px-4 py-2 text-amber-200">
          <div className="flex items-center gap-2 text-sm font-extrabold">
            <Bell className="h-5 w-5 animate-bell-shake text-amber-300" />
            الزبون يسأل عن طلبه!
          </div>
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => onAcknowledge(order.id))}
            className="rounded-lg bg-amber-500/30 px-3 py-1 text-xs font-bold text-amber-100 transition-colors hover:bg-amber-500/50 disabled:opacity-50"
          >
            تم الاطّلاع
          </button>
        </div>
      )}

      <div className="space-y-4 p-4 sm:p-5">
        {/* الترويسة: الاسم + الوقت + الحالة */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 shrink-0 text-brand-400" />
              <h3 className="truncate text-lg font-black sm:text-xl">
                {order.customer_name?.trim() || 'زبون'}
              </h3>
            </div>
            <div
              className="mt-1 flex items-center gap-1.5 text-xs text-zinc-400"
              title={formatFullTime(order.created_at)}
            >
              <Clock className="h-3.5 w-3.5" />
              <span>{formatRelativeTime(order.created_at)}</span>
            </div>
          </div>
          <StatusBadge status={order.status} />
        </div>

        {/* الهاتف + واتساب */}
        <div className="flex items-center justify-between gap-2 rounded-xl bg-coal-900/60 px-3 py-2">
          <div className="flex items-center gap-2 text-sm">
            <Phone className="h-4 w-4 text-zinc-400" />
            <span className="nums font-semibold text-zinc-200">
              {displayPhone(order.customer_phone)}
            </span>
          </div>
          <a
            href={phoneToWaLink(order.customer_phone)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-bold text-white transition-colors hover:bg-emerald-500 active:scale-95"
          >
            <MessageCircle className="h-4 w-4" />
            واتساب
          </a>
        </div>

        {/* وصف الطلب */}
        <div className="rounded-xl bg-coal-900/40 p-3">
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-zinc-400">
            <ShoppingBag className="h-4 w-4" />
            تفاصيل الطلب
          </div>
          {/* summary يحوي الملخّص، أو النص الخام كما هو عند فشل التحليل */}
          <p className="whitespace-pre-line break-words text-base font-semibold leading-relaxed text-zinc-100">
            {parsed.summary || 'بدون تفاصيل'}
          </p>
        </div>

        {/* نوع التوصيل + العنوان + المجموع */}
        <div className="flex flex-wrap items-center gap-2">
          {parsed.delivery_type && (
            <span
              className={cx(
                'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-bold',
                isDelivery
                  ? 'bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/30'
                  : 'bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/30',
              )}
            >
              {isDelivery ? (
                <Truck className="h-4 w-4" />
              ) : (
                <Store className="h-4 w-4" />
              )}
              {parsed.delivery_type}
            </span>
          )}
          <span className="mr-auto inline-flex items-center gap-1.5 rounded-lg bg-brand-500/15 px-3 py-1.5 text-lg font-black text-brand-300 ring-1 ring-brand-500/30">
            <span className="nums">{formatShekel(order.total)}</span>
          </span>
        </div>

        {parsed.address && (
          <div className="flex items-start gap-1.5 text-sm text-zinc-300">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-flame-500" />
            <span className="leading-relaxed">{parsed.address}</span>
          </div>
        )}

        {/* حالة وقت التحضير */}
        {order.prep_time != null && order.time_status !== 'none' && (
          <PrepTimeBanner
            minutes={order.prep_time}
            status={order.time_status}
          />
        )}

        <div className="h-px bg-coal-700" />

        {/* أزرار تغيير الحالة */}
        <StatusButtons
          current={order.status}
          disabled={pending}
          onChange={(status) => run(() => onStatusChange(order.id, status))}
        />

        <div className="h-px bg-coal-700" />

        {/* الردود الجاهزة للزبون */}
        <QuickReplies
          phone={order.customer_phone}
          onReplied={(reply) =>
            onQuickReply(order.id, order.customer_phone, reply)
          }
        />
      </div>
    </article>
  )
}

/** شريط يوضّح وقت التحضير وحالته */
function PrepTimeBanner({
  minutes,
  status,
}: {
  minutes: number
  status: Order['time_status']
}) {
  if (status === 'pending') {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-purple-500/15 px-3 py-2 text-sm font-bold text-purple-200 ring-1 ring-purple-500/40">
        <Clock className="h-4 w-4 animate-pulse" />
        بانتظار موافقة الزبون على{' '}
        <span className="nums">{minutes}</span> دقيقة
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2 rounded-xl bg-emerald-500/15 px-3 py-2 text-sm font-bold text-emerald-200 ring-1 ring-emerald-500/40">
      <Clock className="h-4 w-4" />
      الوقت المحدّد: <span className="nums">{minutes}</span> دقيقة
    </div>
  )
}
