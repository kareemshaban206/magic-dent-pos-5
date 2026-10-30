import { useRef, useState } from 'react'
import {
  X,
  Download,
  Printer,
  CheckCircle2,
  Loader2,
  TriangleAlert,
  CreditCard,
  Banknote,
} from 'lucide-react'
import { docs } from '../lib/docs'
import { download } from '../lib/download'
import { print } from '../lib/print'
import { formatDateTime, formatMoney, formatNumber, paymentLabel } from '../format'

export default function InvoiceModal({ order, onClose, celebrate = false }) {
  const sheetRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')

  if (!order) return null

  const items = Array.isArray(order.items) ? order.items : []
  const grandTotal = Number(order.total) || 0
  const totalQty =
    Number(order.totalQty) || items.reduce((sum, it) => sum + (Number(it.qty) || 0), 0)
  const filename = `فاتورة-${order.orderId}.pdf`

  async function handleDownload() {
    if (!sheetRef.current || busy) return
    setBusy(true)
    setNote('')
    try {
      const file = await docs.pdfFromElement(sheetRef, {
        size: 'A4',
        filename,
        margin: '0',
      })
      const res = await download.saveFile(file, filename)
      if (res && res.ok === false) setNote('تعذر حفظ الملف على هذا الجهاز')
    } catch {
      setNote('تعذر إنشاء ملف الـ PDF، حاول مرة أخرى')
    } finally {
      setBusy(false)
    }
  }

  function handlePrint() {
    if (!sheetRef.current) return
    try {
      print.printElement(sheetRef, {
        title: `فاتورة ${order.orderId}`,
        size: 'A4',
      })
    } catch {
      setNote('تعذر فتح نافذة الطباعة')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-[#050a14]/80 backdrop-blur-sm"
      dir="rtl"
      style={{ height: 'var(--visual-height, 100dvh)' }}
    >
      <div className="mx-auto w-full max-w-[780px] px-3 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] pt-[calc(env(safe-area-inset-top,0px)+1rem)]">
        {/* action bar */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-xl bg-sky-500 px-3.5 py-2.5 text-sm font-extrabold text-slate-950 shadow-lg shadow-sky-500/25 transition active:scale-95 disabled:opacity-60"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              تحميل PDF
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-xl border border-slate-600 bg-slate-800/80 px-3.5 py-2.5 text-sm font-bold text-slate-200 transition active:scale-95 hover:border-sky-500/60"
            >
              <Printer className="h-4 w-4" />
              طباعة
            </button>
          </div>
          <button
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-xl border border-slate-600 bg-slate-800/80 text-slate-300 transition hover:text-white"
            aria-label="إغلاق"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {celebrate && (
          <div className="anim-fade-up mb-3 flex items-center gap-3 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-3">
            <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-400" />
            <div className="min-w-0">
              <p className="text-sm font-extrabold text-emerald-300">تم إتمام البيع بنجاح</p>
              <p className="truncate text-[11px] text-emerald-200/80">
                رقم الطلب {order.orderId} — {formatMoney(grandTotal)}
              </p>
            </div>
          </div>
        )}

        {order.saved === false && (
          <div className="mb-3 flex items-center gap-2 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-[11px] font-semibold text-amber-300">
            <TriangleAlert className="h-4 w-4 shrink-0" />
            تمت العملية لكن لم يتم حفظها في السجل — الفاتورة صالحة للطباعة، تحقق من الاتصال.
          </div>
        )}

        {note && (
          <div className="mb-3 rounded-xl bg-rose-500/15 px-3 py-2 text-[11px] font-semibold text-rose-300">
            {note}
          </div>
        )}

        {/* ---------- printable sheet ---------- */}
        <div
          ref={sheetRef}
          dir="rtl"
          className="w-full overflow-hidden rounded-2xl bg-white px-4 py-6 text-slate-900 shadow-2xl md:px-9 md:py-9"
        >
          <div className="flex items-start justify-between gap-3 border-b-2 border-slate-900 pb-4">
            <div>
              <h1 className="font-display text-xl font-extrabold tracking-tight text-slate-900 md:text-2xl">
                Magic Dent
              </h1>
              <p className="text-[11px] font-semibold text-slate-500 md:text-xs">
                عيادة أسنان — نقطة بيع المستلزمات
              </p>
            </div>
            <div className="text-left">
              <p className="font-display text-base font-extrabold text-slate-900 md:text-lg">
                فاتورة مبيعات
              </p>
              <p className="text-[11px] font-bold text-slate-700">{order.orderId}</p>
              <p className="text-[10px] text-slate-500">{formatDateTime(order.date)}</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 text-[11px] md:grid-cols-4 md:text-xs">
            <div className="rounded-lg bg-slate-100 px-2.5 py-2">
              <p className="text-[9px] font-bold text-slate-500">الكاشير</p>
              <p className="truncate font-extrabold text-slate-900">
                {order.employeeName || '—'}
              </p>
            </div>
            <div className="rounded-lg bg-slate-100 px-2.5 py-2">
              <p className="text-[9px] font-bold text-slate-500">طريقة الدفع</p>
              <p className="flex items-center gap-1 font-extrabold text-slate-900">
                {order.payment === 'visa' ? (
                  <CreditCard className="h-3 w-3" />
                ) : (
                  <Banknote className="h-3 w-3" />
                )}
                {paymentLabel(order.payment)}
              </p>
            </div>
            <div className="rounded-lg bg-slate-100 px-2.5 py-2">
              <p className="text-[9px] font-bold text-slate-500">عدد القطع</p>
              <p className="font-extrabold text-slate-900">{totalQty}</p>
            </div>
            <div className="rounded-lg bg-slate-100 px-2.5 py-2">
              <p className="text-[9px] font-bold text-slate-500">عدد الأصناف</p>
              <p className="font-extrabold text-slate-900">{items.length}</p>
            </div>
          </div>

          <table className="mt-4 w-full border-collapse text-[11px] md:text-[13px]">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="px-2 py-2 text-right font-bold">الصنف</th>
                <th className="w-14 px-1 py-2 text-center font-bold">الكمية</th>
                <th className="w-20 px-1 py-2 text-left font-bold">السعر</th>
                <th className="w-24 px-2 py-2 text-left font-bold">الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, index) => (
                <tr
                  key={`${it.name}-${index}`}
                  className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}
                >
                  <td className="border-b border-slate-200 px-2 py-2 font-semibold text-slate-800">
                    {it.name}
                  </td>
                  <td className="border-b border-slate-200 px-1 py-2 text-center tabular-nums text-slate-700">
                    {it.qty}
                  </td>
                  <td className="border-b border-slate-200 px-1 py-2 text-left tabular-nums text-slate-700">
                    {formatNumber(it.price)}
                  </td>
                  <td className="border-b border-slate-200 px-2 py-2 text-left font-bold tabular-nums text-slate-900">
                    {formatNumber((Number(it.price) || 0) * (Number(it.qty) || 0))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 flex justify-end">
            <div className="w-full max-w-[260px]">
              <div className="flex items-center justify-between border-b border-slate-200 py-1.5 text-[11px] text-slate-600">
                <span>عدد القطع</span>
                <span className="font-bold tabular-nums text-slate-800">{totalQty}</span>
              </div>
              <div className="mt-1 flex items-center justify-between rounded-lg bg-emerald-600 px-3 py-2.5 text-white">
                <span className="text-xs font-bold">الإجمالي المستحق</span>
                <span className="font-display text-base font-extrabold tabular-nums">
                  {formatMoney(grandTotal)}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-end justify-between gap-3 border-t border-dashed border-slate-300 pt-3">
            <p className="text-[10px] leading-relaxed text-slate-500">
              هذه الفاتورة صادرة إلكترونيًا من Magic Dent POS.
              <br />
              الأسعار بالجنيه المصري (ج.م) شاملة الكمية المذكورة.
            </p>
            <p className="text-[10px] font-bold text-slate-600">شكرًا لتعاملكم معنا</p>
          </div>
        </div>
      </div>
    </div>
  )
}
