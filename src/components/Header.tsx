import {
  Beef,
  Bot,
  LogOut,
  Power,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { cx } from '../lib/utils'

interface HeaderProps {
  connected: boolean
  soundOn: boolean
  onToggleSound: () => void
  /** البوت موقوف عن كل الزبائن؟ */
  botGloballyPaused: boolean
  /** تبديل إيقاف/تشغيل البوت عن كل الزبائن */
  onToggleBotPause: () => void
  /** تسجيل الخروج من اللوحة */
  onLogout: () => void
}

/** ترويسة اللوحة: الهوية + حالة الاتصال + التحكم بالصوت + إيقاف البوت العام + خروج */
export default function Header({
  connected,
  soundOn,
  onToggleSound,
  botGloballyPaused,
  onToggleBotPause,
  onLogout,
}: HeaderProps) {
  return (
    <header className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-flame-700 shadow-lg shadow-flame-700/30">
          <Beef className="h-7 w-7 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-black leading-none sm:text-2xl">
            سماش لاب
          </h1>
          <p className="mt-1 text-xs font-semibold text-zinc-400 sm:text-sm">
            لوحة إدارة الطلبات
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* إيقاف/تشغيل البوت عن كل الزبائن */}
        <button
          type="button"
          onClick={onToggleBotPause}
          role="switch"
          aria-checked={botGloballyPaused}
          title={
            botGloballyPaused
              ? 'البوت موقوف عن الجميع — اضغط لإعادة تشغيله'
              : 'البوت يعمل — اضغط لإيقافه عن الجميع'
          }
          className={cx(
            'inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-bold ring-1 transition-colors active:scale-95',
            botGloballyPaused
              ? 'bg-flame-600 text-white ring-flame-500 hover:bg-flame-500'
              : 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/40 hover:bg-emerald-500/25',
          )}
        >
          {botGloballyPaused ? (
            <Power className="h-4 w-4" />
          ) : (
            <Bot className="h-4 w-4" />
          )}
          {botGloballyPaused ? 'البوت موقوف' : 'البوت يعمل'}
        </button>

        {/* حالة الاتصال اللحظي */}
        <span
          title={connected ? 'متصل لحظياً' : 'غير متصل'}
          className={cx(
            'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold',
            connected
              ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/40'
              : 'bg-zinc-500/15 text-zinc-400 ring-1 ring-zinc-600/40',
          )}
        >
          {connected ? (
            <Wifi className="h-4 w-4" />
          ) : (
            <WifiOff className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">
            {connected ? 'لحظي' : 'منقطع'}
          </span>
        </span>

        {/* التحكم بصوت التنبيه */}
        <button
          type="button"
          onClick={onToggleSound}
          title={soundOn ? 'كتم صوت التنبيه' : 'تشغيل صوت التنبيه'}
          aria-label={soundOn ? 'كتم صوت التنبيه' : 'تشغيل صوت التنبيه'}
          className={cx(
            'flex h-10 w-10 items-center justify-center rounded-xl ring-1 transition-colors',
            soundOn
              ? 'bg-brand-500/15 text-brand-300 ring-brand-500/40 hover:bg-brand-500/25'
              : 'bg-coal-800 text-zinc-400 ring-coal-700 hover:bg-coal-700',
          )}
        >
          {soundOn ? (
            <Volume2 className="h-5 w-5" />
          ) : (
            <VolumeX className="h-5 w-5" />
          )}
        </button>

        {/* تسجيل الخروج */}
        <button
          type="button"
          onClick={onLogout}
          title="تسجيل الخروج"
          aria-label="تسجيل الخروج"
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-coal-800 text-zinc-400 ring-1 ring-coal-700 transition-colors hover:bg-flame-700/20 hover:text-flame-500"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </header>
  )
}
