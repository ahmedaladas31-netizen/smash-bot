import { useCallback, useEffect, useState } from 'react'
import {
  supabase,
  SETTINGS_TABLE,
  SETTINGS_ROW_ID,
  isSupabaseConfigured,
} from '../lib/supabase'
import type { RestaurantSettings } from '../types'

interface UseSettingsResult {
  settings: RestaurantSettings | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  /** تحديث متفائل محلي */
  patchSettings: (patch: Partial<RestaurantSettings>) => void
}

const DEFAULT_SETTINGS: RestaurantSettings = {
  id: SETTINGS_ROW_ID,
  busy_mode: false,
  busy_delay: 30,
  general_wait_time: 20,
  bot_globally_paused: false,
}

export function useSettings(): UseSettingsResult {
  const [settings, setSettings] = useState<RestaurantSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSettings = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setError('config')
      setLoading(false)
      return
    }
    try {
      setError(null)
      const { data, error: qErr } = await supabase
        .from(SETTINGS_TABLE)
        .select('*')
        .eq('id', SETTINGS_ROW_ID)
        .maybeSingle()

      if (qErr) throw qErr
      setSettings((data as RestaurantSettings) ?? DEFAULT_SETTINGS)
    } catch (e) {
      console.error('[useSettings] فشل جلب الإعدادات:', e)
      setError(e instanceof Error ? e.message : 'فشل الاتصال')
    } finally {
      setLoading(false)
    }
  }, [])

  const patchSettings = useCallback((patch: Partial<RestaurantSettings>) => {
    setSettings((prev) => ({ ...(prev ?? DEFAULT_SETTINGS), ...patch }))
  }, [])

  useEffect(() => {
    fetchSettings()

    if (!isSupabaseConfigured) return

    const channel = supabase
      .channel('settings-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: SETTINGS_TABLE,
          filter: `id=eq.${SETTINGS_ROW_ID}`,
        },
        (payload) => {
          if (payload.new && Object.keys(payload.new).length) {
            setSettings(payload.new as RestaurantSettings)
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchSettings])

  return { settings, loading, error, refetch: fetchSettings, patchSettings }
}
