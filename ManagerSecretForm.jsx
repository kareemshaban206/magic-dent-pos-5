import { useCallback, useState } from 'react'
import { Eye, EyeOff, KeyRound, Loader2, ShieldCheck, Grid3x3 } from 'lucide-react'
import PatternLock from './PatternLock'

/**
 * The manager's secret can be a free password (letters, digits, symbols — 4 to
 * 64 characters) or a 3×3 drawn pattern. Both are stored the same way (the
 * server keeps the value and only compares it), so the tabs are purely the way
 * the person wants to enter or set it.
 */
export const SECRET_MODES = [
  { id: 'password', label: 'كلمة سر', icon: KeyRound },
  { id: 'pattern', label: 'نمط', icon: Grid3x3 },
]

export default function ManagerSecretForm({
  mode = 'password',
  setMode,
  value,
  onChange,
  confirm = '',
  onConfirmChange,
  confirmMode = false,
  onSubmit,
  busy = false,
  error = '',
  submitLabel = 'دخول',
  hint = '',
  secretLabel = 'كلمة سر المدير',
  confirmLabel = 'تأكيد كلمة سر المدير',
  autoFocus = false,
}) {
  const isPattern = mode === 'pattern'

  const changeMode = useCallback(
    (next) => {
      if (busy || !setMode) return
      setMode(next)
      onChange?.('')
      onConfirmChange?.('')
    },
    [busy, setMode, onChange, onConfirmChange],
  )

  return (
    <div>
      {setMode && (
        <div className="mb-3 flex items-center gap-1 rounded-xl border border-slate-700/70 bg-slate-900/50 p-1">
          {SECRET_MODES.map((option) => {
            const Icon = option.icon
            const active = mode === option.id
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => changeMode(option.id)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-extrabold transition ${
                  active
                    ? 'bg-sky-500 text-slate-950 shadow-lg shadow-sky-500/20'
                    : 'text-slate-300 hover:text-sky-300'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {option.label}
              </button>
            )
          })}
        </div>
      )}

      {isPattern ? (
        <div className="space-y-2">
          <div>
            <p className="mb-1 text-center text-[10.5px] font-bold text-slate-400">
              {confirmMode ? 'ارسم النمط الجديد' : 'ارسم النمط'}
            </p>
            <PatternLock
              value={value}
              onChange={onChange}
              onSubmit={
                confirmMode
                  ? undefined
                  : (drawn) => {
                      if (!busy) onSubmit?.(drawn)
                    }
              }
              busy={busy}
              disabled={busy}
              submitLabel={submitLabel}
            />
          </div>
          {confirmMode && (
            <div>
              <p className="mb-1 text-center text-[10.5px] font-bold text-slate-400">
                أعد رسم النمط للتأكيد
              </p>
              <PatternLock
                value={confirm}
                onChange={onConfirmChange}
                onSubmit={(drawn) => {
                  if (busy) return
                  onConfirmChange?.(drawn)
                  onSubmit?.(drawn)
                }}
                busy={busy}
                disabled={busy}
                submitLabel={submitLabel}
              />
            </div>
          )}
          {error && (
            <p className="anim-fade-up rounded-xl bg-rose-500/10 px-3 py-2 text-center text-[11px] font-bold text-rose-300">
              {error}
            </p>
          )}
          {hint && (
            <p className="text-center text-[10px] font-semibold leading-relaxed text-slate-500">
              {hint}
            </p>
          )}
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!busy) onSubmit?.()
          }}
          className="space-y-2"
        >
          <SecretField
            label={secretLabel}
            value={value}
            onChange={onChange}
            autoFocus={autoFocus}
            placeholder="٤ أحرف على الأقل — أرقام أو حروف أو رموز"
          />
          {confirmMode && (
            <SecretField
              label={confirmLabel}
              value={confirm}
              onChange={onConfirmChange}
              placeholder="أعد كتابتها للتأكيد"
            />
          )}

          {error && (
            <p className="anim-fade-up flex items-center gap-1.5 rounded-xl bg-rose-500/10 px-3 py-2 text-[11px] font-bold text-rose-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-500 py-2.5 text-[12.5px] font-extrabold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400 active:scale-[0.98] disabled:opacity-60"
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ShieldCheck className="h-3.5 w-3.5" />
            )}
            {busy ? 'جارٍ التحقق…' : submitLabel}
          </button>

          {hint && (
            <p className="text-center text-[10px] font-semibold leading-relaxed text-slate-500">
              {hint}
            </p>
          )}
        </form>
      )}
    </div>
  )
}

function SecretField({ label, value, onChange, placeholder, autoFocus }) {
  const [reveal, setReveal] = useState(false)
  return (
    <label className="block">
      <span className="mb-1 block text-[10.5px] font-bold text-slate-400">{label}</span>
      <span className="relative block">
        <input
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          type={reveal ? 'text' : 'password'}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          autoFocus={autoFocus}
          dir="ltr"
          placeholder={placeholder}
          className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2.5 pl-10 text-[14px] font-bold tracking-[0.12em] text-slate-100 outline-none transition placeholder:text-[11px] placeholder:font-normal placeholder:tracking-normal placeholder:text-slate-500 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20"
        />
        <button
          type="button"
          onClick={() => setReveal((v) => !v)}
          aria-label={reveal ? 'إخفاء' : 'إظهار'}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-300"
        >
          {reveal ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
      </span>
    </label>
  )
}
