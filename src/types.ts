// ===== أنواع البيانات المشتركة عبر التطبيق =====

/** حالات الطلب الممكنة في عمود status */
export type OrderStatus =
  | 'new'
  | 'preparing'
  | 'ready'
  | 'on_the_way'
  | 'delivered'
  | 'cancelled'

/** حالة وقت التحضير في عمود time_status */
export type TimeStatus = 'none' | 'pending' | 'confirmed'

/** نوع التوصيل كما يصل من واتساب داخل حقل items */
export type DeliveryType = 'توصيل' | 'استلام' | string

/** الشكل المتوقّع بعد JSON.parse لحقل items النصي */
export interface ParsedItems {
  summary?: string
  delivery_type?: DeliveryType
  address?: string
}

/** صف الطلب كما هو في جدول orders */
export interface Order {
  id: string
  customer_phone: string
  customer_name: string | null
  /** نص JSON — يُفك عبر parseItems */
  items: string | null
  total: number | null
  status: OrderStatus
  prep_time: number | null
  time_status: TimeStatus | null
  customer_asked: boolean | null
  /** false عندما يفشل إرسال رسالة الواتساب رغم تحديث الطلب (tracking) */
  message_sent?: boolean | null
  created_at: string
}

/** صف إعدادات المطعم (صف واحد id=1) */
export interface RestaurantSettings {
  id: number
  busy_mode: boolean
  busy_delay: number | null
  general_wait_time: number | null
  /** عند true: البوت موقوف عن كل الزبائن (تدخّل بشري كامل) */
  bot_globally_paused?: boolean | null
}

/** سبب إيقاف محادثة في جدول paused_sessions */
export type PauseReason = 'customer_request' | 'manual' | string

/**
 * محادثة موقوفة — البوت لا يرد على هذا الرقم حتى يُحذف الصف.
 * المفتاح الأساسي هو customer_phone.
 */
export interface PausedSession {
  customer_phone: string
  paused_at: string
  reason: PauseReason
}

/** قيمة التبويبات — الكل بالإضافة إلى الحالات الرئيسية + الملغية */
export type TabKey = 'all' | 'new' | 'preparing' | 'ready' | 'on_the_way' | 'delivered' | 'cancelled'

/** اتجاه الرسالة: وارد من الزبون أو صادر من البوت/المطعم */
export type MessageDirection = 'in' | 'out'

/** صف رسالة محادثة كما هو في جدول messages */
export interface Message {
  id: string
  customer_phone: string
  customer_name: string | null
  direction: MessageDirection
  body: string | null
  created_at: string
}

/** ملاحظة داخلية عن زبون (لا تُرسَل له) كما في جدول customer_notes */
export interface CustomerNote {
  id: string
  customer_phone: string
  body: string
  created_at: string
}
