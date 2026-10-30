import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Settings2,
  X,
  Plus,
  Search,
  Pencil,
  Trash2,
  Check,
  Loader2,
  PackagePlus,
  Flame,
  TriangleAlert,
  Save,
  RotateCcw,
} from 'lucide-react'
import { usePOS } from './POSProvider'
import { formatMoney, formatNumber, normalizeAr } from '../format'
import ProductThumb from './ProductThumb'

function parsePrice(raw) {
  const cleaned = String(raw ?? '')
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[^\d.]/g, '')
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : NaN
}

export default function ProductAdmin({ open, onClose }) {
  const {
    products,
    addProductItem,
    updateProductItem,
    removeProductItem,
    resetProductSold,
  } = usePOS()

  const [query, setQuery] = useState('')
  const [newName, setNewName] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [newImage, setNewImage] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editPrice, setEditPrice] = useState('')
  const [editImage, setEditImage] = useState('')
  const [savingId, setSavingId] = useState(null)
  const [confirmId, setConfirmId] = useState(null)
  const [removingId, setRemovingId] = useState(null)
  const [resettingId, setResettingId] = useState(null)

  const noticeTimer = useRef(null)
  const nameInput = useRef(null)

  useEffect(() => {
    if (!open) return
    setQuery('')
    setError('')
    setNotice('')
    setEditingId(null)
    setConfirmId(null)
    setNewName('')
    setNewPrice('')
    setNewImage('')
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(
    () => () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current)
    },
    [],
  )

  const filtered = useMemo(() => {
    const term = normalizeAr(query)
    if (!term) return products
    return products.filter(
      (product) =>
        normalizeAr(product.name).includes(term) ||
        normalizeAr(String(product.price)).includes(term),
    )
  }, [products, query])

  function flash(message) {
    setNotice(message)
    setError('')
    if (noticeTimer.current) clearTimeout(noticeTimer.current)
    noticeTimer.current = setTimeout(() => setNotice(''), 2600)
  }

  async function handleAdd(e) {
    e.preventDefault()
    if (adding) return
    if (!newName.trim()) {
      setError('اكتب اسم الصنف الجديد أولًا')
      return
    }
    const price = parsePrice(newPrice)
    if (!Number.isFinite(price) || price <= 0) {
      setError('أدخل سعرًا صحيحًا بالجنيه')
      return
    }
    setAdding(true)
    const result = await addProductItem(newName, price, newImage)
    setAdding(false)
    if (result && result.ok) {
      setNewName('')
      setNewPrice('')
      setNewImage('')
      flash('تمت إضافة الصنف إلى الشبكة فورًا')
      if (nameInput.current) nameInput.current.focus()
    } else if (result && result.error === 'price') {
      setError('أدخل سعرًا صحيحًا بالجنيه')
    } else {
      setError('تعذر الحفظ — تحقق من الاتصال وحاول مرة أخرى')
    }
  }

  function beginEdit(product) {
    setConfirmId(null)
    setError('')
    setEditingId(product.id)
    setEditName(product.name)
    setEditPrice(String(product.price))
    setEditImage(product.image || '')
  }

  async function saveEdit(product) {
    if (savingId) return
    if (!editName.trim()) {
      setError('اسم الصنف لا يمكن أن يكون فارغًا')
      return
    }
    const price = parsePrice(editPrice)
    if (!Number.isFinite(price) || price <= 0) {
      setError('أدخل سعرًا صحيحًا بالجنيه')
      return
    }
    setSavingId(product.id)
    const result = await updateProductItem(product, editName, price, editImage)
    setSavingId(null)
    if (result && result.ok) {
      setEditingId(null)
      flash('تم تحديث الصنف')
    } else {
      setError('تعذر تحديث الصنف — حاول مرة أخرى')
    }
  }

  async function handleResetSold(product) {
    if (resettingId) return
    setResettingId(product.id)
    const result = await resetProductSold(product)
    setResettingId(null)
    if (result && result.ok) {
      flash(`تم تصفير عداد المباع لـ ${product.name}`)
      return
    }
    if (result && result.error === 'missing') {
      setError('هذا الصنف غير متاح للتعديل الآن — حدّث الصفحة ثم أعد المحاولة')
      return
    }
    setError('لم يستجب السيرفر لتصفير العداد — أعد المحاولة بعد لحظات')
  }

  async function handleRemove(product) {
    if (removingId) return
    setRemovingId(product.id)
    const result = await removeProductItem(product)
    setRemovingId(null)
    if (result && result.ok) {
      setConfirmId(null)
      if (editingId === product.id) setEditingId(null)
      flash('تم حذف الصنف من الكتالوج')
    } else {
      setError('تعذر حذف الصنف — حاول مرة أخرى')
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 backdrop-blur-sm md:items-center md:p-6"
      style={{ height: 'var(--visual-height, 100dvh)' }}
      dir="rtl"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="anim-sheet relative flex w-full flex-col overflow-hidden rounded-t-3xl border border-slate-700/80 bg-[#1e293b] shadow-[0_30px_80px_-20px_rgba(2,8,23,0.9)] md:max-w-3xl md:rounded-3xl"
        style={{ maxHeight: 'calc(var(--visual-height, 100dvh) - 1rem)' }}
      >
        {/* ------------------------------------------------ header */}
        <div className="relative shrink-0 border-b border-slate-700/70 bg-gradient-to-l from-sky-500/12 via-transparent to-transparent px-4 py-3.5 md:px-5">
          <div className="pointer-events-none absolute -top-16 left-1/3 h-32 w-32 rounded-full bg-sky-500/20 blur-3xl" />
          <div className="relative flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-sky-400 to-emerald-400 text-slate-950 shadow-lg shadow-sky-500/25">
              <Settings2 className="h-5 w-5" strokeWidth={2.3} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-base font-extrabold leading-tight text-slate-50 md:text-lg">
                إدارة الأصناف والأسعار
              </h2>
              <p className="text-[11px] font-semibold text-slate-400">
                <span className="tabular-nums text-sky-300">
                  {formatNumber(products.length)}
                </span>{' '}
                صنف في الكتالوج — أضف، عدّل، أو احذف فورًا
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="إغلاق"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-slate-600/80 bg-slate-900/60 text-slate-400 transition hover:border-rose-500/50 hover:text-rose-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ------------------------------------------------ add form */}
        <form
          onSubmit={handleAdd}
          className="shrink-0 border-b border-slate-700/60 bg-slate-900/40 px-3 py-3 md:px-4"
        >
          <div className="flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <label className="mb-1 block text-[11px] font-bold text-slate-400">
                اسم الصنف
              </label>
              <input
                ref={nameInput}
                value={newName}
                onChange={(e) => {
                  setNewName(e.target.value)
                  setError('')
                }}
                placeholder="مثال: جوانتي نتريل مقاس M"
                className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2.5 text-sm font-semibold text-slate-100 outline-none transition placeholder:font-normal placeholder:text-slate-500 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20"
              />
            </div>
            <div className="w-24 shrink-0 md:w-28">
              <label className="mb-1 block text-[11px] font-bold text-slate-400">
                السعر (ج.م)
              </label>
              <input
                value={newPrice}
                onChange={(e) => {
                  setNewPrice(e.target.value)
                  setError('')
                }}
                inputMode="decimal"
                placeholder="0"
                className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2.5 text-sm font-bold tabular-nums text-slate-100 outline-none transition placeholder:font-normal placeholder:text-slate-500 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20"
              />
            </div>
            <button
              type="submit"
              disabled={adding}
              className="flex h-[42px] shrink-0 items-center gap-1.5 rounded-xl bg-emerald-500 px-3 text-sm font-extrabold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400 active:scale-[0.97] disabled:opacity-60 md:px-4"
            >
              {adding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" strokeWidth={3} />
              )}
              <span className="hidden sm:inline">إضافة</span>
            </button>
          </div>

          <div className="mt-2 flex items-center gap-2">
            <ProductThumb
              src={newImage}
              name={newName}
              className="h-[42px] w-[42px]"
              rounded="rounded-xl"
              emojiClass="text-[18px]"
            />
            <div className="min-w-0 flex-1">
              <label className="mb-1 block text-[11px] font-bold text-slate-400">
                رابط الصورة (اختياري)
              </label>
              <input
                value={newImage}
                onChange={(e) => {
                  setNewImage(e.target.value)
                  setError('')
                }}
                dir="ltr"
                inputMode="url"
                placeholder="https://example.com/item.jpg"
                className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2.5 text-left text-[13px] font-medium text-slate-100 outline-none transition placeholder:font-normal placeholder:text-slate-500 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20"
              />
            </div>
          </div>

          {error && (
            <p className="anim-fade-up mt-2 flex items-center gap-1.5 rounded-xl bg-rose-500/10 px-3 py-2 text-[11px] font-bold text-rose-300">
              <TriangleAlert className="h-3.5 w-3.5 shrink-0" />
              {error}
            </p>
          )}
          {notice && (
            <p className="anim-fade-up mt-2 flex items-center gap-1.5 rounded-xl bg-emerald-500/10 px-3 py-2 text-[11px] font-bold text-emerald-300">
              <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={3} />
              {notice}
            </p>
          )}
        </form>

        {/* ------------------------------------------------ search */}
        <div className="shrink-0 px-3 pt-3 md:px-4">
          <div className="relative">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              type="search"
              placeholder="ابحث في الكتالوج لتعديل صنف..."
              className="w-full rounded-xl border border-slate-700/80 bg-slate-800/60 py-2.5 pr-9 pl-9 text-sm font-semibold text-slate-100 outline-none transition placeholder:font-normal placeholder:text-slate-500 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="مسح البحث"
                className="absolute left-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full bg-slate-700/70 text-slate-300 transition hover:bg-slate-600"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* ------------------------------------------------ list */}
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 md:px-4">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700/70 px-6 py-12 text-center">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-800 text-slate-500">
                <Search className="h-6 w-6" />
              </div>
              <p className="mt-3 font-display text-sm font-extrabold text-slate-200">
                لا يوجد صنف بهذا الاسم
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                عدّل كلمة البحث أو أضف الصنف من النموذج بالأعلى.
              </p>
            </div>
          ) : (
            <ul className="space-y-1.5">
              {filtered.map((product, index) => {
                const isEditing = editingId === product.id
                const isConfirming = confirmId === product.id
                return (
                  <li
                    key={product.id}
                    className={`anim-fade-up rounded-xl border px-2.5 py-2 transition ${
                      isConfirming
                        ? 'border-rose-500/50 bg-rose-500/10'
                        : isEditing
                          ? 'border-sky-500/60 bg-sky-500/10'
                          : 'border-slate-700/60 bg-slate-800/50 hover:border-slate-600'
                    }`}
                    style={{ animationDelay: `${Math.min(index, 14) * 14}ms` }}
                  >
                    {isEditing ? (
                      <div className="space-y-2">
                        <input
                          value={editName}
                          onChange={(e) => {
                            setEditName(e.target.value)
                            setError('')
                          }}
                          autoFocus
                          className="w-full rounded-lg border border-slate-600 bg-slate-900/80 px-2.5 py-2 text-sm font-semibold text-slate-100 outline-none focus:border-sky-400"
                        />
                        <div className="flex items-center gap-2">
                          <ProductThumb
                            src={editImage}
                            name={editName}
                            className="h-8 w-8 rounded-lg"
                            emojiClass="text-[13px]"
                          />
                          <input
                            value={editImage}
                            onChange={(e) => setEditImage(e.target.value)}
                            dir="ltr"
                            inputMode="url"
                            placeholder="رابط الصورة (اختياري)"
                            className="min-w-0 flex-1 rounded-lg border border-slate-600 bg-slate-900/80 px-2.5 py-2 text-left text-[12px] font-medium text-slate-100 outline-none placeholder:text-slate-500 focus:border-sky-400"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="relative min-w-0 flex-1">
                            <input
                              value={editPrice}
                              onChange={(e) => {
                                setEditPrice(e.target.value)
                                setError('')
                              }}
                              inputMode="decimal"
                              className="w-full rounded-lg border border-slate-600 bg-slate-900/80 px-2.5 py-2 pl-9 text-sm font-bold tabular-nums text-slate-100 outline-none focus:border-sky-400"
                            />
                            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-500">
                              ج.م
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => saveEdit(product)}
                            disabled={savingId === product.id}
                            className="flex items-center gap-1 rounded-lg bg-sky-500 px-3 py-2 text-xs font-extrabold text-slate-950 transition hover:bg-sky-400 disabled:opacity-60"
                          >
                            {savingId === product.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Save className="h-3.5 w-3.5" />
                            )}
                            حفظ
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(null)
                              setError('')
                            }}
                            aria-label="إلغاء التعديل"
                            className="grid h-8 w-8 place-items-center rounded-lg border border-slate-600 text-slate-400 transition hover:text-slate-100"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <ProductThumb
                          src={product.image}
                          name={product.name}
                          className="h-9 w-9"
                          emojiClass="text-[15px]"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-[13px] font-bold leading-snug text-slate-100">
                            {product.name}
                          </p>
                          <div className="mt-0.5 flex items-center gap-2">
                            <span className="font-display text-[13px] font-extrabold tabular-nums text-sky-400">
                              {formatMoney(product.price)}
                            </span>
                            <span className="flex items-center gap-0.5 text-[10px] font-bold tabular-nums text-slate-500">
                              <Flame
                                className={`h-2.5 w-2.5 ${
                                  product.sold > 0 ? 'text-amber-400' : 'text-slate-600'
                                }`}
                              />
                              {formatNumber(product.sold)} مبيع
                            </span>
                            {product.isNew && (
                              <span className="rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-extrabold text-emerald-300">
                                مضاف
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleResetSold(product)}
                            disabled={resettingId === product.id || product.sold <= 0}
                            title="تصفير المباع"
                            className="mt-1 flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[9.5px] font-extrabold text-amber-300 transition hover:border-amber-400/70 hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {resettingId === product.id ? (
                              <Loader2 className="h-2.5 w-2.5 animate-spin" />
                            ) : (
                              <RotateCcw className="h-2.5 w-2.5" strokeWidth={2.6} />
                            )}
                            تصفير المباع
                          </button>
                        </div>

                        {isConfirming ? (
                          <div className="flex shrink-0 items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleRemove(product)}
                              disabled={removingId === product.id}
                              className="flex items-center gap-1 rounded-lg bg-rose-500 px-2.5 py-1.5 text-[11px] font-extrabold text-white transition hover:bg-rose-400 disabled:opacity-60"
                            >
                              {removingId === product.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Trash2 className="h-3 w-3" />
                              )}
                              حذف
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmId(null)}
                              className="rounded-lg border border-slate-600 px-2 py-1.5 text-[11px] font-bold text-slate-400 transition hover:text-slate-100"
                            >
                              إلغاء
                            </button>
                          </div>
                        ) : (
                          <div className="flex shrink-0 items-center gap-1">
                            <button
                              type="button"
                              onClick={() => beginEdit(product)}
                              aria-label="تعديل"
                              className="grid h-8 w-8 place-items-center rounded-lg border border-slate-600/80 text-slate-400 transition hover:border-sky-500/60 hover:text-sky-300"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingId(null)
                                setError('')
                                setConfirmId(product.id)
                              }}
                              aria-label="حذف"
                              className="grid h-8 w-8 place-items-center rounded-lg border border-slate-600/80 text-slate-400 transition hover:border-rose-500/60 hover:text-rose-400"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* ------------------------------------------------ footer */}
        <div className="flex shrink-0 items-center gap-2 border-t border-slate-700/60 bg-slate-900/50 px-3 py-2.5 pb-[calc(env(safe-area-inset-bottom,0px)+0.625rem)] md:px-4 md:pb-2.5">
          <p className="flex min-w-0 flex-1 items-center gap-1.5 text-[10.5px] font-semibold leading-tight text-slate-500">
            <PackagePlus className="h-3.5 w-3.5 shrink-0 text-slate-600" />
            التغييرات تُحفظ مباشرة وتظهر في شبكة البيع على كل الأجهزة.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-xl bg-sky-500 px-4 py-2 text-xs font-extrabold text-slate-950 transition hover:bg-sky-400 active:scale-[0.97]"
          >
            تم
          </button>
        </div>
      </div>
    </div>
  )
}
