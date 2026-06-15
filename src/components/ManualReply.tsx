import { useState } from 'react'
import { Loader2, Pencil, Send } from 'lucide-react'
import { sendCustomerReply } from '../lib/webhook'
import { cx } from '../lib/utils'

interface ManualReplyProps {
  /** رقم الزبون المُرسَل إليه الرسالة */
  phone: string | null
}

/**
 * حقل رسالة حرّة للزبون — يظهر فقط حين يكون البوت موقوفاً عن الزبون.
 * يستخدم نفس قناة الإرسال التي تستخدمها الردود الجاهزة (sendCustomerReply).
 * مستقل تماماً عن منطق الردود الجاهزة ووضع الإيقاف.
 */
export default function ManualReply({ phone }: ManualReplyProps) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const hasPhone = Boolean(phone && phone.trim())
  const canSend = hasPhone && text.trim().length > 0 && !sending

  const handleSend = async () => {
    const message = text.trim()
    if (!message || !hasPhone || sending) return

    setSending(true)
    try {
      await sendCustomerReply(phone as string, message)
      setText('') // امسح الحقل بعد الإرسال الناجح
    } catch (e) {
      console.error('[ManualReply] فشل إرسال الرسالة:', e)
      alert('تعذّر إرسال الرسالة، حاول مرة أخرى.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-zinc-400">
        <Pencil className="h-4 w-4" />
        رسالة يدوية للزبون
      </div>

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              void handleSend()
            }
          }}
          placeholder="اكتب رسالة للزبون..."
          disabled={!hasPhone || sending}
          className="min-w-0 flex-1 rounded-xl border border-coal-700 bg-coal-800 px-3 py-2.5 text-sm font-semibold text-zinc-200 placeholder:text-zinc-500 outline-none transition-colors focus:border-emerald-500/60 disabled:opacity-50"
        />
        <button
          type="button"
          disabled={!canSend}
          onClick={() => void handleSend()}
          className={cx(
            'flex shrink-0 items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition-all active:scale-95',
            'bg-emerald-600 hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50',
          )}
        >
          {sending ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
          ) : (
            <Send className="h-4 w-4 shrink-0" />
          )}
          إرسال
        </button>
      </div>

      {!hasPhone && (
        <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
          لا يوجد رقم لهذا الزبون — تعذّر إرسال رسالة.
        </p>
      )}
    </div>
  )
}
