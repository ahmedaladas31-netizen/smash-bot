import { useEffect, useMemo, useState } from 'react'
import {
  Check,
  Eye,
  EyeOff,
  FolderPlus,
  HelpCircle,
  Loader2,
  Pencil,
  Plus,
  Tag,
  Trash2,
  X,
} from 'lucide-react'
import { useFaq } from '../hooks/useFaq'
import { addFaq, deleteFaq, updateFaq } from '../lib/api'
import { ErrorState } from './StateViews'
import { cx } from '../lib/utils'
import type { FaqItem } from '../types'

/** مفتاح الفئة للأسئلة بلا فئة */
const UNCATEGORIZED = 'بدون فئة'

/** مفتاح فئة السؤال للعرض (يعالج null/الفراغ) */
function catKey(item: FaqItem): string {
  return item.category?.trim() || UNCATEGORIZED
}

/** يحوّل اسم الفئة المعروض إلى قيمة التخزين (UNCATEGORIZED → null) */
function toStored(category: string): string | null {
  return category === UNCATEGORIZED ? null : category
}

/**
 * صفحة إدارة الأسئلة الشائعة: عرض مقسّم بالفئات + إضافة/تعديل/حذف/تفعيل.
 * مستقلّة بذاتها (تستخدم useFaq داخلياً) على غرار ConversationCenter.
 */
export default function FaqManager() {
  const { items, loading, error, refetch, upsertLocal, patchLocal, removeLocal } =
    useFaq()

  // فئات أُنشئت في الجلسة ولا تحتوي أسئلة بعد
  const [extraCategories, setExtraCategories] = useState<string[]>([])
  // الفئة التي يظهر فيها نموذج الإضافة حالياً
  const [addingCategory, setAddingCategory] = useState<string | null>(null)
  // إدخال اسم فئة جديدة (null = غير ظاهر)
  const [newCategory, setNewCategory] = useState<string | null>(null)

  // الفئات المعروضة: من البيانات + المُضافة في الجلسة
  const categories = useMemo(() => {
    const set = new Set<string>()
    for (const it of items) set.add(catKey(it))
    for (const c of extraCategories) set.add(c)
    return [...set].sort((a, b) => a.localeCompare(b, 'ar'))
  }, [items, extraCategories])

  const itemsByCategory = useMemo(() => {
    const map = new Map<string, FaqItem[]>()
    for (const it of items) {
      const key = catKey(it)
      const arr = map.get(key)
      if (arr) arr.push(it)
      else map.set(key, [it])
    }
    return map
  }, [items])

  // ===== الطفرات (تحديث متفائل + كتابة Supabase) =====
  const handleAdd = async (
    question: string,
    answer: string,
    category: string | null,
  ) => {
    try {
      const created = await addFaq({ question, answer, category })
      upsertLocal(created)
      setAddingCategory(null)
    } catch (e) {
      console.error('[FaqManager] فشل إضافة السؤال:', e)
      alert('تعذّرت إضافة السؤال، حاول مرة أخرى.')
    }
  }

  const handleUpdate = async (id: number, patch: Partial<FaqItem>) => {
    patchLocal(id, patch)
    try {
      await updateFaq(id, patch)
    } catch (e) {
      console.error('[FaqManager] فشل تعديل السؤال:', e)
      await refetch()
      alert('تعذّر حفظ التعديل، حاول مرة أخرى.')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('حذف هذا السؤال نهائياً؟')) return
    removeLocal(id)
    try {
      await deleteFaq(id)
    } catch (e) {
      console.error('[FaqManager] فشل حذف السؤال:', e)
      await refetch()
      alert('تعذّر حذف السؤال، حاول مرة أخرى.')
    }
  }

  const handleAddCategory = () => {
    const name = newCategory?.trim()
    if (name && !categories.includes(name)) {
      setExtraCategories((prev) => [...prev, name])
      setAddingCategory(name)
    }
    setNewCategory(null)
  }

  if (error === 'config') {
    return (
      <p className="rounded-xl bg-coal-800 p-6 text-center text-zinc-300">
        إعدادات Supabase غير مضبوطة.
      </p>
    )
  }
  if (error) return <ErrorState onRetry={refetch} />

  return (
    <div className="space-y-4">
      {/* ترويسة الصفحة + فئة جديدة */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-flame-700 text-white">
            <HelpCircle className="h-6 w-6" />
          </div>
          <div>
            <div className="text-lg font-extrabold leading-tight">
              الأسئلة الشائعة
            </div>
            <div className="text-sm font-semibold text-zinc-400">
              يستخدمها البوت للرد على الزبائن
            </div>
          </div>
        </div>

        {newCategory === null ? (
          <button
            type="button"
            onClick={() => setNewCategory('')}
            className="inline-flex items-center gap-2 rounded-xl bg-coal-800 px-4 py-2 text-sm font-bold text-zinc-200 ring-1 ring-coal-700 transition-colors hover:bg-coal-700 active:scale-95"
          >
            <FolderPlus className="h-4 w-4" />
            فئة جديدة
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              type="text"
              value={newCategory}
              placeholder="اسم الفئة"
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddCategory()
                if (e.key === 'Escape') setNewCategory(null)
              }}
              className="w-48 rounded-xl border border-coal-700 bg-coal-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
            />
            <button
              type="button"
              onClick={handleAddCategory}
              className="inline-flex items-center justify-center rounded-xl bg-brand-500 p-2 text-white transition-colors hover:bg-brand-400 active:scale-95"
              title="إضافة الفئة"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setNewCategory(null)}
              className="inline-flex items-center justify-center rounded-xl bg-coal-800 p-2 text-zinc-300 ring-1 ring-coal-700 transition-colors hover:bg-coal-700 active:scale-95"
              title="إلغاء"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* المحتوى */}
      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-zinc-400">
          <Loader2 className="h-10 w-10 animate-spin text-brand-500" />
          <p className="text-lg font-bold">جارٍ تحميل الأسئلة…</p>
        </div>
      ) : categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-zinc-500">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-coal-800 ring-1 ring-coal-700">
            <HelpCircle className="h-10 w-10" />
          </div>
          <p className="text-lg font-bold">لا أسئلة بعد</p>
          <p className="text-sm">أضف فئة جديدة ثم سؤالاً للبدء</p>
        </div>
      ) : (
        <div className="space-y-4">
          {categories.map((cat) => (
            <CategoryBlock
              key={cat}
              category={cat}
              items={itemsByCategory.get(cat) ?? []}
              categories={categories}
              isAdding={addingCategory === cat}
              onStartAdd={() => setAddingCategory(cat)}
              onCancelAdd={() => setAddingCategory(null)}
              onAdd={handleAdd}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/** بلوك فئة واحدة */
function CategoryBlock({
  category,
  items,
  categories,
  isAdding,
  onStartAdd,
  onCancelAdd,
  onAdd,
  onUpdate,
  onDelete,
}: {
  category: string
  items: FaqItem[]
  categories: string[]
  isAdding: boolean
  onStartAdd: () => void
  onCancelAdd: () => void
  onAdd: (question: string, answer: string, category: string | null) => void
  onUpdate: (id: number, patch: Partial<FaqItem>) => void
  onDelete: (id: number) => void
}) {
  return (
    <section className="rounded-2xl border border-coal-700 bg-coal-800/60 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-brand-400" />
          <h2 className="text-base font-extrabold text-zinc-100">{category}</h2>
          <span className="nums rounded-md bg-coal-700 px-2 py-0.5 text-xs font-bold text-zinc-300">
            {items.length}
          </span>
        </div>
        {!isAdding && (
          <button
            type="button"
            onClick={onStartAdd}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500/15 px-3 py-1.5 text-sm font-bold text-brand-300 ring-1 ring-brand-500/40 transition-colors hover:bg-brand-500/25 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            إضافة سؤال
          </button>
        )}
      </div>

      {isAdding && (
        <FaqAddForm
          categories={categories}
          defaultCategory={category}
          onSubmit={onAdd}
          onCancel={onCancelAdd}
        />
      )}

      {items.length === 0 && !isAdding ? (
        <p className="py-2 text-sm text-zinc-500">لا أسئلة في هذه الفئة بعد.</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <FaqRow
              key={item.id}
              item={item}
              categories={categories}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </section>
  )
}

/** نموذج إضافة سؤال جديد */
function FaqAddForm({
  categories,
  defaultCategory,
  onSubmit,
  onCancel,
}: {
  categories: string[]
  defaultCategory: string
  onSubmit: (question: string, answer: string, category: string | null) => void
  onCancel: () => void
}) {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [category, setCategory] = useState(defaultCategory)

  const canSubmit = question.trim() !== '' && answer.trim() !== ''

  const submit = () => {
    if (!canSubmit) return
    onSubmit(question.trim(), answer.trim(), toStored(category))
  }

  return (
    <div className="mb-3 space-y-2 rounded-xl border border-brand-500/30 bg-coal-900/60 p-3">
      <input
        autoFocus
        type="text"
        value={question}
        placeholder="السؤال"
        onChange={(e) => setQuestion(e.target.value)}
        className="w-full rounded-lg border border-coal-700 bg-coal-900 px-3 py-2 text-sm font-bold text-zinc-100 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
      />
      <textarea
        value={answer}
        placeholder="الجواب"
        rows={2}
        onChange={(e) => setAnswer(e.target.value)}
        className="w-full resize-y rounded-lg border border-coal-700 bg-coal-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
      />
      <div className="flex items-center justify-between gap-2">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg border border-coal-700 bg-coal-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-brand-500"
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-400 active:scale-95 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            إضافة
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center justify-center rounded-lg bg-coal-800 p-2 text-zinc-300 ring-1 ring-coal-700 transition-colors hover:bg-coal-700 active:scale-95"
            title="إلغاء"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

/** صف سؤال واحد — عرض/تعديل inline */
function FaqRow({
  item,
  categories,
  onUpdate,
  onDelete,
}: {
  item: FaqItem
  categories: string[]
  onUpdate: (id: number, patch: Partial<FaqItem>) => void
  onDelete: (id: number) => void
}) {
  const [editing, setEditing] = useState(false)
  const [question, setQuestion] = useState(item.question)
  const [answer, setAnswer] = useState(item.answer)

  // مزامنة المسودّات إن تغيّر الصف من مصدر آخر
  useEffect(() => {
    setQuestion(item.question)
    setAnswer(item.answer)
  }, [item.question, item.answer])

  const commitQuestion = () => {
    const next = question.trim()
    if (next && next !== item.question) onUpdate(item.id, { question: next })
    else setQuestion(item.question)
  }

  const commitAnswer = () => {
    const next = answer.trim()
    if (next && next !== item.answer) onUpdate(item.id, { answer: next })
    else setAnswer(item.answer)
  }

  return (
    <div
      className={cx(
        'rounded-xl bg-coal-900/60 p-3 ring-1 ring-coal-700 transition-opacity',
        !item.active && 'opacity-60',
      )}
    >
      {editing ? (
        <div className="space-y-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onBlur={commitQuestion}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur()
            }}
            className="w-full rounded-lg border border-coal-700 bg-coal-900 px-3 py-2 text-sm font-bold text-zinc-100 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
          />
          <textarea
            value={answer}
            rows={2}
            onChange={(e) => setAnswer(e.target.value)}
            onBlur={commitAnswer}
            className="w-full resize-y rounded-lg border border-coal-700 bg-coal-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
          />
          <div className="flex items-center justify-between gap-2">
            <select
              value={catKey(item)}
              onChange={(e) =>
                onUpdate(item.id, { category: toStored(e.target.value) })
              }
              className="rounded-lg border border-coal-700 bg-coal-900 px-3 py-1.5 text-sm text-zinc-100 outline-none focus:border-brand-500"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-bold text-white transition-colors hover:bg-emerald-500 active:scale-95"
            >
              <Check className="h-4 w-4" />
              تم
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-bold text-zinc-100">{item.question}</p>
            <p className="mt-1 whitespace-pre-line break-words text-sm text-zinc-300">
              {item.answer}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {/* تفعيل/إخفاء */}
            <button
              type="button"
              onClick={() => onUpdate(item.id, { active: !item.active })}
              title={item.active ? 'ظاهر للبوت — اضغط للإخفاء' : 'مخفي — اضغط للإظهار'}
              className={cx(
                'inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-bold ring-1 transition-colors',
                item.active
                  ? 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/40 hover:bg-emerald-500/25'
                  : 'bg-zinc-500/15 text-zinc-400 ring-zinc-600/40 hover:bg-zinc-500/25',
              )}
            >
              {item.active ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">
                {item.active ? 'ظاهر' : 'مخفي'}
              </span>
            </button>
            {/* تعديل */}
            <button
              type="button"
              onClick={() => setEditing(true)}
              title="تعديل"
              className="inline-flex items-center justify-center rounded-lg p-2 text-zinc-400 transition-colors hover:bg-coal-700 hover:text-brand-300"
            >
              <Pencil className="h-4 w-4" />
            </button>
            {/* حذف */}
            <button
              type="button"
              onClick={() => onDelete(item.id)}
              title="حذف"
              className="inline-flex items-center justify-center rounded-lg p-2 text-zinc-400 transition-colors hover:bg-flame-500/10 hover:text-flame-400"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
