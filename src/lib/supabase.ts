import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * نتحقق من وجود المفاتيح بدل أن ينهار التطبيق بصمت.
 * إن كانت ناقصة، نعرض رسالة واضحة في الواجهة (انظر App).
 */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

if (!isSupabaseConfigured) {
  // تحذير مفيد أثناء التطوير
  console.warn(
    '[سماش لاب] متغيرات Supabase غير مضبوطة. انسخ .env.example إلى .env وضع VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY.',
  )
}

/**
 * عميل Supabase باستخدام المفتاح العام (anon) فقط — آمن للمتصفّح.
 * لا تستخدم service_role هنا إطلاقاً.
 */
export const supabase = createClient(
  supabaseUrl ?? 'http://localhost',
  supabaseAnonKey ?? 'public-anon-key',
  {
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  },
)

/** اسم جدول الطلبات */
export const ORDERS_TABLE = 'orders'
/** اسم جدول الإعدادات */
export const SETTINGS_TABLE = 'restaurant_settings'
/** معرّف صف الإعدادات الوحيد */
export const SETTINGS_ROW_ID = 1
/** اسم جدول رسائل المحادثات */
export const MESSAGES_TABLE = 'messages'
/** اسم جدول ملاحظات الزبائن الداخلية */
export const NOTES_TABLE = 'customer_notes'
/** اسم جدول المحادثات الموقوفة (تدخّل بشري) */
export const PAUSED_SESSIONS_TABLE = 'paused_sessions'
