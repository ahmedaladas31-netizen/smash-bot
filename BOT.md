# BOT.md — مرجع بوت واتساب وn8n (سماش لاب)

> هذا الملف خاص بـ **البوت والـ workflows** (مش الداشبورد — الداشبورد في [CLAUDE.md](CLAUDE.md)).
> الهدف: أي محادثة جاية تفهم سياق البوت بدون شرح من الصفر.
> البوت مش داخل هذا الريبو — هو في n8n، ويُدار عبر **n8n MCP tools** و**Supabase MCP tools**.

---

## نظرة عامة

بوت واتساب لاستقبال طلبات مطعم سماش لاب وإدارة محادثات الزبائن آلياً عبر ذكاء اصطناعي، ويكتب الطلبات في نفس قاعدة بيانات الداشبورد.

- **n8n:** `n8n.srv1756180.hstgr.cloud`
- **Supabase:** project `zupqwyjgmjnwtsosfynd` (نفس قاعدة بيانات الداشبورد)
- **الموديل:** `gpt-4.1` (موديل سريع غير تفكيري — تحوّلنا من `gpt-5` لأنه كان بطيء ~25 ثانية/رد؛ صار ~3 ثوان)
- **الإخراج:** يرسل واتساب عبر n8n WhatsApp node، وينبّه المالك عبر Telegram عند الطلبات/الأخطاء

---

## المعمارية: تجميع الرسائل (الأهم)

المشكلة المحلولة: الزبون يبعت كذا رسالة ورا بعض → كان يرد على كل وحدة لحالها. الحل: **فصل الاستقبال عن المعالجة** عبر طابور في DB.

```
استقبال (لكل رسالة):  WhatsApp Trigger → Filter (نص فقط) → Log Inbound + Insert To Buffer (ready_at = now+6s)
                                                                            ↓ طابور DB
معالج (كل 3 ثوان):    Schedule → claim_smash_batch() → Execute Workflow → release_smash_lock()
                                                ↓ يمرّر phone + combinedText + customerName
محرك (نفس بوت mine-smash): Execute Workflow Trigger → Check Paused → AI Agent → توجيه الماركرات → الردود
```

- **القفل** (`smash_locks`) يسلسل رسائل الزبون الواحد (الجديدة تنتظر حتى يُرسَل رد دفعته)، ويوازي بين زبائن مختلفين. تنظيف تلقائي للأقفال >دقيقتين كـ backstop.
- التفاصيل الكاملة (node-by-node + كل الـ gotchas) في السكِل: `~/.claude/skills/restaurant-bot/architecture.md`.

---

## الـ workflows (n8n)

| الاسم | ID | الوظيفة |
|------|----|---------|
| **mine-smash bot** | `2gnzhRzekGBzY2oQ` | الاستقبال **+** المحرك (فرعان مستقلان: WhatsApp Trigger للاستقبال، Execute Workflow Trigger للمعالجة) |
| **Smash Lab - Batch Processor** | `ZRbMvhT01mXGooHa` | المعالج: Schedule كل 3 ثوان → claim → يستدعي المحرك → release |
| **Smash Lab — Error Handler** | `O6AHHpZA53ViPn4x` | مُعالج الأخطاء (errorWorkflow للبوت): تنبيه Telegram + رسالة "ثواني بس" للزبون |
| **Smash Lab - Send Messages** | `np7HenENktJj3AtU` | جسر إرسال للداشبورد (webhook `/webhook/smash-send`، يُستعمل من `VITE_WEBHOOK_URL`) |
| ~~Smash Lab - Error~~ | `y3pT6EmqDcQjijPJ` | **مؤرشف** (ميت، استُبدل بالـ Error Handler) |

---

## قاعدة البيانات (Supabase `zupqwyjgmjnwtsosfynd`)

طبقة التجميع (الأساس):
- `smash_buffer` (id تسلسلي, customer_phone, body, created_at, ready_at)
- `smash_locks` (customer_phone PK, locked_at)
- `claim_smash_batch()` → تُرجع `claimed_phone` + `combined_text` (ذرّية: FOR UPDATE SKIP LOCKED، تجمّع بـ string_agg، تحذف الطابور، تقفل، تنظّف الأقفال الميتة)
- `release_smash_lock(text)` → تحرّر القفل
- **RLS:** سياسات `{public}` ALL على الجدولين → مفتاح anon يعمل عبر PostgREST RPC (لا حاجة SECURITY DEFINER)

جداول أخرى يستعملها البوت: `messages` (سجل المحادثة in/out)، `orders` (الطلبات)، `restaurant_settings` (الدوام/الضغط/الإيقاف العام)، `menu_prices` (المنيو، 93 صنف)، `paused_sessions` (إيقاف زبون)، `faq`، `customer_notes`.

---

## المحرك: التدفق والماركرات

`Execute Workflow Trigger` (phone, combinedText, customerName) → **Check Paused** → **Get Restaurant Settings** → **AI Agent** (gpt-4.1 + أداة المنيو + أداة FAQ + ذاكرة 20) → الناتج يُفحص للماركرات ويُوجَّه:

| الماركر | المسار |
|--------|--------|
| `[SEND_MENU]` | إرسال صور المنيو |
| `[ORDER]{json}` | Parse Order (تحقق) → Dedup → Order Valid? → Save Order → تنبيه Telegram |
| `[ASK_STATUS]` | جلب آخر طلب → رد بالحالة |
| `[ASK_TIME]` | جلب الطلب → رد بوقت التحضير المتبقي |
| `[CANCEL_ORDER]` | إلغاء آخر طلب فعّال |
| بدون ماركر | رد عادي (تنظيف أي ماركر شارد ثم إرسال) |

- كل إرسال يتبعه عقدة **Log Out** تسجّل الرد في `messages`.
- **Parse Order** يعيد حساب `isOrderValid` + `missingPrompt` (يرفض حفظ طلب ناقص → ما في طلبات وهمية بصفر شيكل).
- بداية رسالة الـ AI Agent فيها هيدر محقون "حالة المطعم الآن (مفتوح/مسكّر) + وقت التحضير" محسوب من الإعدادات + التوقيت (Asia/Hebron).

البرومت الكامل (الكاشير) محفوظ كقالب معمّم في: `~/.claude/skills/restaurant-bot/system-prompt-template.md`.

---

## كيف تعدّل البوت (عبر n8n MCP)

- **قراءة:** `get_workflow_details(id)` (كبير — احفظه لملف واستخرج بـ node script بدل قراءته كامل).
- **تعديل عقدة:** `update_workflow` بعمليات ذرّية: `setNodeParameter` (JSON Pointer، **لا يدعم فهرسة المصفوفات** — عيّن المصفوفة كاملة)، `updateNodeParameters` (merge/replace)، `addNode`/`removeNode`/`addConnection`/`removeConnection`.
- **بعد التعديل لازم `publish_workflow(id)`** حتى يصير فعّالاً (النسخة الفعّالة منفصلة عن المسودّة).
- **بناء workflow جديد:** SDK code → `validate_workflow` → `create_workflow_from_code`.
- المراجع داخل العقد بالاسم: `$('Node Name').item.json...`.

---

## ⚠️ Gotchas حرجة (كلّفتنا ساعات)

1. **`fetch` غير معرّف في Code nodes** بهذه النسخة → استعمل `await this.helpers.httpRequest({method,url,headers,body,json:true})`. خطأ `fetch` المبتلَع بـ try/catch يبدو وكأنه "ما صار شي" (العلامة: العقدة تخلص بـ ~10ms).
2. **`Dedup Check` ما زال على `fetch` المعطّل** → كشف الطلب المكرر **غير فعّال حالياً** (fail-open). `Check Paused` تم إصلاحه (يستعمل httpRequest الآن، فالإيقاف اليدوي/التدخل البشري يعمل).
3. **التأخير = الموديل.** الموديلات التفكيرية (gpt-5) بطيئة 20-50 ثانية. كل tool call = نداء LLM إضافي (يضاعف الكمون). فكّر بحقن المنيو في البرومت بدل الأداة لو احتجت سرعة أكبر.
4. **curl على Windows يشوّه العربية** إلى `?` (0x3f) — استعمل `execute_sql` أو عقد n8n لإدخال بيانات اختبار عربية.
5. **n8n MCP لا يقدر** يضبط `onError`/`continueOnFail`/`alwaysOutputData` ولا ينشئ credentials — خطوات يدوية في الواجهة.
6. **توكن Telegram مكشوف** داخل URLs لعقد HTTP (Notify Human Needed / Telegram Notify / Error Handler) + مفتاح Supabase anon مكشوف بعدة Code nodes (anon عام). **لم يُنقل لـ credentials بعد** — يحتاج إنشاء credential يدوياً + يُفضّل تدوير توكن Telegram.

---

## الاعتمادات (n8n credentials الموجودة)

`OpenAI account`، `WhatsApp account` (+ `WhatsApp OAuth`)، `Supabase account` + `supabase postgres`، `Telegram demo bot`، `Bearer Auth account`. (الكثير من عقد Supabase تستعمل anon key inline بدل الـ credential — تنظيف مستقبلي.)

---

## بناء بوت لمطعم جديد

استعمل سكِل **`restaurant-bot`** (في `~/.claude/skills/restaurant-bot/`): اكتب `/restaurant-bot`. بتبحث عن أحدث الموديلات/التقنيات، بتسأل عن تفاصيل المطعم، وبتبني كل شي من الصفر بناءً على هذه المعمارية.

---

## مهام/تحسينات مفتوحة (غير منفّذة)

- نقل توكن Telegram لـ credential + تدويره (أمان).
- إصلاح `Dedup Check` (fetch → httpRequest) لو رجع كشف التكرار مطلوباً.
- تحسينات اختيارية ضد التكرار/البطء: حقن المنيو بالبرومت، فحص "تجاوُز" (إلغاء رد لو وصلت رسالة أحدث أثناء المعالجة).
- تحسين برومت تعدّد الأصناف (تجميع أسئلة النوع/الجرامات لكل الأصناف، عدم إعادة سرد الطلب بعد كل جواب).
