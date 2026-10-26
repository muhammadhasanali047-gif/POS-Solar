import React from 'react';

interface CardProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ title, subtitle, children, action, className = '' }) => {
  return (
    <div
      className={`bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm p-3.5 sm:p-4 transition-colors ${className}`}
    >
      {(title || action) && (
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100 dark:border-slate-800/60">
          <div>
            {title && <h3 className="text-sm font-bold text-gray-900 dark:text-white tracking-tight">{title}</h3>}
            {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
};