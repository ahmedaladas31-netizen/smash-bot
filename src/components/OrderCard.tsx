import { useState } from 'react'
import {
  Bell,
  Clock,
  Hand,
  MapPin,
  MessageCircle,
  MessagesSquare,
  Phone,
  Play,
  ShoppingBag,
  Store,
  Truck,
  User,
  XCircle,
} from 'lucide-react'
import StatusBadge from './StatusBadge'
import StatusButtons from './StatusButtons'
import QuickReplies from './QuickReplies'
import ManualReply from './ManualReply'
import { STATUS_META } from '../lib/constants'
import {
  ageMinutes,
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

/** الحالات النشطة التي يُلوَّن فيها عمر الطلب حسب الإلحاح */
const ACTIVE_STATUSES = new Set<OrderStatus>([
  'new',
  'preparing',
  'ready',
  'on_the_way',
])

/** صنف لون شِبّة عمر الطلب: أخضر <10د · أصفر 10–20د · أحمر >20د */
function ageChipClass(minutes: number): string {
  if (minutes > 20) return 'bg-red-500/15 text-red-300 ring-1 ring-red-500/40'
  if (minutes >= 10)
    return 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/40'
  return 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/40'
}

interface OrderCardProps {
  order: Order
  /** الرقم التسلسلي اليومي للطلب (محسوب بالواجهة) */
  dailyNumber?: number
  /** طلب وصل للتو → تمييز بصري لافت */
  isNew?: boolean
  /** طلب أُلغي للتو → وميض أحمر + بانر المراجعة */
  isCancelledFlash?: boolean
  /** البوت موقوف عن هذا الزبون (موجود في paused_sessions) */
  isPaused?: boolean
  onStatusChange: (id: string, status: OrderStatus) => Promise<void>
  onAcknowledge: (id: string) => Promise<void>
  onAcknowledgeCancel?: () => void
  onQuickReply: (
    id: string,
    phone: string | null,
    reply: QuickReply,
  ) => Promise<void>
  /** فتح محادثة هذا الزبون في مركز المحادثات */
  onOpenConversation?: (phone: string) => void
  /** إيقاف البوت يدوياً عن هذا الزبون */
  onManualPause?: (phone: string) => Promise<void> | void
  /** إعادة تشغيل البوت لهذا الزبون (فك الإيقاف) */
  onResumeBot?: (phone: string) => Promise<void> | void
}

export default function OrderCard({
  order,
  dailyNumber,
  isNew,
  isCancelledFlash,
  isPaused,
  onStatusChange,
  onAcknowledge,
  onAcknowledgeCancel,
  onQuickReply,
  onOpenConversation,
  onManualPause,
  onResumeBot,
}: OrderCardProps) {
  const [pending, setPending] = useState(false)
  const meta = STATUS_META[order.status]
  const parsed = parseItems(order.items)
  const asked = Boolean(order.customer_asked)
  const isActive = ACTIVE_STATUSES.has(order.status)
  const age = ageMinutes(order.created_at)
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
        // الطلبات المكتملة تُخفَّت لتبرز النشطة
        order.status === 'delivered' && 'opacity-70',
        isNew && !isCancelledFlash && 'animate-pulse-ring ring-2 ring-brand-400/70',
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
        {/* الترويسة: الرقم + الاسم + الوقت + الحالة */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-2.5">
            {dailyNumber != null && (
              <span
                className="nums inline-flex shrink-0 items-center rounded-lg bg-brand-500/15 px-2 py-1 text-lg font-black text-brand-300 ring-1 ring-brand-500/40"
                title="رقم الطلب اليومي"
              >
                #{dailyNumber}
              </span>
            )}
            <div className="min-w-0">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 shrink-0 text-brand-400" />
              <h3 className="truncate text-base font-bold text-zinc-300">
                {order.customer_name?.trim() || 'زبون'}
              </h3>
            </div>
            <div
              className={cx(
                'mt-1 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-bold',
                isActive ? ageChipClass(age) : 'text-zinc-400',
              )}
              title={formatFullTime(order.created_at)}
            >
              <Clock className="h-3.5 w-3.5" />
              <span>{formatRelativeTime(order.created_at)}</span>
            </div>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <StatusBadge status={order.status} />
            {isPaused && (
              <span
                className="inline-flex items-center gap-1 rounded-md bg-flame-600/20 px-2 py-0.5 text-[11px] font-bold text-flame-300 ring-1 ring-flame-500/40"
                title="البوت موقوف عن هذا الزبون — أنت تردّ يدوياً"
              >
                <Hand className="h-3 w-3" />
                البوت موقوف
              </span>
            )}
          </div>
        </div>

        {/* الهاتف + واتساب */}
        <div className="flex items-center justify-between gap-2 rounded-xl bg-coal-900/60 px-3 py-2">
          <div className="flex items-center gap-2 text-sm">
            <Phone className="h-4 w-4 text-zinc-400" />
            <span className="nums font-semibold text-zinc-200">
              {displayPhone(order.customer_phone)}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {onOpenConversation && order.customer_phone && (
              <button
                type="button"
                onClick={() => onOpenConversation(order.customer_phone)}
                title="فتح المحادثة في مركز المحادثات"
                className="inline-flex items-center gap-1.5 rounded-lg bg-coal-700 px-3 py-1.5 text-sm font-bold text-zinc-200 ring-1 ring-coal-600 transition-colors hover:bg-coal-600 active:scale-95"
              >
                <MessagesSquare className="h-4 w-4" />
                المحادثة
              </button>
            )}
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
        </div>

        {/* تدخل يدوي: إيقاف/تشغيل البوت عن هذا الزبون */}
        {order.customer_phone && (onManualPause || onResumeBot) && (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              run(() =>
                Promise.resolve(
                  isPaused
                    ? onResumeBot?.(order.customer_phone)
                    : onManualPause?.(order.customer_phone),
                ),
              )
            }
            title={
              isPaused
                ? 'البوت موقوف عن هذا الزبون — اضغط لإعادة تشغيله'
                : 'إيقاف البوت والرد يدوياً على هذا الزبون'
            }
            className={cx(
              'flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition-all active:scale-95 disabled:opacity-50',
              isPaused
                ? 'bg-emerald-600 text-white ring-1 ring-emerald-500 hover:bg-emerald-500'
                : 'bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/40 hover:bg-amber-500/20',
            )}
          >
            {isPaused ? (
              <>
                <Play className="h-4 w-4" />
                تشغيل البوت
              </>
            ) : (
              <>
                <Hand className="h-4 w-4" />
                تدخل يدوي
              </>
            )}
          </button>
        )}

        {/* وصف الطلب — العنصر الأبرز في البطاقة */}
        <div className="rounded-xl bg-coal-900/60 p-3.5 ring-1 ring-coal-700">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-zinc-400">
            <ShoppingBag className="h-4 w-4" />
            تفاصيل الطلب
          </div>
          {/* summary يحوي الملخّص، أو النص الخام كما هو عند فشل التحليل */}
          <p className="whitespace-pre-line break-words text-xl font-black leading-relaxed text-white">
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

        {/* رسالة يدوية حرّة — تظهر فقط حين يكون البوت موقوفاً عن الزبون */}
        {isPaused && (
          <>
            <div className="h-px bg-coal-700" />
            <ManualReply phone={order.customer_phone} />
          </>
        )}
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
