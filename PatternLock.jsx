import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, ShieldCheck } from 'lucide-react'

/**
 * 3×3 pattern lock — drag across the dots to draw a pattern.
 * The value is the dot sequence joined with dashes, e.g. "0-1-2-5-8".
 * Same contract as the numeric pad: the parent owns the value and does the
 * server check, this only reads the gesture.
 */
export default function PatternLock({
  value = '',
  onChange,
  onSubmit,
  busy = false,
  disabled = false,
  error = '',
  submitLabel = 'تأكيد النمط',
  hint = '',
  minDots = 4,
}) {
  const [drawing, setDrawing] = useState([])
  const [shake, setShake] = useState(false)
  const pathRef = useRef([])
  const activeRef = useRef(false)
  const dotsRef = useRef([])
  const surfaceRef = useRef(null)
  const shakeTimer = useRef(null)

  const locked = busy || disabled

  useEffect(() => {
    if (!error) return undefined
    setShake(true)
    if (shakeTimer.current) clearTimeout(shakeTimer.current)
    shakeTimer.current = setTimeout(() => setShake(false), 450)
    return () => {
      if (shakeTimer.current) clearTimeout(shakeTimer.current)
    }
  }, [error])

  useEffect(() => {
    if (!value) {
      setDrawing([])
      pathRef.current = []
    }
  }, [value])

  const hitTest = useCallback((clientX, clientY) => {
    for (let i = 0; i < 9; i += 1) {
      const el = dotsRef.current[i]
      if (!el) continue
      const rect = el.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const radius = Math.max(rect.width, rect.height) * 0.62
      if (Math.hypot(clientX - cx, clientY - cy) <= radius) return i
    }
    return null
  }, [])

  const addDot = useCallback((index) => {
    if (index == null) return
    if (pathRef.current.includes(index)) return
    const next = [...pathRef.current, index]
    pathRef.current = next
    setDrawing(next)
  }, [])

  function start(e) {
    if (locked) return
    e.preventDefault()
    activeRef.current = true
    pathRef.current = []
    setDrawing([])
    if (surfaceRef.current && surfaceRef.current.setPointerCapture) {
      try {
        surfaceRef.current.setPointerCapture(e.pointerId)
      } catch {
        /* not supported — moving without capture still works */
      }
    }
    addDot(hitTest(e.clientX, e.clientY))
  }

  function move(e) {
    if (!activeRef.current || locked) return
    addDot(hitTest(e.clientX, e.clientY))
  }

  function end() {
    if (!activeRef.current) return
    activeRef.current = false
    const path = pathRef.current
    if (path.length < minDots) {
      setDrawing([])
      pathRef.current = []
      return
    }
    const joined = path.join('-')
    onChange?.(joined)
    onSubmit?.(joined)
    setDrawing([])
    pathRef.current = []
  }

  /* line segments between chosen dots (percent coordinates on a 100×100 box) */
  const center = (i) => ({
    x: ((i % 3) + 0.5) * (100 / 3),
    y: (Math.floor(i / 3) + 0.5) * (100 / 3),
  })

  return (
    <div className={shake ? 'anim-shake' : ''}>
      <div
        ref={surfaceRef}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        onPointerLeave={end}
        className="relative mx-auto aspect-square w-full max-w-[248px] touch-none select-none rounded-3xl border border-slate-700/70 bg-slate-900/60 p-4"
      >
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-4 h-[calc(100%-2rem)] w-[calc(100%-2rem)]"
        >
          {drawing.slice(1).map((index, i) => {
            const a = center(drawing[i])
            const b = center(index)
            return (
              <line
                key={`${drawing[i]}-${index}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="#38bdf8"
                strokeWidth="2.6"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            )
          })}
        </svg>

        <div className="relative grid h-full w-full grid-cols-3 gap-1.5">
          {Array.from({ length: 9 }).map((_, index) => {
            const active = drawing.includes(index)
            return (
              <div key={index} className="grid place-items-center">
                <span
                  ref={(el) => {
                    dotsRef.current[index] = el
                  }}
                  className={`grid h-4 w-4 place-items-center rounded-full border-2 transition ${
                    active
                      ? 'scale-125 border-sky-400 bg-sky-400 shadow-[0_0_0_6px_rgba(56,189,248,0.18)]'
                      : 'border-slate-500/80 bg-slate-700/60'
                  }`}
                />
              </div>
            )
          })}
        </div>
      </div>

      <p className="mt-2 text-center text-[10.5px] font-semibold text-slate-500">
        {locked
          ? 'جارٍ التحقق…'
          : `اسحب إصبعك بين النقاط لتكوين النمط (${minDots} نقاط على الأقل)`}
      </p>

      {error && (
        <p className="anim-fade-up mt-2 rounded-xl bg-rose-500/10 px-3 py-2 text-center text-[11px] font-bold text-rose-300">
          {error}
        </p>
      )}

      {onSubmit && value && (
        <button
          type="button"
          onClick={() => onSubmit(value)}
          disabled={locked}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-500 py-2.5 text-[12px] font-extrabold text-slate-950 transition hover:bg-emerald-400 active:scale-[0.98] disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
          {busy ? 'جارٍ التحقق…' : submitLabel}
        </button>
      )}

      {hint && (
        <p className="mt-2 text-center text-[10px] font-semibold leading-relaxed text-slate-500">
          {hint}
        </p>
      )}
    </div>
  )
}
