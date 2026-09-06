import { useState, FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ShieldHalf, Loader2 } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import { setSession } from '@/store/authSlice';
import * as authService from '@/services/auth.service';
import { getApiErrorMessage } from '@/services/apiClient';

export function LoginPage() {
  const token = useAppSelector((s) => s.auth.token);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (token) return <Navigate to="/" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await authService.login(email, password);
      dispatch(setSession(result));
      navigate('/', { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-800 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <ShieldHalf size={30} className="text-signal-red" />
          <h1 className="font-display text-[22px] font-semibold text-white">SafeSathi Console</h1>
          <p className="text-[13.5px] text-white/50">Sign in with your administrator account</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-lg border border-white/10 bg-white p-6 shadow-lg">
          <div className="mb-4">
            <label htmlFor="email" className="field-label">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="username"
              className="field-input"
              placeholder="you@safesathi.app"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="mb-5">
            <label htmlFor="password" className="field-label">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              autoComplete="current-password"
              className="field-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <p className="mb-4 rounded-md bg-signal-redDim px-3 py-2 text-[13px] text-signal-red">{error}</p>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
