import React from 'react';
import { EventStatus, RegistrationStatus } from '../types';
import { ComputedEventStatus } from '../utils/eventStatus';

interface StatusTagProps {
  status: EventStatus | ComputedEventStatus | RegistrationStatus;
  size?: 'sm' | 'md';
  label?: string;
}

export const StatusTag: React.FC<StatusTagProps> = ({ status, size = 'md', label }) => {
  const normalized = status.toLowerCase();

  const getStyle = (): string => {
    switch (normalized) {
      case 'upcoming':
      case 'registered':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ongoing':
      case 'attended':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'completed':
        return 'bg-slate-100 text-slate-700 border-slate-300';
      case 'waitlisted':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'cancelled':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getDotColor = (): string => {
    switch (normalized) {
      case 'cancelled':
        return 'bg-rose-500';
      case 'ongoing':
        return 'bg-emerald-500 animate-pulse';
      case 'attended':
        return 'bg-emerald-500';
      case 'completed':
        return 'bg-slate-500';
      case 'waitlisted':
        return 'bg-purple-500';
      default:
        return 'bg-blue-500';
    }
  };

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center font-medium capitalize rounded-full border ${getStyle()} ${sizeClasses}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${getDotColor()}`} />
      {label || status}
    </span>
  );
};
