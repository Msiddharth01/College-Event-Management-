import React, { useState, useEffect } from 'react';
import { Navbar, NavTab } from './components/Navbar';
import { EventCatalogPage } from './pages/EventCatalogPage';
import { MyRegistrationsPage } from './pages/MyRegistrationsPage';
import { OrganizerDashboardPage } from './pages/OrganizerDashboardPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { LoginPage } from './pages/LoginPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { UserProvider } from './context/UserContext';
import { Shield, RefreshCw } from 'lucide-react';

const AppContent: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState<NavTab>('catalog');

  // Auto-switch tabs when user role changes or when logging in
  useEffect(() => {
    if (user?.role === 'organizer') {
      setCurrentTab('organizer');
    } else if (user?.role === 'student') {
      setCurrentTab('catalog');
    }
  }, [user?.role]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <RefreshCw className="w-8 h-8 text-brand-500 animate-spin mb-3" />
        <p className="text-xs text-slate-400 font-medium">Validating university credentials...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <LoginPage
        onLoginSuccess={(role) => {
          setCurrentTab(role === 'organizer' ? 'organizer' : 'catalog');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      <Navbar currentTab={currentTab} onTabChange={setCurrentTab} />

      {/* Role Banner Indicator */}
      <div className="bg-slate-100/90 border-b border-slate-200 text-xs py-1.5 px-4 text-center text-slate-600 flex items-center justify-center space-x-2">
        <Shield className="w-3.5 h-3.5 text-slate-400" />
        <span>
          Authenticated: Logged in as <strong className="text-slate-800">{user?.name}</strong>{' '}
          (<span className="capitalize font-semibold text-brand-600">{user?.role}</span>)
        </span>
        <span className="text-slate-300">•</span>
        <span className="text-slate-500 hidden sm:inline">
          {user?.role === 'organizer'
            ? 'Organizer Privileges: Event Creation, Attendance Marking, & Live Aggregations'
            : 'Student Privileges: Event Discovery & Instant Seat Registration'}
        </span>
      </div>

      <main className="flex-1">
        {currentTab === 'catalog' && <EventCatalogPage />}

        {currentTab === 'registrations' && (
          <MyRegistrationsPage onNavigateHome={() => setCurrentTab('catalog')} />
        )}

        {currentTab === 'organizer' && (
          <OrganizerDashboardPage onNavigateHome={() => setCurrentTab('catalog')} />
        )}

        {currentTab === 'analytics' && (
          <AnalyticsPage onNavigateHome={() => setCurrentTab('catalog')} />
        )}
      </main>

      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            College Event Management System • Dedicated JWT Authentication Flow
          </span>
          <span className="flex items-center space-x-1.5 text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
            <span>Target Backend: <code className="font-mono text-[11px] text-slate-600">http://localhost:5001/api</code></span>
          </span>
        </div>
      </footer>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <UserProvider>
        <AppContent />
      </UserProvider>
    </AuthProvider>
  );
};

export default App;
