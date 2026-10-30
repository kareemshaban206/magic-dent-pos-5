import { useEffect, useRef, useState } from 'react'
import {
  X,
  KeyRound,
  Check,
  Loader2,
  TriangleAlert,
  Repeat2,
  LogOut,
  Lock,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react'
import { usePOS } from './POSProvider'
import ManagerSecretForm from './ManagerSecretForm'

function PinField({ label, value, onChange, autoFocus = false }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-bold text-slate-400">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 4))}
        type="password"
        inputMode="numeric"
        autoComplete="off"
        maxLength={4}
        dir="ltr"
        autoFocus={autoFocus}
        placeholder="••••"
        className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2.5 text-center text-base font-extrabold tracking-[0.4em] tabular-nums text-slate-100 outline-none transition placeholder:font-normal placeholder:tracking-normal placeholder:text-slate-500 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20"
      />
    </label>
  )
}

/**
 * The signed-in cashier's own sheet: their details, their 4-digit code and the
 * two ways out of a shift.
 *
 * Changing (or setting) that code needs the MANAGER's secret first — a cashier
 * cannot re-key their own PIN on their own.
 */
export default function CashierAccount({ open, onClose }) {
  const {
    cashier,
    employees,
    saveCashierPin,
    verifyManagerSecret,
    openShiftGate,
    endShift,
  } = usePOS()

  const employee = employees.find((emp) => emp.id === cashier?.id) || null
  const hasPin = !!employee?.pinSet

  const [approved, setApproved] = useState(false)
  const [mode, setMode] = useState('password')
  const [managerSecret, setManagerSecret] = useState('')
  const [authBusy, setAuthBusy] = useState(false)
  const [authError, setAuthError] = useState('')

  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [confirmEnd, setConfirmEnd] = useState(false)
  const timer = useRef(null)

  useEffect(() => {
    if (!open) return
    setApproved(false)
    setManagerSecret('')
    setAuthError('')
    setCurrent('')
    setNext('')
    setConfirm('')
    setError('')
    setNotice('')
    setBusy(false)
    setConfirmEnd(false)
  }, [open])

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )

  if (!open || !cashier) return null

  async function approve(drawn) {
    if (authBusy) return
    const entered = String(drawn || managerSecret).trim()
    if (entered.length < 4) {
      setAuthError('أدخل كلمة سر المدير (٣ أحرف على الأقل)')
      return
    }
    setAuthBusy(true)
    setAuthError('')
    const result = await verifyManagerSecret(entered)
    setAuthBusy(false)
    if (result && result.ok) {
      setApproved(true)
      setManagerSecret('')
      return
    }
    if (result?.error === 'attempts') setAuthError('محاولات كثيرة — حاول بعد دقيقة')
    else if (result?.error === 'network') setAuthError('تعذر التحقق — تحقق من الاتصال')
    else setAuthError('كلمة سر المدير غير صحيحة')
  }

  async function submit(e) {
    e.preventDefault()
    if (busy || !approved) return
    setNotice('')
    if (!/^\d{4}$/.test(next)) {
      setError('كلمة السر الجديدة يجب أن تكون 4 أرقام')
      return
    }
    if (next !== confirm) {
      setError('تأكيد كلمة السر غير مطابق')
      return
    }
    if (hasPin && !/^\d{4}$/.test(current)) {
      setError('أدخل كلمة السر الحالية للموظف')
      return
    }
    setBusy(true)
    const result = await saveCashierPin(cashier.id, next, hasPin ? current : undefined)
    setBusy(false)
    if (result && result.ok) {
      setError('')
      setCurrent('')
      setNext('')
      setConfirm('')
      setApproved(false)
      setNotice('تم تحديث كلمة السر بموافقة المدير — تُطلب الجديدة في الوردية القادمة')
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => setNotice(''), 5000)
      return
    }
    if (result?.error === 'attempts') setError('محاولات كثيرة — حاول بعد دقيقة')
    else if (!hasPin)
      setError('تعذّر إنشاء كلمة السر من هذا الجهاز — جرّب من الجهاز الأساسي')
    else setError('تعذر حفظ كلمة السر — تحقق من كلمة السر الحالية وحاول مرة أخرى')
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-[#080e1a]/80 p-0 backdrop-blur-sm md:items-center md:p-6"
      style={{ height: 'var(--visual-height, 100dvh)' }}
      onClick={onClose}
    >
      <div
        className="anim-sheet w-full max-w-lg overflow-y-auto rounded-t-3xl border border-slate-700/80 bg-[#1e293b] p-4 shadow-[0_30px_80px_-20px_rgba(2,8,23,0.9)] md:rounded-3xl md:p-5"
        style={{ maxHeight: 'calc(var(--visual-height, 100dvh) - 2rem)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start gap-2.5">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-sky-400 to-emerald-400 font-display text-base font-extrabold text-slate-950">
            {(cashier.name || '؟').trim().charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-[15px] font-extrabold text-slate-50">
              {cashier.name}
            </p>
            <p className="truncate text-[11px] font-semibold text-slate-400">
              {cashier.role || 'كاشير'} · الوردية مفتوحة
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="إغلاق"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-slate-700 bg-slate-900/60 text-slate-400 transition hover:text-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ------------------------------------------------ manager gate */}
        <div className="rounded-2xl border border-slate-700/70 bg-slate-900/40 p-3">
          <div className="mb-2 flex items-center gap-1.5 text-[12px] font-extrabold text-slate-100">
            {approved ? (
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
            ) : (
              <ShieldAlert className="h-4 w-4 text-amber-400" />
            )}
            {approved ? 'تمت موافقة المدير' : 'موافقة المدير مطلوبة'}
          </div>
          <p className="mb-2.5 text-[10.5px] font-semibold leading-relaxed text-slate-500">
            {approved
              ? 'يمكنك الآن تعيين كلمة سرك — تُحفظ على السيرفر وتُطلب في بداية ورديتك.'
              : `لا يمكن ${hasPin ? 'تغيير' : 'إنشاء'} كلمة سر الموظف بدون كلمة سر المدير.`}
          </p>

          {!approved && (
            <ManagerSecretForm
              mode={mode}
              setMode={setMode}
              value={managerSecret}
              onChange={(v) => {
                setManagerSecret(v)
                if (authError) setAuthError('')
              }}
              onSubmit={approve}
              busy={authBusy}
              error={authError}
              submitLabel="متابعة"
              secretLabel="كلمة سر المدير"
            />
          )}
        </div>

        {/* ------------------------------------------------------- pin form */}
        {approved && (
          <form
            onSubmit={submit}
            className="anim-fade-up mt-3 rounded-2xl border border-slate-700/70 bg-slate-900/40 p-3"
          >
            <div className="mb-2 flex items-center gap-1.5 text-[12px] font-extrabold text-slate-100">
              <KeyRound className="h-4 w-4 text-emerald-400" />
              {hasPin ? 'تغيير كلمة سر الكاشير' : 'إنشاء كلمة سر الكاشير'}
            </div>
            <p className="mb-2.5 text-[10.5px] font-semibold leading-relaxed text-slate-500">
              كلمة السر ٤ أرقام وخاصة بهذا الموظف — لا يمكن لأي كاشير آخر بدء ورديته بدونها.
            </p>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {hasPin && (
                <PinField
                  label="الكلمة الحالية للموظف"
                  value={current}
                  onChange={(v) => {
                    setCurrent(v)
                    setError('')
                  }}
                />
              )}
              <PinField
                label="كلمة السر الجديدة"
                value={next}
                onChange={(v) => {
                  setNext(v)
                  setError('')
                }}
                autoFocus
              />
              <PinField
                label="تأكيد كلمة السر"
                value={confirm}
                onChange={(v) => {
                  setConfirm(v)
                  setError('')
                }}
              />
            </div>

            {error && (
              <p className="anim-fade-up mt-2 flex items-center gap-1.5 rounded-xl bg-rose-500/10 px-3 py-2 text-[11px] font-bold text-rose-300">
                <TriangleAlert className="h-3.5 w-3.5 shrink-0" />
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2.5 text-[12px] font-extrabold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400 active:scale-[0.98] disabled:opacity-60"
            >
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
              )}
              {hasPin ? 'حفظ كلمة السر' : 'إنشاء كلمة السر'}
            </button>
          </form>
        )}

        {notice && (
          <p className="anim-fade-up mt-3 flex items-center gap-1.5 rounded-xl bg-emerald-500/10 px-3 py-2 text-[11px] font-bold text-emerald-300">
            <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={3} />
            {notice}
          </p>
        )}

        {/* --------------------------------------------------------- actions */}
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => {
              onClose()
              openShiftGate()
            }}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-600/80 bg-slate-900/50 px-3 py-2.5 text-[11.5px] font-extrabold text-slate-200 transition hover:border-sky-500/60 hover:text-sky-300"
          >
            <Repeat2 className="h-3.5 w-3.5" />
            تغيير الموظف
          </button>

          {!confirmEnd ? (
            <button
              type="button"
              onClick={() => setConfirmEnd(true)}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2.5 text-[11.5px] font-extrabold text-rose-300 transition hover:bg-rose-500/20"
            >
              <LogOut className="h-3.5 w-3.5" />
              إنهاء الوردية وقفل الشاشة
            </button>
          ) : (
            <div className="anim-fade-up flex items-center gap-1.5 rounded-xl border border-rose-500/50 bg-rose-500/10 px-2 py-1.5">
              <p className="min-w-0 flex-1 text-[10.5px] font-extrabold leading-snug text-rose-200">
                إنهاء وردية {cashier.name}؟
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose()
                  endShift()
                }}
                className="flex shrink-0 items-center gap-1 rounded-lg bg-rose-500 px-2.5 py-1.5 text-[10.5px] font-extrabold text-white transition hover:bg-rose-400"
              >
                <Lock className="h-3 w-3" />
                نعم، أنهِ
              </button>
              <button
                type="button"
                onClick={() => setConfirmEnd(false)}
                className="shrink-0 rounded-lg border border-slate-600 px-2 py-1.5 text-[10.5px] font-bold text-slate-300"
              >
                إلغاء
              </button>
            </div>
          )}
        </div>

        <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[10px] font-semibold text-slate-500">
          <ShieldCheck className="h-3 w-3 shrink-0" />
          كلمات السر محفوظة على السيرفر ولا يقرأها أحد من داخل التطبيق.
        </p>
      </div>
    </div>
  )
}
