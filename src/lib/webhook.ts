/**
 * إرسال الردود الجاهزة للزبون عبر webhook خارجي (n8n).
 * الرابط يأتي من متغيّر البيئة VITE_WEBHOOK_URL.
 */

const WEBHOOK_URL = import.meta.env.VITE_WEBHOOK_URL as string | undefined

/** هل تمّت تهيئة رابط الـ webhook؟ */
export const isWebhookConfigured = Boolean(WEBHOOK_URL)

/**
 * يرسل رسالة نصية لرقم الزبون.
 * يرمي خطأً عند فشل الإرسال أو غياب الرابط حتى تعالجه الواجهة.
 */
export async function sendCustomerReply(
  phone: string,
  message: string,
): Promise<void> {
  if (!WEBHOOK_URL) {
    throw new Error('رابط الـ webhook (VITE_WEBHOOK_URL) غير مهيّأ')
  }

  const res = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, message }),
  })

  if (!res.ok) {
    throw new Error(`فشل إرسال الرد (HTTP ${res.status})`)
  }
}
