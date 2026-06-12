import type { OrderStatus, TabKey } from '../types'

/** بيانات عرض كل حالة: التسمية + أصناف الألوان */
export interface StatusMeta {
  label: string
  /** صنف للبادج/الشارة */
  badge: string
  /** صنف للزر النشط */
  activeBtn: string
  /** لون الحدّ الجانبي للبطاقة */
  cardAccent: string
  /** نقطة لونية صغيرة */
  dot: string
}

export const STATUS_META: Record<OrderStatus, StatusMeta> = {
  new: {
    label: 'جديد',
    badge: 'bg-brand-500/15 text-brand-300 ring-1 ring-brand-500/40',
    activeBtn: 'bg-brand-500 text-white shadow-lg shadow-brand-500/30',
    cardAccent: 'border-r-brand-500',
    dot: 'bg-brand-500',
  },
  preparing: {
    label: 'قيد التحضير',
    badge: 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/40',
    activeBtn: 'bg-amber-500 text-coal-950 shadow-lg shadow-amber-500/30',
    cardAccent: 'border-r-amber-500',
    dot: 'bg-amber-500',
  },
  ready: {
    label: 'جاهز',
    badge: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/40',
    activeBtn: 'bg-emerald-500 text-coal-950 shadow-lg shadow-emerald-500/30',
    cardAccent: 'border-r-emerald-500',
    dot: 'bg-emerald-500',
  },
  on_the_way: {
    label: 'في الطريق',
    badge: 'bg-orange-500/15 text-orange-300 ring-1 ring-orange-500/40',
    activeBtn: 'bg-orange-500 text-coal-950 shadow-lg shadow-orange-500/30',
    cardAccent: 'border-r-orange-500',
    dot: 'bg-orange-500',
  },
  delivered: {
    label: 'تم التسليم',
    badge: 'bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/40',
    activeBtn: 'bg-sky-500 text-white shadow-lg shadow-sky-500/30',
    cardAccent: 'border-r-sky-500',
    dot: 'bg-sky-500',
  },
  cancelled: {
    label: 'ملغي',
    badge: 'bg-zinc-500/15 text-zinc-400 ring-1 ring-zinc-500/40',
    activeBtn: 'bg-zinc-600 text-white',
    cardAccent: 'border-r-zinc-600',
    dot: 'bg-zinc-500',
  },
}

/** ترتيب الانتقال الطبيعي بين الحالات */
export const STATUS_FLOW: OrderStatus[] = [
  'new',
  'preparing',
  'ready',
  'on_the_way',
  'delivered',
]

/** التبويبات بالترتيب */
export const TABS: { key: TabKey; label: string }[] = [
  { key: 'all', label: 'الكل' },
  { key: 'new', label: 'جديد' },
  { key: 'preparing', label: 'قيد التحضير' },
  { key: 'ready', label: 'جاهز' },
  { key: 'on_the_way', label: 'في الطريق' },
  { key: 'delivered', label: 'تم التسليم' },
  { key: 'cancelled', label: 'ملغي' },
]

/** أزرار الوقت الجاهزة (بالدقائق) */
export const PREP_TIME_OPTIONS = [15, 20, 25, 30, 40, 60] as const

/** الأوقات التي تُؤكَّد مباشرة (طبيعية) — الباقي يحتاج موافقة الزبون */
export const CONFIRMED_TIMES = new Set<number>([15, 20, 25, 30])

/** خيارات مدة التأخير في وضع الضغط (بالدقائق) */
export const BUSY_DELAY_OPTIONS = [30, 45, 60] as const

/** خيارات وقت الانتظار العام للزبائن (بالدقائق) */
export const GENERAL_WAIT_TIME_OPTIONS = [15, 20, 30, 40, 60] as const

/** الأوقات التي تحتاج سؤال الزبون قبل تسجيل الطلب */
export const WAIT_TIME_NEEDS_CONFIRM = new Set<number>([40, 60])

/** رد جاهز يُرسَل للزبون عبر الـ webhook */
export interface QuickReply {
  /** مُعرّف ثابت لتتبّع حالة الزر */
  id: string
  /** التسمية على الزر */
  label: string
  /** نص الرسالة المُرسَلة للزبون (عربي فلسطيني ودود) */
  message: string
  /**
   * الحالة الجديدة للطلب عند الضغط (اختياري).
   * كل الردود تُصفّر customer_asked؛ وما له status منها يُحدّث الحالة أيضاً.
   */
  status?: OrderStatus
}

/** الردود الجاهزة المعروضة على كل بطاقة طلب */
export const QUICK_REPLIES: QuickReply[] = [
  {
    id: 'ready',
    label: 'الطلب جاهز',
    message: 'طلبك جاهز يا غالي، تفضل استلمه',
    status: 'ready',
  },
  {
    id: 'on_way',
    label: 'صار بالطريق',
    message: 'طلبك صار بالطريق، بيوصلك هلأ',
    status: 'ready',
  },
  { id: 'min5', label: '٥ دقايق', message: 'خمس دقايق وطلبك بكون جاهز' },
  { id: 'min10', label: '١٠ دقايق', message: 'عشر دقايق وبكون عندك' },
  { id: 'min15', label: 'ربع ساعة', message: 'ربع ساعة بكون طلبك جاهز' },
]
