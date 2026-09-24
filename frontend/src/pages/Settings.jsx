import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings2, Save, Loader2, LogOut, Shield, Palette, Bell } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.jsx';
import { useToast } from '../hooks/useToast.jsx';
import ErrorAlert from '../components/ErrorAlert.jsx';
import { formatDate, initials } from '../utils/format.js';

const PREFERENCES = [
  {
    key: 'emailReports',
    icon: Bell,
    title: 'Email report notifications',
    body: 'Get notified when a long analysis finishes.',
    disabled: true,
    note: 'Coming soon',
  },
  {
    key: 'theme',
    icon: Palette,
    title: 'Dark mode',
    body: 'Switch the dashboard to a dark colour scheme.',
    disabled: true,
    note: 'Coming soon',
  },
];

export default function Settings() {
  const { user, updateProfile, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '' });
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null);
  const [errors, setErrors] = useState({});

  const dirty =
    form.name.trim() !== (user?.name || '') || form.email.trim() !== (user?.email || '');

  function validate() {
    const next = {};
    if (!form.name.trim()) next.name = 'Name is required.';
    else if (form.name.trim().length < 2) next.name = 'Name must be at least 2 characters.';
    if (!form.email.trim()) next.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      next.email = 'Please enter a valid email address.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setAlert(null);
    if (!validate()) return;

    setSaving(true);
    try {
      await updateProfile({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
      });
      toast.success('Profile updated.');
    } catch (err) {
      setAlert(err);
    } finally {
      setSaving(false);
    }
  }

  function handleLogout() {
    logout();
    toast.success('You have been signed out.');
    navigate('/login', { replace: true });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-950 sm:text-3xl">Settings</h1>
        <p className="mt-1.5 text-[15px] text-ink-600">
          Manage your account details and preferences.
        </p>
      </div>

      {/* Profile card */}
      <section className="card p-6">
        <div className="flex items-center gap-2">
          <Settings2 size={16} className="text-brand-600" />
          <h2 className="text-[15px] font-semibold text-ink-900">Profile</h2>
        </div>

        <div className="mt-5 flex items-center gap-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-violet-500 text-lg font-bold text-white">
            {initials(user?.name)}
          </span>
          <div>
            <p className="text-sm font-semibold text-ink-900">{user?.name}</p>
            <p className="text-sm text-ink-500">{user?.email}</p>
            <p className="mt-0.5 text-xs text-ink-400">
              Account created {formatDate(user?.createdAt)}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
          {alert && <ErrorAlert error={alert} title="Couldn't save changes" />}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="settings-name" className="label">
                Full Name
              </label>
              <input
                id="settings-name"
                type="text"
                className={`input ${errors.name ? 'input-error' : ''}`}
                value={form.name}
                onChange={(e) => {
                  setForm((f) => ({ ...f, name: e.target.value }));
                  setErrors((x) => ({ ...x, name: undefined }));
                }}
              />
              {errors.name && <p className="field-error">{errors.name}</p>}
            </div>

            <div>
              <label htmlFor="settings-email" className="label">
                Email
              </label>
              <input
                id="settings-email"
                type="email"
                className={`input ${errors.email ? 'input-error' : ''}`}
                value={form.email}
                onChange={(e) => {
                  setForm((f) => ({ ...f, email: e.target.value }));
                  setErrors((x) => ({ ...x, email: undefined }));
                }}
              />
              {errors.email && <p className="field-error">{errors.email}</p>}
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <p className="text-xs text-ink-400">
              {dirty ? 'You have unsaved changes' : 'No changes yet'}
            </p>
            <button
              type="submit"
              className="btn-primary disabled:opacity-50"
              disabled={saving || !dirty}
            >
              {saving ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save size={15} />
                  Save changes
                </>
              )}
            </button>
          </div>
        </form>
      </section>

      {/* Preferences (honestly marked unavailable) */}
      <section className="card p-6">
        <div className="flex items-center gap-2">
          <Palette size={16} className="text-brand-600" />
          <h2 className="text-[15px] font-semibold text-ink-900">Preferences</h2>
        </div>

        <div className="mt-4 space-y-3">
          {PREFERENCES.map((p) => (
            <div
              key={p.key}
              className="flex items-center gap-4 rounded-lg border border-ink-100 bg-ink-50/50 p-4 opacity-70"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-ink-400 shadow-sm">
                <p.icon size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink-700">{p.title}</p>
                <p className="text-[13px] text-ink-500">{p.body}</p>
              </div>
              <span className="badge-neutral shrink-0 !text-[10px]">{p.note}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Security summary */}
      <section className="card p-6">
        <div className="flex items-center gap-2">
          <Shield size={16} className="text-brand-600" />
          <h2 className="text-[15px] font-semibold text-ink-900">Security</h2>
        </div>
        <dl className="mt-4 space-y-3 text-sm">
          {[
            ['Password hashing', 'bcrypt (cost 12)'],
            ['Session', 'JWT, expires in 7 days'],
            ['Report access', 'Scoped to your account only'],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between border-b border-ink-100 pb-3 last:border-0 last:pb-0">
              <dt className="text-ink-500">{k}</dt>
              <dd className="font-medium text-ink-800">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Logout */}
      <section className="card border-red-100 p-6">
        <h2 className="text-[15px] font-semibold text-ink-900">Sign out</h2>
        <p className="mt-1.5 text-sm text-ink-500">
          End your session on this device. Your reports stay in your account.
        </p>
        <button type="button" onClick={handleLogout} className="btn-danger mt-4">
          <LogOut size={15} />
          Logout
        </button>
      </section>
    </div>
  );
}
