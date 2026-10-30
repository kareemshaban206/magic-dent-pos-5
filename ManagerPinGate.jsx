import { useEffect, useRef, useState } from 'react'
import {
  Lock,
  ShieldCheck,
  KeyRound,
  MailCheck,
  Mail,
  ArrowRight,
  Loader2,
  TriangleAlert,
  Check,
  Sparkles,
  RefreshCw,
  LogIn,
} from 'lucide-react'
import { auth } from '../lib/auth'
import { MANAGER_RECOVERY_EMAIL, usePOS } from './POSProvider'
import ManagerSecretForm from './ManagerSecretForm'

const MESSAGES = {
  wrong: 'كلمة السر غير صحيحة — حاول مرة أخرى',
  format: 'كلمة السر تحتاج ٤ أحرف على الأقل',
  match: 'التأكيد غير مطابق — أعد المحاولة',
  attempts: 'محاولات كثيرة — حاول بعد دقيقة',
  network: 'تعذر التحقق من كلمة السر — تحقق من الاتصال',
  denied:
    'تعذّر حفظ كلمة السر من هذا الجهاز — يحتاج الجهاز المسجّل بحساب مالك التطبيق',
  save: 'تعذر الحفظ — حاول مرة أخرى',
  rate: 'أُرسل كود حديثًا — انتظر نصف دقيقة قبل طلب كود جديد',
  quota: 'تم بلوغ حد رسائل الاستعادة اليوم — حاول بعد قليل',
  recipient: 'تعذر إرسال الكود إلى بريد الاستعادة',
  send: 'تعذر إرسال الكود — تحقق من الاتصال وحاول مرة أخرى',
  codeFormat: 'اكتب الكود المكوّن من ٦ أرقام',
  code: 'الكود غير صحيح أو انتهت صلاحيته',
  codeCheck: 'تعذر التحقق من الكود — تحقق من الاتصال',
  owner:
    'لتعيين كلمة سر جديدة من غير الكلمة القديمة، لازم تسجّل الدخول بحساب مالك التطبيق مرة واحدة على هذا الجهاز — اضغط الزر بالأسفل، وبعد الدخول أعد الضغط على «تعيين وفتح السجل».',
  notOwner: 'الحساب الذي سجّلت به ليس مالك التطبيق — استخدم نفس الحساب الذي أنشأ التطبيق',
}

export default function ManagerPinGate() {
  const {
    unlockManager,
    setupManagerSecret,
    sendManagerResetCode,
    completeManagerReset,
  } = usePOS()

  const [view, setView] = useState('unlock')
  const [mode, setMode] = useState('password')
  const [secret, setSecret] = useState('')
  const [confirm, setConfirm] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [ownerNeeded, setOwnerNeeded] = useState(false)
  const [verifiedCode, setVerifiedCode] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const [failures, setFailures] = useState(0)
  const [shake, setShake] = useState(false)
  const shakeTimer = useRef(null)

  useEffect(
    () => () => {
      if (shakeTimer.current) clearTimeout(shakeTimer.current)
    },
    [],
  )

  /* a fresh code cannot be requested every second — the mail service throttles,
     so the button counts down instead of failing */
  useEffect(() => {
    if (cooldown <= 0) return undefined
    const timer = setTimeout(() => setCooldown((n) => n - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  function go(next) {
    setView(next)
    setError('')
    setNotice('')
    setSecret('')
    setConfirm('')
    setCode('')
    setCodeSent(false)
    setOwnerNeeded(false)
    setVerifiedCode('')
  }

  function fail(message) {
    setError(message)
    setFailures((n) => n + 1)
    setShake(true)
    if (shakeTimer.current) clearTimeout(shakeTimer.current)
    shakeTimer.current = setTimeout(() => setShake(false), 450)
  }

  async function attemptUnlock(value) {
    const entered = String(value ?? secret ?? '').trim()
    if (busy) return
    if (entered.length < 4) {
      setError(MESSAGES.format)
      return
    }
    setBusy(true)
    setError('')
    const result = await unlockManager(entered)
    setBusy(false)
    if (result && result.ok) return
    fail(MESSAGES[result?.error] || MESSAGES.wrong)
    setSecret('')
    setConfirm('')
  }

  async function submitSetup(override) {
    if (busy) return
    setBusy(true)
    setError('')
    const result = await setupManagerSecret(secret, override || confirm)
    setBusy(false)
    if (result && result.ok) return
    setError(MESSAGES[result?.error] || MESSAGES.save)
    setShake(true)
    if (shakeTimer.current) clearTimeout(shakeTimer.current)
    shakeTimer.current = setTimeout(() => setShake(false), 450)
  }

  async function requestCode() {
    if (busy) return
    setBusy(true)
    setError('')
    setNotice('')
    const result = await sendManagerResetCode()
    setBusy(false)
    if (result && result.ok) {
      setCodeSent(true)
      setCooldown(30)
      setNotice(`تم إرسال كود من ٦ أرقام إلى ${MANAGER_RECOVERY_EMAIL}`)
      return
    }
    setError(MESSAGES[result?.error] || MESSAGES.send)
  }

  /* Already holding a code (it arrived earlier, or the screen was closed) —
     open the code box without sending a new one. */
  function enterCodeAgain() {
    setCodeSent(true)
    setError('')
    setNotice('')
  }

  /* The server only lets a stored secret be replaced by someone who proves the
     old one — or by the app's owner. A forgotten secret has no old value, so the
     owner signs in once on this device and the reset goes through. */
  async function signInAsOwner() {
    if (busy) return
    setBusy(true)
    setError('')
    setNotice('')
    let user = null
    try {
      user = await auth.signIn()
    } catch {
      user = null
    }
    if (!user) {
      setBusy(false)
      return
    }
    if (!auth.isAppOwner()) {
      setBusy(false)
      setError(MESSAGES.notOwner)
      return
    }
    setBusy(false)
    setOwnerNeeded(false)
    setNotice('تم تسجيل الدخول بحساب مالك التطبيق — اضغط «تعيين وفتح السجل» لإكمال التغيير')
  }

  async function submitReset(override) {
    if (busy) return
    setBusy(true)
    setError('')
    const result = await completeManagerReset(code, secret, override || confirm, {
      verified: verifiedCode !== '' && verifiedCode === code,
    })
    setBusy(false)
    if (result && result.ok) return
    if (result && result.error === 'owner') {
      /* the code was accepted — keep it so the retry after signing in does not
         need a fresh mail */
      setVerifiedCode(code)
      setOwnerNeeded(true)
      setError(MESSAGES.owner)
      return
    }
    setError(MESSAGES[result?.error] || MESSAGES.save)
  }

  const titles = {
    unlock: 'منطقة المدير',
    setup: 'كلمة سر المدير',
    reset: 'استعادة كلمة سر المدير',
  }
  const subtitles = {
    unlock: 'سجل المبيعات وصافي الربح والمخزن محمية — أدخل كلمة سر المدير',
    setup:
      'أنشئ كلمة سر أو نمطًا للمدير — يمكنك تغييرها في أي وقت من إعدادات السجل',
    reset: 'كود تحقق يُرسل إلى بريد الاستعادة ثم تعيّن كلمة سر جديدة',
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex min-h-full w-full max-w-md flex-col items-center justify-center px-4 py-8">
        <div
          className={`anim-pop w-full rounded-3xl border border-slate-700/80 bg-slate-800/60 p-5 shadow-[0_30px_80px_-20px_rgba(2,8,23,0.9)] md:p-6 ${
            shake ? 'anim-shake' : ''
          }`}
        >
          <div className="flex flex-col items-center text-center">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-sky-400 to-emerald-400 text-slate-950 shadow-lg shadow-sky-500/25">
              {view === 'reset' ? (
                <MailCheck className="h-7 w-7" strokeWidth={2.2} />
              ) : view === 'setup' ? (
                <Sparkles className="h-7 w-7" strokeWidth={2.2} />
              ) : (
                <Lock className="h-7 w-7" strokeWidth={2.3} />
              )}
            </div>
            <h2 className="mt-3 font-display text-xl font-extrabold tracking-tight text-slate-50">
              {titles[view]}
            </h2>
            <p className="mt-1 max-w-xs text-[11.5px] font-semibold leading-relaxed text-slate-400">
              {subtitles[view]}
            </p>
          </div>

          <div className="mt-5">
            {view === 'unlock' && (
              <ManagerSecretForm
                mode={mode}
                setMode={setMode}
                value={secret}
                onChange={(v) => {
                  setSecret(v)
                  if (error) setError('')
                }}
                onSubmit={(drawn) => attemptUnlock(drawn || secret)}
                busy={busy}
                error={error}
                submitLabel="دخول السجل"
                hint="كلمة السر محفوظة على السيرفر ولا يقرأها أحد من داخل التطبيق."
                autoFocus
              />
            )}

            {view === 'setup' && (
              <ManagerSecretForm
                mode={mode}
                setMode={setMode}
                value={secret}
                onChange={(v) => {
                  setSecret(v)
                  if (error) setError('')
                }}
                confirm={confirm}
                onConfirmChange={(v) => {
                  setConfirm(v)
                  if (error) setError('')
                }}
                confirmMode
                onSubmit={submitSetup}
                busy={busy}
                error={error}
                submitLabel="حفظ وفتح السجل"
                hint="٤ أحرف على الأقل — أرقام أو حروف أو رموز، أو نمط من ٤ نقاط فأكثر."
                autoFocus
              />
            )}

            {view === 'reset' && (
              <div className="space-y-3">
                <div className="rounded-2xl border border-slate-700/70 bg-slate-900/50 p-3 text-center">
                  <p className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-slate-300">
                    <Mail className="h-3.5 w-3.5 text-sky-400" />
                    بريد الاستعادة
                  </p>
                  <p className="mt-1 truncate text-[12px] font-extrabold tabular-nums text-sky-300" dir="ltr">
                    {MANAGER_RECOVERY_EMAIL}
                  </p>
                </div>

                {!codeSent ? (
                  <button
                    type="button"
                    onClick={requestCode}
                    disabled={busy}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-sky-500 py-2.5 text-[12.5px] font-extrabold text-slate-950 shadow-lg shadow-sky-500/20 transition hover:bg-sky-400 disabled:opacity-60"
                  >
                    {busy ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Mail className="h-3.5 w-3.5" />
                    )}
                    أرسل كود التحقق
                  </button>
                ) : (
                  <>
                    <label className="block">
                      <span className="mb-1 block text-[10.5px] font-bold text-slate-400">
                        كود التحقق (٦ أرقام)
                      </span>
                      <input
                        value={code}
                        onChange={(e) => {
                          setCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                          if (error) setError('')
                        }}
                        inputMode="numeric"
                        dir="ltr"
                        autoComplete="one-time-code"
                        placeholder="••••••"
                        className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2.5 text-center text-lg font-extrabold tracking-[0.5em] tabular-nums text-slate-100 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20"
                      />
                    </label>

                    <ManagerSecretForm
                      mode={mode}
                      setMode={setMode}
                      value={secret}
                      onChange={(v) => {
                        setSecret(v)
                        if (error) setError('')
                      }}
                      confirm={confirm}
                      onConfirmChange={(v) => {
                        setConfirm(v)
                        if (error) setError('')
                      }}
                      confirmMode
                      onSubmit={submitReset}
                      busy={busy}
                      error={error}
                      submitLabel="تعيين وفتح السجل"
                      secretLabel={mode === 'pattern' ? 'النمط الجديد' : 'كلمة السر الجديدة'}
                      confirmLabel={mode === 'pattern' ? 'تأكيد النمط' : 'تأكيد كلمة السر'}
                      hint="انسخ الكود من بريد الاستعادة، ثم اكتب كلمة السر الجديدة مرتين."
                    />

                    {ownerNeeded && (
                      <div className="rounded-2xl border border-sky-500/40 bg-sky-500/10 p-3">
                        <p className="flex items-start gap-1.5 text-[10.5px] font-bold leading-relaxed text-sky-200">
                          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          السيرفر لا يسمح بتغيير كلمة سر موجودة إلا من يثبت القديمة أو من
                          حساب مالك التطبيق. سجّل الدخول مرة واحدة على هذا الجهاز ثم أعد
                          الضغط على «تعيين وفتح السجل».
                        </p>
                        <button
                          type="button"
                          onClick={signInAsOwner}
                          disabled={busy}
                          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl bg-sky-500 py-2.5 text-[12px] font-extrabold text-slate-950 transition hover:bg-sky-400 disabled:opacity-60"
                        >
                          {busy ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <LogIn className="h-3.5 w-3.5" />
                          )}
                          تسجيل الدخول بحساب مالك التطبيق
                        </button>
                      </div>
                    )}

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={requestCode}
                        disabled={busy || cooldown > 0}
                        className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-700/80 bg-slate-900/40 px-3 py-2 text-[11px] font-extrabold text-slate-300 transition hover:border-sky-500/50 hover:text-sky-300 disabled:opacity-50"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        {cooldown > 0
                          ? `إعادة الإرسال بعد ${cooldown} ث`
                          : 'إعادة إرسال كود جديد'}
                      </button>
                      <button
                        type="button"
                        onClick={() => enterCodeAgain()}
                        disabled={busy}
                        className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-700/80 bg-slate-900/40 px-3 py-2 text-[11px] font-extrabold text-slate-300 transition hover:border-slate-500 disabled:opacity-50"
                      >
                        <KeyRound className="h-3.5 w-3.5" />
                        عندي كود قديم — إدخاله
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {notice && (
              <p className="anim-fade-up mt-3 flex items-center gap-1.5 rounded-xl bg-emerald-500/10 px-3 py-2 text-[11px] font-bold text-emerald-300">
                <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={3} />
                {notice}
              </p>
            )}
            {view === 'reset' && error && (
              <p className="anim-fade-up mt-3 flex items-center gap-1.5 rounded-xl bg-rose-500/10 px-3 py-2 text-[11px] font-bold text-rose-300">
                <TriangleAlert className="h-3.5 w-3.5 shrink-0" />
                {error}
              </p>
            )}
          </div>

          {/* ------------------------------------------------------ links */}
          <div className="mt-4 space-y-1.5 border-t border-slate-700/60 pt-3">
            {view === 'unlock' && (
              <>
                <button
                  type="button"
                  onClick={() => go('reset')}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-700/80 bg-slate-900/40 px-3 py-2 text-[11px] font-extrabold text-slate-300 transition hover:border-sky-500/50 hover:text-sky-300"
                >
                  <Mail className="h-3.5 w-3.5" />
                  نسيت كلمة السر؟ استعادتها بالبريد
                </button>
                <button
                  type="button"
                  onClick={() => go('setup')}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-700/80 bg-slate-900/40 px-3 py-2 text-[11px] font-extrabold text-slate-300 transition hover:border-emerald-500/50 hover:text-emerald-300"
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  أول مرة؟ أنشئ كلمة سر المدير
                </button>
              </>
            )}
            {view !== 'unlock' && (
              <button
                type="button"
                onClick={() => go('unlock')}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-700/80 bg-slate-900/40 px-3 py-2 text-[11px] font-extrabold text-slate-300 transition hover:border-sky-500/50 hover:text-sky-300"
              >
                <ArrowRight className="h-3.5 w-3.5" />
                رجوع لشاشة الدخول
              </button>
            )}
            {failures >= 2 && view === 'unlock' && (
              <p className="px-1 text-center text-[10px] font-semibold leading-relaxed text-slate-500">
                كلمة السر تُطلب في كل مرة تُفتح فيها هذه الشاشة.
              </p>
            )}
          </div>

          <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[10px] font-semibold text-slate-500">
            <ShieldCheck className="h-3 w-3" />
            كلمة سر المدير محفوظة على السيرفر — لا تُقرأ من داخل التطبيق ولا من البيانات
          </p>
        </div>
      </div>
    </div>
  )
}
