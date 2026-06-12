import {
  supabase,
  ORDERS_TABLE,
  SETTINGS_TABLE,
  SETTINGS_ROW_ID,
} from './supabase'
import { CONFIRMED_TIMES } from './constants'
import type { OrderStatus, TimeStatus } from '../types'

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
