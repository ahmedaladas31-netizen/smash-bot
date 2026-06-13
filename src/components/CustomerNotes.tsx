import { useCallback, useEffect, useState } from 'react'
import { Loader2, NotebookPen, Plus, Trash2 } from 'lucide-react'
import {
  addCustomerNote,
  deleteCustomerNote,
  fetchCustomerNotes,
} from '../lib/api'
import { formatRelativeTime } from '../lib/utils'
import type { CustomerNote } from '../types'

interface CustomerNotesProps {
  phone: string
}

/**
 * ملاحظات داخلية عن الزبون (مثل: "زبون دائم"). لا تُرسَل للزبون إطلاقاً —
 * تُخزَّن في جدول customer_notes وتظهر للموظف فقط.
 */
export default function CustomerNotes({ phone }: CustomerNotesProps) {
  const [notes, setNotes] = useState<CustomerNote[]>([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    if (!phone) return
    setLoading(true)
    try {
      setNotes(await fetchCustomerNotes(phone))
    } catch (e) {
      console.error('[CustomerNotes] فشل جلب الملاحظات:', e)
    } finally {
      setLoading(false)
    }
  }, [phone])

  useEffect(() => {
    load()
  }, [load])

  const handleAdd = async () => {
    const body = draft.trim()
    if (!body || saving) return
    setSaving(true)
    try {
      await addCustomerNote(phone, body)
      setDraft('')
      await load()
    } catch (e) {
      console.error('[CustomerNotes] فشل إضافة ملاحظة:', e)
      alert('تعذّر حفظ الملاحظة، حاول مرة أخرى.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    const prev = notes
    setNotes((n) => n.filter((x) => x.id !== id)) // تحديث متفائل
    try {
      await deleteCustomerNote(id)
    } catch (e) {
      console.error('[CustomerNotes] فشل حذف ملاحظة:', e)
      setNotes(prev)
      alert('تعذّر حذف الملاحظة.')
    }
  }

  return (
    <div className="rounded-xl bg-coal-900/60 p-3 ring-1 ring-coal-700">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-zinc-400">
        <NotebookPen className="h-4 w-4" />
        ملاحظات داخلية (لا تظهر للزبون)
      </div>

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAdd()
          }}
          placeholder="مثلاً: زبون دائم"
          className="min-w-0 flex-1 rounded-lg bg-coal-800 px-3 py-2 text-sm text-zinc-100 ring-1 ring-coal-700 outline-none placeholder:text-zinc-500 focus:ring-brand-500/50"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!draft.trim() || saving}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white transition-colors hover:bg-brand-500 disabled:opacity-40"
          aria-label="إضافة ملاحظة"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
        </button>
      </div>

      <div className="mt-3 space-y-2">
        {loading ? (
          <p className="text-xs text-zinc-500">جارٍ التحميل…</p>
        ) : notes.length === 0 ? (
          <p className="text-xs text-zinc-500">لا ملاحظات بعد.</p>
        ) : (
          notes.map((note) => (
            <div
              key={note.id}
              className="flex items-start justify-between gap-2 rounded-lg bg-coal-800/70 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="break-words text-sm text-zinc-100">{note.body}</p>
                <p className="mt-0.5 text-[11px] text-zinc-500">
                  {formatRelativeTime(note.created_at)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(note.id)}
                className="shrink-0 rounded-md p-1 text-zinc-500 transition-colors hover:bg-flame-500/15 hover:text-flame-500"
                aria-label="حذف الملاحظة"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
