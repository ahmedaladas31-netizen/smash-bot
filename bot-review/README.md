# bot-review — مراجعة إنتاجية لبوت واتساب سماش لاب

نتائج المراجعة الشاملة لنظام الطلبات (n8n + GPT-4o + Supabase) بتاريخ 2026-06-12.

## الملفات

| الملف | المحتوى |
|-------|---------|
| [findings.md](findings.md) | **التقرير الكامل**: المشاكل الحرجة، التحسينات، خطة التنفيذ بالترتيب |
| [system-prompt-v2.txt](system-prompt-v2.txt) | البرومبت المحسّن — جاهز للصق في عقدة AI Agent في n8n |
| [system-prompt-current.txt](system-prompt-current.txt) | نسخة البرومبت الحالي بالإنتاج (مرجع للمقارنة) |
| [test-script.mjs](test-script.mjs) | سكريبت اختبار: 16 سيناريو محادثة زبون حقيقية مع فحوصات تلقائية |
| [menu-fixture.json](menu-fixture.json) | منيو تجريبي للاختبار — **استبدله بتصدير حقيقي من `full_menu_view`** |

## تشغيل الاختبارات

يتطلب Node 18+ ومفتاح OpenAI (نفس الموديل المستخدم بالإنتاج: gpt-4o).

```powershell
# PowerShell
$env:OPENAI_API_KEY = "sk-..."
node bot-review/test-script.mjs
```

```bash
# bash
OPENAI_API_KEY=sk-... node bot-review/test-script.mjs
```

### أوضاع مفيدة

```powershell
# مقارنة A/B: البرومبت الحالي مقابل المحسّن
node bot-review/test-script.mjs --prompt system-prompt-current.txt
node bot-review/test-script.mjs --prompt system-prompt-v2.txt

# إعادة إنتاج مشكلة الذاكرة (الإنتاج حالياً على النافذة الافتراضية = 5)
node bot-review/test-script.mjs --window 5 --only 1,2,15

# سيناريوهات محددة + حفظ المحاضر الكاملة
node bot-review/test-script.mjs --only 10,11,14 --save --verbose
```

- **PASS** = كل الفحوصات سليمة، **WARN** = ملاحظات أسلوبية (تُطبع للمراجعة)،
  **FAIL** = خرق قاعدة صلبة (ماركر مكسور، JSON غلط، طلب حُفظ والمطعم مسكّر...).
- الموديل غير حتمي — لو فشل سيناريو بشكل حدّي، أعد تشغيله مرة ثانية واقرأ
  المحضر المطبوع قبل الحكم.
- exit code = 1 عند وجود أي FAIL (مناسب لـ CI).

## ماذا يفحص السكريبت تلقائياً على كل رد؟

1. الماركرات: صيغة حرفية صحيحة، ماركر واحد كحد أقصى، في نهاية الرسالة، ولا
   ماركرات مخترعة/مكسورة (`[ORDR]`، `[X]`...).
2. سطر `[ORDER]`: JSON صالح، `total` رقم موجب، `delivery_type` حرفياً
   توصيل/استلام، عنوان إلزامي للتوصيل، اسم غير فارغ، لا نص بعد الـ JSON.
3. الأسلوب: لا إيموجي، لا markdown، طول الرد ضمن المعقول.
4. منطق كل سيناريو: لا `[ORDER]` قبل اكتمال المعلومات أو أثناء الإغلاق أو قبل
   موافقة الزبون وقت الضغط، `[ASK_STATUS]`/`[ASK_TIME]`/`[CANCEL_ORDER]` في
   محلها الصحيح، إلخ.

## تطبيق البرومبت الجديد

انسخ محتوى `system-prompt-v2.txt` كاملاً والصقه في n8n:
**My workflow 2 ← عقدة AI Agent ← Options ← System Message** (استبدال كامل).
قبل اللصق راجع النقطتين الناقصتين في نهاية القسم 4 من findings.md
(موقع المطعم وطرق الدفع) وأضفهما إن أردت.

> مهم: البرومبت v2 يحل جزءاً من المشاكل فقط — مشاكل الـ workflow الحرجة
> (القسم 1 في findings.md) تحتاج تعديلات في n8n نفسه ولا يحلها البرومبت.
