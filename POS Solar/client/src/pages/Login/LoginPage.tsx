import React, { useState } from 'react';
import { ArrowRight, Lock, Mail, Eye, EyeOff } from 'lucide-react';
import api from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('admin@solarpos.com');
  const [password, setPassword] = useState('Solar123!');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data.success) {
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

  const setDemoAccount = (role: 'ADMIN' | 'CEO' | 'MANAGER' | 'CASHIER') => {
    if (role === 'ADMIN') {
      setEmail('admin@solarpos.com');
      setPassword('Solar123!');
    } else if (role === 'CEO') {
      setEmail('ceo@solarpos.com');
      setPassword('Solar123!');
    } else if (role === 'CASHIER') {
      setEmail('cashier@solarpos.com');
      setPassword('Solar123!');
    } else {
      setEmail('manager@solarpos.com');
      setPassword('Solar123!');
    }
  };

  return (
    <div className="min-h-[100dvh] w-full bg-gradient-to-br from-slate-100 via-sky-50/50 to-emerald-50/60 flex items-center justify-center p-3 sm:p-6 md:p-8 relative overflow-hidden selection:bg-emerald-500 selection:text-white">
      {/* Decorative ambient light orbs */}
      <div className="absolute top-0 -left-12 w-80 sm:w-96 h-80 sm:h-96 bg-emerald-200/35 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -right-10 w-80 sm:w-96 h-80 sm:h-96 bg-amber-200/35 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px] opacity-35 pointer-events-none" />

      {/* Main Login Card */}
      <div className="relative z-10 w-full max-w-[420px] mx-auto bg-white rounded-2xl sm:rounded-3xl shadow-[0_20px_50px_rgba(15,23,42,0.08)] border border-slate-200/80 p-5 sm:p-8 transition-all">
        {/* Header Branding */}
        <div className="flex flex-col items-center text-center mb-5 sm:mb-7">
          <div className="p-2 sm:p-2.5 rounded-2xl bg-slate-50 border border-slate-100/90 shadow-sm">
            <img
              src="/ji-energies-logo.png"
              alt="J.I ENERGIES & ALP SOLAR"
              className="h-12 sm:h-14 w-auto object-contain"
            />
          </div>
        </div>

        {error && (
          <div className="mb-4 sm:mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2 animate-shake">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Work Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@solarcompany.com"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 font-medium focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 focus:bg-white transition-all shadow-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
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
                className="w-full pl-10 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 font-medium focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 focus:bg-white transition-all shadow-xs"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors p-1"
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 via-teal-700 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-emerald-700/20 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Authenticating...
              </span>
            ) : (
              <>
                <span>Sign In to System</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* 1-Click Role Switchers for Instant Demonstration */}
        <div className="mt-6 sm:mt-7 pt-5 border-t border-slate-100 text-center">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
            Quick Test Accounts (1-Click Fill)
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => setDemoAccount('ADMIN')}
              className="px-2 py-2 rounded-xl border border-purple-200 bg-purple-50 text-purple-700 text-xs font-bold hover:bg-purple-100 active:scale-95 transition-all shadow-xs"
            >
              Admin
            </button>
            <button
              type="button"
              onClick={() => setDemoAccount('CEO')}
              className="px-2 py-2 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 text-xs font-bold hover:bg-amber-100 active:scale-95 transition-all shadow-xs"
            >
              CEO
            </button>
            <button
              type="button"
              onClick={() => setDemoAccount('MANAGER')}
              className="px-2 py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-bold hover:bg-emerald-100 active:scale-95 transition-all shadow-xs"
            >
              Manager
            </button>
            <button
              type="button"
              onClick={() => setDemoAccount('CASHIER')}
              className="px-2 py-2 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-100 active:scale-95 transition-all shadow-xs"
            >
              Cashier
            </button>
          </div>
          <p className="text-[11px] text-slate-400 mt-3 font-medium">
            Password: <code className="bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded-md border border-slate-200">Solar123!</code>
          </p>
        </div>

        {/* Footer info */}
        <p className="text-center text-[10px] sm:text-[11px] text-slate-400 mt-4 sm:mt-5 font-medium">
          © 2026 J.I Energies & Alp Solar • Central POS System
        </p>
      </div>
    </div>
  );
};
