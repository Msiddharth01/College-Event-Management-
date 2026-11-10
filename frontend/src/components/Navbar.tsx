import React, { useState } from 'react';
import {
  Calendar,
  BookmarkCheck,
  LayoutDashboard,
  BarChart3,
  GraduationCap,
  Menu,
  X,
  User,
  Building2,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export type NavTab = 'catalog' | 'registrations' | 'organizer' | 'analytics';

interface NavbarProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();

  // Dynamic tabs based on authenticated user role (RBAC)
  const isOrganizer = user?.role === 'organizer';

  const navItems = isOrganizer
    ? [
        { id: 'organizer', label: 'Organizer Dashboard', icon: LayoutDashboard },
        { id: 'analytics', label: 'Analytics', icon: BarChart3 },
        { id: 'catalog', label: 'Events Catalog', icon: Calendar },
      ]
    : [
        { id: 'catalog', label: 'Events Catalog', icon: Calendar },
        { id: 'registrations', label: 'My Registrations', icon: BookmarkCheck },
      ];

  const handleTabClick = (tab: NavTab) => {
    onTabChange(tab);
    setMobileMenuOpen(false);
  };

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Title */}
          <div
            className="flex items-center space-x-3 cursor-pointer"
            onClick={() => handleTabClick(isOrganizer ? 'organizer' : 'catalog')}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-700 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <span className="font-extrabold text-slate-800 text-lg tracking-tight block leading-tight">
                Event<span className="text-brand-600">Sphere</span>
              </span>
              <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase block">
                College Management
              </span>
            </div>
          </div>

          {/* Desktop Navigation Tabs */}
          <div className="hidden md:flex items-center space-x-1 lg:space-x-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabClick(item.id as NavTab)}
                  className={`flex items-center px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-brand-50 text-brand-700 font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 mr-2 ${
                      isActive ? 'text-brand-600' : 'text-slate-400'
                    }`}
                  />
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* Top-Right Authenticated User Profile & Log Out */}
          <div className="hidden sm:flex items-center space-x-3">
            <div className="flex items-center bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-1.5 shadow-2xs space-x-3">
              <div className="flex items-center space-x-2">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    isOrganizer ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                  }`}
                >
                  {isOrganizer ? (
                    <Building2 className="w-4 h-4" />
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                </div>

                <div className="flex flex-col text-left">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-xs font-bold text-slate-800 leading-tight">
                      {user?.name || 'Authenticated User'}
                    </span>
                    <span
                      className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        isOrganizer
                          ? 'bg-purple-100 text-purple-800 border border-purple-200'
                          : 'bg-blue-100 text-blue-800 border border-blue-200'
                      }`}
                    >
                      {isOrganizer ? 'Organizer' : 'Student'}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono truncate max-w-[150px]">
                    {user?.email}
                  </span>
                </div>
              </div>

              {/* Log Out Button */}
              <button
                onClick={logout}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100"
                title="Log Out"
                aria-label="Log Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-100 bg-white px-4 pt-2 pb-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id as NavTab)}
                className={`w-full flex items-center px-4 py-2.5 rounded-lg text-sm font-medium ${
                  isActive
                    ? 'bg-brand-50 text-brand-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Icon
                  className={`w-4 h-4 mr-3 ${
                    isActive ? 'text-brand-600' : 'text-slate-400'
                  }`}
                />
                {item.label}
              </button>
            );
          })}

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-800">{user?.name}</p>
              <p className="text-[11px] text-slate-400 font-mono">{user?.email}</p>
            </div>
            <button
              onClick={() => {
                logout();
                setMobileMenuOpen(false);
              }}
              className="inline-flex items-center px-3 py-1.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-200 text-xs font-semibold"
            >
              <LogOut className="w-3.5 h-3.5 mr-1" />
              Log Out
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};
