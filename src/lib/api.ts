import {
  supabase,
  ORDERS_TABLE,
  SETTINGS_TABLE,
  SETTINGS_ROW_ID,
  NOTES_TABLE,
  PAUSED_SESSIONS_TABLE,
  FAQ_TABLE,
} from './supabase'
import { CONFIRMED_TIMES } from './constants'
import type {
  CustomerNote,
  FaqItem,
  OrderStatus,
  PauseReason,
  PausedSession,
  RestaurantSettings,
  TimeStatus,
} from '../types'

/** حقول دوام المطعم القابلة للتحديث */
export type WorkingHoursPatch = Partial<
  Pick<
    RestaurantSettings,
    'weekday_open' | 'weekday_close' | 'friday_open' | 'friday_close'
  >
>

/** تغيير حالة الطلب */
export async function updateOrderStatus(id: string, status: OrderStatus) {
  const { error } = await supabase
    .from(ORDERS_TABLE)
    .update({ status })
    .eq('id', id)
  if (error) throw error
}

/**
 * تحديد وقت التحضير.
 * 15/20/25/30 → confirmed (يُبلَّغ الزبون مباشرة)
 * 40/60 → pending (نحتاج موافقة الزبون أولاً)
 */
export async function updatePrepTime(id: string, minutes: number) {
  const time_status: TimeStatus = CONFIRMED_TIMES.has(minutes)
    ? 'confirmed'
    : 'pending'
  const { error } = await supabase
    .from(ORDERS_TABLE)
    .update({ prep_time: minutes, time_status })
    .eq('id', id)
  if (error) throw error
}

/** إعادة ضبط علم customer_asked بعد أن يطّلع صاحب المطعم */
export async function acknowledgeCustomerAsked(id: string) {
  const { error } = await supabase
    .from(ORDERS_TABLE)
    .update({ customer_asked: false })
    .eq('id', id)
  if (error) throw error
}

/**
 * تطبيق رد جاهز على الطلب: تصفير customer_asked دائماً,
 * مع تحديث الحالة (status) عند تمريرها.
 */
export async function applyQuickReply(id: string, status?: OrderStatus) {
  const payload: { customer_asked: boolean; status?: OrderStatus } = {
    customer_asked: false,
  }
  if (status) payload.status = status
  const { error } = await supabase
    .from(ORDERS_TABLE)
    .update(payload)
    .eq('id', id)
  if (error) throw error
}

/**
 * تعليم الطلب بأن رسالة الواتساب لم تُرسَل (message_sent=false) —
 * يُستخدم عند نجاح تحديث الطلب وفشل الـ webhook، للتتبّع لاحقاً.
 */
export async function markMessageNotSent(id: string) {
  const { error } = await supabase
    .from(ORDERS_TABLE)
    .update({ message_sent: false })
    .eq('id', id)
  if (error) throw error
}

/** تفعيل/إلغاء وضع الضغط مع مدة التأخير */
export async function updateBusyMode(busy_mode: boolean, busy_delay?: number) {
  const payload: { busy_mode: boolean; busy_delay?: number } = { busy_mode }
  if (typeof busy_delay === 'number') payload.busy_delay = busy_delay
  const { error } = await supabase
    .from(SETTINGS_TABLE)
    .update(payload)
    .eq('id', SETTINGS_ROW_ID)
  if (error) throw error
}

/** تغيير مدة التأخير فقط */
export async function updateBusyDelay(busy_delay: number) {
  const { error } = await supabase
    .from(SETTINGS_TABLE)
    .update({ busy_delay })
    .eq('id', SETTINGS_ROW_ID)
  if (error) throw error
}

/** تغيير وقت الانتظار العام */
export async function updateGeneralWaitTime(general_wait_time: number) {
  const { error } = await supabase
    .from(SETTINGS_TABLE)
    .update({ general_wait_time })
    .eq('id', SETTINGS_ROW_ID)
  if (error) throw error
}

/** إيقاف/تشغيل البوت عن كل الزبائن (تدخّل بشري كامل) */
export async function updateBotGloballyPaused(bot_globally_paused: boolean) {
  const { error } = await supabase
    .from(SETTINGS_TABLE)
    .update({ bot_globally_paused })
    .eq('id', SETTINGS_ROW_ID)
  if (error) throw error
}

/** تحديث دوام المطعم (أي مجموعة من حقول الساعات) */
export async function updateWorkingHours(patch: WorkingHoursPatch) {
  const { error } = await supabase
    .from(SETTINGS_TABLE)
    .update(patch)
    .eq('id', SETTINGS_ROW_ID)
  if (error) throw error
}

// ===== المحادثات الموقوفة (تدخّل بشري) =====

/** جلب كل المحادثات الموقوفة مرتّبة من الأحدث للأقدم */
export async function fetchPausedSessions(): Promise<PausedSession[]> {
  const { data, error } = await supabase
    .from(PAUSED_SESSIONS_TABLE)
    .select('*')
    .order('paused_at', { ascending: false })
  if (error) throw error
  return (data as PausedSession[]) ?? []
}

/**
 * إيقاف البوت يدوياً عن زبون — إضافة/تحديث صف في paused_sessions.
 * upsert على المفتاح customer_phone حتى لا يفشل لو كان موقوفاً مسبقاً.
 */
export async function pauseSession(
  customer_phone: string,
  reason: PauseReason = 'manual',
) {
  const { error } = await supabase
    .from(PAUSED_SESSIONS_TABLE)
    .upsert(
      { customer_phone, reason, paused_at: new Date().toISOString() },
      { onConflict: 'customer_phone' },
    )
  if (error) throw error
}

/** فك إيقاف محادثة — حذف الصف ليعود البوت للرد على هذا الرقم */
export async function unpauseSession(customer_phone: string) {
  const { error } = await supabase
    .from(PAUSED_SESSIONS_TABLE)
    .delete()
    .eq('customer_phone', customer_phone)
  if (error) throw error
}

// ===== الملاحظات الداخلية عن الزبائن (لا تُرسَل للزبون) =====

/** جلب ملاحظات زبون مرتّبة من الأحدث للأقدم */
export async function fetchCustomerNotes(phone: string): Promise<CustomerNote[]> {
  const { data, error } = await supabase
    .from(NOTES_TABLE)
    .select('*')
    .eq('customer_phone', phone)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data as CustomerNote[]) ?? []
}

/** إضافة ملاحظة داخلية لزبون */
export async function addCustomerNote(phone: string, body: string) {
  const { error } = await supabase
    .from(NOTES_TABLE)
    .insert({ customer_phone: phone, body })
  if (error) throw error
}

/** حذف ملاحظة داخلية */
export async function deleteCustomerNote(id: string) {
  const { error } = await supabase.from(NOTES_TABLE).delete().eq('id', id)
  if (error) throw error
}

// ===== الأسئلة الشائعة (faq) =====

/** الحقول القابلة للتعديل في سؤال شائع */
export type FaqPatch = Partial<
  Pick<FaqItem, 'question' | 'answer' | 'category' | 'active'>
>

/** جلب كل الأسئلة الشائعة مرتّبة بالفئة ثم تاريخ الإنشاء */
export async function fetchFaq(): Promise<FaqItem[]> {
  const { data, error } = await supabase
    .from(FAQ_TABLE)
    .select('*')
    .order('category', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data as FaqItem[]) ?? []
}

/** إضافة سؤال جديد — يعيد الصف المُدرَج */
export async function addFaq(input: {
  question: string
  answer: string
  category: string | null
}): Promise<FaqItem> {
  const { data, error } = await supabase
    .from(FAQ_TABLE)
    .insert({ ...input, active: true })
    .select()
    .single()
  if (error) throw error
  return data as FaqItem
}

/** تعديل سؤال (السؤال/الجواب/الفئة/التفعيل) */
export async function updateFaq(id: number, patch: FaqPatch) {
  const { error } = await supabase.from(FAQ_TABLE).update(patch).eq('id', id)
  if (error) throw error
}

/** حذف سؤال */
export async function deleteFaq(id: number) {
  const { error } = await supabase.from(FAQ_TABLE).delete().eq('id', id)
  if (error) throw error
}
