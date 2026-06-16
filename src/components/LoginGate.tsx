import { useState, type FormEvent } from 'react'
import { Beef, Lock, LogIn } from 'lucide-react'
import { checkPassword, isPasswordConfigured, saveAuth } from '../lib/auth'

interface LoginGateProps {
  /** يُستدعى بعد نجاح كلمة السر */
  onSuccess: () => void
}

/** شاشة دخول بسيطة تظهر قبل اللوحة كاملة */
export default function LoginGate({ onSuccess }: LoginGateProps) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (checkPassword(password)) {
      saveAuth()
      onSuccess()
    } else {
      setError(true)
      setPassword('')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-3xl bg-coal-900 p-8 shadow-2xl ring-1 ring-coal-700">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-flame-700 shadow-lg shadow-flame-700/30">
            <Beef className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black leading-none">سماش لاب</h1>
            <p className="mt-1.5 text-sm font-semibold text-zinc-400">
              لوحة إدارة الطلبات
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div className="relative">
            <Lock className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                if (error) setError(false)
              }}
              autoFocus
              placeholder="كلمة السر"
              aria-label="كلمة السر"
              className="w-full rounded-xl bg-coal-800 py-3 pr-11 pl-4 text-base font-semibold text-zinc-100 outline-none ring-1 ring-coal-700 transition-colors placeholder:text-zinc-500 focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {error && (
            <p className="text-sm font-bold text-flame-500">
              كلمة السر غير صحيحة، حاول مرة أخرى.
            </p>
          )}

          {!isPasswordConfigured && (
            <p className="text-sm font-bold text-amber-400">
              لم تُضبط كلمة سر اللوحة بعد (VITE_DASHBOARD_PASSWORD).
            </p>
          )}

          <button
            type="submit"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-brand-600 to-flame-700 py-3 text-base font-bold text-white shadow-lg shadow-brand-600/25 transition-all hover:opacity-95 active:scale-[0.98]"
          >
            <LogIn className="h-5 w-5" />
            دخول
          </button>
        </form>
      </div>
    </div>
  )
}
