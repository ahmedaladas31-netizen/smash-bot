import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase, MESSAGES_TABLE, isSupabaseConfigured } from '../lib/supabase'
import type { Message } from '../types'

/** محادثة مجمّعة لزبون واحد (مشتقّة من الرسائل) */
export interface Conversation {
  phone: string
  name: string | null
  lastBody: string | null
  lastDirection: Message['direction']
  lastAt: string
  count: number
}

interface UseConversationsResult {
  /** كل الرسائل المحمّلة (الأحدث أولاً) */
  messages: Message[]
  /** قائمة المحادثات مجمّعة حسب الرقم (الأحدث نشاطاً أولاً) */
  conversations: Conversation[]
  loading: boolean
  error: string | null
  connected: boolean
  refetch: () => Promise<void>
}

const PAGE_SIZE = 500

/**
 * يجلب آخر الرسائل ويشترك في الـ Realtime (INSERT فقط — الرسائل سجلّ ثابت).
 * يحاكي بنية useOrders. المحادثات تُشتقّ بالتجميع حسب customer_phone.
 */
export function useConversations(): UseConversationsResult {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)

  const knownIds = useRef<Set<string>>(new Set())

  const fetchMessages = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setError('config')
      setLoading(false)
      return
    }
    try {
      setError(null)
      const { data, error: qErr } = await supabase
        .from(MESSAGES_TABLE)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE)

      if (qErr) throw qErr
      const list = (data as Message[]) ?? []
      knownIds.current = new Set(list.map((m) => m.id))
      setMessages(list)
    } catch (e) {
      console.error('[useConversations] فشل جلب الرسائل:', e)
      setError(e instanceof Error ? e.message : 'فشل الاتصال')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMessages()

    if (!isSupabaseConfigured) return

    const channel = supabase
      .channel('messages-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: MESSAGES_TABLE },
        (payload) => {
          const msg = payload.new as Message
          if (knownIds.current.has(msg.id)) return
          knownIds.current.add(msg.id)
          setMessages((prev) => [msg, ...prev])
        },
      )
      .subscribe((status) => {
        setConnected(status === 'SUBSCRIBED')
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('[useConversations] حالة قناة Realtime:', status)
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchMessages])

  // تجميع الرسائل في محادثات حسب رقم الزبون
  const conversations = useMemo<Conversation[]>(() => {
    const map = new Map<string, Conversation>()
    // الرسائل مرتّبة تنازلياً، فأول ظهور لكل رقم هو الأحدث
    for (const m of messages) {
      const existing = map.get(m.customer_phone)
      if (!existing) {
        map.set(m.customer_phone, {
          phone: m.customer_phone,
          name: m.customer_name,
          lastBody: m.body,
          lastDirection: m.direction,
          lastAt: m.created_at,
          count: 1,
        })
      } else {
        existing.count += 1
        // أكمل الاسم إن كان ناقصاً في الأحدث
        if (!existing.name && m.customer_name) existing.name = m.customer_name
      }
    }
    return [...map.values()].sort(
      (a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime(),
    )
  }, [messages])

  return { messages, conversations, loading, error, connected, refetch: fetchMessages }
}
