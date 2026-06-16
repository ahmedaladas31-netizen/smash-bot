/**
 * حماية دخول اللوحة بكلمة سر بسيطة (طبقة ردع للوصول العَرَضي).
 *
 * كلمة السر تأتي من متغيّر البيئة VITE_DASHBOARD_PASSWORD ولا تُكتب في الكود
 * ولا قيمة افتراضية لها. تنبيه أمني: متغيّرات VITE_* تُدمَج داخل bundle
 * المتصفّح عند البناء — تماماً مثل توكن الـ webhook (انظر lib/webhook.ts) —
 * فهذه طبقة ردع مناسبة لداشبورد داخلي تمنع الدخول العَرَضي، وليست حماية
 * تشفيرية. الحماية الأمتن تكون عبر مصادقة من جهة الخادم (Supabase Auth + RLS).
 */

const PASSWORD = import.meta.env.VITE_DASHBOARD_PASSWORD as string | undefined

/** مفتاح تخزين علامة الدخول في المتصفّح */
const AUTH_KEY = 'smashlab_auth'

/** هل ضُبطت كلمة سر اللوحة في البيئة؟ */
export const isPasswordConfigured = Boolean(PASSWORD)

/**
 * تجزئة بسيطة (FNV-1a) — لتفادي تخزين كلمة السر الصريحة في localStorage،
 * ولإبطال الجلسات القديمة تلقائياً إن تغيّرت كلمة السر في البيئة.
 * ليست تجزئة تشفيرية؛ الغرض منها التخزين المحلي فقط.
 */
function hashToken(value: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16)
}

/** تتحقّق من تطابق كلمة السر المُدخلة مع المضبوطة في البيئة */
export function checkPassword(input: string): boolean {
  if (!PASSWORD) return false
  return input === PASSWORD
}

/** هل الجلسة الحالية مُصادَق عليها؟ (تُقرأ من localStorage) */
export function readStoredAuth(): boolean {
  if (!PASSWORD) return false
  try {
    return localStorage.getItem(AUTH_KEY) === hashToken(PASSWORD)
  } catch {
    return false
  }
}

/** تحفظ علامة الدخول بعد نجاح كلمة السر */
export function saveAuth(): void {
  if (!PASSWORD) return
  try {
    localStorage.setItem(AUTH_KEY, hashToken(PASSWORD))
  } catch {
    /* تجاهل أخطاء التخزين (وضع التصفّح الخاص مثلاً) */
  }
}

/** تمسح علامة الدخول (تسجيل الخروج) */
export function clearAuth(): void {
  try {
    localStorage.removeItem(AUTH_KEY)
  } catch {
    /* تجاهل */
  }
}
