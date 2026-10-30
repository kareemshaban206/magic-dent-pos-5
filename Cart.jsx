import { useState } from 'react'
import {
  Minus,
  Plus,
  Trash2,
  ShoppingBasket,
  Banknote,
  CreditCard,
  Loader2,
  X,
  PackagePlus,
  ReceiptText,
} from 'lucide-react'
import { usePOS } from './POSProvider'
import { formatMoney } from '../format'

export default function Cart({ onCheckout, onClose }) {
  const {
    items,
    incQty,
    decQty,
    removeItem,
    clearCart,
    addCustom,
    payment,
    setPayment,
    count,
    total,
  } = usePOS()

  const [priceInput, setPriceInput] = useState('')
  const [labelInput, setLabelInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  function submitCustom(e) {
    e.preventDefault()
    const amount = Number(priceInput)
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('أدخل سعرًا صحيحًا للصنف')
      return
    }
    addCustom(labelInput, amount)
    setPriceInput('')
    setLabelInput('')
    setError('')
  }

  async function handleCheckout() {
    if (!items.length || busy) return
    setBusy(true)
    try {
      await onCheckout()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* header */}
      <div className="flex shrink-0 items-center gap-2 border-b border-slate-800 px-3 py-3 md:px-4">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-sky-500/15 text-sky-400">
          <ShoppingBasket className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-base font-extrabold text-slate-100">
            سلة المبيعات
          </h2>
          <p className="text-[11px] text-slate-400">
            {count > 0 ? `${count} قطعة في ${items.length} صنف` : 'لم تُضف أصناف بعد'}
          </p>
        </div>
        {items.length > 0 && (
          <button
            onClick={clearCart}
            className="rounded-lg border border-slate-700 px-2 py-1.5 text-[11px] font-bold text-slate-400 transition hover:border-rose-500/50 hover:text-rose-400"
          >
            تفريغ
          </button>
        )}
        {onClose && (
          <button
            onClick={onClose}
            aria-label="إغلاق السلة"
            className="grid h-9 w-9 place-items-center rounded-xl border border-slate-700 text-slate-400 transition hover:text-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* scrollable middle */}
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 md:px-4">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700/80 px-4 py-8 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-slate-800 text-slate-500">
              <ShoppingBasket className="h-6 w-6" />
            </div>
            <p className="mt-3 text-sm font-bold text-slate-300">السلة فارغة</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              اضغط على أي صنف من الشبكة لإضافته، أو أضف مبلغًا مخصصًا من الأسفل.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((line) => (
              <div
                key={line.key}
                className="anim-fade-up flex items-center gap-2 rounded-xl border border-slate-700/70 bg-slate-800/60 px-2.5 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-slate-100">
                    {line.name}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {formatMoney(line.price)} × {line.qty}
                  </p>
                </div>

                <div className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900/70 p-0.5">
                  <button
                    onClick={() => decQty(line.key)}
                    aria-label="إنقاص"
                    className="grid h-7 w-7 place-items-center rounded-md text-slate-300 transition hover:bg-slate-700 active:scale-90"
                  >
                    <Minus className="h-3.5 w-3.5" strokeWidth={3} />
                  </button>
                  <span className="w-6 text-center text-xs font-extrabold tabular-nums text-slate-100">
                    {line.qty}
                  </span>
                  <button
                    onClick={() => incQty(line.key)}
                    aria-label="زيادة"
                    className="grid h-7 w-7 place-items-center rounded-md text-sky-300 transition hover:bg-sky-500/20 active:scale-90"
                  >
                    <Plus className="h-3.5 w-3.5" strokeWidth={3} />
                  </button>
                </div>

                <div className="w-16 shrink-0 text-left text-[13px] font-extrabold tabular-nums text-sky-400">
                  {formatMoney(line.price * line.qty)}
                </div>

                <button
                  onClick={() => removeItem(line.key)}
                  aria-label="حذف الصنف"
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-slate-500 transition hover:bg-rose-500/15 hover:text-rose-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* custom additions */}
        <div className="mt-4 rounded-2xl border border-slate-700/70 bg-slate-900/40 p-2.5">
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
            <PackagePlus className="h-3.5 w-3.5" />
            إضافة سريعة غير مسجلة
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {[50, 100, 150].map((amount) => (
              <button
                key={amount}
                onClick={() => addCustom('', amount)}
                className="rounded-xl border border-sky-500/30 bg-sky-500/10 py-2 text-sm font-extrabold text-sky-300 transition active:scale-95 hover:bg-sky-500/20"
              >
                +{amount}ج
              </button>
            ))}
          </div>
          <form onSubmit={submitCustom} className="mt-1.5 flex gap-1.5">
            <input
              value={priceInput}
              onChange={(e) => {
                setPriceInput(e.target.value)
                setError('')
              }}
              type="number"
              inputMode="decimal"
              min="1"
              placeholder="سعر"
              className="w-20 rounded-xl border border-slate-700 bg-slate-900/80 px-2 py-2 text-center text-sm font-bold text-slate-100 outline-none placeholder:font-normal placeholder:text-slate-500 focus:border-sky-400"
            />
            <input
              value={labelInput}
              onChange={(e) => setLabelInput(e.target.value)}
              placeholder="وصف (اختياري)"
              className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-900/80 px-2.5 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-sky-400"
            />
            <button
              type="submit"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-sky-500 text-slate-950 transition active:scale-95 hover:bg-sky-400"
              aria-label="إضافة المبلغ"
            >
              <Plus className="h-4 w-4" strokeWidth={3} />
            </button>
          </form>
          {error && <p className="mt-1.5 text-[11px] font-semibold text-rose-400">{error}</p>}
        </div>

        {/* payment method */}
        <div className="mt-3">
          <p className="mb-1.5 text-[11px] font-bold text-slate-400">طريقة الدفع</p>
          <div className="grid grid-cols-2 gap-1.5 rounded-2xl border border-slate-700/70 bg-slate-900/50 p-1.5">
            <button
              onClick={() => setPayment('cash')}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-extrabold transition ${
                payment === 'cash'
                  ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/25'
                  : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              <Banknote className="h-4 w-4" />
              كاش
            </button>
            <button
              onClick={() => setPayment('visa')}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-extrabold transition ${
                payment === 'visa'
                  ? 'bg-sky-500 text-slate-950 shadow-lg shadow-sky-500/25'
                  : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              <CreditCard className="h-4 w-4" />
              فيزا
            </button>
          </div>
          {payment === 'visa' && (
            <p className="mt-1.5 text-center text-[10px] font-semibold text-sky-400/80">
              الدفع عبر Paymob — سيتم تسجيل الفاتورة كفيزا
            </p>
          )}
        </div>
      </div>

      {/* footer */}
      <div className="shrink-0 border-t border-slate-800 bg-[#101a2c] px-3 py-3 md:px-4">
        <div className="mb-2 flex items-center justify-between text-[11px] text-slate-400">
          <span>عدد القطع</span>
          <span className="font-bold tabular-nums text-slate-200">{count}</span>
        </div>
        <div className="mb-3 flex items-end justify-between">
          <span className="text-sm font-bold text-slate-300">الإجمالي</span>
          <span className="font-display text-2xl font-extrabold tabular-nums text-emerald-400">
            {formatMoney(total)}
          </span>
        </div>
        <button
          onClick={handleCheckout}
          disabled={!items.length || busy}
          className={`flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-base font-extrabold transition active:scale-[0.985] ${
            items.length && !busy
              ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/25'
              : 'cursor-not-allowed bg-slate-800 text-slate-500'
          }`}
        >
          {busy ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <ReceiptText className="h-5 w-5" />
          )}
          إتمام البيع وإصدار الفاتورة
        </button>
      </div>
    </div>
  )
}
