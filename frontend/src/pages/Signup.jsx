import { useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { Eye, EyeOff, UserPlus, Loader2, Check, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.jsx';
import { useToast } from '../hooks/useToast.jsx';
import ErrorAlert from '../components/ErrorAlert.jsx';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Signup() {
  const { signup } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { title } = useOutletContext() || {};

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [alert, setAlert] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
    if (alert) setAlert(null);
  }

  function validate() {
    const next = {};
    const name = form.name.trim();
    const email = form.email.trim();

    if (!name) next.name = 'Full name is required.';
    else if (name.length < 2) next.name = 'Name must be at least 2 characters.';

    if (!email) next.email = 'Email is required.';
    else if (!EMAIL_RE.test(email)) next.email = 'Please enter a valid email address.';

    if (!form.password) next.password = 'Password is required.';
    else if (form.password.length < 8) next.password = 'Password must be at least 8 characters.';

    if (!form.confirmPassword) next.confirmPassword = 'Please confirm your password.';
    else if (form.password !== form.confirmPassword)
      next.confirmPassword = 'Passwords do not match.';

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setAlert(null);
    try {
      await signup({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        confirmPassword: form.confirmPassword,
      });
      toast.success('Account created. Welcome to VeriWrite AI.');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setAlert(err);
    } finally {
      setSubmitting(false);
    }
  }

  const checks = [
    { ok: form.password.length >= 8, label: '8+ characters' },
    { ok: /[A-Za-z]/.test(form.password) && /\d/.test(form.password), label: 'letter & number' },
    {
      ok: form.password.length > 0 && form.password === form.confirmPassword,
      label: 'passwords match',
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-ink-950">
        {title || 'Create your account'}
      </h1>
      <p className="mt-2 text-sm text-ink-500">
        Start generating explainable authenticity reports in minutes.
      </p>

      <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
        {alert && <ErrorAlert error={alert} title="Sign up failed" />}

        <div>
          <label htmlFor="name" className="label">
            Full Name
          </label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            className={`input ${errors.name ? 'input-error' : ''}`}
            placeholder="Ada Lovelace"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            aria-invalid={Boolean(errors.name)}
          />
          {errors.name && <p className="field-error">{errors.name}</p>}
        </div>

        <div>
          <label htmlFor="email" className="label">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className={`input ${errors.email ? 'input-error' : ''}`}
            placeholder="you@university.edu"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            aria-invalid={Boolean(errors.email)}
          />
          {errors.email && <p className="field-error">{errors.email}</p>}
        </div>

        <div>
          <label htmlFor="password" className="label">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              className={`input pr-11 ${errors.password ? 'input-error' : ''}`}
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
              aria-invalid={Boolean(errors.password)}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && <p className="field-error">{errors.password}</p>}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="label">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            className={`input ${errors.confirmPassword ? 'input-error' : ''}`}
            placeholder="••••••••"
            value={form.confirmPassword}
            onChange={(e) => update('confirmPassword', e.target.value)}
            aria-invalid={Boolean(errors.confirmPassword)}
          />
          {errors.confirmPassword && <p className="field-error">{errors.confirmPassword}</p>}
        </div>

        <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
          {checks.map((c) => (
            <li
              key={c.label}
              className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                c.ok ? 'text-emerald-600' : 'text-ink-400'
              }`}
            >
              {c.ok ? <Check size={13} /> : <X size={13} />}
              {c.label}
            </li>
          ))}
        </ul>

        <button type="submit" className="btn-primary w-full !py-3" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Creating account…
            </>
          ) : (
            <>
              <UserPlus size={16} />
              Create account
            </>
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-500">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-brand-600 transition hover:text-brand-700">
          Sign in
        </Link>
      </p>
    </div>
  );
}
