import { useEffect, useState } from 'react'
import { CalendarClock } from 'lucide-react'
import type { WorkingHoursPatch } from '../lib/api'

/** حقل دوام واحد قابل للتعديل */
export type HoursField =
  | 'weekday_open'
  | 'weekday_close'
  | 'friday_open'
  | 'friday_close'

interface WorkingHoursSettingsProps {
  weekdayOpen: number
  weekdayClose: number
  fridayOpen: number
  fridayClose: number
  disabled?: boolean
  /** يُستدعى بعد مغادرة الحقل (blur) بقيمة جديدة محصورة في النطاق */
  onCommit: (patch: WorkingHoursPatch) => void
}

/**
 * يحوّل الساعة (0–24) إلى نص مقروء بالعربية.
 * 24 ومنتصف الليل تُعرض "12 م" كما في المثال المطلوب.
 */
function formatHour(h: number): string {
  if (h === 24) return '12 م'
  if (h === 0) return '12 ص'
  if (h === 12) return '12 م'
  if (h < 12) return `${h} ص`
  return `${h - 12} م`
}

/** حصر القيمة داخل النطاق مع التعامل مع المدخلات غير الصالحة */
function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min
  return Math.min(max, Math.max(min, value))
}

/**
 * قسم "دوام المطعم" في الإعدادات.
 * يتبع نمط الحفظ التلقائي للوحة: تعديل محلي أثناء الكتابة، وحفظ عند مغادرة الحقل.
 */
export default function WorkingHoursSettings({
  weekdayOpen,
  weekdayClose,
  fridayOpen,
  fridayClose,
  disabled,
  onCommit,
}: WorkingHoursSettingsProps) {
  return (
    <div className="rounded-2xl border border-coal-700 bg-coal-800/60 p-4">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-coal-700 text-brand-300">
          <CalendarClock className="h-6 w-6" />
        </div>
        <div>
          <div className="text-lg font-extrabold leading-tight">دوام المطعم</div>
          <div className="text-sm font-semibold text-zinc-400">
            ساعات الفتح والإغلاق بنظام 24 ساعة
          </div>
        </div>
      </div>

      {/* أيام الأسبوع */}
      <div className="mb-2 text-xs font-semibold text-zinc-400">
        أيام الأسبوع (السبت–الخميس)
      </div>
      <div className="grid grid-cols-2 gap-3">
        <HourField
          label="يفتح الساعة"
          value={weekdayOpen}
          min={0}
          max={23}
          disabled={disabled}
          onCommit={(v) => onCommit({ weekday_open: v })}
        />
        <HourField
          label="يسكر الساعة"
          value={weekdayClose}
          min={0}
          max={24}
          disabled={disabled}
          onCommit={(v) => onCommit({ weekday_close: v })}
        />
      </div>

      {/* الجمعة */}
      <div className="mb-2 mt-4 text-xs font-semibold text-zinc-400">الجمعة</div>
      <div className="grid grid-cols-2 gap-3">
        <HourField
          label="يفتح الساعة"
          value={fridayOpen}
          min={0}
          max={23}
          disabled={disabled}
          onCommit={(v) => onCommit({ friday_open: v })}
        />
        <HourField
          label="يسكر الساعة"
          value={fridayClose}
          min={0}
          max={24}
          disabled={disabled}
          onCommit={(v) => onCommit({ friday_close: v })}
        />
      </div>

      {/* عرض توضيحي للدوام (للقراءة فقط) */}
      <div className="mt-4 rounded-xl bg-coal-900/60 px-3 py-2.5 text-sm font-semibold text-zinc-300 ring-1 ring-coal-700">
        <span className="text-zinc-500">أيام الأسبوع: </span>
        <span className="nums text-zinc-100">
          {formatHour(weekdayOpen)} — {formatHour(weekdayClose)}
        </span>
        <span className="mx-2 text-zinc-600">|</span>
        <span className="text-zinc-500">الجمعة: </span>
        <span className="nums text-zinc-100">
          {formatHour(fridayOpen)} — {formatHour(fridayClose)}
        </span>
      </div>
    </div>
  )
}

interface HourFieldProps {
  label: string
  value: number
  min: number
  max: number
  disabled?: boolean
  onCommit: (value: number) => void
}

/** حقل ساعة واحد: تعديل محلي أثناء الكتابة + حفظ عند المغادرة */
function HourField({
  label,
  value,
  min,
  max,
  disabled,
  onCommit,
}: HourFieldProps) {
  const [draft, setDraft] = useState(String(value))

  // مزامنة القيمة عند تغيّرها من مصدر خارجي (realtime / جهاز آخر)
  useEffect(() => {
    setDraft(String(value))
  }, [value])

  const commit = () => {
    const next = clamp(parseInt(draft, 10), min, max)
    setDraft(String(next))
    if (next !== value) onCommit(next)
  }

  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold text-zinc-400">{label}</span>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={draft}
        disabled={disabled}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
        }}
        className="nums w-full rounded-xl border border-coal-700 bg-coal-900 px-3 py-2.5 text-lg font-extrabold text-zinc-100 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 disabled:opacity-50"
      />
    </label>
  )
}
