import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Compass } from 'lucide-react';
import Logo from '../components/Logo.jsx';
import { useAuth } from '../hooks/useAuth.jsx';

export default function NotFound() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  return (
    <div className="grid min-h-screen place-items-center bg-ink-50 px-6">
      <div className="w-full max-w-md text-center animate-fade-up">
        <div className="flex justify-center">
          <Logo size="md" />
        </div>

        <p className="mt-10 text-7xl font-extrabold tracking-tight gradient-text">404</p>
        <h1 className="mt-4 text-xl font-semibold text-ink-900">Page not found</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-500">
          The page you&apos;re looking for doesn&apos;t exist or may have been moved.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">
            <ArrowLeft size={15} />
            Go back
          </button>
          <Link to={isAuthenticated ? '/dashboard' : '/'} className="btn-primary">
            <Compass size={15} />
            {isAuthenticated ? 'Dashboard' : 'Home'}
          </Link>
        </div>
      </div>
    </div>
  );
}
