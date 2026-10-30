import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ReceiptText,
  Banknote,
  CreditCard,
  Loader2,
  TrendingUp,
  Package,
  FileText,
  CalendarDays,
  ShieldCheck,
  Lock,
  KeyRound,
  Check,
  TriangleAlert,
  X,
  SlidersHorizontal,
  BarChart3,
  PackageSearch,
  Trash2,
  Users,
  UserRound,
  LayoutDashboard,
  Wallet,
  FileSpreadsheet,
  ChevronLeft,
  ArrowRight,
  Percent,
  ShoppingBag,
} from 'lucide-react'
import { useLive } from '../lib/useLive'
import { db } from '../lib/db'
import { usePOS } from '../components/POSProvider'
import { formatMoney, formatDateTime, formatNumber, normalizeAr, paymentLabel } from '../format'
import InvoiceModal from '../components/InvoiceModal'
import ManagerPinGate from '../components/ManagerPinGate'
import ManagerSecretForm from '../components/ManagerSecretForm'
import InventoryExcel from '../components/InventoryExcel'
import Chart from '../components/Chart'

/* One cashier's box: their employee id, or their name for an invoice entered
   before the id was saved with it. */
function orderEmployeeKey(order) {
  if (order && order.employeeId) return String(order.employeeId)
  return `name:${(order && order.employeeName) || 'غير محدد'}`
}

/* ------------------------------------------------------------------ period */

function isoLocal(value) {
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function shiftDays(base, delta) {
  const d = new Date(base)
  d.setDate(d.getDate() + delta)
  return d
}

function rangeFor(preset) {
  const now = new Date()
  if (preset === 'today') return { from: isoLocal(now), to: isoLocal(now) }
  if (preset === 'yesterday') {
    const y = shiftDays(now, -1)
    return { from: isoLocal(y), to: isoLocal(y) }
  }
  if (preset === 'week') return { from: isoLocal(shiftDays(now, -6)), to: isoLocal(now) }
  if (preset === 'month') {
    const first = new Date(now.getFullYear(), now.getMonth(), 1)
    return { from: isoLocal(first), to: isoLocal(now) }
  }
  return { from: '', to: '' }
}

const PRESETS = [
  { id: 'today', label: 'اليوم' },
  { id: 'yesterday', label: 'أمس' },
  { id: 'week', label: 'آخر ٧ أيام' },
  { id: 'month', label: 'هذا الشهر' },
  { id: 'all', label: 'كل الفترات' },
]

const SECTIONS = [
  { id: 'overview', label: 'نظرة عامة', icon: LayoutDashboard, tone: 'sky' },
  { id: 'profit', label: 'صافي الربح', icon: Wallet, tone: 'emerald' },
  { id: 'items', label: 'الأصناف', icon: BarChart3, tone: 'amber' },
  { id: 'cashiers', label: 'الكاشيرين', icon: Users, tone: 'violet' },
  { id: 'invoices', label: 'الفواتير', icon: ReceiptText, tone: 'sky' },
  { id: 'stock', label: 'المخزن وExcel', icon: FileSpreadsheet, tone: 'emerald' },
  { id: 'settings', label: 'إعدادات المدير', icon: ShieldCheck, tone: 'slate' },
]

const TONES = {
  sky: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
  emerald: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  amber: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  violet: 'border-violet-500/30 bg-violet-500/10 text-violet-300',
  slate: 'border-slate-600/60 bg-slate-800/60 text-slate-200',
}

function StatCard({ icon: Icon, label, value, tone = 'slate', hint = '' }) {
  return (
    <div className={`rounded-2xl border p-3 ${TONES[tone] || TONES.slate}`}>
      <div className="flex items-center gap-1.5 text-[11px] font-bold opacity-80">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-1 font-display text-lg font-extrabold tabular-nums md:text-xl">
        {value}
      </p>
      {hint && <p className="mt-0.5 text-[9.5px] font-semibold opacity-70">{hint}</p>}
    </div>
  )
}

/* ------------------------------------------------------ manager settings */

function ManagerSettings() {
  const { lockManager, changeManagerPin, verifyManagerSecret } = usePOS()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState('current')
  const [mode, setMode] = useState('password')
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const noticeTimer = useRef(null)

  useEffect(
    () => () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current)
    },
    [],
  )

  function reset() {
    setStep('current')
    setMode('password')
    setCurrent('')
    setNext('')
    setConfirm('')
    setError('')
  }

  /* step 1 — prove the current secret, whatever mode it was set in */
  async function verifyCurrent(drawn) {
    if (busy) return
    setError('')
    const entered = String(drawn || current).trim()
    if (entered.length < 4) {
      setError('أدخل كلمة السر الحالية أولًا')
      return
    }
    setBusy(true)
    const result = await verifyManagerSecret(entered)
    setBusy(false)
    if (result && result.ok) {
      setCurrent(entered)
      setStep('new')
      return
    }
    if (result?.error === 'attempts') setError('محاولات كثيرة — حاول بعد دقيقة')
    else if (result?.error === 'network') setError('تعذر التحقق — تحقق من الاتصال')
    else setError('كلمة السر الحالية غير صحيحة')
  }

  /* step 2 — set the new one */
  async function submitNew(overrideConfirm) {
    if (busy) return
    setError('')
    const confirmed = String(overrideConfirm || confirm).trim()
    if (String(next).trim().length < 4) {
      setError('كلمة السر الجديدة تحتاج ٤ أحرف على الأقل')
      return
    }
    if (String(next).trim() !== confirmed) {
      setError('التأكيد غير مطابق')
      return
    }
    setBusy(true)
    const result = await changeManagerPin(current, next, confirmed)
    setBusy(false)
    if (result && result.ok) {
      setOpen(false)
      reset()
      setNotice('تم تحديث كلمة سر المدير — تُطلب الجديدة في المرة القادمة')
      if (noticeTimer.current) clearTimeout(noticeTimer.current)
      noticeTimer.current = setTimeout(() => setNotice(''), 4500)
      return
    }
    if (result?.error === 'current') {
      setStep('current')
      setError('كلمة السر الحالية غير صحيحة')
    } else if (result?.error === 'match') setError('التأكيد غير مطابق')
    else if (result?.error === 'attempts') setError('محاولات كثيرة — حاول بعد دقيقة')
    else if (result?.error === 'save') setError('تعذر الحفظ — حاول مرة أخرى')
    else setError('كلمة السر الجديدة تحتاج ٤ أحرف على الأقل')
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-800/60">
        <div className="flex flex-wrap items-center gap-2 p-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-500/15 text-emerald-400">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-extrabold text-slate-100">كلمة سر المدير</p>
            <p className="text-[10.5px] font-semibold leading-tight text-slate-400">
              ٤ أحرف على الأقل (أرقام أو حروف أو رموز) أو نمط مرسوم — تُتحقق على السيرفر
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                if (!open) reset()
                setOpen((v) => !v)
                setError('')
                setNotice('')
              }}
              className="flex items-center gap-1 rounded-xl border border-slate-600/80 bg-slate-900/60 px-2.5 py-2 text-[11px] font-extrabold text-slate-200 transition hover:border-sky-500/60 hover:text-sky-300"
            >
              <KeyRound className="h-3.5 w-3.5" />
              تغيير
            </button>
            <button
              type="button"
              onClick={lockManager}
              className="flex items-center gap-1 rounded-xl border border-slate-600/80 bg-slate-900/60 px-2.5 py-2 text-[11px] font-extrabold text-slate-200 transition hover:border-rose-500/50 hover:text-rose-300"
            >
              <Lock className="h-3.5 w-3.5" />
              قفل
            </button>
          </div>
        </div>

        {notice && (
          <p className="anim-fade-up mx-3 mb-3 flex items-center gap-1.5 rounded-xl bg-emerald-500/10 px-3 py-2 text-[11px] font-bold text-emerald-300">
            <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={3} />
            {notice}
          </p>
        )}

        {open && (
          <div className="anim-fade-up border-t border-slate-700/60 bg-slate-900/40 px-3 py-3">
            {step === 'current' ? (
              <ManagerSecretForm
                mode={mode}
                setMode={setMode}
                value={current}
                onChange={(v) => {
                  setCurrent(v)
                  setError('')
                }}
                onSubmit={verifyCurrent}
                busy={busy}
                error={error}
                submitLabel="متابعة للتغيير"
                secretLabel="كلمة السر الحالية"
                hint="نحتاج كلمة السر الحالية أولًا قبل تعيين كلمة سر أو نمط جديد."
                autoFocus
              />
            ) : (
              <ManagerSecretForm
                mode={mode}
                setMode={setMode}
                value={next}
                onChange={(v) => {
                  setNext(v)
                  setError('')
                }}
                confirm={confirm}
                onConfirmChange={(v) => {
                  setConfirm(v)
                  setError('')
                }}
                confirmMode
                onSubmit={submitNew}
                busy={busy}
                error={error}
                submitLabel="حفظ كلمة السر"
                secretLabel="كلمة السر الجديدة"
                confirmLabel="تأكيد كلمة السر الجديدة"
                hint="٤ أحرف على الأقل (أرقام أو حروف أو رموز) أو نمط من ٤ نقاط فأكثر."
              />
            )}
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                reset()
              }}
              className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg border border-slate-700 px-3 py-1.5 text-[10.5px] font-bold text-slate-400 transition hover:text-slate-200"
            >
              <X className="h-3 w-3" />
              إغلاق
            </button>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-700/70 bg-slate-800/60 p-3">
        <p className="text-[11.5px] font-extrabold text-slate-100">نسيت كلمة السر؟</p>
        <p className="mt-1 text-[10.5px] font-semibold leading-relaxed text-slate-400">
          من شاشة قفل المدير اضغط «نسيت كلمة السر؟ استعادتها بالبريد» — يُرسل كود تحقق
          إلى بريد الاستعادة ثم تعيّن كلمة سر أو نمطًا جديدًا.
        </p>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------- page */

export default function Orders() {
  const { managerUnlocked, products } = usePOS()
  const { data: orders, loading } = useLive('orders', { order: '-createdAt' })
  const [openOrder, setOpenOrder] = useState(null)
  const [section, setSection] = useState('overview')

  const [preset, setPreset] = useState('today')
  const initial = useMemo(() => rangeFor('today'), [])
  const [fromDate, setFromDate] = useState(initial.from)
  const [toDate, setToDate] = useState(initial.to)

  const [wipeOpen, setWipeOpen] = useState(false)
  const [wiping, setWiping] = useState(false)
  const [wipeNotice, setWipeNotice] = useState('')
  const [wipeError, setWipeError] = useState('')
  const wipeTimer = useRef(null)

  useEffect(
    () => () => {
      if (wipeTimer.current) clearTimeout(wipeTimer.current)
    },
    [],
  )

  const list = useMemo(() => (Array.isArray(orders) ? orders : []), [orders])

  function applyPreset(id) {
    setPreset(id)
    const range = rangeFor(id)
    setFromDate(range.from)
    setToDate(range.to)
  }

  const periodLabelText =
    fromDate || toDate ? `${fromDate || '…'} ← ${toDate || '…'}` : 'كل السجل'

  const visible = useMemo(
    () =>
      list.filter((order) => {
        const key = isoLocal(order.date || order.createdAt)
        if (!key) return !fromDate && !toDate
        if (fromDate && key < fromDate) return false
        if (toDate && key > toDate) return false
        return true
      }),
    [list, fromDate, toDate],
  )

  /* cost lookup — the purchasing price the manager stored per product */
  const costLookup = useMemo(() => {
    const byId = new Map()
    const byName = new Map()
    for (const product of products) {
      const cost = Number(product.cost) || 0
      byId.set(String(product.id), cost)
      byName.set(normalizeAr(product.name), cost)
    }
    return { byId, byName }
  }, [products])

  function unitCostOf(line) {
    const snapshot = Number(line?.cost)
    if (Number.isFinite(snapshot) && snapshot > 0) return snapshot
    const pid = line?.productId ? String(line.productId) : ''
    if (pid && costLookup.byId.has(pid)) return costLookup.byId.get(pid)
    return costLookup.byName.get(normalizeAr(line?.name)) || 0
  }

  /* هر كاشير في الفترة = إجماليات فواتيره وحدها */
  const employeeStats = useMemo(() => {
    const map = new Map()
    for (const order of visible) {
      const key = orderEmployeeKey(order)
      const current =
        map.get(key) || {
          key,
          name: order.employeeName || 'غير محدد',
          total: 0,
          cash: 0,
          visa: 0,
          count: 0,
          pieces: 0,
        }
      const value = Number(order.total) || 0
      current.total += value
      if (order.payment === 'visa') current.visa += value
      else current.cash += value
      current.count += 1
      current.pieces += Number(order.totalQty) || 0
      map.set(key, current)
    }
    return [...map.values()].sort((a, b) => b.total - a.total)
  }, [visible])

  /* المحدد من صندوق كاشير — يضيّق التحليلات والفواتير عليه */
  const [employeeFilter, setEmployeeFilter] = useState('')
  const selectedEmployeeName =
    employeeStats.find((row) => row.key === employeeFilter)?.name || ''

  const shown = useMemo(
    () =>
      employeeFilter
        ? visible.filter((order) => orderEmployeeKey(order) === employeeFilter)
        : visible,
    [visible, employeeFilter],
  )

  const period = useMemo(() => {
    let cash = 0
    let visa = 0
    let pieces = 0
    let cost = 0
    const byProduct = new Map()

    for (const order of shown) {
      const value = Number(order.total) || 0
      if (order.payment === 'visa') visa += value
      else cash += value
      pieces += Number(order.totalQty) || 0

      const items = Array.isArray(order.items) ? order.items : []
      for (const line of items) {
        const name = line?.name || 'صنف'
        const qty = Number(line?.qty) || 0
        const price = Number(line?.price) || 0
        const revenue = price * qty
        const unitCost = unitCostOf(line)
        const lineCost = unitCost * qty
        cost += lineCost

        const key = line?.productId ? String(line.productId) : `n:${name}`
        const prev = byProduct.get(key)
        if (prev) {
          prev.qty += qty
          prev.revenue += revenue
          prev.cost += lineCost
        } else {
          byProduct.set(key, { key, name, qty, revenue, cost: lineCost })
        }
      }
    }

    const breakdown = [...byProduct.values()]
      .map((row) => ({
        ...row,
        profit: row.revenue - row.cost,
        unitCost: row.qty ? row.cost / row.qty : 0,
        margin: row.revenue ? ((row.revenue - row.cost) / row.revenue) * 100 : 0,
      }))
      .sort((a, b) => b.qty - a.qty || b.revenue - a.revenue)

    const revenue = cash + visa
    const profit = revenue - cost

    return {
      cash,
      visa,
      revenue,
      cost,
      profit,
      margin: revenue ? (profit / revenue) * 100 : 0,
      pieces,
      count: shown.length,
      breakdown,
      missingCosts: breakdown.filter((row) => row.unitCost <= 0).length,
      maxQty: breakdown.reduce((max, row) => (row.qty > max ? row.qty : max), 0),
    }
  }, [shown, costLookup])

  const chartSpec = useMemo(() => {
    const top = period.breakdown.slice(0, 8)
    if (!top.length) return null
    return {
      kind: 'hbar',
      labels: top.map((row) =>
        row.name.length > 24 ? `${row.name.slice(0, 23)}…` : row.name,
      ),
      series: [{ name: 'قطع', data: top.map((row) => row.qty), color: '#38bdf8' }],
      options: { title: 'أكثر الأصناف مبيعًا (بالقطع)' },
    }
  }, [period.breakdown])

  const overall = useMemo(() => {
    let total = 0
    for (const order of list) total += Number(order.total) || 0
    return { total, count: list.length }
  }, [list])

  const stockTotals = useMemo(() => {
    let stock = 0
    for (const product of products) stock += Number(product.stock) || 0
    return stock
  }, [products])

  /* تصفير سجل الفترة المحددة: يحذف فواتير الفترة من السجل (بعد تأكيد صريح).
     عدّادات «مبيع» الأصناف لها زرها المستقل في إدارة الأصناف. */
  async function wipePeriod() {
    if (wiping) return
    const targets = visible.filter((order) => order.id)
    if (!targets.length) return
    setWiping(true)
    setWipeError('')
    setWipeNotice('')
    let removed = 0
    let failed = 0
    const chunk = 6
    for (let i = 0; i < targets.length; i += chunk) {
      const slice = targets.slice(i, i + chunk)
      const results = await Promise.all(
        slice.map(async (order) => {
          try {
            await db.delete('orders', order.id)
            return true
          } catch {
            return false
          }
        }),
      )
      for (const ok of results) {
        if (ok) removed += 1
        else failed += 1
      }
    }
    setWiping(false)
    setWipeOpen(false)
    if (removed) {
      setWipeNotice(
        `تم تصفير ${formatNumber(removed)} فاتورة من سجل ${periodLabelText}`,
      )
      if (wipeTimer.current) clearTimeout(wipeTimer.current)
      wipeTimer.current = setTimeout(() => setWipeNotice(''), 5000)
    }
    if (failed) {
      setWipeError(
        `${formatNumber(failed)} فاتورة لم تُصفَّر — تحقق من الاتصال وأعد المحاولة`,
      )
    }
  }

  if (!managerUnlocked) return <ManagerPinGate />

  const hubValues = {
    overview: formatMoney(period.revenue),
    profit: formatMoney(period.profit),
    items: `${formatNumber(period.breakdown.length)} صنف`,
    cashiers: `${formatNumber(employeeStats.length)} كاشير`,
    invoices: `${formatNumber(period.count)} فاتورة`,
    stock: `${formatNumber(stockTotals)} قطعة`,
    settings: 'كلمة السر والنمط',
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-[1400px] px-3 py-4 md:px-6 md:py-6">
        {/* ------------------------------------------------------- header */}
        <div className="mb-3 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-sky-400 to-emerald-400 text-slate-950 shadow-lg shadow-sky-500/20">
            <ReceiptText className="h-6 w-6" strokeWidth={2.3} />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-xl font-extrabold text-slate-50 md:text-2xl">
              سجل المبيعات
            </h1>
            <p className="text-[11.5px] text-slate-400">
              الفترة الحالية: {periodLabelText} · {formatNumber(period.count)} فاتورة
            </p>
          </div>
          <div className="hidden items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-[10.5px] font-extrabold text-emerald-300 sm:flex">
            <ShieldCheck className="h-3.5 w-3.5" />
            منطقة المدير
          </div>
        </div>

        {/* -------------------------------------------------- period bar */}
        <div className="mb-3 rounded-2xl border border-slate-700/70 bg-slate-800/60 p-2.5">
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-extrabold text-slate-300">
            <SlidersHorizontal className="h-3.5 w-3.5 text-sky-400" />
            فلترة الفترة
            <span className="ms-auto text-[10px] font-bold text-slate-500">
              إجمالي السجل الكامل {formatMoney(overall.total)} ({formatNumber(overall.count)})
            </span>
          </div>

          <div className="no-scrollbar mb-2 flex gap-1.5 overflow-x-auto pb-0.5">
            {PRESETS.map((option) => {
              const active = preset === option.id
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => applyPreset(option.id)}
                  className={`shrink-0 rounded-xl border px-3 py-1.5 text-[11.5px] font-extrabold transition active:scale-[0.97] ${
                    active
                      ? 'border-sky-400 bg-sky-500/20 text-sky-300'
                      : 'border-slate-600/80 bg-slate-900/50 text-slate-300 hover:border-sky-500/50 hover:text-sky-300'
                  }`}
                >
                  {option.label}
                </button>
              )
            })}
          </div>

          <div className="grid grid-cols-2 gap-2 md:max-w-md">
            <label className="block">
              <span className="mb-1 block text-[10px] font-bold text-slate-400">من تاريخ</span>
              <input
                type="date"
                dir="ltr"
                value={fromDate}
                max={toDate || undefined}
                onChange={(e) => {
                  setFromDate(e.target.value)
                  setPreset('custom')
                }}
                className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-2.5 py-1.5 text-left text-[12px] font-bold tabular-nums text-slate-100 outline-none focus:border-sky-400"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] font-bold text-slate-400">إلى تاريخ</span>
              <input
                type="date"
                dir="ltr"
                value={toDate}
                min={fromDate || undefined}
                onChange={(e) => {
                  setToDate(e.target.value)
                  setPreset('custom')
                }}
                className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-2.5 py-1.5 text-left text-[12px] font-bold tabular-nums text-slate-100 outline-none focus:border-sky-400"
              />
            </label>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {!wipeOpen ? (
              <button
                type="button"
                onClick={() => {
                  setWipeOpen(true)
                  setWipeError('')
                  setWipeNotice('')
                }}
                disabled={wiping || visible.length === 0}
                className="flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/10 px-2.5 py-1.5 text-[10.5px] font-extrabold text-rose-300 transition hover:border-rose-400/70 hover:bg-rose-500/20 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {wiping ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Trash2 className="h-3 w-3" />
                )}
                {fromDate || toDate ? 'تصفير سجل الفترة' : 'تصفير السجل بالكامل'}
                <span className="rounded-md bg-rose-500/20 px-1.5 py-0.5 tabular-nums">
                  {formatNumber(visible.length)}
                </span>
              </button>
            ) : (
              <div className="anim-fade-up flex w-full flex-wrap items-center gap-2 rounded-xl border border-rose-500/50 bg-rose-500/10 px-2.5 py-2">
                <p className="min-w-0 flex-1 text-[10.5px] font-extrabold leading-snug text-rose-200">
                  حذف {formatNumber(visible.length)} فاتورة من {periodLabelText} نهائيًا؟
                  <span className="mt-0.5 block text-[9.5px] font-semibold text-rose-300/80">
                    لا يمكن استرجاعها — وعدّادات «مبيع» الأصناف لها زرها المستقل.
                  </span>
                </p>
                <button
                  type="button"
                  onClick={wipePeriod}
                  disabled={wiping}
                  className="flex items-center gap-1 rounded-lg bg-rose-500 px-2.5 py-1.5 text-[10.5px] font-extrabold text-white transition hover:bg-rose-400 disabled:opacity-60"
                >
                  {wiping ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="h-3 w-3" />
                  )}
                  نعم، صفّر
                </button>
                <button
                  type="button"
                  onClick={() => setWipeOpen(false)}
                  disabled={wiping}
                  className="rounded-lg border border-slate-600 px-2 py-1.5 text-[10.5px] font-bold text-slate-300"
                >
                  إلغاء
                </button>
              </div>
            )}
          </div>

          {wipeNotice && (
            <p className="anim-fade-up mt-2 flex items-center gap-1.5 rounded-xl bg-emerald-500/10 px-3 py-1.5 text-[10.5px] font-bold text-emerald-300">
              <Check className="h-3 w-3 shrink-0" strokeWidth={3} />
              {wipeNotice}
            </p>
          )}
          {wipeError && (
            <p className="anim-fade-up mt-2 flex items-center gap-1.5 rounded-xl bg-rose-500/10 px-3 py-1.5 text-[10.5px] font-bold text-rose-300">
              <TriangleAlert className="h-3 w-3 shrink-0" />
              {wipeError}
            </p>
          )}
        </div>

        {/* -------------------------------------------------------- hub */}
        <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
          {SECTIONS.map((item, index) => {
            const Icon = item.icon
            const active = section === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                className={`anim-fade-up group flex items-center gap-2 rounded-2xl border px-2.5 py-2 text-right transition active:scale-[0.98] ${
                  active
                    ? 'border-sky-400 bg-sky-500/15 shadow-lg shadow-sky-500/10'
                    : 'border-slate-700/70 bg-slate-800/60 hover:border-sky-500/50'
                }`}
                style={{ animationDelay: `${Math.min(index, 8) * 22}ms` }}
              >
                <span
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl border ${
                    active ? TONES.sky : TONES[item.tone] || TONES.slate
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11.5px] font-extrabold text-slate-100">
                    {item.label}
                  </span>
                  <span className="block truncate text-[9.5px] font-bold tabular-nums text-slate-400">
                    {hubValues[item.id]}
                  </span>
                </span>
                <ChevronLeft
                  className={`h-3.5 w-3.5 shrink-0 transition ${
                    active ? 'text-sky-300' : 'text-slate-600 group-hover:text-sky-400'
                  }`}
                />
              </button>
            )
          })}
        </div>

        {/* ---------------------------------------------------- sections */}
        {section !== 'overview' && (
          <button
            type="button"
            onClick={() => setSection('overview')}
            className="mb-2 flex items-center gap-1 rounded-lg border border-slate-700/70 bg-slate-800/50 px-2 py-1 text-[10.5px] font-bold text-slate-300 transition hover:border-sky-500/50 hover:text-sky-300"
          >
            <ArrowRight className="h-3 w-3" />
            رجوع لكل الأقسام
          </button>
        )}

        {employeeFilter && section !== 'cashiers' && (
          <p className="anim-fade-up mb-2 flex items-center gap-1.5 rounded-xl bg-sky-500/10 px-3 py-2 text-[11px] font-bold text-sky-300">
            <UserRound className="h-3.5 w-3.5" />
            تعرض الآن مبيعات {selectedEmployeeName} وحدها
            <button
              type="button"
              onClick={() => setEmployeeFilter('')}
              className="ms-auto rounded-md bg-sky-500/20 px-1.5 py-0.5 text-[10px] font-extrabold text-sky-200"
            >
              عرض الكل
            </button>
          </p>
        )}

        <div key={section} className="anim-fade-up">
          {section === 'overview' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-6">
                <StatCard
                  icon={TrendingUp}
                  label="مبيعات الفترة"
                  value={formatMoney(period.revenue)}
                  tone="sky"
                />
                <StatCard
                  icon={Wallet}
                  label="صافي الربح"
                  value={formatMoney(period.profit)}
                  tone="emerald"
                  hint={`هامش ${formatNumber(Math.round(period.margin))}%`}
                />
                <StatCard
                  icon={Banknote}
                  label="كاش 💵"
                  value={formatMoney(period.cash)}
                  tone="slate"
                />
                <StatCard
                  icon={CreditCard}
                  label="فيزا 💳"
                  value={formatMoney(period.visa)}
                  tone="violet"
                />
                <StatCard
                  icon={Package}
                  label="القطع المباعة"
                  value={formatNumber(period.pieces)}
                  tone="amber"
                />
                <StatCard
                  icon={ReceiptText}
                  label="عدد الفواتير"
                  value={formatNumber(period.count)}
                  tone="slate"
                />
              </div>

              {period.missingCosts > 0 && (
                <button
                  type="button"
                  onClick={() => setSection('stock')}
                  className="flex w-full items-center gap-2 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-right text-[11px] font-bold text-amber-200 transition hover:bg-amber-500/15"
                >
                  <TriangleAlert className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 flex-1">
                    {formatNumber(period.missingCosts)} صنف مبيع بدون سعر شراء — صافي الربح
                    غير دقيق حتى تدخل تكلفته.
                  </span>
                  <ChevronLeft className="h-3.5 w-3.5 shrink-0" />
                </button>
              )}

              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-700/70 bg-slate-800/60 p-3">
                  <div className="mb-2 flex items-center gap-1.5 text-[12px] font-extrabold text-slate-100">
                    <Users className="h-4 w-4 text-violet-400" />
                    أعلى الكاشيرين في الفترة
                  </div>
                  {employeeStats.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-slate-700/70 px-3 py-6 text-center text-[11px] font-semibold text-slate-500">
                      لا مبيعات في هذه الفترة.
                    </p>
                  ) : (
                    <ul className="space-y-1.5">
                      {employeeStats.slice(0, 4).map((emp) => (
                        <li
                          key={emp.key}
                          className="flex items-center gap-2 rounded-xl bg-slate-900/40 px-2.5 py-2"
                        >
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-violet-400 to-sky-400 font-display text-[12px] font-extrabold text-slate-950">
                            {(emp.name || '؟').trim().charAt(0)}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[12px] font-bold text-slate-100">
                              {emp.name}
                            </span>
                            <span className="block text-[9.5px] font-semibold text-slate-500">
                              {formatNumber(emp.count)} فاتورة · {formatNumber(emp.pieces)} قطعة
                            </span>
                          </span>
                          <span className="shrink-0 font-display text-[12.5px] font-extrabold tabular-nums text-emerald-400">
                            {formatMoney(emp.total)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-700/70 bg-slate-800/60 p-3">
                  <div className="mb-2 flex items-center gap-1.5 text-[12px] font-extrabold text-slate-100">
                    <ShoppingBag className="h-4 w-4 text-amber-400" />
                    أعلى الأصناف
                  </div>
                  {period.breakdown.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-slate-700/70 px-3 py-6 text-center text-[11px] font-semibold text-slate-500">
                      لا مبيعات في هذه الفترة.
                    </p>
                  ) : (
                    <ul className="space-y-1.5">
                      {period.breakdown.slice(0, 4).map((row) => (
                        <li
                          key={row.key}
                          className="rounded-xl bg-slate-900/40 px-2.5 py-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="min-w-0 flex-1 truncate text-[12px] font-bold text-slate-100">
                              {row.name}
                            </p>
                            <span className="shrink-0 text-[10px] font-extrabold tabular-nums text-amber-300">
                              {formatNumber(row.qty)} قطعة
                            </span>
                          </div>
                          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-700/60">
                            <div
                              className="h-full rounded-full bg-gradient-to-l from-amber-400 to-sky-400"
                              style={{
                                width: `${Math.max(
                                  4,
                                  Math.round((row.qty / (period.maxQty || 1)) * 100),
                                )}%`,
                              }}
                            />
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}

          {section === 'profit' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
                <StatCard
                  icon={TrendingUp}
                  label="إجمالي البيع"
                  value={formatMoney(period.revenue)}
                  tone="sky"
                />
                <StatCard
                  icon={ShoppingBag}
                  label="إجمالي التكلفة"
                  value={formatMoney(period.cost)}
                  tone="slate"
                  hint="سعر الشراء × الكمية المباعة"
                />
                <StatCard
                  icon={Wallet}
                  label="صافي الربح"
                  value={formatMoney(period.profit)}
                  tone="emerald"
                />
                <StatCard
                  icon={Percent}
                  label="هامش الربح"
                  value={`${formatNumber(Math.round(period.margin))}%`}
                  tone="amber"
                />
              </div>

              {period.missingCosts > 0 && (
                <p className="flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[10.5px] font-bold leading-relaxed text-amber-200">
                  <TriangleAlert className="h-3.5 w-3.5 shrink-0" />
                  {formatNumber(period.missingCosts)} صنف مبيع سعر شرائه صفر — صافي الربح
                  يظهر أعلى من الحقيقة حتى تسجّل تكلفته من قسم «المخزن وExcel».
                </p>
              )}

              <div className="rounded-2xl border border-slate-700/70 bg-slate-800/60 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-[12px] font-extrabold text-slate-100">
                    <Wallet className="h-4 w-4 text-emerald-400" />
                    صافي ربح كل صنف في الفترة
                  </div>
                  <span className="rounded-lg bg-slate-900/60 px-2 py-1 text-[10px] font-bold tabular-nums text-slate-400">
                    {formatNumber(period.breakdown.length)} صنف
                  </span>
                </div>

                {period.breakdown.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700/70 px-6 py-10 text-center">
                    <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-800 text-slate-500">
                      <PackageSearch className="h-5 w-5" />
                    </div>
                    <p className="mt-3 font-display text-sm font-extrabold text-slate-200">
                      لا مبيعات في هذه الفترة
                    </p>
                    <p className="mt-1 max-w-sm text-[11px] leading-relaxed text-slate-500">
                      جرّب توسيع الفترة أو اختر «كل الفترات».
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[560px] border-separate border-spacing-y-1 text-right">
                      <thead>
                        <tr className="text-[10px] font-extrabold text-slate-500">
                          <th className="px-2 py-1 font-bold">الصنف</th>
                          <th className="px-2 py-1 font-bold">الكمية</th>
                          <th className="px-2 py-1 font-bold">البيع</th>
                          <th className="px-2 py-1 font-bold">تكلفة القطعة</th>
                          <th className="px-2 py-1 font-bold">إجمالي التكلفة</th>
                          <th className="px-2 py-1 font-bold">صافي الربح</th>
                          <th className="px-2 py-1 font-bold">الهامش</th>
                        </tr>
                      </thead>
                      <tbody>
                        {period.breakdown.map((row) => (
                          <tr key={row.key} className="bg-slate-900/40 text-[11.5px]">
                            <td className="max-w-[180px] truncate rounded-r-xl px-2 py-2 font-bold text-slate-100">
                              {row.name}
                            </td>
                            <td className="px-2 py-2 tabular-nums text-amber-300">
                              {formatNumber(row.qty)}
                            </td>
                            <td className="px-2 py-2 tabular-nums text-sky-300">
                              {formatMoney(row.revenue)}
                            </td>
                            <td className="px-2 py-2 tabular-nums text-slate-400">
                              {row.unitCost > 0 ? formatMoney(row.unitCost) : '—'}
                            </td>
                            <td className="px-2 py-2 tabular-nums text-slate-300">
                              {formatMoney(row.cost)}
                            </td>
                            <td
                              className={`px-2 py-2 font-extrabold tabular-nums ${
                                row.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              {formatMoney(row.profit)}
                            </td>
                            <td className="rounded-l-xl px-2 py-2 tabular-nums text-slate-400">
                              {formatNumber(Math.round(row.margin))}%
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-emerald-500/10 text-[12px] font-extrabold">
                          <td className="rounded-r-xl px-2 py-2 text-emerald-200">الإجمالي</td>
                          <td className="px-2 py-2 tabular-nums text-amber-200">
                            {formatNumber(period.pieces)}
                          </td>
                          <td className="px-2 py-2 tabular-nums text-sky-200">
                            {formatMoney(period.revenue)}
                          </td>
                          <td className="px-2 py-2 text-slate-400">—</td>
                          <td className="px-2 py-2 tabular-nums text-slate-200">
                            {formatMoney(period.cost)}
                          </td>
                          <td className="px-2 py-2 tabular-nums text-emerald-300">
                            {formatMoney(period.profit)}
                          </td>
                          <td className="rounded-l-xl px-2 py-2 tabular-nums text-emerald-200">
                            {formatNumber(Math.round(period.margin))}%
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setSection('stock')}
                  className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-600/80 bg-slate-900/50 px-3 py-2 text-[11px] font-extrabold text-slate-200 transition hover:border-sky-500/60 hover:text-sky-300"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  تعديل أسعار الشراء والكميات
                </button>
              </div>
            </div>
          )}

          {section === 'items' && (
            <div className="rounded-2xl border border-slate-700/70 bg-slate-800/60 p-3">
              <div className="mb-2.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-[12px] font-extrabold text-slate-100">
                  <BarChart3 className="h-4 w-4 text-emerald-400" />
                  تفصيل الأصناف في الفترة
                </div>
                <span className="rounded-lg bg-slate-900/60 px-2 py-1 text-[10px] font-bold tabular-nums text-slate-400">
                  {formatNumber(period.breakdown.length)} صنف
                </span>
              </div>

              {period.breakdown.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700/70 px-6 py-10 text-center">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-800 text-slate-500">
                    <PackageSearch className="h-5 w-5" />
                  </div>
                  <p className="mt-3 font-display text-sm font-extrabold text-slate-200">
                    لا مبيعات في هذه الفترة
                  </p>
                  <p className="mt-1 max-w-sm text-[11px] leading-relaxed text-slate-500">
                    جرّب توسيع الفترة أو اختر «كل الفترات» لعرض تفصيل كل الأصناف.
                  </p>
                </div>
              ) : (
                <>
                  {chartSpec && (
                    <div className="mb-3 rounded-xl border border-slate-700/60 bg-slate-900/40 p-2">
                      <Chart spec={chartSpec} />
                    </div>
                  )}

                  <ul className="space-y-1.5">
                    {period.breakdown.map((row, index) => (
                      <li
                        key={row.key}
                        className="anim-fade-up rounded-xl border border-slate-700/60 bg-slate-900/40 px-2.5 py-2"
                        style={{ animationDelay: `${Math.min(index, 12) * 18}ms` }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="min-w-0 flex-1 truncate text-[12.5px] font-bold text-slate-100">
                            <span className="me-1 text-[10px] font-extrabold tabular-nums text-slate-500">
                              {index + 1}.
                            </span>
                            {row.name}
                          </p>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-extrabold tabular-nums text-amber-300">
                              {formatNumber(row.qty)} قطعة
                            </span>
                            <span className="font-display text-[12px] font-extrabold tabular-nums text-emerald-400">
                              {formatMoney(row.revenue)}
                            </span>
                          </div>
                        </div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-700/60">
                          <div
                            className="h-full rounded-full bg-gradient-to-l from-emerald-400 to-sky-400"
                            style={{
                              width: `${Math.max(
                                3,
                                Math.round((row.qty / (period.maxQty || 1)) * 100),
                              )}%`,
                            }}
                          />
                        </div>
                        <p className="mt-1 text-[9.5px] font-bold text-slate-500">
                          صافي ربحه {formatMoney(row.profit)} · تكلفة القطعة{' '}
                          {row.unitCost > 0 ? formatMoney(row.unitCost) : 'غير مسجلة'}
                        </p>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}

          {section === 'cashiers' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-[12px] font-extrabold text-slate-100">
                  <Users className="h-4 w-4 text-violet-400" />
                  مبيعات كل كاشير في الفترة
                </div>
                {employeeFilter ? (
                  <button
                    type="button"
                    onClick={() => setEmployeeFilter('')}
                    className="flex items-center gap-1 rounded-lg border border-slate-600/80 bg-slate-900/50 px-2 py-1 text-[10.5px] font-extrabold text-slate-300 transition hover:border-sky-500/50 hover:text-sky-300"
                  >
                    <X className="h-3 w-3" />
                    عرض كل الفريق
                  </button>
                ) : (
                  <span className="text-[10px] font-bold text-slate-500">
                    اضغط على صندوق كاشير لعرض فواتيره وحدها
                  </span>
                )}
              </div>

              {employeeStats.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-700/70 px-3 py-6 text-center text-[11px] font-semibold text-slate-500">
                  لا مبيعات في هذه الفترة لعرضها لكل كاشير.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                  {employeeStats.map((emp, index) => {
                    const active = employeeFilter === emp.key
                    return (
                      <button
                        key={emp.key}
                        type="button"
                        onClick={() =>
                          setEmployeeFilter((prev) => (prev === emp.key ? '' : emp.key))
                        }
                        className={`anim-fade-up rounded-2xl border p-3 text-right transition active:scale-[0.99] ${
                          active
                            ? 'border-sky-400 bg-sky-500/10 shadow-lg shadow-sky-500/10'
                            : 'border-slate-700/70 bg-slate-800/60 hover:border-sky-500/50'
                        }`}
                        style={{ animationDelay: `${Math.min(index, 10) * 25}ms` }}
                      >
                        <div className="flex items-center gap-2">
                          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-400 to-sky-400 font-display text-sm font-extrabold text-slate-950">
                            {(emp.name || '؟').trim().charAt(0)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[12.5px] font-extrabold text-slate-100">
                              {emp.name}
                            </p>
                            <p className="text-[10px] font-semibold text-slate-400">
                              {formatNumber(emp.count)} فاتورة · {formatNumber(emp.pieces)} قطعة
                            </p>
                          </div>
                          {active && (
                            <span className="flex shrink-0 items-center gap-1 rounded-lg bg-sky-500/20 px-1.5 py-0.5 text-[9.5px] font-extrabold text-sky-300">
                              <Check className="h-2.5 w-2.5" strokeWidth={3} />
                              معروض
                            </span>
                          )}
                        </div>

                        <p className="mt-2 font-display text-lg font-extrabold tabular-nums text-emerald-400">
                          {formatMoney(emp.total)}
                        </p>

                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
                          <span className="flex items-center gap-1 rounded-md bg-slate-900/60 px-1.5 py-0.5 text-slate-300">
                            <Banknote className="h-2.5 w-2.5" />
                            كاش {formatMoney(emp.cash)}
                          </span>
                          <span className="flex items-center gap-1 rounded-md bg-violet-500/15 px-1.5 py-0.5 text-violet-300">
                            <CreditCard className="h-2.5 w-2.5" />
                            فيزا {formatMoney(emp.visa)}
                          </span>
                        </div>

                        <p className="mt-1.5 text-[10px] font-bold text-slate-500">
                          {active ? 'اعرض فواتير كل الفريق' : 'اعرض فواتيره كاملة'}
                        </p>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {section === 'invoices' && (
            <div>
              <div className="mb-2 flex items-center gap-1.5 text-[12px] font-extrabold text-slate-200">
                <CalendarDays className="h-4 w-4 text-sky-400" />
                فواتير الفترة
              </div>

              {loading && !list.length ? (
                <div className="flex items-center justify-center gap-2 rounded-3xl border border-slate-800 py-16 text-sm text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جارٍ تحميل السجل…
                </div>
              ) : list.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-700/70 px-6 py-16 text-center">
                  <div className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-800 text-slate-500">
                    <FileText className="h-7 w-7" />
                  </div>
                  <p className="mt-4 font-display text-lg font-extrabold text-slate-200">
                    لا توجد فواتير بعد
                  </p>
                  <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-500">
                    أول عملية بيع من شاشة الكاشير ستظهر هنا تلقائيًا مع إمكانية إعادة الطباعة.
                  </p>
                </div>
              ) : visible.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-700/70 px-6 py-14 text-center">
                  <div className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-800 text-slate-500">
                    <CalendarDays className="h-7 w-7" />
                  </div>
                  <p className="mt-4 font-display text-base font-extrabold text-slate-200">
                    لا فواتير في هذه الفترة
                  </p>
                  <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-500">
                    غيّر التواريخ أو اختر «كل الفترات» لعرض الفواتير السابقة.
                  </p>
                </div>
              ) : shown.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-700/70 px-6 py-14 text-center">
                  <div className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-800 text-slate-500">
                    <UserRound className="h-7 w-7" />
                  </div>
                  <p className="mt-4 font-display text-base font-extrabold text-slate-200">
                    لا فواتير لهذا الكاشير في الفترة
                  </p>
                  <button
                    type="button"
                    onClick={() => setEmployeeFilter('')}
                    className="mt-4 rounded-xl border border-slate-600/80 bg-slate-900/50 px-3 py-2 text-[11px] font-extrabold text-slate-200 transition hover:border-sky-500/60 hover:text-sky-300"
                  >
                    عرض كل الفريق
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 md:gap-3 xl:grid-cols-3">
                  {shown.map((order, index) => (
                    <div
                      key={order.id || order.orderId || index}
                      className="anim-fade-up rounded-2xl border border-slate-700/70 bg-slate-800/60 p-3 transition hover:border-sky-500/50"
                      style={{ animationDelay: `${Math.min(index, 12) * 25}ms` }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-display text-sm font-extrabold text-slate-100">
                            {order.orderId}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {formatDateTime(order.date || order.createdAt)}
                          </p>
                        </div>
                        <span
                          className={`flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-extrabold ${
                            order.payment === 'visa'
                              ? 'bg-violet-500/15 text-violet-300'
                              : 'bg-emerald-500/15 text-emerald-300'
                          }`}
                        >
                          {order.payment === 'visa' ? (
                            <CreditCard className="h-3 w-3" />
                          ) : (
                            <Banknote className="h-3 w-3" />
                          )}
                          {paymentLabel(order.payment)}
                        </span>
                      </div>

                      <div className="mt-2 flex items-center justify-between gap-2 border-t border-slate-700/60 pt-2">
                        <div className="min-w-0">
                          <p className="truncate text-[11px] text-slate-400">
                            {order.employeeName || 'غير محدد'}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {Number(order.totalQty) || 0} قطعة ·{' '}
                            {Array.isArray(order.items) ? order.items.length : 0} صنف
                          </p>
                        </div>
                        <p className="shrink-0 font-display text-sm font-extrabold tabular-nums text-emerald-400">
                          {formatMoney(order.total)}
                        </p>
                      </div>

                      <button
                        onClick={() => setOpenOrder(order)}
                        className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-600 bg-slate-900/60 py-2 text-[11px] font-bold text-slate-200 transition hover:border-sky-500/60 hover:text-sky-300"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        عرض الفاتورة / PDF
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {section === 'stock' && <InventoryExcel />}

          {section === 'settings' && <ManagerSettings />}
        </div>

        <p className="mt-6 text-center text-[10px] text-slate-600">
          التحليلات محسوبة من فواتير الفترة المختارة — يمكن تحميل أي فاتورة PDF في أي وقت.
        </p>
      </div>

      {openOrder && <InvoiceModal order={openOrder} onClose={() => setOpenOrder(null)} />}
    </div>
  )
}
