import { useMemo, useRef, useState } from 'react'
import {
  Download,
  Upload,
  Loader2,
  Check,
  TriangleAlert,
  FileSpreadsheet,
  Search,
  Save,
  X,
} from 'lucide-react'
import { docs } from '../lib/docs'
import { download } from '../lib/download'
import { readSpreadsheet } from '../lib/spreadsheet'
import { usePOS } from './POSProvider'
import { formatMoney, formatNumber, normalizeAr } from '../format'

const COLUMNS = [
  { header: 'كود الصنف', key: 'code', width: 34 },
  { header: 'اسم الصنف', key: 'name', width: 42 },
  { header: 'سعر الشراء', key: 'cost', width: 14 },
  { header: 'سعر البيع', key: 'price', width: 14 },
  { header: 'الكمية المتاحة', key: 'stock', width: 16 },
  { header: 'رابط الصورة', key: 'image', width: 46 },
  { header: 'المباع', key: 'sold', width: 12 },
]

function parseNum(raw) {
  if (raw === undefined || raw === null) return null
  const text = String(raw)
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[^\d.-]/g, '')
    .trim()
  if (!text) return null
  const n = Number(text)
  return Number.isFinite(n) && n >= 0 ? n : null
}

/**
 * The shelf: a spreadsheet of every product with its purchasing price and the
 * units available. Download it, edit it in Excel, upload it back — the app reads
 * the file and stores the numbers, so a sale takes stock off automatically.
 */
export default function InventoryExcel() {
  const { products, applyInventory, applyInventoryBulk } = usePOS()
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [busyRow, setBusyRow] = useState('')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const fileInput = useRef(null)

  const filtered = useMemo(() => {
    const term = normalizeAr(query)
    if (!term) return products
    return products.filter((product) => normalizeAr(product.name).includes(term))
  }, [products, query])

  const totals = useMemo(() => {
    let stock = 0
    let stockValue = 0
    for (const product of products) {
      stock += Number(product.stock) || 0
      stockValue += (Number(product.stock) || 0) * (Number(product.cost) || 0)
    }
    return { stock, stockValue }
  }, [products])

  function flash(message) {
    setNotice(message)
    setError('')
  }

  async function downloadSheet() {
    if (busy) return
    setBusy(true)
    setNotice('')
    setError('')
    try {
      const rows = products.map((product) => ({
        code: product.id,
        name: product.name,
        cost: Number(product.cost) || 0,
        price: Number(product.price) || 0,
        stock: Number(product.stock) || 0,
        image: product.image || '',
        sold: Number(product.sold) || 0,
      }))
      const file = await docs.xlsx({
        sheets: [{ name: 'المخزون', columns: COLUMNS, rows }],
      })
      const stamp = new Date().toISOString().slice(0, 10)
      await download.saveFile(file, `magic-dent-inventory-${stamp}.xlsx`)
      flash(
        'تم تنزيل شيت المخزون — عدّل الكميات والأسعار أو رابط الصورة ثم ارفعه من جديد',
      )
    } catch (err) {
      setError(
        err && err.message
          ? `تعذر إنشاء الملف: ${err.message}`
          : 'تعذر إنشاء ملف الإكسل — حاول مرة أخرى',
      )
    } finally {
      setBusy(false)
    }
  }

  async function onPickFile(event) {
    const file = event.target.files && event.target.files[0]
    if (!file) return
    setBusy(true)
    setNotice('')
    setError('')
    try {
      const parsed = await readSpreadsheet(file)
      const rows = Array.isArray(parsed.rows) ? parsed.rows : []
      const byId = new Map(products.map((product) => [String(product.id), product]))
      const byName = new Map(
        products.map((product) => [String(product.name).trim(), product]),
      )

      const targets = []
      let unmatched = 0
      for (const row of rows) {
        const code = String(row['كود الصنف'] ?? row['كود'] ?? row.id ?? '').trim()
        const name = String(row['اسم الصنف'] ?? row['الاسم'] ?? row.name ?? '').trim()
        const product = byId.get(code) || byName.get(name)
        if (!product) {
          unmatched += 1
          continue
        }
        const cost = parseNum(row['سعر الشراء'] ?? row['التكلفة'] ?? row.cost)
        const stock = parseNum(
          row['الكمية المتاحة'] ?? row['الكمية'] ?? row['الرصيد'] ?? row.stock,
        )
        const price = parseNum(row['سعر البيع'] ?? row['السعر'] ?? row.price)
        const rawImage =
          row['رابط الصورة'] ?? row['الصورة'] ?? row['رابط الصورة '] ?? row.image
        const patch = {}
        if (cost !== null) patch.cost = cost
        if (stock !== null) patch.stock = stock
        if (price !== null && price > 0) patch.price = price
        if (rawImage !== undefined && rawImage !== null) {
          const image = String(rawImage).trim()
          if (image === '' || /^https?:\/\//i.test(image)) patch.image = image
        }
        if (!Object.keys(patch).length) {
          unmatched += 1
          continue
        }
        targets.push({ product, patch })
      }

      if (!targets.length) {
        setError(
          `لم يُقرأ أي صف يمكن تحديثه — تأكد من أعمدة «سعر الشراء» و«سعر البيع» و«الكمية المتاحة» و«رابط الصورة» (${formatNumber(rows.length)} صف في الملف)`,
        )
        return
      }

      const { updated, failed } = await applyInventoryBulk(targets)
      if (updated) {
        flash(
          `تم تحديث ${formatNumber(updated)} صنف من الملف${
            unmatched ? ` · ${formatNumber(unmatched)} صف لم يُطابق` : ''
          }`,
        )
      }
      if (failed) {
        setError(
          `${formatNumber(failed)} صنف لم يُحفظ — تحقق من الاتصال وأعد رفع الملف`,
        )
      }
    } catch (err) {
      setError(
        err && err.message
          ? `تعذر قراءة الملف: ${err.message}`
          : 'تعذر قراءة الملف — تأكد أنه ملف Excel أو CSV',
      )
    } finally {
      setBusy(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-slate-700/70 bg-slate-800/60 p-3">
        <div className="mb-2 flex items-center gap-1.5 text-[12px] font-extrabold text-slate-100">
          <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
          مخزن الأصناف على Excel
        </div>
        <p className="text-[10.5px] font-semibold leading-relaxed text-slate-400">
          نزّل الشيت، اعدّل سعر الشراء وسعر البيع والكمية المتاحة ورابط الصورة لكل
          صنف، ثم ارفعه مرة أخرى — السعر والصورة يتحدّثوا فورًا في شاشة الكاشير،
          والكمية تتخصم مع كل عملية بيع، وتقدر تنزّل الشيت تاني في أي وقت لمراجعة
          الرصيد بعد الخصم.
        </p>
        <p className="mt-1.5 rounded-xl bg-sky-500/10 px-2.5 py-1.5 text-[10px] font-bold leading-relaxed text-sky-300">
          السعر الجديد يسري على المبيعات القادمة — الفواتير القديمة تحتفظ بسعرها
          وتكلفتها وقت البيع، فتقارير الفترات السابقة لا تتغيّر.
        </p>

        <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={downloadSheet}
            disabled={busy}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-2.5 text-[11.5px] font-extrabold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400 active:scale-[0.98] disabled:opacity-60"
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            تنزيل شيت المخزون
          </button>

          <button
            type="button"
            onClick={() => fileInput.current && fileInput.current.click()}
            disabled={busy}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-sky-500/40 bg-sky-500/10 px-3 py-2.5 text-[11.5px] font-extrabold text-sky-300 transition hover:bg-sky-500/20 active:scale-[0.98] disabled:opacity-60"
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            رفع الشيت بعد التعديل
          </button>
        </div>

        <input
          ref={fileInput}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={onPickFile}
          className="hidden"
        />

        {notice && (
          <p className="anim-fade-up mt-2 flex items-center gap-1.5 rounded-xl bg-emerald-500/10 px-3 py-2 text-[11px] font-bold text-emerald-300">
            <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={3} />
            {notice}
          </p>
        )}
        {error && (
          <p className="anim-fade-up mt-2 flex items-start gap-1.5 rounded-xl bg-rose-500/10 px-3 py-2 text-[11px] font-bold leading-relaxed text-rose-300">
            <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {error}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-slate-700/70 bg-slate-800/60 p-3">
          <p className="text-[10.5px] font-bold text-slate-400">إجمالي القطع بالمخزن</p>
          <p className="mt-1 font-display text-lg font-extrabold tabular-nums text-amber-300">
            {formatNumber(totals.stock)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-700/70 bg-slate-800/60 p-3">
          <p className="text-[10.5px] font-bold text-slate-400">قيمة المخزون بسعر الشراء</p>
          <p className="mt-1 font-display text-lg font-extrabold tabular-nums text-emerald-400">
            {formatMoney(totals.stockValue)}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-700/70 bg-slate-800/60 p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="text-[12px] font-extrabold text-slate-100">
            تعديل سريع لسعر الشراء والكمية
          </div>
          <span className="rounded-lg bg-slate-900/60 px-2 py-1 text-[10px] font-bold tabular-nums text-slate-400">
            {formatNumber(filtered.length)} صنف
          </span>
        </div>

        <div className="relative mb-2">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث عن صنف بالاسم..."
            className="w-full rounded-xl border border-slate-700/80 bg-slate-900/70 py-2 pr-9 pl-9 text-[12.5px] font-semibold text-slate-100 outline-none transition placeholder:font-normal placeholder:text-slate-500 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="مسح البحث"
              className="absolute left-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full bg-slate-700/70 text-slate-300"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {filtered.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-700/70 px-3 py-6 text-center text-[11px] font-semibold text-slate-500">
            لا يوجد صنف بهذا الاسم.
          </p>
        ) : (
          <ul className="max-h-[420px] space-y-1.5 overflow-y-auto pl-0.5">
            {filtered.map((product) => (
              <InventoryRow
                key={product.id}
                product={product}
                busy={busyRow === product.id}
                onSave={async (patch) => {
                  setBusyRow(product.id)
                  const result = await applyInventory(product, patch)
                  setBusyRow('')
                  if (result && result.ok) flash(`تم حفظ بيانات ${product.name}`)
                  else setError(`تعذر حفظ ${product.name} — أعد المحاولة`)
                }}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function InventoryRow({ product, busy, onSave }) {
  const [cost, setCost] = useState(String(Number(product.cost) || ''))
  const [stock, setStock] = useState(String(Number(product.stock) || ''))

  const dirty =
    String(Number(product.cost) || '') !== cost || String(Number(product.stock) || '') !== stock

  return (
    <li className="rounded-xl border border-slate-700/60 bg-slate-900/40 px-2.5 py-2">
      <p className="line-clamp-1 text-[12.5px] font-bold text-slate-100">{product.name}</p>
      <div className="mt-1.5 flex items-center gap-1.5">
        <label className="min-w-0 flex-1">
          <span className="block text-[9px] font-bold text-slate-500">سعر الشراء</span>
          <input
            value={cost}
            onChange={(e) => setCost(e.target.value.replace(/[^\d.]/g, ''))}
            inputMode="decimal"
            placeholder="0"
            className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-2 py-1.5 text-[12px] font-bold tabular-nums text-slate-100 outline-none focus:border-sky-400"
          />
        </label>
        <label className="min-w-0 flex-1">
          <span className="block text-[9px] font-bold text-slate-500">الكمية المتاحة</span>
          <input
            value={stock}
            onChange={(e) => setStock(e.target.value.replace(/[^\d]/g, ''))}
            inputMode="numeric"
            placeholder="0"
            className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-2 py-1.5 text-[12px] font-bold tabular-nums text-slate-100 outline-none focus:border-sky-400"
          />
        </label>
        <div className="shrink-0 pt-3">
          <button
            type="button"
            disabled={busy || !dirty}
            onClick={() =>
              onSave({
                cost: cost === '' ? 0 : Number(cost),
                stock: stock === '' ? 0 : Number(stock),
              })
            }
            className="flex h-8 items-center gap-1 rounded-lg bg-sky-500 px-2.5 text-[11px] font-extrabold text-slate-950 transition hover:bg-sky-400 disabled:opacity-40"
          >
            {busy ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Save className="h-3 w-3" />
            )}
            حفظ
          </button>
        </div>
      </div>
      <p className="mt-1 text-[9.5px] font-semibold text-slate-500">
        سعر البيع {formatMoney(product.price)} · المباع {formatNumber(product.sold)}
      </p>
    </li>
  )
}
