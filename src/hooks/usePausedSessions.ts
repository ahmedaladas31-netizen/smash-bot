import { useCallback, useEffect, useRef, useState } from 'react'
import {
  supabase,
  PAUSED_SESSIONS_TABLE,
  isSupabaseConfigured,
} from '../lib/supabase'
import { fetchPausedSessions } from '../lib/api'
import type { PausedSession } from '../types'

interface UsePausedSessionsResult {
  sessions: PausedSession[]
  loading: boolean
  error: string | null
  /** متصل بالـ Realtime؟ */
  connected: boolean
  refetch: () => Promise<void>
  /** حذف محلي متفائل (يُستخدم فور فك الإيقاف لتبدو فورية) */
  removeLocal: (phone: string) => void
}

/** كل كم ملّي ثانية نعيد الجلب كشبكة أمان لو لم يكن Realtime مفعّلاً لهذا الجدول */
const POLL_MS = 30_000

/**
 * يجلب المحادثات الموقوفة (تدخّل بشري) ويشترك في الـ Realtime.
 * يحاكي بنية useOrders، مع polling خفيف كشبكة أمان (الجدول جديد وقد لا يكون
 * مضافاً لنشرة الـ realtime بعد).
 */
export function usePausedSessions(): UsePausedSessionsResult {
  const [sessions, setSessions] = useState<PausedSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)

  const sortDesc = (list: PausedSession[]) =>
    [...list].sort(
      (a, b) =>
        new Date(b.paused_at).getTime() - new Date(a.paused_at).getTime(),
    )

  const fetchSessions = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setError('config')
      setLoading(false)
      return
    }
    try {
      setError(null)
      const list = await fetchPausedSessions()
      setSessions(sortDesc(list))
    } catch (e) {
      console.error('[usePausedSessions] فشل جلب المحادثات الموقوفة:', e)
      setError(e instanceof Error ? e.message : 'فشل الاتصال')
    } finally {
      setLoading(false)
    }
  }, [])

  const removeLocal = useCallback((phone: string) => {
    setSessions((prev) => prev.filter((s) => s.customer_phone !== phone))
  }, [])

  // نحتفظ بالدالة في ref حتى لا نعيد ضبط الـ polling في كل render
  const fetchRef = useRef(fetchSessions)
  fetchRef.current = fetchSessions

  useEffect(() => {
    fetchSessions()

    if (!isSupabaseConfigured) return

    const upsert = (row: PausedSession) =>
      setSessions((prev) => {
        const rest = prev.filter((s) => s.customer_phone !== row.customer_phone)
        return sortDesc([row, ...rest])
      })

    const channel = supabase
      .channel('paused-sessions-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: PAUSED_SESSIONS_TABLE },
        (payload) => upsert(payload.new as PausedSession),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: PAUSED_SESSIONS_TABLE },
        (payload) => upsert(payload.new as PausedSession),
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: PAUSED_SESSIONS_TABLE },
        (payload) => {
          const removed = payload.old as Partial<PausedSession>
          if (!removed.customer_phone) return
          setSessions((prev) =>
            prev.filter((s) => s.customer_phone !== removed.customer_phone),
          )
        },
      )
      .subscribe((status) => {
        setConnected(status === 'SUBSCRIBED')
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('[usePausedSessions] حالة قناة Realtime:', status)
        }
      })

    // شبكة أمان: إعادة جلب دوري لو لم تصل أحداث Realtime
    const poll = setInterval(() => {
      fetchRef.current()
    }, POLL_MS)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(poll)
    }
  }, [fetchSessions])

  return {
    sessions,
    loading,
    error,
    connected,
    refetch: fetchSessions,
    removeLocal,
  }
}
