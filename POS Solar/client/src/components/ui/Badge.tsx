import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'default' | 'dealer';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'default', className = '' }) => {
  const variantStyles = {
    success: 'bg-emerald-50 text-gray-900 dark:bg-emerald-950/50 dark:text-white border-emerald-300 dark:border-emerald-800',
    warning: 'bg-amber-50 text-gray-900 dark:bg-amber-950/50 dark:text-white border-amber-300 dark:border-amber-800',
    danger: 'bg-rose-50 text-gray-900 dark:bg-rose-950/50 dark:text-white border-rose-300 dark:border-rose-800',
    info: 'bg-sky-50 text-gray-900 dark:bg-sky-950/50 dark:text-white border-sky-300 dark:border-sky-800',
    dealer: 'bg-gray-100 text-gray-900 dark:bg-slate-800 dark:text-white border-gray-300 dark:border-slate-700',
    default: 'bg-gray-100 text-gray-900 dark:bg-slate-800 dark:text-white border-gray-300 dark:border-slate-700',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
};