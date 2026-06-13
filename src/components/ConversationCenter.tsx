import { useEffect, useMemo, useRef } from 'react'
import {
  Bot,
  MapPin,
  MessageCircle,
  Phone,
  ShoppingBag,
  User,
} from 'lucide-react'
import { useConversations, type Conversation } from '../hooks/useConversations'
import CustomerNotes from './CustomerNotes'
import StatusBadge from './StatusBadge'
import { STATUS_META } from '../lib/constants'
import {
  computeDailyNumbers,
  cx,
  displayPhone,
  formatRelativeTime,
  formatShekel,
  parseItems,
  phoneToWaLink,
} from '../lib/utils'
import type { Message, Order } from '../types'

interface ConversationCenterProps {
  /** كل الطلبات المحمّلة — لربط المحادثة بطلبات الزبون */
  orders: Order[]
  /** الرقم المختار حالياً (مُتحكَّم به من App ليفتح من بطاقة الطلب) */
  selectedPhone: string | null
  onSelectPhone: (phone: string) => void
}

/** وقت قصير HH:MM بتوقيت المطعم */
function shortTime(dateStr: string): string {
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('ar', {
    timeZone: 'Asia/Hebron',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

export default function ConversationCenter({
  orders,
  selectedPhone,
  onSelectPhone,
}: ConversationCenterProps) {
  const { messages, conversations, loading, error, connected } =
    useConversations()

  // الرقم الفعلي المعروض: المختار، وإلا أول محادثة
  const activePhone = selectedPhone ?? conversations[0]?.phone ?? null

  // رسائل المحادثة الحالية مرتّبة تصاعدياً
  const thread = useMemo(
    () =>
      messages
        .filter((m) => m.customer_phone === activePhone)
        .slice()
        .sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        ),
    [messages, activePhone],
  )

  // طلبات الزبون الحالي (الأحدث أولاً) + أرقامها اليومية
  const dailyNumbers = useMemo(() => computeDailyNumbers(orders), [orders])
  const customerOrders = useMemo(
    () =>
      orders
        .filter((o) => o.customer_phone === activePhone)
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        ),
    [orders, activePhone],
  )
  const activeConv = conversations.find((c) => c.phone === activePhone) ?? null
  const customerName =
    customerOrders.find((o) => o.customer_name)?.customer_name ??
    activeConv?.name ??
    'زبون'

  // التمرير لأسفل عند تغيّر المحادثة أو وصول رسالة
  const threadEndRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ block: 'end' })
  }, [thread.length, activePhone])

  if (error === 'config') {
    return (
      <p className="rounded-xl bg-coal-800 p-6 text-center text-zinc-300">
        إعدادات Supabase غير مضبوطة.
      </p>
    )
  }

  return (
    <div className="flex h-[calc(100vh-13rem)] gap-3">
      {/* قائمة المحادثات (يمين) */}
      <aside className="flex w-72 shrink-0 flex-col rounded-2xl border border-coal-700 bg-coal-800/60">
        <div className="flex items-center justify-between border-b border-coal-700 px-4 py-3">
          <span className="font-bold text-zinc-200">المحادثات</span>
          <span
            className={cx(
              'h-2.5 w-2.5 rounded-full',
              connected ? 'bg-emerald-500' : 'bg-zinc-600',
            )}
            title={connected ? 'متصل لحظياً' : 'منقطع'}
          />
        </div>
        <div className="scroll-thin flex-1 overflow-y-auto">
          {loading ? (
            <p className="p-4 text-sm text-zinc-500">جارٍ التحميل…</p>
          ) : conversations.length === 0 ? (
            <p className="p-4 text-sm leading-relaxed text-zinc-500">
              لا محادثات بعد. ستظهر هنا فور وصول رسائل جديدة.
            </p>
          ) : (
            conversations.map((conv) => (
              <ConversationListRow
                key={conv.phone}
                conv={conv}
                active={conv.phone === activePhone}
                orderStatus={
                  orders.find((o) => o.customer_phone === conv.phone)?.status ??
                  null
                }
                onClick={() => onSelectPhone(conv.phone)}
              />
            ))
          )}
        </div>
      </aside>

      {/* سجل المحادثة (وسط) */}
      <section className="flex min-w-0 flex-1 flex-col rounded-2xl border border-coal-700 bg-coal-800/40">
        {activePhone ? (
          <>
            <div className="flex items-center gap-2 border-b border-coal-700 px-4 py-3">
              <User className="h-4 w-4 text-brand-400" />
              <span className="truncate font-bold text-zinc-200">
                {customerName}
              </span>
              <span className="nums text-xs text-zinc-500">
                {displayPhone(activePhone)}
              </span>
            </div>
            <div className="scroll-thin flex-1 space-y-2 overflow-y-auto p-4">
              {thread.map((m) => (
                <MessageBubble key={m.id} message={m} />
              ))}
              <div ref={threadEndRef} />
            </div>
          </>
        ) : (
          <p className="m-auto text-zinc-500">اختر محادثة لعرضها</p>
        )}
      </section>

      {/* لوحة الزبون (يسار) */}
      {activePhone && (
        <aside className="scroll-thin hidden w-80 shrink-0 space-y-3 overflow-y-auto rounded-2xl border border-coal-700 bg-coal-800/60 p-3 lg:block">
          <div className="flex items-center justify-between gap-2 rounded-xl bg-coal-900/60 px-3 py-2">
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-zinc-400" />
              <span className="nums font-semibold text-zinc-200">
                {displayPhone(activePhone)}
              </span>
            </div>
            <a
              href={phoneToWaLink(activePhone)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-bold text-white transition-colors hover:bg-emerald-500"
            >
              <MessageCircle className="h-4 w-4" />
              واتساب
            </a>
          </div>

          <div>
            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-zinc-400">
              <ShoppingBag className="h-4 w-4" />
              طلبات الزبون ({customerOrders.length})
            </div>
            {customerOrders.length === 0 ? (
              <p className="text-xs text-zinc-500">لا طلبات مسجّلة لهذا الرقم.</p>
            ) : (
              <div className="space-y-2">
                {customerOrders.map((o) => (
                  <CustomerOrderRow
                    key={o.id}
                    order={o}
                    dailyNumber={dailyNumbers.get(o.id)}
                  />
                ))}
              </div>
            )}
          </div>

          <CustomerNotes phone={activePhone} />
        </aside>
      )}
    </div>
  )
}

/** صف في قائمة المحادثات */
function ConversationListRow({
  conv,
  active,
  orderStatus,
  onClick,
}: {
  conv: Conversation
  active: boolean
  orderStatus: Order['status'] | null
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'flex w-full flex-col gap-1 border-b border-coal-700/60 px-4 py-3 text-right transition-colors',
        active ? 'bg-brand-500/15' : 'hover:bg-coal-700/40',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate font-bold text-zinc-200">
          {conv.name?.trim() || 'زبون'}
        </span>
        <span className="shrink-0 text-[11px] text-zinc-500">
          {formatRelativeTime(conv.lastAt)}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        {conv.lastDirection === 'out' && (
          <Bot className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
        )}
        <span className="truncate text-xs text-zinc-400">
          {conv.lastBody || '—'}
        </span>
      </div>
      {orderStatus && (
        <span
          className={cx(
            'mt-0.5 inline-flex w-fit rounded-md px-2 py-0.5 text-[11px] font-bold',
            STATUS_META[orderStatus].badge,
          )}
        >
          {STATUS_META[orderStatus].label}
        </span>
      )}
    </button>
  )
}

/** فقاعة رسالة واحدة */
function MessageBubble({ message }: { message: Message }) {
  const isOut = message.direction === 'out'
  return (
    <div className={cx('flex', isOut ? 'justify-end' : 'justify-start')}>
      <div
        className={cx(
          'max-w-[78%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow',
          isOut
            ? 'bg-emerald-700/80 text-emerald-50'
            : 'bg-coal-700 text-zinc-100',
        )}
      >
        <p className="whitespace-pre-line break-words">{message.body || '—'}</p>
        <div
          className={cx(
            'mt-1 flex items-center gap-1 text-[10px]',
            isOut ? 'text-emerald-200/70' : 'text-zinc-400',
          )}
        >
          {isOut && <Bot className="h-3 w-3" />}
          <span className="nums">{shortTime(message.created_at)}</span>
        </div>
      </div>
    </div>
  )
}

/** صف طلب مختصر في لوحة الزبون */
function CustomerOrderRow({
  order,
  dailyNumber,
}: {
  order: Order
  dailyNumber?: number
}) {
  const parsed = parseItems(order.items)
  return (
    <div className="rounded-lg bg-coal-900/60 p-2.5 ring-1 ring-coal-700">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {dailyNumber != null && (
            <span className="nums rounded-md bg-brand-500/20 px-1.5 text-xs font-extrabold text-brand-300">
              #{dailyNumber}
            </span>
          )}
          <StatusBadge status={order.status} />
        </div>
        <span className="nums text-sm font-bold text-brand-300">
          {formatShekel(order.total)}
        </span>
      </div>
      {parsed.summary && (
        <p className="mt-1.5 line-clamp-2 break-words text-sm text-zinc-200">
          {parsed.summary}
        </p>
      )}
      {parsed.address && (
        <div className="mt-1 flex items-start gap-1 text-xs text-zinc-400">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-flame-500" />
          <span>{parsed.address}</span>
        </div>
      )}
      <p className="mt-1 text-[11px] text-zinc-500">
        {formatRelativeTime(order.created_at)}
      </p>
    </div>
  )
}
