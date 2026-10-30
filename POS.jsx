import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Search,
  SearchX,
  Flame,
  ShoppingCart,
  Sparkles,
  ChevronUp,
  X,
  Plus,
} from 'lucide-react'
import { usePOS } from '../components/POSProvider'
import { formatMoney, formatNumber, normalizeAr } from '../format'
import Cart from '../components/Cart'
import InvoiceModal from '../components/InvoiceModal'
import ProductThumb from '../components/ProductThumb'

/* Arabic alphabet quick-filter — the value is normalised (أ → ا) so matching
   works against the same normalisation used by the search box. */
const LETTERS = [
  { key: 'ا', label: 'أ' },
  { key: 'ب', label: 'ب' },
  { key: 'ت', label: 'ت' },
  { key: 'ث', label: 'ث' },
  { key: 'ج', label: 'ج' },
  { key: 'ح', label: 'ح' },
  { key: 'خ', label: 'خ' },
  { key: 'د', label: 'د' },
  { key: 'ذ', label: 'ذ' },
  { key: 'ر', label: 'ر' },
  { key: 'ز', label: 'ز' },
  { key: 'س', label: 'س' },
  { key: 'ش', label: 'ش' },
  { key: 'ص', label: 'ص' },
  { key: 'ض', label: 'ض' },
  { key: 'ط', label: 'ط' },
  { key: 'ظ', label: 'ظ' },
  { key: 'ع', label: 'ع' },
  { key: 'غ', label: 'غ' },
  { key: 'ف', label: 'ف' },
  { key: 'ق', label: 'ق' },
  { key: 'ك', label: 'ك' },
  { key: 'ل', label: 'ل' },
  { key: 'م', label: 'م' },
  { key: 'ن', label: 'ن' },
  { key: 'ه', label: 'ه' },
  { key: 'و', label: 'و' },
  { key: 'ي', label: 'ي' },
]

export default function POS() {
  const { addProduct, count, total, checkout, products, productsLoading } = usePOS()

  const [query, setQuery] = useState('')
  const [letter, setLetter] = useState('')
  const [flashKey, setFlashKey] = useState(null)
  const [cartOpen, setCartOpen] = useState(false)
  const [completed, setCompleted] = useState(null)
  const flashTimer = useRef(null)

  useEffect(
    () => () => {
      if (flashTimer.current) clearTimeout(flashTimer.current)
    },
    [],
  )

  const filtered = useMemo(() => {
    if (letter) {
      return products.filter((product) => {
        const name = normalizeAr(product.name)
        return name.startsWith(letter) || name.startsWith(`ال${letter}`)
      })
    }
    const term = normalizeAr(query)
    if (!term) return products
    return products.filter((product) => {
      const name = normalizeAr(product.name)
      return name.includes(term) || normalizeAr(String(product.price)).includes(term)
    })
  }, [products, query, letter])

  /* the letter bar and the text field stay in sync in both directions */
  const pickLetter = useCallback(
    (key) => {
      const next = letter === key ? '' : key
      setLetter(next)
      setQuery(next)
    },
    [letter],
  )

  const onQueryChange = useCallback((value) => {
    setQuery(value)
    setLetter('')
  }, [])

  const clearFilters = useCallback(() => {
    setQuery('')
    setLetter('')
  }, [])

  const handleAdd = useCallback(
    (product) => {
      addProduct(product)
      setFlashKey(product.id)
      if (flashTimer.current) clearTimeout(flashTimer.current)
      flashTimer.current = setTimeout(() => setFlashKey(null), 550)
    },
    [addProduct],
  )

  const handleCheckout = useCallback(async () => {
    const result = await checkout()
    if (result && result.order) {
      setCompleted(result.order)
      setCartOpen(false)
    }
  }, [checkout])

  return (
    <div className="flex h-full min-h-0">
      {/* ---------------- catalog ---------------- */}
      <section className="flex min-w-0 flex-1 flex-col">
        <div className="shrink-0 border-b border-slate-800/70 bg-gradient-to-l from-sky-500/[0.07] via-[#0f172a]/85 to-emerald-500/[0.05] px-2.5 py-2 backdrop-blur md:px-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                type="search"
                placeholder="🔍 ابحث عن اسم الصنف هنا..."
                className="w-full rounded-2xl border border-slate-700/80 bg-slate-800/60 py-2.5 pr-10 pl-10 text-[13px] font-semibold text-slate-100 outline-none transition placeholder:font-normal placeholder:text-slate-500 focus:border-sky-400 focus:bg-slate-800 focus:ring-2 focus:ring-sky-400/20"
              />
              {query && (
                <button
                  onClick={clearFilters}
                  aria-label="مسح البحث"
                  className="absolute left-2.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full bg-slate-700/70 text-slate-300 transition hover:bg-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="hidden shrink-0 items-center gap-1.5 rounded-xl border border-sky-500/30 bg-sky-500/10 px-2.5 py-2 text-[11px] font-bold text-sky-300 sm:flex">
              <Sparkles className="h-3.5 w-3.5" />
              <span className="tabular-nums">{formatNumber(filtered.length)}</span>
              <span className="text-slate-400">صنف</span>
            </div>
          </div>

          {/* ---------------- alphabet quick filter ---------------- */}
          <div className="no-scrollbar mt-2 flex items-center gap-1 overflow-x-auto pb-0.5">
            <button
              onClick={clearFilters}
              className={`shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-extrabold transition ${
                !letter
                  ? 'bg-gradient-to-l from-sky-400 to-emerald-400 text-slate-950 shadow-lg shadow-sky-500/25'
                  : 'border border-slate-700/70 bg-slate-800/50 text-slate-300 hover:border-sky-500/50 hover:text-sky-300'
              }`}
            >
              الكل
            </button>
            <span className="h-4 w-px shrink-0 bg-slate-700/70" aria-hidden="true" />
            {LETTERS.map((item) => {
              const active = letter === item.key
              return (
                <button
                  key={item.key}
                  onClick={() => pickLetter(item.key)}
                  aria-label={`أصناف تبدأ بحرف ${item.label}`}
                  aria-pressed={active}
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[12.5px] font-extrabold transition active:scale-[0.94] ${
                    active
                      ? 'bg-gradient-to-l from-sky-400 to-emerald-400 text-slate-950 shadow-lg shadow-sky-500/25'
                      : 'border border-slate-700/70 bg-slate-800/50 text-slate-300 hover:border-sky-500/50 hover:text-sky-300'
                  }`}
                >
                  {item.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2.5 py-2.5 pb-28 md:px-4 md:py-3 lg:pb-4">
          {productsLoading && !products.length ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
              {Array.from({ length: 15 }).map((_, i) => (
                <div
                  key={i}
                  className="h-[172px] animate-pulse rounded-2xl border border-slate-800 bg-slate-800/40"
                />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-700/70 px-6 py-16 text-center">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-800 text-slate-500">
                <SearchX className="h-7 w-7" />
              </div>
              <p className="mt-4 font-display text-lg font-extrabold text-slate-200">
                لا توجد أصناف مطابقة
              </p>
              <p className="mt-1 max-w-xs text-xs leading-relaxed text-slate-500">
                {letter
                  ? 'لا يوجد صنف يبدأ بهذا الحرف — جرّب حرفًا آخر أو ابحث بالاسم.'
                  : 'جرّب كلمة أخرى أو أضف المبلغ كصنف مخصص من السلة.'}
              </p>
              <button
                onClick={clearFilters}
                className="mt-4 rounded-xl border border-sky-500/40 bg-sky-500/10 px-4 py-2 text-sm font-bold text-sky-300 transition hover:bg-sky-500/20"
              >
                مسح البحث
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
              {filtered.map((product, index) => {
                const sold = Number(product.sold) || 0
                const stock = Number(product.stock) || 0
                const flashing = flashKey === product.id
                return (
                  <button
                    key={product.id}
                    onClick={() => handleAdd(product)}
                    className={`group anim-fade-up relative flex flex-col overflow-hidden rounded-2xl border text-right transition duration-200 active:scale-[0.97] ${
                      flashing
                        ? 'border-sky-400 shadow-xl shadow-sky-500/25 anim-ring'
                        : 'border-slate-700/70 bg-gradient-to-b from-slate-800/80 to-slate-900/90 hover:-translate-y-0.5 hover:border-sky-400/70 hover:shadow-lg hover:shadow-sky-900/30'
                    }`}
                    style={{ animationDelay: `${Math.min(index, 18) * 16}ms` }}
                  >
                    {/* -------- big picture: the card's visual anchor -------- */}
                    <div className="relative w-full overflow-hidden bg-slate-900/60">
                      <div className="aspect-[4/3] w-full">
                        <ProductThumb
                          bare
                          src={product.image}
                          name={product.name}
                          className="h-full w-full"
                          emojiClass="text-4xl"
                        />
                      </div>
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/5 to-transparent" />

                      {sold > 0 && (
                        <span className="absolute left-1.5 top-1.5 flex items-center gap-0.5 rounded-md bg-slate-950/70 px-1.5 py-0.5 text-[9.5px] font-extrabold tabular-nums text-amber-300 backdrop-blur">
                          <Flame className="h-2.5 w-2.5" />
                          {sold}
                        </span>
                      )}
                      {stock > 0 && (
                        <span className="absolute right-1.5 top-1.5 rounded-md bg-emerald-500/85 px-1.5 py-0.5 text-[9.5px] font-extrabold tabular-nums text-slate-950 backdrop-blur">
                          {formatNumber(stock)}
                        </span>
                      )}

                      {flashing && (
                        <span className="absolute inset-0 grid place-items-center bg-sky-500/25 backdrop-blur-[1px]">
                          <span className="grid h-9 w-9 place-items-center rounded-full bg-sky-400 text-slate-950 shadow-lg">
                            <Plus className="h-5 w-5" strokeWidth={3} />
                          </span>
                        </span>
                      )}
                    </div>

                    {/* ------------------------- name + price ------------------------- */}
                    <div className="flex flex-1 flex-col justify-between p-2">
                      <p className="line-clamp-2 text-[11.5px] font-bold leading-tight text-slate-100">
                        {product.name}
                      </p>
                      <div className="mt-1 flex items-center justify-between gap-1">
                        <span className="font-display text-[13px] font-extrabold tabular-nums text-emerald-400">
                          {formatMoney(product.price)}
                        </span>
                        <span className="grid h-6 w-6 place-items-center rounded-lg bg-sky-500/15 text-sky-300 transition group-hover:bg-sky-500 group-hover:text-slate-950">
                          <Plus className="h-3.5 w-3.5" strokeWidth={3} />
                        </span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* ---------------- desktop cart ---------------- */}
      <aside className="hidden min-h-0 w-[290px] shrink-0 flex-col border-s border-slate-800/80 bg-[#131c2e] lg:flex xl:w-[330px]">
        <Cart onCheckout={handleCheckout} />
      </aside>

      {/* ---------------- mobile cart bar ---------------- */}
      <button
        onClick={() => setCartOpen(true)}
        className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-slate-700 bg-[#131c2e]/95 px-3 py-2.5 pb-[calc(env(safe-area-inset-bottom,0px)+0.625rem)] backdrop-blur lg:hidden"
      >
        <div className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sky-500/15 text-sky-400">
          <ShoppingCart className="h-5 w-5" />
          {count > 0 && (
            <span className="absolute -top-1 -left-1 grid h-5 min-w-5 place-items-center rounded-full bg-emerald-500 px-1 text-[10px] font-extrabold text-slate-950">
              {count}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1 text-right">
          <p className="text-[10px] font-bold text-slate-400">
            {count > 0 ? `${count} قطعة — سلة المبيعات` : 'سلة المبيعات فارغة'}
          </p>
          <p className="font-display text-base font-extrabold tabular-nums text-emerald-400">
            {formatMoney(total)}
          </p>
        </div>
        <span className="flex items-center gap-1 rounded-xl bg-sky-500 px-3 py-2 text-xs font-extrabold text-slate-950">
          عرض السلة
          <ChevronUp className="h-4 w-4" />
        </span>
      </button>

      {/* ---------------- mobile cart sheet ---------------- */}
      {cartOpen && (
        <div
          className="fixed inset-0 z-40 flex flex-col justify-end lg:hidden"
          style={{ height: 'var(--visual-height, 100dvh)' }}
        >
          <div
            className="absolute inset-0 bg-black/65 backdrop-blur-sm"
            onClick={() => setCartOpen(false)}
          />
          <div className="anim-sheet relative flex max-h-[90%] flex-col rounded-t-3xl border-t border-slate-700 bg-[#131c2e] pb-[env(safe-area-inset-bottom,0px)]">
            <div className="flex shrink-0 justify-center pt-2">
              <span className="h-1.5 w-12 rounded-full bg-slate-600" />
            </div>
            <div className="min-h-0 flex-1">
              <Cart onCheckout={handleCheckout} onClose={() => setCartOpen(false)} />
            </div>
          </div>
        </div>
      )}

      {completed && (
        <InvoiceModal
          order={completed}
          celebrate
          onClose={() => setCompleted(null)}
        />
      )}
    </div>
  )
}
