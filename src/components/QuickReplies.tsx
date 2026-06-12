import { useEffect, useRef, useState } from 'react'
import { Check, Loader2, MessageSquareReply, Send, X } from 'lucide-react'
import { QUICK_REPLIES, type QuickReply } from '../lib/constants'
import { cx } from '../lib/utils'

type ReplyState = 'idle' | 'sending' | 'sent' | 'error'

interface QuickRepliesProps {
  /** رقم الزبون المُرسَل إليه الرد */
  phone: string | null
  /**
   * ينفّذ الرد: تحديث الطلب في Supabase ثم إرسال الواتساب.
   * يرمي خطأً فقط عند فشل تحديث Supabase (عندها يظهر الزر بحالة خطأ).
   */
  onReplied: (reply: QuickReply) => Promise<void>
}

/** مدة بقاء حالة "تم الإرسال"/"فشل" قبل العودة لوضع الزر الطبيعي */
const RESET_MS = 4000

/**
 * قسم "رد على الزبون": أزرار ردود جاهزة تُرسل رسالة عبر الـ webhook.
 * كل زر يدير حالته بنفسه (إرسال/تم/فشل) ويتعطّل مؤقتاً لمنع الضغط المزدوج.
 */
export default function QuickReplies({ phone, onReplied }: QuickRepliesProps) {
  const [states, setStates] = useState<Record<string, ReplyState>>({})
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const hasPhone = Boolean(phone && phone.trim())

  // تنظيف المؤقتات عند إزالة البطاقة
  useEffect(() => {
    const map = timers.current
    return () => {
      map.forEach((t) => clearTimeout(t))
      map.clear()
    }
  }, [])

  const setState = (id: string, s: ReplyState) =>
    setStates((prev) => ({ ...prev, [id]: s }))

  const scheduleReset = (id: string) => {
    const existing = timers.current.get(id)
    if (existing) clearTimeout(existing)
    timers.current.set(
      id,
      setTimeout(() => {
        setState(id, 'idle')
        timers.current.delete(id)
      }, RESET_MS),
    )
  }

  const handleClick = async (reply: QuickReply) => {
    if (!hasPhone) return
    const state = states[reply.id] ?? 'idle'
    // امنع الضغط أثناء الإرسال أو خلال فترة التأكيد
    if (state === 'sending' || state === 'sent') return

    setState(reply.id, 'sending')
    try {
      // التنفيذ (Supabase ثم الواتساب) يتم في onReplied؛
      // يرمي خطأً فقط إن فشل تحديث Supabase.
      await onReplied(reply)
      setState(reply.id, 'sent')
    } catch (e) {
      console.error('[QuickReplies] فشل تنفيذ الرد:', e)
      setState(reply.id, 'error')
    } finally {
      scheduleReset(reply.id)
    }
  }

  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-zinc-400">
        <MessageSquareReply className="h-4 w-4" />
        رد على الزبون
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {QUICK_REPLIES.map((reply) => {
          const state = states[reply.id] ?? 'idle'
          const busy = state === 'sending' || state === 'sent'
          return (
            <button
              key={reply.id}
              type="button"
              disabled={!hasPhone || busy}
              onClick={() => handleClick(reply)}
              title={reply.message}
              className={cx(
                'flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2.5 text-sm font-bold transition-all active:scale-95 disabled:cursor-not-allowed',
                state === 'sent' &&
                  'border-emerald-400 bg-emerald-500/20 text-emerald-200',
                state === 'error' &&
                  'border-flame-500 bg-flame-500/15 text-flame-500',
                state === 'sending' &&
                  'border-coal-700 bg-coal-800 text-zinc-400 opacity-70',
                state === 'idle' &&
                  'border-coal-700 bg-coal-800 text-zinc-200 hover:border-emerald-500/60 hover:bg-coal-700 disabled:opacity-50',
              )}
            >
              {state === 'sending' && (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
              )}
              {state === 'sent' && <Check className="h-4 w-4 shrink-0" />}
              {state === 'error' && <X className="h-4 w-4 shrink-0" />}
              {state === 'idle' && (
                <Send className="h-4 w-4 shrink-0 opacity-70" />
              )}
              <span className="truncate">
                {state === 'sent'
                  ? 'تم الإرسال'
                  : state === 'error'
                    ? 'فشل، أعد المحاولة'
                    : reply.label}
              </span>
            </button>
          )
        })}
      </div>

      {!hasPhone && (
        <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
          لا يوجد رقم لهذا الزبون — تعذّر إرسال رد.
        </p>
      )}
    </div>
  )
}
