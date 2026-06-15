import { useCallback, useEffect, useState } from 'react'
import { isSupabaseConfigured } from '../lib/supabase'
import { fetchFaq } from '../lib/api'
import type { FaqItem } from '../types'

interface UseFaqResult {
  items: FaqItem[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  /** إدراج/تحديث صف محلياً (تحديث متفائل) */
  upsertLocal: (item: FaqItem) => void
  /** تعديل حقول صف محلياً */
  patchLocal: (id: number, patch: Partial<FaqItem>) => void
  /** حذف صف محلياً */
  removeLocal: (id: number) => void
}

/**
 * يجلب الأسئلة الشائعة عند فتح الصفحة (بدون Realtime — كافٍ هنا).
 * يوفّر مساعدات تحديث محلي متفائل للطفرات (إضافة/تعديل/حذف).
 */
export function useFaq(): UseFaqResult {
  const [items, setItems] = useState<FaqItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setError('config')
      setLoading(false)
      return
    }
    try {
      setError(null)
      const list = await fetchFaq()
      setItems(list)
    } catch (e) {
      console.error('[useFaq] فشل جلب الأسئلة الشائعة:', e)
      setError(e instanceof Error ? e.message : 'فشل الاتصال')
    } finally {
      setLoading(false)
    }
  }, [])

  const upsertLocal = useCallback((item: FaqItem) => {
    setItems((prev) => {
      const exists = prev.some((f) => f.id === item.id)
      return exists
        ? prev.map((f) => (f.id === item.id ? item : f))
        : [...prev, item]
    })
  }, [])

  const patchLocal = useCallback((id: number, patch: Partial<FaqItem>) => {
    setItems((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)))
  }, [])

  const removeLocal = useCallback((id: number) => {
    setItems((prev) => prev.filter((f) => f.id !== id))
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { items, loading, error, refetch, upsertLocal, patchLocal, removeLocal }
}
