import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { db } from '../lib/db'
import { email } from '../lib/email'
import { useLiveShared } from '../lib/useLive'
import { randomOrderCode } from '../format'
import { PRODUCTS } from '../data/products'

const POSContext = createContext(null)

const THEME_KEY = 'magicdent.theme.v1'

/* where a forgotten manager secret is recovered to */
export const MANAGER_RECOVERY_EMAIL = 'kareemshaban152@gmail.com'

/* the manager secret lives on the server, keyed to this row — no read of the
   row ever returns it, so it cannot be taken out of the app or the data view */
const CONFIG = 'config'
const PIN_ROW = 'manager-pin'
const SECRET = 'pin'

const DEFAULT_EMPLOYEES = [
  { id: 'emp-1', name: 'د. محمد عبد الله', role: 'مدير العيادة', sort: 1 },
  { id: 'emp-2', name: 'سارة أحمد', role: 'كاشير', sort: 2 },
  { id: 'emp-3', name: 'كريم سمير', role: 'كاشير', sort: 3 },
  { id: 'emp-4', name: 'هدى مصطفى', role: 'مساعد طبيب', sort: 4 },
]

/* Catalog edits live in their own collection so every device can write them:
   override  → a change of name/price for a base catalog item
   hidden    → a base catalog item removed from the grid
   new       → a product added from the app itself                              */
const EDITS = 'catalog_edits'

/* Purchasing cost + on-hand stock per product. Written as counter moves, so any
   device can update them without owning the catalog row. */
const INVENTORY = 'inventory'

function money(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function cleanImage(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function cleanSecret(value) {
  return String(value ?? '').trim()
}

/* a password of 4+ characters, or a drawn pattern ("0-1-2-5-8") */
function validSecret(value) {
  const v = cleanSecret(value)
  return v.length >= 4 && v.length <= 64
}

function readStoredTheme() {
  try {
    return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

export function POSProvider({ children }) {
  const [cashier, setCashier] = useState(null)
  const [items, setItems] = useState([])
  const [payment, setPayment] = useState('cash')
  const [gateOpen, setGateOpen] = useState(false)
  const [managerUnlocked, setManagerUnlocked] = useState(false)
  const [theme, setTheme] = useState(readStoredTheme)

  /* --------------------------------------------------------------- theme */
  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('light', theme === 'light')
    root.style.colorScheme = theme === 'light' ? 'light' : 'dark'
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {
      /* storage blocked — the theme still applies for this session */
    }
  }, [theme])

  const toggleTheme = useCallback(
    () => setTheme((prev) => (prev === 'light' ? 'dark' : 'light')),
    [],
  )

  /* ------------------------------------------------------ manager lock
     The manager secret is compared by the server (it is never stored in the
     app or in a readable row), so it cannot be read out of the source and it
     can be rotated from any device that knows the current one.

     It may be a free password (letters/digits/symbols) or a drawn 3×3 pattern —
     both are just a string to the server, which is what makes the mode free to
     change at any time. */
  const verifyManagerSecret = useCallback(async (secret) => {
    const value = cleanSecret(secret)
    if (!validSecret(value)) return { error: 'format' }
    try {
      const row = await db.checkSecret(CONFIG, PIN_ROW, SECRET, value)
      if (!row) return { error: 'wrong' }
      return { ok: true }
    } catch (err) {
      return {
        error: err && err.code === 'SECRET_ATTEMPTS' ? 'attempts' : 'network',
      }
    }
  }, [])

  const unlockManager = useCallback(
    async (secret) => {
      const result = await verifyManagerSecret(secret)
      if (result && result.ok) setManagerUnlocked(true)
      return result
    },
    [verifyManagerSecret],
  )

  const lockManager = useCallback(() => setManagerUnlocked(false), [])

  /* First secret for the app (works while none exists yet). */
  const setupManagerSecret = useCallback(async (secret, confirm) => {
    const value = cleanSecret(secret)
    if (!validSecret(value)) return { error: 'format' }
    if (value !== cleanSecret(confirm)) return { error: 'match' }
    try {
      const ok = await db.setSecret(CONFIG, PIN_ROW, SECRET, value)
      if (!ok) return { error: 'denied' }
      setManagerUnlocked(true)
      return { ok: true }
    } catch (err) {
      if (err && err.code === 'SECRET_ATTEMPTS') return { error: 'attempts' }
      return { error: 'denied' }
    }
  }, [])

  const changeManagerPin = useCallback(
    async (current, next, confirm) => {
      const cur = cleanSecret(current)
      const nxt = cleanSecret(next)
      if (!validSecret(cur)) return { error: 'current' }
      if (!validSecret(nxt)) return { error: 'format' }
      if (nxt !== cleanSecret(confirm)) return { error: 'match' }
      const check = await verifyManagerSecret(cur)
      if (!check.ok) {
        return { error: check.error === 'wrong' ? 'current' : check.error }
      }
      try {
        const ok = await db.setSecret(CONFIG, PIN_ROW, SECRET, nxt, { current: cur })
        return ok ? { ok: true } : { error: 'save' }
      } catch (err) {
        if (err && err.code === 'SECRET_ATTEMPTS') return { error: 'attempts' }
        return { error: 'save' }
      }
    },
    [verifyManagerSecret],
  )

  /* Forgot the secret → a one-time code goes to the clinic's recovery mailbox.
     The code proves the address; then a new secret is set. */
  const sendManagerResetCode = useCallback(async () => {
    try {
      await email.sendCode(MANAGER_RECOVERY_EMAIL, {
        subject: 'كود استعادة كلمة سر المدير — Magic Dent POS',
        body:
          'كود التحقق الخاص بك هو {code}\n\n' +
          'استخدمه خلال 10 دقائق لتعيين كلمة سر / نمط جديد للمدير في تطبيق Magic Dent POS.\n' +
          'لو لم تطلب هذا الكود، تجاهل الرسالة وستبقى كلمة السر الحالية كما هي.',
      })
      return { ok: true }
    } catch (err) {
      const code = err && err.code
      if (code === 'RATE_LIMITED') return { error: 'rate' }
      if (code === 'DAILY_LIMIT' || code === 'QUOTA_EXCEEDED') return { error: 'quota' }
      if (code === 'BAD_RECIPIENT') return { error: 'recipient' }
      return { error: 'send' }
    }
  }, [])

  /* A mailed code is checked once — `verified` lets the screen retry only the
     last step (the owner's sign-in) without burning the code it already proved. */
  const completeManagerReset = useCallback(async (code, next, confirm, options) => {
    const digits = String(code || '').replace(/\D/g, '')
    const nxt = cleanSecret(next)
    if (digits.length !== 6) return { error: 'codeFormat' }
    if (!validSecret(nxt)) return { error: 'format' }
    if (nxt !== cleanSecret(confirm)) return { error: 'match' }
    const alreadyProven = !!(options && options.verified)
    if (!alreadyProven) {
      let valid = false
      try {
        valid = await email.checkCode(MANAGER_RECOVERY_EMAIL, digits)
      } catch {
        return { error: 'codeCheck' }
      }
      if (!valid) return { error: 'code' }
    }
    try {
      const ok = await db.setSecret(CONFIG, PIN_ROW, SECRET, nxt)
      /* A stored secret is only replaced by someone who proves the old one — or
         by the app's owner. A forgotten secret has no old value, so this last
         step needs the owner's session; the screen offers a sign-in button and
         retries right after it rather than dead-ending. */
      if (!ok) return { error: 'owner' }
      setManagerUnlocked(true)
      return { ok: true }
    } catch (err) {
      if (err && err.code === 'SECRET_ATTEMPTS') return { error: 'attempts' }
      return { error: 'owner' }
    }
  }, [])

  /* ------------------------------------------------ per-cashier codes
     Every employee has their OWN 4-digit code so no cashier can take over
     another's shift. The code is kept by the server on that employee's row
     (never in the app, never in a readable field) so it can be set and changed
     from any device that knows the current one.

     pinSet on the employee row is only a UI hint that a code exists (the server
     still compares the real value), so the gate knows whether to ask for a code
     or to offer creating one for the first time. */
  const checkCashierPin = useCallback(async (employeeId, pin) => {
    const value = String(pin || '').trim()
    if (!employeeId) return { error: 'missing' }
    if (!/^\d{4}$/.test(value)) return { error: 'format' }
    try {
      const row = await db.checkSecret('employees', employeeId, 'pin', value)
      if (!row) return { error: 'wrong' }
      return { ok: true, employee: row }
    } catch (err) {
      return {
        error: err && err.code === 'SECRET_ATTEMPTS' ? 'attempts' : 'network',
      }
    }
  }, [])

  /* Create the code for an employee who has none yet (currentPin left out), or
     replace it while passing the current one. Both are judged by the server.

     The manager approves every replacement (the screen asks for the manager
     secret first) so a cashier cannot quietly re-key their own code — the
     manager's approval is what unlocks this call. */
  const saveCashierPin = useCallback(async (employeeId, nextPin, currentPin) => {
    if (!employeeId) return { error: 'missing' }
    const value = String(nextPin || '').trim()
    if (!/^\d{4}$/.test(value)) return { error: 'format' }
    const current = currentPin ? String(currentPin).trim() : ''
    try {
      const set = await db.setSecret(
        'employees',
        employeeId,
        'pin',
        value,
        current ? { current } : undefined,
      )
      if (!set) return { error: current ? 'save' : 'denied' }
      /* the flag only drives the gate's UI — the real code stays on the server */
      db.updateShared('employees', employeeId, { pinSet: true }).catch(() => {})
      return { ok: true }
    } catch (err) {
      if (err && err.code === 'SECRET_ATTEMPTS') return { error: 'attempts' }
      return { error: current ? 'save' : 'denied' }
    }
  }, [])

  const { data: employeeRows, loading: employeesLoading } = useLiveShared('employees')
  const { data: productRows, loading: productsLoading } = useLiveShared('products')
  const { data: editRows } = useLiveShared(EDITS)
  const { data: inventoryRows } = useLiveShared(INVENTORY)

  /* ---------------------------------------------------------------- staff */
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const rows = await db.selectShared('employees')
        if (cancelled || (rows && rows.length)) return
        for (const emp of DEFAULT_EMPLOYEES) {
          await db.upsertShared(
            'employees',
            { name: emp.name, role: emp.role, sort: emp.sort, archived: false },
            emp.id,
            { writableBy: 'anyone' },
          )
        }
      } catch {
        /* offline / first run without connection — the gate falls back below */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const allEmployees = useMemo(() => {
    const rows = (employeeRows || []).map((row) => ({
      id: row.id,
      name: row.name || 'موظف',
      role: row.role || '',
      sort: Number.isFinite(Number(row.sort)) ? Number(row.sort) : 9999,
      archived: !!row.archived,
      pinSet: !!row.pinSet,
    }))
    return rows.sort(
      (a, b) => a.sort - b.sort || String(a.name).localeCompare(String(b.name), 'ar'),
    )
  }, [employeeRows])

  const employees = useMemo(
    () => allEmployees.filter((emp) => !emp.archived),
    [allEmployees],
  )

  const startShift = useCallback((employee) => {
    if (!employee) return
    const value = { id: employee.id, name: employee.name, role: employee.role || '' }
    setCashier(value)
    setGateOpen(false)
  }, [])

  const openShiftGate = useCallback(() => setGateOpen(true), [])
  const closeShiftGate = useCallback(() => setGateOpen(false), [])

  /* End the shift: the gate comes back up, so the next person must enter their
     own code before touching the cashier screen. */
  const endShift = useCallback(() => {
    setCashier(null)
    setGateOpen(true)
  }, [])

  const addEmployee = useCallback(async (name, role) => {
    const cleanName = String(name || '').trim()
    if (!cleanName) return null
    const id = `emp-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
    const row = {
      name: cleanName,
      role: String(role || '').trim() || 'كاشير',
      sort: Date.now(),
      archived: false,
      pinSet: false,
    }
    try {
      await db.insertShared('employees', row, id, { writableBy: 'anyone' })
    } catch {
      return null
    }
    return { id, ...row }
  }, [])

  const setEmployeeArchived = useCallback(async (id, archived) => {
    try {
      await db.updateShared('employees', id, { archived: !!archived })
      return true
    } catch {
      return false
    }
  }, [])

  /* ------------------------------------------------------------ inventory
     productId → { cost, stock } — the purchasing price the manager enters and
     the units still on the shelf. */
  const inventoryMap = useMemo(() => {
    const map = new Map()
    for (const row of inventoryRows || []) {
      if (!row) continue
      const key = row.productId || String(row.id || '').replace(/^inv-/, '')
      if (!key) continue
      map.set(key, { cost: money(row.cost), stock: money(row.stock) })
    }
    return map
  }, [inventoryRows])

  /* -------------------------------------------------------------- catalog */
  const products = useMemo(() => {
    const baseRows = productRows && productRows.length ? productRows : []

    const base = (baseRows.length ? baseRows : PRODUCTS).map((row, index) => ({
      id: row.id || `seed:${row.name}`,
      name: row.name || 'صنف',
      price: money(row.price),
      sold: money(row.sold),
      image: cleanImage(row.image),
      sort: Number.isFinite(Number(row.sort)) ? Number(row.sort) : index + 500,
      isNew: false,
    }))

    const overrides = new Map()
    const hidden = new Set()
    const additions = []

    for (const edit of editRows || []) {
      if (!edit) continue
      const kind = edit.kind
      if (kind === 'override' && edit.productId) {
        overrides.set(edit.productId, edit)
      } else if (kind === 'hidden' && edit.productId) {
        hidden.add(edit.productId)
      } else if (kind === 'new' && edit.id) {
        additions.push({
          id: edit.id,
          name: edit.name || 'صنف جديد',
          price: money(edit.price),
          sold: money(edit.sold),
          image: cleanImage(edit.image),
          sort: Number.isFinite(Number(edit.sort)) ? Number(edit.sort) : Date.now(),
          isNew: true,
        })
      }
    }

    const merged = base
      .filter((row) => !hidden.has(row.id))
      .map((row) => {
        const ov = overrides.get(row.id)
        if (!ov) return row
        return {
          ...row,
          name: ov.name ? ov.name : row.name,
          price: ov.price !== undefined && ov.price !== null ? money(ov.price) : row.price,
          image: ov.image !== undefined && ov.image !== null ? cleanImage(ov.image) : row.image,
        }
      })

    const extras = additions.filter((row) => !hidden.has(row.id))

    return [...merged, ...extras]
      .map((row) => {
        const inv = inventoryMap.get(row.id)
        return {
          ...row,
          cost: inv ? inv.cost : 0,
          stock: inv ? inv.stock : 0,
        }
      })
      .sort(
        (a, b) => a.sort - b.sort || String(a.name).localeCompare(String(b.name), 'ar'),
      )
  }, [productRows, editRows, inventoryMap])

  /* Set the purchasing cost and/or the available quantity of one product.
     Written as a counter move (current → target) because the catalog rows were
     seeded elsewhere: a shared row may only be overwritten by its creator, but
     any device that can read the row may move a number on it. */
  const applyInventory = useCallback(async (product, patch = {}) => {
    if (!product || !product.id) return { error: 'missing' }
    const id = `inv-${product.id}`

    const move = async (field, target) => {
      const value = Number(target)
      if (!Number.isFinite(value) || value < 0) return false
      let row = null
      try {
        row = await db.getShared(INVENTORY, id)
      } catch {
        row = null
      }
      if (!row) {
        try {
          await db.insertShared(
            INVENTORY,
            {
              productId: product.id,
              name: product.name,
              cost: field === 'cost' ? value : 0,
              stock: field === 'stock' ? value : 0,
            },
            id,
          )
          return true
        } catch {
          return false
        }
      }
      const current = money(row[field])
      const delta = value - current
      if (!delta) return true
      try {
        const res = await db.incrementShared(INVENTORY, id, field, delta)
        return res !== null
      } catch {
        return false
      }
    }

    let ok = true
    if (patch.cost !== undefined && patch.cost !== null && patch.cost !== '') {
      ok = (await move('cost', patch.cost)) && ok
    }
    if (patch.stock !== undefined && patch.stock !== null && patch.stock !== '') {
      ok = (await move('stock', patch.stock)) && ok
    }
    return ok ? { ok: true } : { error: 'save' }
  }, [])

  /* Bulk version for a spreadsheet upload: reads the current numbers from the
     live map (no per-row read) and sends the moves in batches, so 60 products
     do not become 120 separate writes. */
  const applyInventoryBulk = useCallback(
    async (targets = []) => {
      if (!Array.isArray(targets) || !targets.length) return { updated: 0, failed: 0 }
      const updatedIds = new Set()
      let failed = 0
      const inserts = []
      const costOps = []
      const stockOps = []
      const mediaTargets = []

      for (const entry of targets) {
        const product = entry && entry.product
        const patch = (entry && entry.patch) || {}
        if (!product || !product.id) {
          failed += 1
          continue
        }
        /* selling price and picture are catalog fields, not counters — they go
           onto the catalog override so every device's grid shows them. Decided
           before the stock branch, so a product with no inventory row yet still
           gets its price and picture. */
        const rawPrice = patch.price
        const nextPrice =
          rawPrice !== undefined && rawPrice !== null && rawPrice !== ''
            ? Number(rawPrice)
            : null
        const rawImage = patch.image
        const nextImage =
          rawImage !== undefined && rawImage !== null ? String(rawImage).trim() : null
        const priceChanged =
          nextPrice !== null &&
          Number.isFinite(nextPrice) &&
          nextPrice > 0 &&
          nextPrice !== Number(product.price)
        const imageChanged =
          nextImage !== null && cleanImage(nextImage) !== cleanImage(product.image)
        if (priceChanged || imageChanged) {
          mediaTargets.push({
            product,
            price: priceChanged ? nextPrice : Number(product.price),
            image: nextImage !== null ? cleanImage(nextImage) : cleanImage(product.image),
          })
        }

        const current = inventoryMap.get(product.id)
        if (!current) {
          inserts.push({ product, patch })
          continue
        }
        const cost = patch.cost
        if (cost !== undefined && cost !== null && cost !== '' && Number(cost) !== current.cost) {
          costOps.push({
            pid: product.id,
            op: {
              action: 'incrementShared',
              collection: INVENTORY,
              id: `inv-${product.id}`,
              field: 'cost',
              by: Number(cost) - current.cost,
            },
          })
        }
        const stock = patch.stock
        if (
          stock !== undefined &&
          stock !== null &&
          stock !== '' &&
          Number(stock) !== current.stock
        ) {
          stockOps.push({
            pid: product.id,
            op: {
              action: 'incrementShared',
              collection: INVENTORY,
              id: `inv-${product.id}`,
              field: 'stock',
              by: Number(stock) - current.stock,
            },
          })
        }

      }

      for (const { product, patch } of inserts) {
        try {
          await db.insertShared(
            INVENTORY,
            {
              productId: product.id,
              name: product.name,
              cost: Number(patch.cost) || 0,
              stock: Number(patch.stock) || 0,
            },
            `inv-${product.id}`,
          )
          updatedIds.add(product.id)
        } catch {
          failed += 1
        }
      }

      const runPass = async (ops) => {
        for (let i = 0; i < ops.length; i += 20) {
          const slice = ops.slice(i, i + 20)
          try {
            await db.batch(slice.map((entry) => entry.op))
            for (const entry of slice) updatedIds.add(entry.pid)
          } catch {
            failed += slice.length
          }
        }
      }

      await runPass(costOps)
      await runPass(stockOps)

      /* price / image edits have to go through the catalog override row: the
         seeded catalog rows belong to whoever created them, so an overwrite of
         the row itself would be refused for this device. */
      for (const entry of mediaTargets) {
        const product = entry.product
        try {
          if (product.isNew) {
            await db.updateShared(EDITS, product.id, {
              price: entry.price,
              image: entry.image,
            })
          } else {
            await db.upsertShared(
              EDITS,
              {
                kind: 'override',
                productId: product.id,
                name: product.name,
                price: entry.price,
                image: entry.image,
              },
              `ovr-${product.id}`,
              { writableBy: 'anyone' },
            )
          }
          updatedIds.add(product.id)
        } catch {
          failed += 1
        }
      }

      return { updated: updatedIds.size, failed }
    },
    [inventoryMap],
  )

  const addProductItem = useCallback(async (name, price, image) => {
    const cleanName = String(name || '').trim()
    const amount = Number(price)
    if (!cleanName) return { error: 'name' }
    if (!Number.isFinite(amount) || amount <= 0) return { error: 'price' }
    const id = `new-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
    const row = {
      kind: 'new',
      productId: id,
      name: cleanName,
      price: amount,
      image: cleanImage(image),
      sold: 0,
      sort: Date.now(),
      createdAt: new Date().toISOString(),
    }
    try {
      await db.upsertShared(EDITS, row, id, { writableBy: 'anyone' })
    } catch {
      return { error: 'save' }
    }
    return { ok: true, id }
  }, [])

  const updateProductItem = useCallback(async (product, name, price, image) => {
    if (!product) return { error: 'missing' }
    const cleanName = String(name || '').trim()
    const amount = Number(price)
    if (!cleanName) return { error: 'name' }
    if (!Number.isFinite(amount) || amount <= 0) return { error: 'price' }
    const picture = cleanImage(image)

    try {
      if (product.isNew) {
        await db.updateShared(EDITS, product.id, {
          name: cleanName,
          price: amount,
          image: picture,
        })
      } else {
        await db.upsertShared(
          EDITS,
          {
            kind: 'override',
            productId: product.id,
            name: cleanName,
            price: amount,
            image: picture,
          },
          `ovr-${product.id}`,
          { writableBy: 'anyone' },
        )
      }
    } catch {
      return { error: 'save' }
    }
    return { ok: true }
  }, [])

  const removeProductItem = useCallback(async (product) => {
    if (!product) return { error: 'missing' }
    try {
      if (product.isNew) {
        await db.deleteShared(EDITS, product.id)
      } else {
        await db.upsertShared(
          EDITS,
          { kind: 'hidden', productId: product.id, name: product.name },
          `del-${product.id}`,
          { writableBy: 'anyone' },
        )
      }
    } catch {
      return { error: 'save' }
    }
    return { ok: true }
  }, [])

  /* Reset the "sold" counter of ONE product back to 0 without touching its
     name, price or picture — lets a manager clear the counts per shift or day.

     The catalog rows are shared and were seeded outside the app, so overwriting
     them (updateShared) is refused for anyone but the row's creator — that was
     the "حاول الاتصال مرة أخرى" failure. A counter write is judged by READ
     access instead, so a cashier may always bring the counter back to zero by
     subtracting its current value atomically. Works for both a product added
     from the app (its row lives in EDITS) and a seeded catalog item. */
  const resetProductSold = useCallback(async (product) => {
    if (!product) return { error: 'missing' }
    const collection = product.isNew ? EDITS : 'products'
    if (!product.isNew && String(product.id).startsWith('seed:')) {
      return { error: 'missing' }
    }
    try {
      const row = await db.getShared(collection, product.id)
      if (!row) return { error: 'missing' }
      const sold = money(row.sold)
      if (sold <= 0) return { ok: true, from: 0 }
      const res = await db.incrementShared(collection, product.id, 'sold', -sold)
      if (res === null) return { error: 'missing' }
      return { ok: true, from: sold }
    } catch (err) {
      return { error: err && err.status === 404 ? 'missing' : 'save' }
    }
  }, [])

  /* ----------------------------------------------------------------- cart */
  const addProduct = useCallback((product) => {
    if (!product) return
    const price = Number(product.price) || 0
    const key = `p:${product.id || product.name}`
    setItems((prev) => {
      const existing = prev.find((line) => line.key === key)
      if (existing) {
        return prev.map((line) =>
          line.key === key ? { ...line, qty: line.qty + 1 } : line,
        )
      }
      return [
        {
          key,
          name: product.name,
          price,
          qty: 1,
          productId: product.id || null,
          cost: Number(product.cost) || 0,
        },
        ...prev,
      ]
    })
  }, [])

  const addCustom = useCallback((name, price) => {
    const amount = Number(price)
    if (!Number.isFinite(amount) || amount <= 0) return false
    const key = `c:${amount}`
    const label =
      String(name || '').trim() || `صنف إضافي ${amount} ج.م`
    setItems((prev) => {
      const existing = prev.find((line) => line.key === key)
      if (existing) {
        return prev.map((line) =>
          line.key === key ? { ...line, qty: line.qty + 1 } : line,
        )
      }
      return [{ key, name: label, price: amount, qty: 1, productId: null, cost: 0 }, ...prev]
    })
    return true
  }, [])

  const incQty = useCallback((key) => {
    setItems((prev) =>
      prev.map((line) => (line.key === key ? { ...line, qty: line.qty + 1 } : line)),
    )
  }, [])

  const decQty = useCallback((key) => {
    setItems((prev) =>
      prev.flatMap((line) => {
        if (line.key !== key) return [line]
        const next = line.qty - 1
        return next <= 0 ? [] : [{ ...line, qty: next }]
      }),
    )
  }, [])

  const setQty = useCallback((key, qty) => {
    const next = Number(qty)
    if (!Number.isFinite(next) || next <= 0) {
      setItems((prev) => prev.filter((line) => line.key !== key))
      return
    }
    setItems((prev) =>
      prev.map((line) => (line.key === key ? { ...line, qty: Math.floor(next) } : line)),
    )
  }, [])

  const removeItem = useCallback((key) => {
    setItems((prev) => prev.filter((line) => line.key !== key))
  }, [])

  const clearCart = useCallback(() => {
    setItems([])
    setPayment('cash')
  }, [])

  const count = useMemo(() => items.reduce((sum, line) => sum + line.qty, 0), [items])
  const total = useMemo(
    () => items.reduce((sum, line) => sum + line.price * line.qty, 0),
    [items],
  )

  /* ------------------------------------------------------------- checkout */
  const checkout = useCallback(async () => {
    if (!items.length) return { error: 'empty' }

    const orderId = `POS-${randomOrderCode()}`
    const totalQty = items.reduce((sum, line) => sum + line.qty, 0)
    const grandTotal = items.reduce((sum, line) => sum + line.price * line.qty, 0)
    const record = {
      orderId,
      items: items.map((line) => ({
        name: line.name,
        price: line.price,
        qty: line.qty,
        cost: Number(line.cost) || 0,
        productId: line.productId || null,
      })),
      totalQty,
      total: grandTotal,
      payment,
      employeeId: cashier?.id || null,
      employeeName: cashier?.name || 'غير محدد',
      date: new Date().toISOString(),
    }

    let saved = true
    let savedId = null
    try {
      const row = await db.insert('orders', record)
      savedId = row?.id || null
    } catch {
      saved = false
    }

    for (const line of items) {
      if (!line.productId) continue
      const isNew = String(line.productId).startsWith('new-')
      db.incrementShared(
        isNew ? EDITS : 'products',
        line.productId,
        'sold',
        line.qty,
      ).catch(() => {})
      /* take the sold units off the shelf */
      db.incrementShared(INVENTORY, `inv-${line.productId}`, 'stock', -line.qty).catch(
        () => {},
      )
    }

    setItems([])
    setPayment('cash')

    return { order: { ...record, saved, savedId } }
  }, [items, payment, cashier])

  const value = useMemo(
    () => ({
      theme,
      toggleTheme,
      managerUnlocked,
      unlockManager,
      lockManager,
      verifyManagerSecret,
      setupManagerSecret,
      changeManagerPin,
      sendManagerResetCode,
      completeManagerReset,
      cashier,
      startShift,
      openShiftGate,
      closeShiftGate,
      gateOpen,
      employees,
      allEmployees,
      employeesLoading,
      addEmployee,
      setEmployeeArchived,
      checkCashierPin,
      saveCashierPin,
      endShift,
      products,
      productsLoading,
      inventoryMap,
      applyInventory,
      applyInventoryBulk,
      addProductItem,
      updateProductItem,
      removeProductItem,
      resetProductSold,
      items,
      addProduct,
      addCustom,
      incQty,
      decQty,
      setQty,
      removeItem,
      clearCart,
      count,
      total,
      payment,
      setPayment,
      checkout,
    }),
    [
      theme,
      toggleTheme,
      managerUnlocked,
      unlockManager,
      lockManager,
      verifyManagerSecret,
      setupManagerSecret,
      changeManagerPin,
      sendManagerResetCode,
      completeManagerReset,
      cashier,
      startShift,
      openShiftGate,
      closeShiftGate,
      gateOpen,
      employees,
      allEmployees,
      employeesLoading,
      addEmployee,
      setEmployeeArchived,
      checkCashierPin,
      saveCashierPin,
      endShift,
      products,
      productsLoading,
      inventoryMap,
      applyInventory,
      applyInventoryBulk,
      addProductItem,
      updateProductItem,
      removeProductItem,
      resetProductSold,
      items,
      addProduct,
      addCustom,
      incQty,
      decQty,
      setQty,
      removeItem,
      clearCart,
      count,
      total,
      payment,
      checkout,
    ],
  )

  return <POSContext.Provider value={value}>{children}</POSContext.Provider>
}

export function usePOS() {
  const ctx = useContext(POSContext)
  if (!ctx) throw new Error('usePOS must be used inside POSProvider')
  return ctx
}
