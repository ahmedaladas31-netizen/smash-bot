import { Clock, Hand, MessageCircle, Phone, Play, UserCog } from 'lucide-react'
import { cx, displayPhone, formatRelativeTime, phoneToWaLink } from '../lib/utils'
import type { PauseReason, PausedSession } from '../types'

interface PausedSessionsPanelProps {
  sessions: PausedSession[]
  loading: boolean
  connected: boolean
  /** فك إيقاف رقم (حذف الصف من paused_sessions) */
  onUnpause: (phone: string) => void
}

/** تسمية وأيقونة سبب الإيقاف */
function reasonMeta(reason: PauseReason): { label: string; icon: typeof Hand } {
  switch (reason) {
    case 'customer_request':
      return { label: 'طلب موظف', icon: UserCog }
    case 'manual':
      return { label: 'إيقاف يدوي', icon: Hand }
    default:
      return { label: 'غير محدد', icon: Hand }
  }
}

/**
 * قائمة "محادثات بحاجة تدخل": كل صف في paused_sessions = زبون البوت موقوف عنه.
 * تظهر فقط عند وجود محادثات موقوفة (شاشة المطبخ تبقى نظيفة بدونها).
 */
export default function PausedSessionsPanel({
  sessions,
  loading,
  connected,
  onUnpause,
}: PausedSessionsPanelProps) {
  // لا نعرض شيئاً أثناء أول تحميل أو عند عدم وجود محادثات موقوفة
  if (loading || sessions.length === 0) return null

  return (
    <div className="rounded-2xl border border-amber-600/50 bg-amber-500/10 p-4">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-coal-950">
          <Hand className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="text-base font-extrabold leading-tight text-amber-100">
            محادثات بحاجة تدخل
          </div>
          <div className="text-xs font-semibold text-amber-300/80">
            البوت موقوف عن هؤلاء الزبائن — رُدّ عليهم يدوياً
          </div>
        </div>
        <span
          className="nums rounded-lg bg-amber-500/20 px-2.5 py-1 text-sm font-extrabold text-amber-200"
          title="عدد المحادثات الموقوفة"
        >
          {sessions.length}
        </span>
        <span
          className={cx(
            'h-2.5 w-2.5 shrink-0 rounded-full',
            connected ? 'bg-emerald-500' : 'bg-zinc-600',
          )}
          title={connected ? 'متصل لحظياً' : 'منقطع'}
        />
      </div>

      <div className="space-y-2">
        {sessions.map((s) => {
          const { label, icon: Icon } = reasonMeta(s.reason)
          return (
            <div
              key={s.customer_phone}
              className="flex flex-wrap items-center gap-3 rounded-xl bg-coal-900/60 px-3 py-2.5 ring-1 ring-amber-600/20"
            >
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <Phone className="h-4 w-4 shrink-0 text-zinc-400" />
                <span className="nums truncate font-bold text-zinc-100">
                  {displayPhone(s.customer_phone)}
                </span>
              </div>

              <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/15 px-2 py-1 text-xs font-bold text-amber-200 ring-1 ring-amber-500/30">
                <Icon className="h-3.5 w-3.5" />
                {label}
              </span>

              <span className="inline-flex items-center gap-1 text-xs text-zinc-400">
                <Clock className="h-3.5 w-3.5" />
                {formatRelativeTime(s.paused_at)}
              </span>

              <div className="flex items-center gap-2">
                <a
                  href={phoneToWaLink(s.customer_phone)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-bold text-white transition-colors hover:bg-emerald-500"
                >
                  <MessageCircle className="h-4 w-4" />
                  واتساب
                </a>
                <button
                  type="button"
                  onClick={() => onUnpause(s.customer_phone)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-bold text-white transition-all hover:bg-brand-400 active:scale-95"
                  title="إعادة تشغيل البوت لهذا الرقم"
                >
                  <Play className="h-4 w-4" />
                  فك الإيقاف
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
