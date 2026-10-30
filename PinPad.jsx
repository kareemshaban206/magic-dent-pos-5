import { useEffect, useRef, useState } from 'react'
import { Delete, ShieldCheck } from 'lucide-react'

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'مسح', '0', 'حذف']

/**
 * A 4-digit keypad used by the cashier lock (shift start) and by the cashier
 * account sheet. Purely presentational: the parent owns the value and does the
 * server check, so the same pad serves every screen.
 */
export default function PinPad({
  value,
  onChange,
  onSubmit,
  busy = false,
  error = '',
  submitLabel = 'تأكيد',
  disabled = false,
  hint = '',
}) {
  const [shake, setShake] = useState(false)
  const shakeTimer = useRef(null)

  useEffect(() => {
    if (!error) return
    setShake(true)
    if (shakeTimer.current) clearTimeout(shakeTimer.current)
    shakeTimer.current = setTimeout(() => setShake(false), 450)
    return () => {
      if (shakeTimer.current) clearTimeout(shakeTimer.current)
    }
  }, [error])

  const locked = busy || disabled

  function run(next) {
    if (!onSubmit || locked) return
    onSubmit(next)
  }

  function push(key) {
    if (locked) return
    if (key === 'حذف') {
      onChange(value.slice(0, -1))
      return
    }
    if (key === 'مسح') {
      onChange('')
      return
    }
    const next = value.length >= 4 ? value : value + key
    onChange(next)
    if (next.length === 4) run(next)
  }

  useEffect(() => {
    const onKey = (e) => {
      if (locked) return
      if (/^\d$/.test(e.key)) push(e.key)
      else if (e.key === 'Backspace') push('حذف')
      else if (e.key === 'Enter' && value.length === 4) run(value)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div className={shake ? 'anim-shake' : ''}>
      <div className="flex items-center justify-center gap-2.5" dir="ltr">
        {[0, 1, 2, 3].map((index) => {
          const filled = value.length > index
          const wrong = !!error
          return (
            <div
              key={index}
              className={`grid h-14 w-12 place-items-center rounded-2xl border text-2xl font-extrabold tabular-nums transition ${
                wrong
                  ? 'border-rose-400/70 bg-rose-500/10 text-rose-300'
                  : filled
                    ? 'border-sky-400/70 bg-sky-500/15 text-sky-300'
                    : 'border-slate-600/80 bg-slate-900/70 text-slate-500'
              }`}
            >
              {filled ? '•' : ''}
            </div>
          )
        })}
      </div>

      {error && (
        <p className="anim-fade-up mt-3 rounded-xl bg-rose-500/10 px-3 py-2 text-center text-[11px] font-bold text-rose-300">
          {error}
        </p>
      )}

      <div className="mt-4 grid grid-cols-3 gap-2" dir="rtl">
        {KEYS.map((key) => {
          const isAction = key === 'حذف' || key === 'مسح'
          return (
            <button
              key={key}
              type="button"
              onClick={() => push(key)}
              disabled={locked}
              className={`flex h-12 items-center justify-center rounded-xl border text-lg font-extrabold transition active:scale-[0.96] disabled:opacity-50 ${
                isAction
                  ? 'border-slate-600/80 bg-slate-900/50 text-xs text-slate-300 hover:border-sky-500/50 hover:text-sky-300'
                  : 'border-slate-600/80 bg-slate-900/70 text-slate-100 hover:border-sky-500/60 hover:bg-slate-900'
              }`}
            >
              {key === 'حذف' ? <Delete className="h-4 w-4" /> : key}
            </button>
          )
        })}
      </div>

      <button
        type="submit"
        onClick={(e) => {
          e.preventDefault()
          if (value.length === 4) run(value)
        }}
        disabled={value.length !== 4 || locked}
        className={`mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-extrabold transition ${
          value.length === 4 && !locked
            ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/25 hover:bg-emerald-400 active:scale-[0.98]'
            : 'cursor-not-allowed bg-slate-800 text-slate-500'
        }`}
      >
        <ShieldCheck className="h-4 w-4" />
        {busy ? 'جارٍ التحقق…' : submitLabel}
      </button>

      {hint && (
        <p className="mt-2 text-center text-[10.5px] font-semibold leading-relaxed text-slate-500">
          {hint}
        </p>
      )}
    </div>
  )
}
