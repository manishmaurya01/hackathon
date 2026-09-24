import { Link, useNavigate } from 'react-router-dom';
import { UserRound, Mail, Calendar, FileBarChart2, ShieldCheck, LogOut, ArrowRight } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.jsx';
import { useToast } from '../hooks/useToast.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { getStats } from '../services/analysis.service.js';
import { formatDate, initials } from '../utils/format.js';

function DetailRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-4 border-b border-ink-100 py-4 last:border-0">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-ink-100 text-ink-500">
        <Icon size={16} />
      </span>
      <div className="min-w-0">
        <p className="text-[12px] font-semibold uppercase tracking-wider text-ink-400">{label}</p>
        <p className="mt-0.5 truncate text-sm font-medium text-ink-800">{value}</p>
      </div>
    </div>
  );
}

export default function Profile() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { data } = useAsync(() => getStats(), []);
  const stats = data?.stats;

  function handleLogout() {
    logout();
    toast.success('You have been signed out.');
    navigate('/login', { replace: true });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-950 sm:text-3xl">Profile</h1>
        <p className="mt-1.5 text-[15px] text-ink-600">
          Your account information and activity at a glance.
        </p>
      </div>

      {/* Identity */}
      <section className="card overflow-hidden">
        <div className="relative bg-gradient-to-r from-brand-600 to-violet-600 px-6 py-8">
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                'radial-gradient(circle at 80% 20%, rgba(255,255,255,.5), transparent 55%)',
            }}
            aria-hidden="true"
          />
          <div className="relative flex items-center gap-5">
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full border-2 border-white/40 bg-white/15 text-xl font-bold text-white backdrop-blur">
              {initials(user?.name)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-xl font-bold text-white">{user?.name}</p>
              <p className="truncate text-sm text-white/80">{user?.email}</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-2">
          <DetailRow icon={UserRound} label="Full Name" value={user?.name || '—'} />
          <DetailRow icon={Mail} label="Email" value={user?.email || '—'} />
          <DetailRow
            icon={Calendar}
            label="Account Created"
            value={formatDate(user?.createdAt, { weekday: undefined })}
          />
          <DetailRow
            icon={FileBarChart2}
            label="Total Reports"
            value={
              stats
                ? `${stats.totalReports.toLocaleString()} report${stats.totalReports === 1 ? '' : 's'}`
                : 'Loading…'
            }
          />
          <DetailRow icon={ShieldCheck} label="User ID" value={user?.id || '—'} />
        </div>
      </section>

      {/* Actions */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link to="/settings" className="btn-secondary flex-1">
          Edit profile
          <ArrowRight size={15} />
        </Link>
        <button type="button" onClick={handleLogout} className="btn-danger flex-1">
          <LogOut size={15} />
          Logout
        </button>
      </div>

      <p className="text-center text-xs leading-relaxed text-ink-400">
        Reports are private to your account. Only your JWT can read or delete them.
      </p>
    </div>
  );
}
