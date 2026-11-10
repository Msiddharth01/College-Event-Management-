import React from 'react';
import { EventStatus, RegistrationStatus } from '../types';

interface StatusTagProps {
  status: EventStatus | RegistrationStatus;
  size?: 'sm' | 'md';
}

export const StatusTag: React.FC<StatusTagProps> = ({ status, size = 'md' }) => {
  const getStyle = (): string => {
    switch (status) {
      case 'upcoming':
      case 'registered':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ongoing':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'completed':
      case 'attended':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'cancelled':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center font-medium capitalize rounded-full border ${getStyle()} ${sizeClasses}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
          status === 'cancelled'
            ? 'bg-rose-500'
            : status === 'attended' || status === 'completed'
            ? 'bg-emerald-500'
            : status === 'ongoing'
            ? 'bg-amber-500'
            : 'bg-blue-500'
        }`}
      />
      {status}
    </span>
  );
};

