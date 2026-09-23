import React from 'react';
import { clsx } from 'clsx';
import { EmailStatus } from '../../types';

export interface BadgeProps {
  status: EmailStatus | string;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ status, className }) => {
  const normalized = status.toUpperCase();

  const styles: Record<string, { bg: string; text: string; dot: string; label: string }> = {
    SCHEDULED: {
      bg: 'bg-sky-50 border-sky-200',
      text: 'text-sky-700',
      dot: 'bg-sky-500',
      label: 'Scheduled',
    },
    PROCESSING: {
      bg: 'bg-indigo-50 border-indigo-200',
      text: 'text-indigo-700',
      dot: 'bg-indigo-500 animate-pulse',
      label: 'Processing',
    },
    SENT: {
      bg: 'bg-emerald-50 border-emerald-200',
      text: 'text-emerald-700',
      dot: 'bg-emerald-500',
      label: 'Sent',
    },
    RATE_LIMITED: {
      bg: 'bg-amber-50 border-amber-200',
      text: 'text-amber-700',
      dot: 'bg-amber-500',
      label: 'Rate Limited',
    },
    FAILED: {
      bg: 'bg-rose-50 border-rose-200',
      text: 'text-rose-700',
      dot: 'bg-rose-500',
      label: 'Failed',
    },
  };

  const config = styles[normalized] || {
    bg: 'bg-slate-100 border-slate-200',
    text: 'text-slate-700',
    dot: 'bg-slate-400',
    label: status,
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border',
        config.bg,
        config.text,
        className
      )}
    >
      <span className={clsx('w-1.5 h-1.5 rounded-full', config.dot)} />
      {config.label}
    </span>
  );
};
