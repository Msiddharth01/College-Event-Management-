import React from 'react';
import { ShieldAlert, ArrowLeft, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface UnauthorizedBannerProps {
  requiredRole: 'organizer' | 'student';
  onNavigateHome: () => void;
}

export const UnauthorizedBanner: React.FC<UnauthorizedBannerProps> = ({
  requiredRole,
  onNavigateHome,
}) => {
  const { user, logout } = useAuth();

  return (
    <div className="max-w-3xl mx-auto px-4 py-16 text-center animate-fadeIn">
      <div className="w-16 h-16 rounded-2xl bg-rose-100 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto mb-5 shadow-sm">
        <ShieldAlert className="w-9 h-9" />
      </div>

      <span className="inline-block px-3 py-1 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-full uppercase tracking-wider mb-3">
        HTTP 403 • Unauthorized Access
      </span>

      <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
        Access Denied: Insufficient Permissions
      </h2>

      <p className="text-sm text-slate-600 max-w-lg mx-auto mb-6 leading-relaxed">
        This view is restricted to <strong className="capitalize text-slate-800">{requiredRole}</strong> accounts.
        You are currently signed in as <strong className="text-slate-800">{user?.name}</strong> (Role: <span className="capitalize font-semibold text-brand-600">{user?.role}</span>).
      </p>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          onClick={onNavigateHome}
          className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-xs transition-all"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Events Catalog
        </button>

        <button
          onClick={logout}
          className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold shadow-sm hover:shadow transition-all"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign In as Different Role
        </button>
      </div>
    </div>
  );
};

