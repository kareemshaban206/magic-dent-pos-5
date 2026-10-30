import { useEffect, useState } from 'react'
import { HashRouter, Routes, Route, NavLink } from 'react-router-dom'
import {
  ShoppingBag,
  ReceiptText,
  Stethoscope,
  Repeat2,
  Settings2,
  Lock,
  Sun,
  Moon,
} from 'lucide-react'
import { POSProvider, usePOS } from './components/POSProvider'
import ShiftGate from './components/ShiftGate'
import ProductAdmin from './components/ProductAdmin'
import CashierAccount from './components/CashierAccount'
import POS from './pages/POS'
import Orders from './pages/Orders'

function NavTabs() {
  const { managerUnlocked } = usePOS()
  const base =
    'flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[13px] font-bold transition sm:flex-none'
  return (
    <nav className="flex items-center gap-1 rounded-2xl border border-slate-700/70 bg-slate-800/50 p-1">
      <NavLink
        to="/"
        end
        className={({ isActive }) =>
          `${base} ${
            isActive
              ? 'bg-sky-500 text-slate-950 shadow-lg shadow-sky-500/25'
              : 'text-slate-300 hover:bg-slate-700/60 hover:text-white'
          }`
        }
      >
        <ShoppingBag className="h-4 w-4" />
        الكاشير
      </NavLink>
      <NavLink
        to="/orders"
        className={({ isActive }) =>
          `${base} ${
            isActive
              ? 'bg-sky-500 text-slate-950 shadow-lg shadow-sky-500/25'
              : 'text-slate-300 hover:bg-slate-700/60 hover:text-white'
          }`
        }
        title={managerUnlocked ? 'سجل المبيعات' : 'سجل المبيعات — محمي بكلمة سر المدير'}
      >
        <ReceiptText className="h-4 w-4" />
        سجل المبيعات
        {!managerUnlocked && <Lock className="h-3 w-3 opacity-70" />}
      </NavLink>
    </nav>
  )
}

function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme } = usePOS()
  const isLight = theme === 'light'
  return (
    <button
      onClick={toggleTheme}
      aria-label={isLight ? 'التحويل إلى الوضع الداكن' : 'التحويل إلى الوضع النهاري'}
      title={isLight ? 'الوضع الداكن' : 'الوضع النهاري'}
      className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-700/80 bg-slate-800/60 transition hover:border-sky-500/60 hover:bg-slate-800 active:scale-[0.95] ${className}`}
    >
      {isLight ? (
        <Moon className="h-5 w-5 text-sky-500" strokeWidth={2.2} />
      ) : (
        <Sun className="h-5 w-5 text-amber-300" strokeWidth={2.2} />
      )}
    </button>
  )
}

function CashierBadge({ onOpen }) {
  const { cashier } = usePOS()
  const initial = cashier?.name ? cashier.name.trim().charAt(0) : '?'

  return (
    <button
      onClick={onOpen}
      className="group flex shrink-0 items-center gap-2 rounded-2xl border border-slate-700/80 bg-slate-800/60 px-2 py-1.5 transition hover:border-sky-500/60 hover:bg-slate-800"
      title="حسابي وكلمة السر"
    >
      <div className="relative grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-sky-400 to-emerald-400 font-display text-sm font-extrabold text-slate-950">
        {initial}
        <span className="absolute -bottom-0.5 -left-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#0f172a] bg-emerald-400" />
      </div>
      <div className="text-right leading-tight">
        <p className="max-w-[86px] truncate text-[12px] font-extrabold text-slate-100 sm:max-w-[110px]">
          {cashier?.name || 'بدء الوردية'}
        </p>
        <p className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 transition group-hover:text-sky-300">
          <Repeat2 className="h-2.5 w-2.5" />
          حسابي وكلمة السر
        </p>
      </div>
    </button>
  )
}

function ManageProductsButton({ compact = false, onClick }) {
  if (compact) {
    return (
      <button
        onClick={onClick}
        aria-label="إدارة الأصناف"
        title="إدارة الأصناف"
        className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-700/80 bg-slate-800/60 text-sky-400 transition hover:border-sky-500/60 hover:bg-slate-800 active:scale-[0.95]"
      >
        <Settings2 className="h-5 w-5" />
      </button>
    )
  }
  return (
    <button
      onClick={onClick}
      title="إدارة وتعديل الأصناف والأسعار"
      className="group flex shrink-0 items-center gap-1.5 rounded-2xl border border-slate-700/80 bg-slate-800/60 px-2.5 py-2 text-[12px] font-extrabold text-slate-300 transition hover:border-sky-500/60 hover:bg-slate-800 hover:text-sky-300 active:scale-[0.97]"
    >
      <Settings2 className="h-4 w-4 text-sky-400 transition group-hover:rotate-45" />
      <span className="hidden md:inline">إدارة الأصناف</span>
    </button>
  )
}

function Shell() {
  const [adminOpen, setAdminOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  return (
    <div className="flex h-full flex-col bg-[#0f172a] text-slate-100" dir="rtl">
      <header className="shrink-0 border-b border-slate-800/80 bg-[#0f172a]/95 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto w-full max-w-[1600px] px-3 md:px-6">
          <div className="flex items-center gap-2 py-2.5 md:gap-4">
            <div className="flex shrink-0 items-center gap-2">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-sky-400 to-emerald-400 text-slate-950 shadow-lg shadow-sky-500/20">
                <Stethoscope className="h-5 w-5" strokeWidth={2.3} />
              </div>
              <div className="leading-tight">
                <h1 className="font-display text-[15px] font-extrabold tracking-tight text-slate-50 md:text-lg">
                  Magic Dent <span className="text-sky-400">POS</span>
                </h1>
                <p className="hidden text-[10px] font-semibold text-slate-500 sm:block">
                  نقطة بيع مستلزمات عيادة الأسنان
                </p>
              </div>
            </div>

            <div className="hidden sm:block">
              <NavTabs />
            </div>

            <div className="ms-auto flex items-center gap-1.5 md:gap-2">
              <div className="hidden md:block">
                <ThemeToggle />
              </div>
              <div className="hidden md:block">
                <ManageProductsButton onClick={() => setAdminOpen(true)} />
              </div>
              <CashierBadge onOpen={() => setAccountOpen(true)} />
            </div>
          </div>

          <div className="flex items-center gap-2 pb-2.5 sm:hidden">
            <div className="min-w-0 flex-1">
              <NavTabs />
            </div>
            <ThemeToggle />
            <ManageProductsButton compact onClick={() => setAdminOpen(true)} />
          </div>
        </div>
      </header>

      <main className="relative min-h-0 flex-1 overflow-hidden">
        <Routes>
          <Route path="/" element={<POS />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="*" element={<POS />} />
        </Routes>
      </main>

      <ShiftGate />
      <CashierAccount open={accountOpen} onClose={() => setAccountOpen(false)} />
      <ProductAdmin open={adminOpen} onClose={() => setAdminOpen(false)} />
    </div>
  )
}

export default function App() {
  useEffect(() => {
    document.documentElement.dir = 'rtl'
    document.documentElement.lang = 'ar'
  }, [])

  return (
    <POSProvider>
      <HashRouter>
        <Shell />
      </HashRouter>
    </POSProvider>
  )
}
