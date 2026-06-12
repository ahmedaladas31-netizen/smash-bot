# 🍔 سماش لاب — لوحة إدارة طلبات واتساب اللحظية

لوحة تحكم احترافية لمطعم **سماش لاب** تعرض طلبات واتساب لحظياً، وتتيح لصاحب
المطعم إدارة الحالات وتحديد أوقات التحضير وتفعيل وضع الضغط — بواجهة عربية كاملة
باتجاه RTL ومناسبة لشاشة المطبخ.

> قاعدة البيانات على Supabase باسم المشروع **smash-menu**.

---

## ✨ المميزات

- **عرض لحظي** للطلبات عبر Supabase Realtime — أي طلب جديد يظهر فوراً بدون تحديث.
- **تنبيه صوتي (beep)** عند وصول طلب جديد + **وميض بصري** على البطاقة لثوانٍ.
- **تنبيه خاص** عندما يسأل الزبون عن طلبه (`customer_asked`) — جرس يهتزّ وإطار لافت.
- **بطاقة طلب غنية**: الاسم، الرقم، زر واتساب، تفاصيل الطلب، نوع التوصيل/الاستلام،
  العنوان، المجموع بالشيكل، الوقت النسبي، والحالة بلون مميز.
- **تغيير الحالة** بنقرة: جديد ← قيد التحضير ← جاهز ← تم التسليم + زر إلغاء.
- **أزرار وقت التحضير** الجاهزة (15/20/25/30/40/60):
  - `15–30` → تأكيد مباشر (`time_status = confirmed`).
  - `40/60` → بانتظار موافقة الزبون (`time_status = pending`).
- **وضع الضغط (Busy Mode)** مع اختيار مدة التأخير (30/45/60) وشريط علوي واضح.
- **تبويبات وعدّادات** حسب الحالة، مع إبراز الطلبات الجديدة والتي يسأل عنها الزبون.
- معالجة كاملة لحالات: التحميل / لا توجد طلبات / خطأ الاتصال / نقص الإعدادات.

---

## 🧱 الستاك التقني

React + Vite + TypeScript · Tailwind CSS · Supabase JS (Realtime) · lucide-react ·
خطوط Cairo / Tajawal من Google Fonts.

---

## 🚀 التشغيل السريع

```bash
# 1) تثبيت الحزم
npm install

# 2) إعداد المفاتيح
cp .env.example .env      # على ويندوز: copy .env.example .env
# ثم عدّل .env وضع قيم مشروعك

# 3) التشغيل
npm run dev
```

افتح الرابط الذي يظهر (افتراضياً http://localhost:5173).

---

## 🔑 متغيرات البيئة (`.env`)

من لوحة Supabase: **Project Settings → API**

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

> ⚠️ استخدم مفتاح **anon / public** فقط — لا تضع `service_role` في تطبيق متصفّح.
> ملف `.env` مُستبعد من Git تلقائياً.

---

## 🗄️ إعداد قاعدة البيانات

افتح **SQL Editor** في Supabase ونفّذ ما يلي مرة واحدة:

```sql
-- جدول الطلبات
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_phone text not null,
  customer_name  text,
  items          text,            -- نص JSON: { "summary", "delivery_type", "address" }
  total          numeric,
  status         text not null default 'new',  -- new | preparing | ready | delivered | cancelled
  prep_time      integer,
  time_status    text default 'none',          -- none | pending | confirmed
  customer_asked boolean default false,
  created_at     timestamptz not null default now()
);

-- جدول الإعدادات (صف واحد id = 1)
create table if not exists public.restaurant_settings (
  id         integer primary key,
  busy_mode  boolean not null default false,
  busy_delay integer not null default 30
);

insert into public.restaurant_settings (id, busy_mode, busy_delay)
values (1, false, 30)
on conflict (id) do nothing;
```

### تفعيل الوصول عبر anon key (RLS)

اللوحة لصاحب المطعم فقط وتعمل بمفتاح anon، لذا نفعّل RLS ونسمح بالقراءة والتحديث:

```sql
alter table public.orders enable row level security;
alter table public.restaurant_settings enable row level security;

-- قراءة وتحديث الطلبات
create policy "read orders"   on public.orders for select using (true);
create policy "update orders" on public.orders for update using (true) with check (true);
-- (اختياري) السماح بإضافة طلبات تجريبية من اللوحة:
-- create policy "insert orders" on public.orders for insert with check (true);

-- قراءة وتحديث الإعدادات
create policy "read settings"   on public.restaurant_settings for select using (true);
create policy "update settings" on public.restaurant_settings for update using (true) with check (true);
```

> 🔒 السياسات أعلاه مفتوحة لأن اللوحة خاصة بصاحب المطعم. إن أردت تأميناً أعلى،
> استخدم Supabase Auth واربط السياسات بمستخدم مُسجّل بدل `using (true)`.

### تفعيل Realtime

من لوحة Supabase: **Database → Replication → supabase_realtime** وفعّل الجدولين
`orders` و `restaurant_settings`. أو عبر SQL:

```sql
alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.restaurant_settings;
```

---

## 📦 صيغة حقل `items`

نص JSON يُفكّ داخل `try/catch` — وإن فشل التحليل يُعرض النص كما هو:

```json
{
  "summary": "2× سماش برجر دبل + بطاطا كبيرة + كولا",
  "delivery_type": "توصيل",
  "address": "شارع المدارس، عمارة 12، الطابق 2"
}
```

---

## 🛠️ أوامر مفيدة

```bash
npm run dev        # خادم التطوير
npm run build      # بناء للإنتاج (dist/)
npm run preview    # معاينة البناء
npm run typecheck  # فحص الأنواع فقط
```

---

## 🧩 هيكل المشروع

```
src/
├── components/        # مكوّنات الواجهة
│   ├── Header.tsx
│   ├── BusyModeBar.tsx
│   ├── BusyModeToggle.tsx
│   ├── StatusTabs.tsx
│   ├── OrderCard.tsx
│   ├── StatusBadge.tsx
│   ├── StatusButtons.tsx
│   ├── TimeButtons.tsx
│   └── StateViews.tsx
├── hooks/             # منطق البيانات اللحظي
│   ├── useOrders.ts
│   └── useSettings.ts
├── lib/               # الأدوات والثوابت
│   ├── supabase.ts    # عميل Supabase (anon)
│   ├── api.ts         # دوال التحديث
│   ├── constants.ts   # الحالات/الألوان/الأوقات
│   ├── utils.ts       # parseItems, الوقت, الهاتف, الشيكل
│   └── sound.ts       # تنبيه صوتي عبر Web Audio
├── types.ts
├── App.tsx            # التجميع: تنبيهات + فلترة + ترتيب
└── main.tsx
```

---

## 🔗 ملاحظة عن سير العمل (Workflow)

اللوحة تحدّث القيم في Supabase فقط (`prep_time`, `time_status`, الحالة، وضع الضغط).
يوجد **workflow منفصل** يقرأ هذه التغييرات ويرسل رسائل واتساب للزبون — اللوحة لا
ترسل الرسائل بنفسها.
