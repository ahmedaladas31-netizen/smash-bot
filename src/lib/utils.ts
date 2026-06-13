import type { Order, ParsedItems } from '../types'

/** نتيجة فك حقل items — كل الحقول نصوص بقيمة افتراضية فارغة */
export interface ParsedItemsResult {
  summary: string
  delivery_type: string
  address: string
}

/** يحوّل object مفكوكًا مسبقًا إلى نتيجة بحقول نصية آمنة */
function fromParsedObject(obj: ParsedItems): ParsedItemsResult {
  return {
    summary: obj.summary ?? '',
    delivery_type: obj.delivery_type ?? '',
    address: obj.address ?? '',
  }
}

/**
 * يفك حقل items ويتعامل مع كل الحالات بأمان:
 * - null/undefined → نتيجة فارغة بقيم افتراضية.
 * - object أصلاً (مش string) → يُستخدم مباشرة.
 * - string → JSON.parse؛ وعند الفشل يُعاد النص كما هو في summary.
 */
export function parseItems(
  items: string | ParsedItems | null | undefined,
): ParsedItemsResult {
  if (items == null) {
    return { summary: '', delivery_type: '', address: '' }
  }

  // object أصلاً → استخدمه مباشرة
  if (typeof items === 'object') {
    return fromParsedObject(items)
  }

  // string فاضي أو مسافات فقط → قيم افتراضية
  if (!items.trim()) {
    return { summary: '', delivery_type: '', address: '' }
  }

  // string → حاول التحليل، وعند الفشل اعرض النص كما هو
  try {
    const parsed = JSON.parse(items)
    if (parsed && typeof parsed === 'object') {
      return fromParsedObject(parsed as ParsedItems)
    }
    // JSON صالح لكنه ليس object (رقم/نص) → اعرضه كما هو
    return { summary: items, delivery_type: '', address: '' }
  } catch {
    return { summary: items, delivery_type: '', address: '' }
  }
}

/** تنسيق الأرقام العربية للوحدات الزمنية (مفرد/مثنى/جمع) */
function arabicUnit(
  n: number,
  one: string,
  two: string,
  few: string,
  many: string,
): string {
  if (n === 1) return one
  if (n === 2) return two
  if (n >= 3 && n <= 10) return `${n} ${few}`
  return `${n} ${many}`
}

/**
 * وقت نسبي بالعربية مثل: "الآن"، "من 5 دقائق"، "من ساعتين".
 */
export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = Date.now()
  const diffSec = Math.round((now - date.getTime()) / 1000)

  if (Number.isNaN(date.getTime())) return ''
  if (diffSec < 0) return 'الآن'
  if (diffSec < 45) return 'الآن'

  const diffMin = Math.round(diffSec / 60)
  if (diffMin < 60) {
    return `من ${arabicUnit(diffMin, 'دقيقة', 'دقيقتين', 'دقائق', 'دقيقة')}`
  }

  const diffHour = Math.round(diffMin / 60)
  if (diffHour < 24) {
    return `من ${arabicUnit(diffHour, 'ساعة', 'ساعتين', 'ساعات', 'ساعة')}`
  }

  const diffDay = Math.round(diffHour / 24)
  return `من ${arabicUnit(diffDay, 'يوم', 'يومين', 'أيام', 'يوم')}`
}

/** عمر الطلب بالدقائق (للتلوين حسب الإلحاح) — صفر إن كان التاريخ غير صالح */
export function ageMinutes(dateStr: string): number {
  const t = new Date(dateStr).getTime()
  if (Number.isNaN(t)) return 0
  return Math.max(0, Math.floor((Date.now() - t) / 60000))
}

/** الوقت الكامل للعرض عند hover (title) */
export function formatFullTime(dateStr: string): string {
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return ''
  try {
    return new Intl.DateTimeFormat('ar', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date)
  } catch {
    return date.toLocaleString()
  }
}

/**
 * يجهّز رقم الهاتف لرابط wa.me — أرقام فقط بدون + أو فراغات.
 * أرقام واتساب تأتي عادةً بصيغة دولية كاملة.
 */
export function phoneToWaLink(phone: string | null): string {
  const digits = (phone ?? '').replace(/[^\d]/g, '')
  return `https://wa.me/${digits}`
}

/** عرض الهاتف بشكل مقروء (مع الحفاظ على + إن وُجدت) */
export function displayPhone(phone: string | null): string {
  return (phone ?? '').trim() || 'بدون رقم'
}

/** تنسيق المبلغ بالشيكل */
export function formatShekel(total: number | null): string {
  const value = typeof total === 'number' && !Number.isNaN(total) ? total : 0
  // نعرض رقمين عشريين فقط إن لزم
  const formatted = Number.isInteger(value) ? String(value) : value.toFixed(2)
  return `${formatted} ₪`
}

/** دمج أصناف className بشكل آمن */
export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}

/** مفتاح اليوم (YYYY-MM-DD) بتوقيت المطعم Asia/Hebron — للتجميع اليومي */
function hebronDayKey(dateStr: string): string {
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return 'invalid'
  // en-CA يعطي صيغة YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Hebron' }).format(d)
}

/**
 * يحسب رقماً تسلسلياً يومياً لكل طلب (بالوصول، يشمل كل الحالات).
 * الترقيم يبدأ من 1 لكل يوم بتوقيت Asia/Hebron ويتصفّر تلقائياً عند منتصف الليل.
 * يُعيد خريطة id → رقم. محسوب بالكامل من البيانات المحمّلة (بدون أي تخزين).
 */
export function computeDailyNumbers(orders: Order[]): Map<string, number> {
  const byDay = new Map<string, { id: string; t: number }[]>()
  for (const o of orders) {
    const key = hebronDayKey(o.created_at)
    const arr = byDay.get(key)
    const entry = { id: o.id, t: new Date(o.created_at).getTime() }
    if (arr) arr.push(entry)
    else byDay.set(key, [entry])
  }
  const numbers = new Map<string, number>()
  for (const arr of byDay.values()) {
    arr.sort((a, b) => a.t - b.t)
    arr.forEach((entry, i) => numbers.set(entry.id, i + 1))
  }
  return numbers
}
