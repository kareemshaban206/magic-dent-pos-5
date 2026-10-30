import { useEffect, useState } from 'react'
import {
  ChevronDown,
  X,
  UserPlus,
  Users,
  Check,
  Archive,
  RotateCcw,
  Loader2,
  Stethoscope,
  ShieldCheck,
  Lock,
  ArrowRight,
  KeyRound,
} from 'lucide-react'
import { usePOS } from './POSProvider'
import PinPad from './PinPad'

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

export default function ShiftGate() {
  const {
    cashier,
    gateOpen,
    employees,
    allEmployees,
    employeesLoading,
    startShift,
    closeShiftGate,
    addEmployee,
    setEmployeeArchived,
    checkCashierPin,
    saveCashierPin,
  } = usePOS()

  const visible = !cashier || gateOpen

  const [selectedId, setSelectedId] = useState('')
  const [manageOpen, setManageOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newRole, setNewRole] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  /* steps: pick (choose the name) → pin (enter the code) / create (first code) */
  const [step, setStep] = useState('pick')
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [pinBusy, setPinBusy] = useState(false)

  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [createError, setCreateError] = useState('')
  const [createBusy, setCreateBusy] = useState(false)
  const [createBlocked, setCreateBlocked] = useState(false)

  /* the gate starts fresh (choose a name) each time it actually appears */
  useEffect(() => {
    if (!visible) return
    setError('')
    setStep('pick')
    setPin('')
    setPinError('')
    setNewPin('')
    setConfirmPin('')
    setCreateError('')
    setCreateBlocked(false)
  }, [visible])

  /* keep the chosen employee selected while the live roster updates */
  useEffect(() => {
    if (!visible) return
    setSelectedId((prev) => {
      if (prev && employees.some((emp) => emp.id === prev)) return prev
      const preferred =
        employees.find((emp) => emp.id === cashier?.id) || employees[0] || null
      return preferred ? preferred.id : ''
    })
  }, [visible, employees, cashier])

  if (!visible) return null

  const selectedEmployee = employees.find((emp) => emp.id === selectedId) || null
  const initial = selectedEmployee?.name ? selectedEmployee.name.trim().charAt(0) : '؟'

  function handleStart() {
    if (!selectedEmployee) {
      setError('اختر اسم الموظف لبدء الوردية')
      return
    }
    setError('')
    setPin('')
    setPinError('')
    setNewPin('')
    setConfirmPin('')
    setCreateError('')
    setCreateBlocked(false)
    setStep(selectedEmployee.pinSet ? 'pin' : 'create')
  }

  async function verifyPin(value) {
    if (pinBusy || !selectedEmployee) return
    setPinBusy(true)
    setPinError('')
    const result = await checkCashierPin(selectedEmployee.id, value)
    setPinBusy(false)
    if (result && result.ok) {
      startShift(selectedEmployee)
      return
    }
    if (result?.error === 'attempts') {
      setPinError('محاولات كثيرة — حاول بعد دقيقة')
      setPin('')
      return
    }
    if (result?.error === 'network') {
      setPinError('تعذر التحقق من كلمة السر — تحقق من الاتصال')
      return
    }
    setPinError('كلمة السر غير صحيحة — حاول مرة أخرى')
    setPin('')
  }

  async function createPin(e) {
    e?.preventDefault()
    if (createBusy || !selectedEmployee) return
    setCreateBlocked(false)
    if (!/^\d{4}$/.test(newPin)) {
      setCreateError('كلمة السر يجب أن تكون 4 أرقام')
      return
    }
    if (newPin !== confirmPin) {
      setCreateError('تأكيد كلمة السر غير مطابق')
      return
    }
    setCreateBusy(true)
    const result = await saveCashierPin(selectedEmployee.id, newPin)
    setCreateBusy(false)
    if (result && result.ok) {
      startShift(selectedEmployee)
      return
    }
    if (result?.error === 'attempts') {
      setCreateError('محاولات كثيرة — حاول بعد دقيقة')
      return
    }
    setCreateError('')
    setCreateBlocked(true)
  }

  async function handleAdd(e) {
    e.preventDefault()
    if (busy) return
    if (!newName.trim()) {
      setError('اكتب اسم الموظف أولًا')
      return
    }
    setBusy(true)
    const created = await addEmployee(newName, newRole)
    setBusy(false)
    if (created) {
      setNewName('')
      setNewRole('')
      setSelectedId(created.id)
      setError('')
    } else {
      setError('تعذر إضافة الموظف، تحقق من الاتصال وحاول مرة أخرى')
    }
  }

  async function toggleArchive(emp) {
    const ok = await setEmployeeArchived(emp.id, !emp.archived)
    if (!ok) setError('تعذر تحديث الموظف، حاول مرة أخرى')
  }

  const canDismiss = !!cashier && gateOpen

  const titles = {
    pick: 'بدء الوردية',
    pin: 'كلمة سر الكاشير',
    create: 'أنشئ كلمة سرك',
  }
  const subtitles = {
    pick: 'اختر اسمك من القائمة لفتح شاشة الكاشير',
    pin: 'أدخل كلمة السر الخاصة بك للمتابعة',
    create: 'أول مرة لك على الجهاز — اختر كلمة سر من 4 أرقام',
  }

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-[#080e1a]/90 backdrop-blur-md"
      dir="rtl"
    >
      <div className="flex min-h-full items-center justify-center p-4 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] pt-[calc(env(safe-area-inset-top,0px)+1rem)]">
        <div className="anim-pop relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-700/80 bg-[#1e293b] shadow-[0_30px_80px_-20px_rgba(2,8,23,0.9)]">
          <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-sky-500/25 blur-3xl anim-glow" />

          {canDismiss && (
            <button
              onClick={closeShiftGate}
              aria-label="إغلاق"
              className="absolute left-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full border border-slate-700 bg-slate-900/70 text-slate-400 transition hover:text-slate-100"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          <div className="relative px-5 pt-7 pb-6 md:px-7">
            <div className="flex flex-col items-center text-center">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-sky-400 to-emerald-400 text-slate-950 shadow-lg shadow-sky-500/25">
                {step === 'pick' ? (
                  <Stethoscope className="h-7 w-7" strokeWidth={2.2} />
                ) : (
                  <Lock className="h-7 w-7" strokeWidth={2.2} />
                )}
              </div>
              <h2 className="mt-3 font-display text-2xl font-extrabold tracking-tight text-slate-50">
                {titles[step]}
              </h2>
              <p className="mt-1 text-sm text-slate-400">{subtitles[step]}</p>
            </div>

            {/* -------------------------------------------------- pick step */}
            {step === 'pick' && (
              <>
                <div className="mt-6">
                  <label
                    htmlFor="shift-employee"
                    className="mb-1.5 block text-xs font-semibold text-slate-400"
                  >
                    الموظف / الكاشير
                  </label>
                  <div className="relative">
                    <select
                      id="shift-employee"
                      value={selectedId}
                      onChange={(e) => {
                        setSelectedId(e.target.value)
                        setError('')
                      }}
                      disabled={employeesLoading || !employees.length}
                      className="w-full appearance-none rounded-2xl border border-slate-600/80 bg-slate-900/70 px-4 py-3.5 pl-10 text-base font-semibold text-slate-100 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/25 disabled:opacity-60"
                    >
                      {!employees.length && (
                        <option value="">
                          {employeesLoading ? 'جارٍ تحميل الموظفين…' : 'لا يوجد موظفون بعد'}
                        </option>
                      )}
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name}
                          {emp.role ? ` — ${emp.role}` : ''}
                          {emp.pinSet ? ' 🔒' : ''}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  </div>

                  {selectedEmployee && (
                    <p className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                      {selectedEmployee.pinSet ? (
                        <>
                          <Lock className="h-3 w-3" />
                          هذا الموظف له كلمة سر — ستُطلب عند بدء الوردية
                        </>
                      ) : (
                        <>
                          <KeyRound className="h-3 w-3" />
                          لا توجد كلمة سر لهذا الموظف بعد — ستُنشأ عند أول دخول
                        </>
                      )}
                    </p>
                  )}

                  {error && (
                    <p className="mt-2 rounded-xl bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-300">
                      {error}
                    </p>
                  )}

                  <button
                    onClick={handleStart}
                    disabled={!selectedEmployee}
                    className={`mt-3 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-base font-extrabold transition active:scale-[0.98] ${
                      selectedEmployee
                        ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/25'
                        : 'cursor-not-allowed bg-slate-700 text-slate-400'
                    }`}
                  >
                    <Check className="h-5 w-5" strokeWidth={3} />
                    بدء الوردية الآن
                  </button>
                </div>

                <button
                  onClick={() => setManageOpen((v) => !v)}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700/80 bg-slate-900/40 px-3 py-2.5 text-xs font-bold text-slate-300 transition hover:border-sky-500/50 hover:text-sky-300"
                >
                  <Users className="h-4 w-4" />
                  إدارة الموظفين
                  <span className="text-slate-500">({allEmployees.length})</span>
                </button>

                {manageOpen && (
                  <div className="anim-fade-up mt-3 rounded-2xl border border-slate-700/70 bg-slate-900/40 p-3">
                    <form onSubmit={handleAdd} className="space-y-2">
                      <input
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="اسم الموظف الجديد"
                        className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-sky-400"
                      />
                      <div className="flex gap-2">
                        <input
                          value={newRole}
                          onChange={(e) => setNewRole(e.target.value)}
                          placeholder="المسمى (اختياري)"
                          className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-sky-400"
                        />
                        <button
                          type="submit"
                          disabled={busy}
                          className="flex items-center gap-1.5 rounded-xl border border-sky-500/40 bg-sky-500/15 px-3 py-2.5 text-sm font-bold text-sky-300 transition hover:bg-sky-500/25 disabled:opacity-50"
                        >
                          {busy ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <UserPlus className="h-4 w-4" />
                          )}
                          إضافة
                        </button>
                      </div>
                    </form>

                    <div className="mt-3 max-h-44 space-y-1.5 overflow-y-auto pl-0.5">
                      {allEmployees.length === 0 && (
                        <p className="py-3 text-center text-xs text-slate-500">
                          لا يوجد موظفون — أضف أول موظف من الأعلى
                        </p>
                      )}
                      {allEmployees.map((emp) => (
                        <div
                          key={emp.id}
                          className="flex items-center gap-2 rounded-xl bg-slate-800/70 px-2.5 py-2"
                        >
                          <div className="min-w-0 flex-1">
                            <p
                              className={`truncate text-sm font-semibold ${
                                emp.archived
                                  ? 'text-slate-500 line-through'
                                  : 'text-slate-200'
                              }`}
                            >
                              {emp.name}
                            </p>
                            {emp.role && (
                              <p className="truncate text-[10px] text-slate-500">
                                {emp.role}
                              </p>
                            )}
                          </div>
                          {emp.pinSet && (
                            <span
                              title="له كلمة سر"
                              className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-500/15 text-emerald-400"
                            >
                              <Lock className="h-3.5 w-3.5" />
                            </span>
                          )}
                          <button
                            onClick={() => toggleArchive(emp)}
                            aria-label={emp.archived ? 'إرجاع' : 'أرشفة'}
                            className={`grid h-8 w-8 place-items-center rounded-lg border transition ${
                              emp.archived
                                ? 'border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/15'
                                : 'border-slate-600 text-slate-400 hover:border-rose-500/50 hover:text-rose-400'
                            }`}
                          >
                            {emp.archived ? (
                              <RotateCcw className="h-3.5 w-3.5" />
                            ) : (
                              <Archive className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  لكل موظف كلمة سر خاصة — لا يمكن الدخول على وردية غيره
                </p>
              </>
            )}

            {/* --------------------------------------------------- pin step */}
            {step === 'pin' && selectedEmployee && (
              <div className="mt-5">
                <div className="mb-4 flex items-center gap-2 rounded-2xl border border-slate-700/70 bg-slate-900/50 px-3 py-2.5">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-sky-400 to-emerald-400 font-display text-sm font-extrabold text-slate-950">
                    {initial}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-extrabold text-slate-100">
                      {selectedEmployee.name}
                    </p>
                    <p className="truncate text-[10.5px] font-semibold text-slate-400">
                      {selectedEmployee.role || 'كاشير'}
                    </p>
                  </div>
                  <Lock className="h-4 w-4 shrink-0 text-emerald-400" />
                </div>

                <PinPad
                  value={pin}
                  onChange={(next) => {
                    setPin(next)
                    if (pinError) setPinError('')
                  }}
                  onSubmit={verifyPin}
                  busy={pinBusy}
                  error={pinError}
                  submitLabel="دخول الوردية"
                  hint="كلمة السر محفوظة على السيرفر وتُطلب في كل مرة تبدأ فيها ورديتك."
                />

                <button
                  type="button"
                  onClick={() => {
                    setStep('pick')
                    setPin('')
                    setPinError('')
                  }}
                  className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-700/80 bg-slate-900/40 px-3 py-2.5 text-xs font-bold text-slate-300 transition hover:border-sky-500/50 hover:text-sky-300"
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                  رجوع لاختيار الموظف
                </button>
              </div>
            )}

            {/* ------------------------------------------------ create step */}
            {step === 'create' && selectedEmployee && (
              <div className="mt-5">
                <div className="mb-4 flex items-center gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-sky-400 to-emerald-400 font-display text-sm font-extrabold text-slate-950">
                    {initial}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-extrabold text-slate-100">
                      {selectedEmployee.name}
                    </p>
                    <p className="truncate text-[10.5px] font-semibold text-amber-300/90">
                      أول كلمة سر لهذا الموظف
                    </p>
                  </div>
                </div>

                <form onSubmit={createPin} className="space-y-2.5">
                  <PinField
                    label="كلمة السر الجديدة (4 أرقام)"
                    value={newPin}
                    autoFocus
                    onChange={(v) => {
                      setNewPin(v)
                      setCreateError('')
                      setCreateBlocked(false)
                    }}
                  />
                  <PinField
                    label="تأكيد كلمة السر"
                    value={confirmPin}
                    onChange={(v) => {
                      setConfirmPin(v)
                      setCreateError('')
                      setCreateBlocked(false)
                    }}
                  />

                  {createError && (
                    <p className="anim-fade-up flex items-center gap-1.5 rounded-xl bg-rose-500/10 px-3 py-2 text-[11px] font-bold text-rose-300">
                      {createError}
                    </p>
                  )}

                  {createBlocked && (
                    <div className="anim-fade-up rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2.5">
                      <p className="text-[11px] font-extrabold leading-relaxed text-amber-200">
                        تعذّر إنشاء كلمة السر من هذا الجهاز.
                      </p>
                      <p className="mt-0.5 text-[10.5px] font-semibold leading-relaxed text-amber-300/85">
                        إما أن لهذا الموظف كلمة سر بالفعل، أو أن كلمة السر الأولى
                        تُنشأ من الجهاز الذي أُضيف عليه الموظف. جرّب إدخال كلمة
                        السر إن كانت موجودة، أو ابدأ الوردية بدونها.
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setStep('pin')
                            setPin('')
                            setPinError('')
                            setCreateBlocked(false)
                          }}
                          className="flex items-center gap-1 rounded-lg bg-sky-500 px-2.5 py-1.5 text-[11px] font-extrabold text-slate-950 transition hover:bg-sky-400"
                        >
                          <Lock className="h-3 w-3" />
                          لدي كلمة سر — أدخلها
                        </button>
                        <button
                          type="button"
                          onClick={() => startShift(selectedEmployee)}
                          className="rounded-lg border border-slate-600 px-2.5 py-1.5 text-[11px] font-bold text-slate-300 transition hover:text-slate-100"
                        >
                          دخول بدون كلمة سر
                        </button>
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={createBusy}
                    className={`mt-1 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-extrabold transition ${
                      createBusy
                        ? 'cursor-wait bg-slate-800 text-slate-500'
                        : 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/25 hover:bg-emerald-400 active:scale-[0.98]'
                    }`}
                  >
                    {createBusy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" strokeWidth={3} />
                    )}
                    حفظ وبدء الوردية
                  </button>
                </form>

                <button
                  type="button"
                  onClick={() => {
                    setStep('pick')
                    setNewPin('')
                    setConfirmPin('')
                    setCreateError('')
                    setCreateBlocked(false)
                  }}
                  className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-700/80 bg-slate-900/40 px-3 py-2.5 text-xs font-bold text-slate-300 transition hover:border-sky-500/50 hover:text-sky-300"
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                  رجوع لاختيار الموظف
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
