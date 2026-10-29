import React, { useState, useEffect } from 'react';
import { ArrowRight, Lock, Mail, Eye, EyeOff, Crown, ShieldCheck } from 'lucide-react';
import api from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';

export const LoginPage: React.FC = () => {
  // Strict URL & storage role detection
  const detectPortalRole = (): 'CEO' | 'MANAGER' => {
    try {
      const href = (window.location.href || '').toLowerCase();
      const search = (window.location.search || '').toLowerCase();
      const path = (window.location.pathname || '').toLowerCase();
      const hash = (window.location.hash || '').toLowerCase();

      // 1. Explicit Manager URL (/manager, ?role=manager, #manager)
      if (
        path.includes('/manager') ||
        search.includes('role=manager') ||
        hash.includes('manager') ||
        href.includes('role=manager')
      ) {
        try { localStorage.setItem('solar_locked_portal', 'MANAGER'); } catch {}
        return 'MANAGER';
      }

      // 2. Explicit CEO/Admin URL (/admin, /ceo, ?role=admin, ?role=ceo, #admin)
      if (
        path.includes('/admin') ||
        path.includes('/ceo') ||
        search.includes('role=admin') ||
        search.includes('role=ceo') ||
        hash.includes('admin') ||
        href.includes('role=admin') ||
        href.includes('role=ceo')
      ) {
        try { localStorage.setItem('solar_locked_portal', 'CEO'); } catch {}
        return 'CEO';
      }

      // 3. Check saved device role
      const saved = localStorage.getItem('solar_locked_portal');
      if (saved === 'CEO') return 'CEO';
      if (saved === 'MANAGER') return 'MANAGER';
    } catch {}

    // Default to MANAGER if no explicit route is provided
    return 'MANAGER';
  };

  const [activeRole, setActiveRole] = useState<'CEO' | 'MANAGER'>(detectPortalRole);

  const getInitialPassword = (role: 'CEO' | 'MANAGER'): string => {
    try {
      const saved = localStorage.getItem(`solar_${role.toLowerCase()}_custom_pwd`);
      if (saved) return saved;
    } catch {}
    return 'Solar123!';
  };

  const [email, setEmail] = useState(() => (detectPortalRole() === 'MANAGER' ? 'manager@solarpos.com' : 'ceo@solarpos.com'));
  const [password, setPassword] = useState(() => getInitialPassword(detectPortalRole()));
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login } = useAuthStore();

  useEffect(() => {
    const handleUrlChange = () => {
      const detected = detectPortalRole();
      setActiveRole(detected);
      setEmail(detected === 'MANAGER' ? 'manager@solarpos.com' : 'ceo@solarpos.com');
      setPassword(getInitialPassword(detected));
    };
    window.addEventListener('popstate', handleUrlChange);
    return () => window.removeEventListener('popstate', handleUrlChange);
  }, []);

  const switchPortal = (newRole: 'CEO' | 'MANAGER') => {
    setActiveRole(newRole);
    setEmail(newRole === 'MANAGER' ? 'manager@solarpos.com' : 'ceo@solarpos.com');
    setPassword(getInitialPassword(newRole));
    setError(null);
    try {
      localStorage.setItem('solar_locked_portal', newRole);
      const url = new URL(window.location.href);
      url.pathname = newRole === 'MANAGER' ? '/manager' : '/admin';
      url.searchParams.delete('role');
      window.history.pushState({}, '', url.toString());
    } catch {}
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data.success) {
        try {
          localStorage.setItem(`solar_${activeRole.toLowerCase()}_custom_pwd`, password);
          localStorage.setItem('solar_locked_portal', activeRole);
        } catch {}
        login(res.data.data.token, res.data.data.user);
      } else {
        setError(res.data.error || 'Login failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to connect to central server');
    } finally {
      setIsLoading(false);
    }
  };

  const isCEO = activeRole === 'CEO';

  return (
    <div
      className={`min-h-[100dvh] w-full flex items-center justify-center p-3 sm:p-6 md:p-8 relative overflow-hidden transition-all duration-500 ${
        isCEO
          ? 'bg-gradient-to-br from-amber-50/60 via-slate-100 to-amber-100/40 selection:bg-amber-500'
          : 'bg-gradient-to-br from-emerald-50/60 via-slate-100 to-teal-100/40 selection:bg-emerald-500'
      } selection:text-white`}
    >
      {/* Decorative ambient light orbs */}
      <div
        className={`absolute top-0 -left-12 w-80 sm:w-96 h-80 sm:h-96 rounded-full blur-3xl pointer-events-none transition-colors duration-500 ${
          isCEO ? 'bg-amber-300/30' : 'bg-emerald-300/30'
        }`}
      />
      <div
        className={`absolute -bottom-10 -right-10 w-80 sm:w-96 h-80 sm:h-96 rounded-full blur-3xl pointer-events-none transition-colors duration-500 ${
          isCEO ? 'bg-orange-300/25' : 'bg-teal-300/25'
        }`}
      />
      <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px] opacity-35 pointer-events-none" />

      {/* Main Login Card */}
      <div className="relative z-10 w-full max-w-[440px] mx-auto bg-white rounded-2xl sm:rounded-3xl shadow-[0_20px_50px_rgba(15,23,42,0.08)] border border-slate-200/90 p-5 sm:p-8 transition-all">
        {/* Header Branding */}
        <div className="flex flex-col items-center text-center mb-5">
          <div className="p-2 sm:p-2.5 rounded-2xl bg-slate-50 border border-slate-100/90 shadow-sm mb-3">
            <img
              src="/ji-energies-logo.png"
              alt="J.I ENERGIES & ALP SOLAR"
              className="h-11 sm:h-13 w-auto object-contain"
            />
          </div>

          {/* Role Dedicated Banner & Title */}
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider shadow-2xs border transition-colors">
              {isCEO ? (
                <span className="text-amber-800 bg-amber-100 border border-amber-300 flex items-center gap-1 px-2.5 py-0.5 rounded-full">
                  <Crown className="w-3.5 h-3.5 text-amber-600" />
                  <span>Executive &amp; CEO Access</span>
                </span>
              ) : (
                <span className="text-emerald-800 bg-emerald-100 border border-emerald-300 flex items-center gap-1 px-2.5 py-0.5 rounded-full">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Operations &amp; Manager Access</span>
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {isCEO ? 'Executive & Admin Portal' : 'Operations & Manager Portal'}
            </h1>
            <p className="text-xs text-slate-500 font-medium max-w-xs mx-auto">
              {isCEO
                ? 'Full system administration, access rules & financial controls'
                : 'Sales counter, live inventory stock & customer billing'}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2 animate-shake">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Work Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder={isCEO ? 'ceo@solarpos.com' : 'manager@solarpos.com'}
                className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 font-bold focus:outline-none focus:bg-white transition-all shadow-xs ${
                  isCEO
                    ? 'focus:border-amber-500 focus:ring-3 focus:ring-amber-500/15'
                    : 'focus:border-emerald-500 focus:ring-3 focus:ring-emerald-500/15'
                }`}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className={`w-full pl-10 pr-11 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 font-bold focus:outline-none focus:bg-white transition-all shadow-xs ${
                  isCEO
                    ? 'focus:border-amber-500 focus:ring-3 focus:ring-amber-500/15'
                    : 'focus:border-emerald-500 focus:ring-3 focus:ring-emerald-500/15'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 px-4 rounded-xl text-white font-bold text-xs sm:text-sm tracking-wide transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none ${
              isCEO
                ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/25 ring-2 ring-amber-500/20'
                : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25 ring-2 ring-emerald-500/20'
            }`}
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <span>{isCEO ? 'Sign In as CEO / Admin' : 'Sign In to Manager Portal'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Clean Footer with Discreet Switcher Link */}
        <div className="mt-6 pt-4 border-t border-slate-100 text-center space-y-1.5">
          <p className="text-[11px] text-slate-400 font-medium">
            © 2026 J.I Energies &amp; Alp Solar • Central POS System
          </p>
          <div>
            {isCEO ? (
              <button
                type="button"
                onClick={() => switchPortal('MANAGER')}
                className="text-[11px] text-slate-400 hover:text-emerald-600 transition-colors underline cursor-pointer"
              >
                Branch Operations / Manager Portal →
              </button>
            ) : (
              <button
                type="button"
                onClick={() => switchPortal('CEO')}
                className="text-[11px] text-slate-400 hover:text-amber-600 transition-colors underline cursor-pointer"
              >
                Executive &amp; CEO Admin Portal →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
