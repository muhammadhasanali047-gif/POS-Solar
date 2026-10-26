import React, { useState } from 'react';
import { Zap, ShieldCheck, ArrowRight, Lock, Mail } from 'lucide-react';
import api from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('admin@solarpos.com');
  const [password, setPassword] = useState('Solar123!');
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
    <div className="min-h-screen w-screen bg-gradient-to-br from-slate-900 via-slate-950 to-solar-950 flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 p-5 sm:p-8">
        {/* Header Branding */}
        <div className="flex flex-col items-center text-center mb-6 sm:mb-8">
          <img
            src="/ji-energies-logo.png"
            alt="J.I ENERGIES & ALP SOLAR"
            className="h-14 sm:h-16 w-auto object-contain mb-2 sm:mb-3 dark:hidden"
          />
          <img
            src="/ji-energies-logo-dark.png"
            alt="J.I ENERGIES & ALP SOLAR"
            className="h-14 sm:h-16 w-auto object-contain mb-2 sm:mb-3 hidden dark:block"
          />
          <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5 sm:mt-1">
            Authorised Sales & Service Center • Multan
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-700 dark:text-rose-300 text-xs font-medium">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Work Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@solarcompany.com"
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-solar-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-solar-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-solar-600 hover:bg-solar-700 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
          >
            {isLoading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>Sign In to System</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* 1-Click Role Switchers for Instant Demonstration */}
        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-slate-800 text-center">
          <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2.5">
            Quick Test Accounts (1-Click Fill)
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => setDemoAccount('ADMIN')}
              className="px-2 py-1.5 rounded-lg border border-purple-200 dark:border-purple-900 bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 text-[11px] font-bold hover:bg-purple-100 transition-colors"
            >
              Admin
            </button>
            <button
              type="button"
              onClick={() => setDemoAccount('CEO')}
              className="px-2 py-1.5 rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 text-[11px] font-bold hover:bg-amber-100 transition-colors"
            >
              CEO
            </button>
            <button
              type="button"
              onClick={() => setDemoAccount('MANAGER')}
              className="px-2 py-1.5 rounded-lg border border-solar-200 dark:border-solar-900 bg-solar-50 dark:bg-solar-950/30 text-solar-700 dark:text-solar-300 text-[11px] font-bold hover:bg-solar-100 transition-colors"
            >
              Manager
            </button>
            <button
              type="button"
              onClick={() => setDemoAccount('CASHIER')}
              className="px-2 py-1.5 rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 text-[11px] font-bold hover:bg-blue-100 transition-colors"
            >
              Cashier
            </button>
          </div>
          <p className="text-[10px] text-gray-400 mt-3">
            Password: <code className="bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">Solar123!</code>
          </p>
        </div>
      </div>
    </div>
  );
};