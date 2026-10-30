const nf = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 })

/** 1 250.5 → "1,250.5 ج.م" */
export function formatMoney(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '0 ج.م'
  return `${nf.format(n)} ج.م`
}

export function formatNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) ? nf.format(n) : '0'
}

export function formatDateTime(iso) {
  const d = iso ? new Date(iso) : new Date()
  if (Number.isNaN(d.getTime())) return '—'
  try {
    return d.toLocaleString('ar-EG', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return d.toISOString().slice(0, 16).replace('T', ' ')
  }
}

/** Arabic-friendly search normalisation: strips diacritics, unifies alef/ya/ta-marbuta. */
export function normalizeAr(value) {
  return String(value ?? '')
    .replace(/[\u064B-\u0652\u0640\u0670]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim()
}

const CODE_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'

/** POS-XXXXXX */
export function randomOrderCode(length = 6) {
  let out = ''
  for (let i = 0; i < length; i += 1) {
    out += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  }
  return out
}

export const PAYMENT_LABELS = {
  cash: 'كاش',
  visa: 'فيزا (Paymob)',
}

export function paymentLabel(key) {
  return PAYMENT_LABELS[key] || 'كاش'
}
