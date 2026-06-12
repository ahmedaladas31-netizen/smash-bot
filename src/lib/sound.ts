/**
 * تنبيه صوتي بسيط عبر Web Audio API — بدون ملفات صوت خارجية.
 * المتصفّحات تمنع الصوت قبل أول تفاعل من المستخدم، لذا نهيّئ
 * السياق بعد أول ضغطة (انظر primeAudio).
 */

let audioCtx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    if (!audioCtx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext
      audioCtx = new Ctor()
    }
    return audioCtx
  } catch {
    return null
  }
}

/** يُستدعى مرة بعد أول تفاعل لفكّ حظر الصوت */
export function primeAudio(): void {
  const ctx = getCtx()
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {})
  }
}

/** نغمة قصيرة واحدة */
function tone(ctx: AudioContext, freq: number, start: number, duration: number) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.value = freq
  osc.connect(gain)
  gain.connect(ctx.destination)

  const t = ctx.currentTime + start
  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.exponentialRampToValueAtTime(0.35, t + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration)
  osc.start(t)
  osc.stop(t + duration + 0.02)
}

/** صافرة تنبيه من نغمتين لطلب جديد */
export function playNewOrderBeep(): void {
  const ctx = getCtx()
  if (!ctx) return
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  tone(ctx, 880, 0, 0.18)
  tone(ctx, 1175, 0.2, 0.22)
}

/** تنبيه مختلف عندما يسأل الزبون عن طلبه */
export function playCustomerAskedBeep(): void {
  const ctx = getCtx()
  if (!ctx) return
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  tone(ctx, 660, 0, 0.15)
  tone(ctx, 660, 0.18, 0.15)
}

/** تنبيه إلغاء الطلب: ثلاث نبضات تحذيرية ثم نغمة هابطة */
export function playCancelledBeep(): void {
  const ctx = getCtx()
  if (!ctx) return
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  tone(ctx, 700, 0, 0.12)
  tone(ctx, 700, 0.16, 0.12)
  tone(ctx, 700, 0.32, 0.12)
  tone(ctx, 380, 0.54, 0.30)
}
