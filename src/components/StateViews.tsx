import {
  Inbox,
  Loader2,
  PlugZap,
  RefreshCw,
  ServerCrash,
} from 'lucide-react'

/** حالة التحميل */
export function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-zinc-400">
      <Loader2 className="h-10 w-10 animate-spin text-brand-500" />
      <p className="text-lg font-bold">جارٍ تحميل الطلبات…</p>
    </div>
  )
}

/** لا توجد طلبات في التبويب الحالي */
export function EmptyState({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-zinc-500">
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-coal-800 ring-1 ring-coal-700">
        <Inbox className="h-10 w-10" />
      </div>
      <p className="text-lg font-bold">{message ?? 'لا توجد طلبات حالياً'}</p>
      <p className="text-sm">سيظهر أي طلب جديد هنا فوراً</p>
    </div>
  )
}

/** خطأ في الاتصال مع زر إعادة المحاولة */
export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-flame-700/15 text-flame-500 ring-1 ring-flame-700/40">
        <ServerCrash className="h-10 w-10" />
      </div>
      <div>
        <p className="text-lg font-bold text-zinc-200">تعذّر الاتصال بالخادم</p>
        <p className="mt-1 text-sm text-zinc-400">
          تأكّد من اتصال الإنترنت وإعدادات Supabase ثم أعد المحاولة
        </p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 font-bold text-white transition-colors hover:bg-brand-600 active:scale-95"
      >
        <RefreshCw className="h-5 w-5" />
        إعادة المحاولة
      </button>
    </div>
  )
}

/** متغيرات Supabase غير مضبوطة */
export function ConfigState() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center justify-center gap-4 py-20 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/40">
        <PlugZap className="h-10 w-10" />
      </div>
      <div>
        <p className="text-xl font-black text-zinc-100">
          إعدادات Supabase غير مكتملة
        </p>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          أنشئ ملف <code className="rounded bg-coal-800 px-1.5 py-0.5">.env</code>{' '}
          من <code className="rounded bg-coal-800 px-1.5 py-0.5">.env.example</code>{' '}
          وضع فيه قيم مشروعك:
        </p>
      </div>
      <pre
        dir="ltr"
        className="w-full overflow-x-auto rounded-xl bg-coal-900 p-4 text-right text-xs leading-relaxed text-zinc-300 ring-1 ring-coal-700"
      >
        <code>{`VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...`}</code>
      </pre>
      <p className="text-xs text-zinc-500">
        ثم أعد تشغيل خادم التطوير (npm run dev).
      </p>
    </div>
  )
}
