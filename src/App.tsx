import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Header from './components/Header'
import BusyModeBar from './components/BusyModeBar'
import BusyModeToggle from './components/BusyModeToggle'
import StatusTabs from './components/StatusTabs'
import OrderCard from './components/OrderCard'
import {
  ConfigState,
  EmptyState,
  ErrorState,
  LoadingState,
} from './components/StateViews'
import { useOrders } from './hooks/useOrders'
import { useSettings } from './hooks/useSettings'
import {
  acknowledgeCustomerAsked,
  applyQuickReply,
  markMessageNotSent,
  updateBusyDelay,
  updateBusyMode,
  updateGeneralWaitTime,
  updateOrderStatus,
} from './lib/api'
import { sendCustomerReply } from './lib/webhook'
import type { QuickReply } from './lib/constants'
import { isSupabaseConfigured } from './lib/supabase'
import {
  playCancelledBeep,
  playCustomerAskedBeep,
  playNewOrderBeep,
  primeAudio,
} from './lib/sound'
import { parseItems } from './lib/utils'
import type { Order, OrderStatus, TabKey } from './types'

const SOUND_KEY = 'smashlab_sound'
const FLASH_MS = 30_000
const CANCEL_FLASH_MS = 15_000

/**
 * يبني نص رسالة الواتساب المناسبة عند تغيير حالة الطلب.
 * يعيد null إن لم تكن الحالة تستوجب رسالة.
 */
function buildStatusMessage(order: Order, status: OrderStatus): string | null {
  const parsed = parseItems(order.items)
  const isDelivery =
    parsed.delivery_type.includes('توصيل') ||
    parsed.delivery_type.includes('دليفري')

  switch (status) {
    case 'preparing':
      return 'طلبك دخل المطبخ وعم يتحضر، ما رح يطول.'
    case 'ready':
      return isDelivery
        ? 'طلبك جاهز وصار بالطريق!'
        : 'طلبك جاهز وبتقدر تستلمو من المطعم.'
    case 'on_the_way':
      return 'طلبك في الطريق وبوصلك هلأ!'
    case 'cancelled':
      return 'معلش، اضطررنا نلغي طلبك. اتصل فينا لو بدك تعرف أكثر.'
    default:
      return null
  }
}

/** ترتيب الأولوية: ملغي بحاجة مراجعة، ثم من يسأل، ثم الجديد، ثم الباقي */
function priorityRank(o: Order, cancelledIds: Set<string>): number {
  if (cancelledIds.has(o.id)) return 0
  if (o.customer_asked) return 1
  if (o.status === 'new') return 2
  return 3
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('all')
  const [soundOn, setSoundOn] = useState<boolean>(() => {
    const saved = localStorage.getItem(SOUND_KEY)
    return saved === null ? true : saved === '1'
  })
  const [newIds, setNewIds] = useState<Set<string>>(new Set())
  const [cancelledIds, setCancelledIds] = useState<Set<string>>(new Set())
  const [, setTick] = useState(0)

  // مراجع لإبقاء قيم حديثة داخل callbacks الـ realtime
  const soundRef = useRef(soundOn)
  soundRef.current = soundOn
  const ordersRef = useRef<Order[]>([])
  const flashTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  )
  const cancelTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  )

  // ===== التنبيهات اللحظية =====
  const flagAsNew = useCallback((id: string) => {
    setNewIds((prev) => new Set(prev).add(id))
    const existing = flashTimers.current.get(id)
    if (existing) clearTimeout(existing)
    flashTimers.current.set(
      id,
      setTimeout(() => {
        setNewIds((prev) => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
        flashTimers.current.delete(id)
      }, FLASH_MS),
    )
  }, [])

  const handleNewOrder = useCallback(
    (order: Order) => {
      flagAsNew(order.id)
      if (soundRef.current) playNewOrderBeep()
    },
    [flagAsNew],
  )

  const handleCustomerAsked = useCallback(() => {
    if (soundRef.current) playCustomerAskedBeep()
  }, [])

  const flagAsCancelled = useCallback((id: string) => {
    setCancelledIds((prev) => new Set(prev).add(id))
    const existing = cancelTimers.current.get(id)
    if (existing) clearTimeout(existing)
    cancelTimers.current.set(
      id,
      setTimeout(() => {
        setCancelledIds((prev) => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
        cancelTimers.current.delete(id)
      }, CANCEL_FLASH_MS),
    )
  }, [])

  const handleOrderCancelled = useCallback(
    (order: Order) => {
      flagAsCancelled(order.id)
      if (soundRef.current) playCancelledBeep()
    },
    [flagAsCancelled],
  )

  const handleAcknowledgeCancel = useCallback((id: string) => {
    const timer = cancelTimers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      cancelTimers.current.delete(id)
    }
    setCancelledIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }, [])

  const {
    orders,
    loading: ordersLoading,
    error: ordersError,
    connected,
    refetch: refetchOrders,
    patchOrder,
  } = useOrders({
    onNewOrder: handleNewOrder,
    onCustomerAsked: handleCustomerAsked,
    onOrderCancelled: handleOrderCancelled,
  })

  ordersRef.current = orders

  const { settings, patchSettings } = useSettings()

  // ===== تحديث الأوقات النسبية كل 30 ثانية =====
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30_000)
    return () => clearInterval(t)
  }, [])

  // ===== فكّ حظر الصوت بعد أول تفاعل =====
  useEffect(() => {
    const onFirst = () => primeAudio()
    window.addEventListener('pointerdown', onFirst, { once: true })
    return () => window.removeEventListener('pointerdown', onFirst)
  }, [])

  // تنظيف المؤقتات عند الإغلاق
  useEffect(() => {
    const timers = flashTimers.current
    return () => {
      timers.forEach((t) => clearTimeout(t))
      timers.clear()
    }
  }, [])

  useEffect(() => {
    const timers = cancelTimers.current
    return () => {
      timers.forEach((t) => clearTimeout(t))
      timers.clear()
    }
  }, [])

  const toggleSound = useCallback(() => {
    primeAudio()
    setSoundOn((prev) => {
      const next = !prev
      localStorage.setItem(SOUND_KEY, next ? '1' : '0')
      return next
    })
  }, [])

  // ===== العدّادات لكل تبويب =====
  const counts = useMemo<Record<TabKey, number>>(() => {
    const c: Record<TabKey, number> = {
      all: 0,
      new: 0,
      preparing: 0,
      ready: 0,
      on_the_way: 0,
      delivered: 0,
      cancelled: 0,
    }
    for (const o of orders) {
      // "الكل" يعرض غير الملغية + الملغية التي لم تُراجَع بعد
      if (o.status !== 'cancelled' || cancelledIds.has(o.id)) c.all += 1
      if (o.status in c) c[o.status as TabKey] += 1
    }
    return c
  }, [orders, cancelledIds])

  // ===== القائمة المعروضة (فلترة + ترتيب أولوية) =====
  const visibleOrders = useMemo(() => {
    const filtered =
      activeTab === 'all'
        ? orders.filter((o) => o.status !== 'cancelled' || cancelledIds.has(o.id))
        : orders.filter((o) => o.status === activeTab)
    return [...filtered].sort((a, b) => {
      const pr = priorityRank(a, cancelledIds) - priorityRank(b, cancelledIds)
      if (pr !== 0) return pr
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    })
  }, [orders, activeTab, cancelledIds])

  // ===== المعالِجات (تحديث متفائل + طفرة Supabase + واتساب) =====
  const handleStatusChange = useCallback(
    async (id: string, status: OrderStatus) => {
      patchOrder(id, { status })
      try {
        await updateOrderStatus(id, status)
      } catch (e) {
        await refetchOrders()
        throw e
      }

      // إرسال رسالة واتساب للزبون إن وُجدت للحالة الجديدة
      const order = ordersRef.current.find((o) => o.id === id)
      if (order) {
        const message = buildStatusMessage(order, status)
        if (message) {
          try {
            await sendCustomerReply(order.customer_phone, message)
          } catch (e) {
            console.error('[handleStatusChange] فشل إرسال واتساب:', e)
            try {
              await markMessageNotSent(id)
            } catch {}
          }
        }
      }
    },
    [patchOrder, refetchOrders],
  )


  const handleAcknowledge = useCallback(
    async (id: string) => {
      patchOrder(id, { customer_asked: false })
      try {
        await acknowledgeCustomerAsked(id)
      } catch (e) {
        await refetchOrders()
        throw e
      }
    },
    [patchOrder, refetchOrders],
  )

  // إرسال رد جاهز: تحديث Supabase أولاً، ثم إرسال الواتساب
  const handleQuickReply = useCallback(
    async (id: string, phone: string | null, reply: QuickReply) => {
      // (1) حدّث الطلب في Supabase أولاً (تحديث متفائل + كتابة)
      patchOrder(id, {
        customer_asked: false,
        ...(reply.status ? { status: reply.status } : {}),
      })
      try {
        await applyQuickReply(id, reply.status)
      } catch (e) {
        // (3) فشل Supabase → تراجع، اعرض خطأ، ولا ترسل واتساب
        await refetchOrders()
        throw e
      }

      // (2) نجح Supabase → أرسل رسالة الواتساب عبر الـ webhook
      try {
        await sendCustomerReply(phone ?? '', reply.message)
      } catch (e) {
        // (4) فشل الواتساب وحده → الداشبورد يبقى محدَّثاً، ونعلّم أن الرسالة لم تُرسَل
        console.error(
          '[handleQuickReply] فشل إرسال الواتساب، تعليم message_sent=false:',
          e,
        )
        patchOrder(id, { message_sent: false })
        try {
          await markMessageNotSent(id)
        } catch (markErr) {
          console.error(
            '[handleQuickReply] تعذّر تعليم message_sent=false:',
            markErr,
          )
        }
        // لا نرمي الخطأ: الزر يُظهر "تم الإرسال" لأن تحديث الطلب نجح
      }
    },
    [patchOrder, refetchOrders],
  )

  // ===== وضع الضغط =====
  const busyMode = settings?.busy_mode ?? false
  const busyDelay = settings?.busy_delay ?? 30
  const generalWaitTime = settings?.general_wait_time ?? 20

  const handleToggleBusy = useCallback(
    async (next: boolean) => {
      patchSettings({ busy_mode: next })
      try {
        await updateBusyMode(next, busyDelay)
      } catch (e) {
        console.error(e)
        patchSettings({ busy_mode: !next })
        alert('تعذّر تحديث وضع الضغط، حاول مرة أخرى.')
      }
    },
    [patchSettings, busyDelay],
  )

  const handleDelayChange = useCallback(
    async (minutes: number) => {
      const prev = busyDelay
      patchSettings({ busy_delay: minutes })
      try {
        await updateBusyDelay(minutes)
      } catch (e) {
        console.error(e)
        patchSettings({ busy_delay: prev })
        alert('تعذّر تحديث مدة التأخير، حاول مرة أخرى.')
      }
    },
    [patchSettings, busyDelay],
  )

  const handleWaitTimeChange = useCallback(
    async (minutes: number) => {
      const prev = generalWaitTime
      patchSettings({ general_wait_time: minutes })
      try {
        await updateGeneralWaitTime(minutes)
      } catch (e) {
        console.error(e)
        patchSettings({ general_wait_time: prev })
        alert('تعذّر تحديث وقت الانتظار العام، حاول مرة أخرى.')
      }
    },
    [patchSettings, generalWaitTime],
  )

  // ===== شاشات الحالة =====
  if (!isSupabaseConfigured) {
    return (
      <Shell>
        <ConfigState />
      </Shell>
    )
  }

  return (
    <div className="min-h-screen">
      {busyMode && <BusyModeBar delay={busyDelay} />}

      <div className="mx-auto max-w-[2000px] px-3 py-4 sm:px-6 sm:py-6">
        <div className="space-y-5">
          <Header
            connected={connected}
            soundOn={soundOn}
            onToggleSound={toggleSound}
          />

          <BusyModeToggle
            busyMode={busyMode}
            busyDelay={busyDelay}
            generalWaitTime={generalWaitTime}
            onToggle={handleToggleBusy}
            onDelayChange={handleDelayChange}
            onWaitTimeChange={handleWaitTimeChange}
          />

          <StatusTabs
            active={activeTab}
            counts={counts}
            onChange={setActiveTab}
          />

          {/* المحتوى */}
          {ordersError ? (
            <ErrorState onRetry={refetchOrders} />
          ) : ordersLoading ? (
            <LoadingState />
          ) : visibleOrders.length === 0 ? (
            <EmptyState
              message={
                activeTab === 'all'
                  ? 'لا توجد طلبات بعد'
                  : 'لا توجد طلبات في هذا التبويب'
              }
            />
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4">
              {visibleOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  isNew={newIds.has(order.id)}
                  isCancelledFlash={cancelledIds.has(order.id)}
                  onStatusChange={handleStatusChange}
                  onAcknowledge={handleAcknowledge}
                  onAcknowledgeCancel={() => handleAcknowledgeCancel(order.id)}
                  onQuickReply={handleQuickReply}
                />
              ))}
            </div>
          )}

          <footer className="pt-4 pb-8 text-center text-xs text-zinc-600">
            سماش لاب — لوحة الطلبات اللحظية
          </footer>
        </div>
      </div>
    </div>
  )
}

/** غلاف بسيط لشاشات الحالة المستقلة */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-6">{children}</div>
    </div>
  )
}
