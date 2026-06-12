# CLAUDE.md — مرجع المشروع لـ Claude

## ما هو هذا المشروع؟

لوحة إدارة طلبات واتساب لحظية لمطعم **سماش لاب**.
الموظف يفتحها على شاشة المطبخ ويدير الطلبات الواردة عبر واتساب.

- **Stack:** React 18 + TypeScript + Vite + Tailwind CSS
- **DB:** Supabase (project: `smash-menu`) — Realtime مفعّل
- **Messaging:** n8n webhook يرسل رسائل واتساب للزبائن (`VITE_WEBHOOK_URL`)
- **Icons:** lucide-react
- **Fonts:** Cairo / Tajawal (Arabic RTL)

---

## حالات الطلب (OrderStatus)

```
new → preparing → ready → on_the_way → delivered
                                      ↘ cancelled (في أي وقت)
```

| الحالة | اللون | المعنى |
|--------|-------|--------|
| `new` | brand (blue) | طلب جديد لم يُتخذ قرار بشأنه |
| `preparing` | amber | دخل المطبخ |
| `ready` | emerald | جاهز للاستلام/التوصيل |
| `on_the_way` | orange | خرج للتوصيل |
| `delivered` | sky | وصل للزبون |
| `cancelled` | zinc | ملغي |

---

## الملفات الأساسية وما يفعله كل منها

| الملف | الوظيفة |
|-------|---------|
| [src/types.ts](src/types.ts) | أنواع TypeScript: `OrderStatus`, `Order`, `TabKey` |
| [src/lib/constants.ts](src/lib/constants.ts) | `STATUS_META` (ألوان/تسميات) + `STATUS_FLOW` + `TABS` + `QUICK_REPLIES` |
| [src/lib/api.ts](src/lib/api.ts) | كل دوال Supabase: `updateOrderStatus`, `updatePrepTime`, إلخ |
| [src/lib/supabase.ts](src/lib/supabase.ts) | عميل Supabase (anon key) |
| [src/lib/webhook.ts](src/lib/webhook.ts) | `sendCustomerReply(phone, message)` — POST للـ n8n webhook |
| [src/lib/utils.ts](src/lib/utils.ts) | `parseItems`, تنسيق الوقت والهاتف والشيكل |
| [src/lib/sound.ts](src/lib/sound.ts) | تنبيهات صوتية عبر Web Audio API |
| [src/hooks/useOrders.ts](src/hooks/useOrders.ts) | جلب الطلبات + Realtime subscription |
| [src/hooks/useSettings.ts](src/hooks/useSettings.ts) | جلب إعدادات المطعم + Realtime |
| [src/components/StatusButtons.tsx](src/components/StatusButtons.tsx) | أزرار تغيير الحالة — يقرأ من `STATUS_FLOW` و`STATUS_META` |
| [src/components/StatusBadge.tsx](src/components/StatusBadge.tsx) | شارة الحالة الملونة |
| [src/components/StatusTabs.tsx](src/components/StatusTabs.tsx) | تبويبات الفلترة — يقرأ من `TABS` |
| [src/components/OrderCard.tsx](src/components/OrderCard.tsx) | بطاقة الطلب الكاملة |
| [src/components/TimeButtons.tsx](src/components/TimeButtons.tsx) | أزرار وقت التحضير (15/20/25/30/40/60 دقيقة) |
| [src/components/BusyModeBar.tsx](src/components/BusyModeBar.tsx) | شريط وضع الضغط العلوي |
| [src/components/StateViews.tsx](src/components/StateViews.tsx) | حالات التحميل / الخطأ / الفراغ |
| [src/App.tsx](src/App.tsx) | الحالة الكاملة: فلترة + ترتيب + `handleStatusChange` + `buildStatusMessage` |

---

## كيف تضيف حالة جديدة؟

1. **[src/types.ts](src/types.ts)** — أضف قيمة لـ `OrderStatus` (وربما `TabKey`)
2. **[src/lib/constants.ts](src/lib/constants.ts)** — أضف مفتاحاً في `STATUS_META` (label + ألوان) + أضفها في `STATUS_FLOW` بالترتيب الصحيح + أضف tab في `TABS`
3. **[src/components/StatusButtons.tsx](src/components/StatusButtons.tsx)** — أضف أيقونة في `STATUS_ICON`
4. **[src/App.tsx](src/App.tsx)** — أضف `case` في `buildStatusMessage` إن أردت رسالة واتساب تلقائية

---

## تدفق تحديث الحالة

```
الموظف يضغط الزر
  → onChange(status)  [StatusButtons]
  → handleStatusChange(id, status)  [App.tsx]
      ├─ patchOrder(id, {status})   // تحديث UI فوراً (optimistic)
      ├─ updateOrderStatus(id, status)  // Supabase update
      └─ buildStatusMessage → sendCustomerReply  // واتساب عبر n8n webhook
```

إن فشل Supabase → rollback عبر `refetchOrders()`.
إن فشل الواتساب → يُسجَّل `message_sent = false` في Supabase للمتابعة.

---

## رسائل الواتساب التلقائية (`buildStatusMessage` في App.tsx)

| الحالة | الرسالة |
|--------|---------|
| `preparing` | طلبك دخل المطبخ وعم يتحضر، ما رح يطول. |
| `ready` (توصيل) | طلبك جاهز وصار بالطريق! |
| `ready` (استلام) | طلبك جاهز وبتقدر تستلمو من المطعم. |
| `on_the_way` | طلبك في الطريق وبوصلك هلأ! |
| `cancelled` | معلش، اضطررنا نلغي طلبك. اتصل فينا لو بدك تعرف أكثر. |
| باقي الحالات | لا رسالة |

---

## ألوان Tailwind المخصصة

- `brand-*` — الأزرق الأساسي
- `coal-*` — الرمادي الداكن (خلفيات البطاقات)
- `flame-*` — أحمر/برتقالي (زر الإلغاء)

---



## متغيرات البيئة (`.env`)

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
VITE_WEBHOOK_URL=https://your-n8n-instance/webhook/...
```

---

## أوامر التطوير

```bash
npm run dev        # خادم التطوير
npm run build      # بناء الإنتاج
npm run typecheck  # فحص TypeScript فقط
```
