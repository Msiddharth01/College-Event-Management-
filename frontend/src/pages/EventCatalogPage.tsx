import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, RefreshCw, AlertCircle, CheckCircle2, Shield } from 'lucide-react';
import { Event, EventStatus, Registration } from '../types';
import { getEvents, registerForEvent, getStudentRegistrations } from '../api/client';
import { EventCard } from '../components/EventCard';
import { useAuth } from '../context/AuthContext';

export const EventCatalogPage: React.FC = () => {
  const { user: activeUser } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [studentRegistrations, setStudentRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const isOrganizer = activeUser?.role === 'organizer';

  const fetchCatalogData = useCallback(async () => {
    try {
      setLoading(true);
      const fetchedEvents = await getEvents();
      setEvents(fetchedEvents);

      if (activeUser && activeUser.role === 'student') {
        const regs = await getStudentRegistrations(activeUser.id).catch(() => []);
        setStudentRegistrations(regs);
      } else {
        setStudentRegistrations([]);
      }
    } catch (err: unknown) {
      console.error('Failed to load events:', err);
    } finally {
      setLoading(false);
    }
  }, [activeUser]);

  useEffect(() => {
    fetchCatalogData();
  }, [fetchCatalogData]);

  const handleRegister = async (event: Event) => {
    if (!activeUser || activeUser.role !== 'student') {
      setNotification({
        type: 'error',
        message: 'Only student accounts can register for campus events.',
      });
      return;
    }

    try {
      await registerForEvent(activeUser.id, event._id);
      setNotification({
        type: 'success',
        message: `Successfully registered for "${event.title}"!`,
      });
      await fetchCatalogData();
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Registration failed. Please try again.';
      setNotification({
        type: 'error',
        message: msg,
      });
    }
  };

  // Filter events by search & status
  const filteredEvents = events.filter((ev) => {
    const matchesSearch =
      ev.title.toLowerCase().includes(search.toLowerCase()) ||
      ev.description.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || ev.status === (statusFilter as EventStatus);
    return matchesSearch && matchesStatus;
  });

  const registeredEventIds = new Set(
    studentRegistrations
      .filter((r) => r.status !== 'cancelled')
      .map((r) => (typeof r.eventId === 'object' ? r.eventId._id : r.eventId))
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Campus Event Catalog
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {isOrganizer
              ? 'Read-only catalog view for organizers. To publish or manage events, use the Organizer Dashboard.'
              : 'Discover workshops, symposiums, hackathons, and cultural events across campus.'}
          </p>
        </div>

        <button
          onClick={fetchCatalogData}
          disabled={loading}
          className="inline-flex items-center self-start md:self-auto px-3.5 py-2 border border-slate-200 bg-white text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 shadow-xs transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh Feed
        </button>
      </div>

      {/* Organizer Read-Only Mode Indicator Banner */}
      {isOrganizer && (
        <div className="mb-6 p-4 rounded-xl border border-purple-200 bg-purple-50 text-purple-900 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2.5">
            <Shield className="w-4 h-4 text-purple-600 shrink-0" />
            <span>
              <strong>Organizer Read-Only Mode:</strong> Registration controls are hidden because your active profile is an Organizer. Sign in as a student to test student self-registration.
            </span>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {notification && (
        <div
          className={`mb-6 p-4 rounded-xl border flex items-center justify-between text-sm transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 mr-3 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 mr-3 text-rose-600 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-xs font-bold underline ml-4 hover:opacity-80"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs mb-8 flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search events by title or keywords..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0 hidden sm:block" />
          <span className="text-xs font-medium text-slate-500 hidden sm:inline">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 cursor-pointer"
          >
            <option value="all">All Events</option>
            <option value="upcoming">Upcoming</option>
            <option value="ongoing">Ongoing</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Events Grid */}
      {loading ? (
        <div className="py-20 text-center">
          <RefreshCw className="w-8 h-8 text-brand-600 animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-500">Loading catalog from database...</p>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-200 p-8">
          <p className="text-base font-semibold text-slate-700">No events found</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Try adjusting your search criteria, clearing the status filter, or create a new event in the Organizer Dashboard.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((event) => (
            <EventCard
              key={event._id}
              event={event}
              onRegister={handleRegister}
              isRegistered={registeredEventIds.has(event._id)}
              actionSlot={
                isOrganizer ? (
                  <span className="w-full text-center py-2 px-3 rounded-lg bg-slate-100 text-slate-500 font-semibold text-xs border border-slate-200">
                    Organizer View (Read-Only)
                  </span>
                ) : undefined
              }
            />
          ))}
        </div>
      )}
    </div>
  );
};
