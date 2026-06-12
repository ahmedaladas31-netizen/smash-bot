import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase, ORDERS_TABLE, isSupabaseConfigured } from '../lib/supabase'
import type { Order } from '../types'

interface UseOrdersCallbacks {
  /** يُستدعى عند وصول طلب جديد (INSERT) */
  onNewOrder?: (order: Order) => void
  /** يُستدعى عند انتقال customer_asked إلى true */
  onCustomerAsked?: (order: Order) => void
  /** يُستدعى عند انتقال حالة الطلب إلى cancelled */
  onOrderCancelled?: (order: Order) => void
}

interface UseOrdersResult {
  orders: Order[]
  loading: boolean
  error: string | null
  /** متصل بالـ Realtime؟ */
  connected: boolean
  refetch: () => Promise<void>
  /** تحديث متفائل محلي (يُستخدم بعد الطفرات لتبدو فورية) */
  patchOrder: (id: string, patch: Partial<Order>) => void
}

const PAGE_SIZE = 200

export function useOrders(callbacks: UseOrdersCallbacks = {}): UseOrdersResult {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)

  // نحتفظ بالـ callbacks في ref حتى لا نُعيد الاشتراك في كل render
  const cbRef = useRef(callbacks)
  cbRef.current = callbacks

  // خريطة سريعة لمعرفة إن كان الطلب موجوداً مسبقاً (لتجنّب التكرار)
  const knownIds = useRef<Set<string>>(new Set())

  const sortDesc = (list: Order[]) =>
    [...list].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )

  const fetchOrders = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setError('config')
      setLoading(false)
      return
    }
    try {
      setError(null)
      const { data, error: qErr } = await supabase
        .from(ORDERS_TABLE)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE)

      if (qErr) throw qErr
      const list = (data as Order[]) ?? []
      knownIds.current = new Set(list.map((o) => o.id))
      setOrders(list)
    } catch (e) {
      console.error('[useOrders] فشل جلب الطلبات:', e)
      setError(e instanceof Error ? e.message : 'فشل الاتصال')
    } finally {
      setLoading(false)
    }
  }, [])

  const patchOrder = useCallback((id: string, patch: Partial<Order>) => {
    setOrders((prev) =>
      sortDesc(prev.map((o) => (o.id === id ? { ...o, ...patch } : o))),
    )
  }, [])

  useEffect(() => {
    fetchOrders()

    if (!isSupabaseConfigured) return

    const channel = supabase
      .channel('orders-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: ORDERS_TABLE },
        (payload) => {
          const order = payload.new as Order
          if (knownIds.current.has(order.id)) return
          knownIds.current.add(order.id)
          setOrders((prev) => sortDesc([order, ...prev]))
          if (order.status === 'cancelled') {
            cbRef.current.onOrderCancelled?.(order)
          } else {
            cbRef.current.onNewOrder?.(order)
          }
          if (order.customer_asked) cbRef.current.onCustomerAsked?.(order)
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: ORDERS_TABLE },
        (payload) => {
          const next = payload.new as Order
          const prevRow = payload.old as Partial<Order>
          setOrders((prev) => {
            const exists = prev.some((o) => o.id === next.id)
            const merged = exists
              ? prev.map((o) => (o.id === next.id ? { ...o, ...next } : o))
              : [next, ...prev]
            knownIds.current.add(next.id)
            return sortDesc(merged)
          })
          // تنبيه الإلغاء (انتقال إلى cancelled من أي حالة أخرى)
          if (next.status === 'cancelled' && prevRow.status !== 'cancelled') {
            cbRef.current.onOrderCancelled?.(next)
          }
          // تنبيه عندما يسأل الزبون (انتقال false/none → true)
          if (next.customer_asked && !prevRow.customer_asked) {
            cbRef.current.onCustomerAsked?.(next)
          }
        },
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: ORDERS_TABLE },
        (payload) => {
          const removed = payload.old as Partial<Order>
          if (!removed.id) return
          knownIds.current.delete(removed.id)
          setOrders((prev) => prev.filter((o) => o.id !== removed.id))
        },
      )
      .subscribe((status) => {
        setConnected(status === 'SUBSCRIBED')
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('[useOrders] حالة قناة Realtime:', status)
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchOrders])

  return { orders, loading, error, connected, refetch: fetchOrders, patchOrder }
}
