-- ============================================================
-- مركز المحادثات + الملاحظات الداخلية — إعداد قاعدة البيانات
-- شغّل هذا الملف مرة واحدة في Supabase: SQL Editor → New query → Run
-- (إنشاء الجداول يحتاج صلاحيات عالية، فلا يصير من مفتاح anon)
-- ============================================================

-- جدول رسائل المحادثة (وارد من الزبون + صادر من البوت/المطعم)
create table if not exists public.messages (
  id             uuid primary key default gen_random_uuid(),
  customer_phone text not null,
  customer_name  text,
  direction      text not null check (direction in ('in','out')),
  body           text,
  created_at     timestamptz not null default now()
);
create index if not exists messages_phone_created_idx
  on public.messages (customer_phone, created_at desc);

-- جدول الملاحظات الداخلية عن الزبائن (لا تُرسَل للزبون)
create table if not exists public.customer_notes (
  id             uuid primary key default gen_random_uuid(),
  customer_phone text not null,
  body           text not null,
  created_at     timestamptz not null default now()
);
create index if not exists customer_notes_phone_created_idx
  on public.customer_notes (customer_phone, created_at desc);

-- تفعيل الـ Realtime ليظهر كل شي لحظياً في الداشبورد
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.customer_notes;

-- RLS: سياسات متساهلة تطابق وضع جدول orders الحالي (لوحة داخلية).
-- messages: قراءة + إدراج (n8n يكتب، الداشبورد يقرأ فقط).
-- customer_notes: CRUD كامل (الداشبورد يضيف/يحذف).
alter table public.messages enable row level security;
alter table public.customer_notes enable row level security;

create policy "read messages"   on public.messages       for select using (true);
create policy "insert messages" on public.messages       for insert with check (true);
create policy "all notes"       on public.customer_notes  for all    using (true) with check (true);

-- تحقّق سريع (اختياري): إدراج رسالة تجريبية ثم حذفها
-- insert into public.messages (customer_phone, customer_name, direction, body)
--   values ('970000000000', 'تجربة', 'in', 'مرحبا');
-- delete from public.messages where customer_phone = '970000000000';
