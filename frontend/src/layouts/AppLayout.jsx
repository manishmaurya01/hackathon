import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ScanSearch,
  FileBarChart2,
  Plug,
  Settings,
  UserRound,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import Logo from '../components/Logo.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { useToast } from '../hooks/useToast.jsx';
import { initials } from '../utils/format.js';

const PRIMARY = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/analyze', label: 'New Analysis', icon: ScanSearch },
  { to: '/reports', label: 'Reports', icon: FileBarChart2 },
  { to: '/integration', label: 'Integration', icon: Plug },
];

const SECONDARY = [
  { to: '/settings', label: 'Settings', icon: Settings },
  { to: '/profile', label: 'Profile', icon: UserRound },
];

function NavItem({ to, label, icon: Icon, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
          isActive
            ? 'bg-brand-600 text-white shadow-sm'
            : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            size={17}
            strokeWidth={2}
            className={isActive ? 'text-white' : 'text-ink-400 group-hover:text-ink-700'}
          />
          {label}
        </>
      )}
    </NavLink>
  );
}

export default function AppLayout() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  function handleLogout() {
    logout();
    toast.success('You have been signed out.');
    navigate('/login', { replace: true });
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-ink-200/70 px-5">
        <NavLink to="/dashboard" aria-label="VeriWrite AI dashboard">
          <Logo size="sm" />
        </NavLink>
        <button
          type="button"
          className="btn-ghost !p-1.5 lg:hidden"
          onClick={() => setOpen(false)}
          aria-label="Close menu"
        >
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4 thin-scroll" aria-label="Main">
        <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
          Analysis
        </p>
        {PRIMARY.map((item) => (
          <NavItem key={item.to} {...item} onClick={() => setOpen(false)} />
        ))}

        <div className="my-4 border-t border-ink-200/70" />

        <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
          Account
        </p>
        {SECONDARY.map((item) => (
          <NavItem key={item.to} {...item} onClick={() => setOpen(false)} />
        ))}
      </nav>

      <div className="shrink-0 border-t border-ink-200/70 p-3">
        <div className="flex items-center gap-3 rounded-lg bg-ink-50 px-3 py-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-violet-500 text-xs font-bold text-white">
            {initials(user?.name)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink-900">{user?.name}</p>
            <p className="truncate text-xs text-ink-500">{user?.email}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink-600 transition hover:bg-red-50 hover:text-red-600"
        >
          <LogOut size={17} strokeWidth={2} className="text-ink-400" />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-ink-50">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-ink-200/70 bg-white lg:block">
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-ink-950/40 backdrop-blur-sm animate-fade-in"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-white shadow-pop animate-fade-up">
            {sidebar}
          </aside>
        </div>
      )}

      {/* Top bar (mobile) */}
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-ink-200/70 bg-white/80 px-4 backdrop-blur lg:hidden">
        <button
          type="button"
          className="btn-ghost !p-2"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          aria-expanded={open}
        >
          <Menu size={20} />
        </button>
        <Logo size="sm" />
        <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-violet-500 text-xs font-bold text-white">
          {initials(user?.name)}
        </span>
      </header>

      <main className="lg:pl-64">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
