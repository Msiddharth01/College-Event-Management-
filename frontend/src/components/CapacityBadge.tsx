import React from 'react';
import { Users } from 'lucide-react';

interface CapacityBadgeProps {
  current: number;
  max: number;
  showProgress?: boolean;
}

export const CapacityBadge: React.FC<CapacityBadgeProps> = ({
  current,
  max,
  showProgress = true,
}) => {
  const percentage = Math.min(Math.round((current / max) * 100), 100);
  const isFull = current >= max;
  const isNearFull = !isFull && percentage >= 80;

  let textBadgeStyle = 'bg-slate-100 text-slate-700 border-slate-200';
  let progressColor = 'bg-brand-600';

  if (isFull) {
    textBadgeStyle = 'bg-rose-50 text-rose-700 border-rose-200';
    progressColor = 'bg-rose-500';
  } else if (isNearFull) {
    textBadgeStyle = 'bg-amber-50 text-amber-700 border-amber-200';
    progressColor = 'bg-amber-500';
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-xs font-medium mb-1">
        <span className="flex items-center text-slate-600">
          <Users className="w-3.5 h-3.5 mr-1 text-slate-400" />
          Capacity
        </span>
        <span
          className={`px-2 py-0.5 rounded border text-[11px] font-semibold ${textBadgeStyle}`}
        >
          {isFull ? 'FULL' : `${current} / ${max}`}
        </span>
      </div>
      {showProgress && (
        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${progressColor}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </div>
  );
};

