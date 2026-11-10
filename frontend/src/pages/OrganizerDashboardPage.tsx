import React, { useState, useEffect, useCallback } from 'react';
import {
  PlusCircle,
  Users,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  XCircle,
  RefreshCw,
  Eye,
} from 'lucide-react';
import {
  Event,
  Venue,
  Organizer,
  Registration,
  Student,
  CreateEventPayload,
} from '../types';
import {
  getEvents,
  createEvent,
  cancelEvent,
  getVenues,
  getOrganizers,
  getEventRegistrations,
  markAttendance,
} from '../api/client';
import { StatusTag } from '../components/StatusTag';
import { Modal } from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import { UnauthorizedBanner } from '../components/UnauthorizedBanner';

interface OrganizerDashboardPageProps {
  onNavigateHome?: () => void;
}

export const OrganizerDashboardPage: React.FC<OrganizerDashboardPageProps> = ({ onNavigateHome }) => {
  const { user: activeUser } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isRosterModalOpen, setIsRosterModalOpen] = useState(false);
  const [selectedEventForRoster, setSelectedEventForRoster] = useState<Event | null>(null);
  const [roster, setRoster] = useState<Registration[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState<CreateEventPayload>({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    capacity: 50,
    organizerId: '',
    venueId: '',
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [evs, vens, orgs] = await Promise.all([
        getEvents(),
        getVenues(),
        getOrganizers(),
      ]);
      setEvents(evs);
      setVenues(vens);
      setOrganizers(orgs);

      // Default dropdown selection if available
      if (orgs.length > 0 && !formData.organizerId) {
        setFormData((prev) => ({ ...prev, organizerId: orgs[0]._id }));
      }
      if (vens.length > 0 && !formData.venueId) {
        setFormData((prev) => ({ ...prev, venueId: vens[0]._id }));
      }
    } catch (err: unknown) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [formData.organizerId, formData.venueId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Role Guard: Restrict to organizer accounts only
  if (!activeUser || activeUser.role !== 'organizer') {
    return (
      <UnauthorizedBanner
        requiredRole="organizer"
        onNavigateHome={onNavigateHome || (() => {})}
      />
    );
  }

  // Handle Create Event
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.startDate || !formData.endDate) {
      setFormError('Start date and end date are required.');
      return;
    }

    if (new Date(formData.endDate) <= new Date(formData.startDate)) {
      setFormError('End date must be chronologically after the start date.');
      return;
    }

    const selectedVenue = venues.find((v) => v._id === formData.venueId);
    if (selectedVenue && formData.capacity > selectedVenue.capacity) {
      setFormError(
        `Event capacity (${formData.capacity}) cannot exceed physical venue capacity (${selectedVenue.capacity}).`
      );
      return;
    }

    try {
      await createEvent(formData);
      setIsCreateModalOpen(false);
      setNotification({
        type: 'success',
        message: `Event "${formData.title}" created successfully!`,
      });
      // Reset form
      setFormData({
        title: '',
        description: '',
        startDate: '',
        endDate: '',
        capacity: 50,
        organizerId: organizers[0]?._id || '',
        venueId: venues[0]?._id || '',
      });
      await fetchData();
    } catch (err: any) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Failed to create event.';
      setFormError(msg);
    }
  };

  // Handle Cancel Event
  const handleCancelEvent = async (event: Event) => {
    if (!window.confirm(`Are you sure you want to cancel the event "${event.title}"?`)) {
      return;
    }

    try {
      await cancelEvent(event._id);
      setNotification({
        type: 'success',
        message: `Event "${event.title}" has been cancelled.`,
      });
      await fetchData();
    } catch (err: any) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Failed to cancel event.';
      setNotification({
        type: 'error',
        message: msg,
      });
    }
  };

  // Open Roster / Attendance Modal
  const handleViewRoster = async (event: Event) => {
    setSelectedEventForRoster(event);
    setIsRosterModalOpen(true);
    try {
      setRosterLoading(true);
      const data = await getEventRegistrations(event._id);
      setRoster(data);
    } catch (err: unknown) {
      console.error('Failed to load roster:', err);
    } finally {
      setRosterLoading(false);
    }
  };

  // Mark Attendance
  const handleMarkAttendance = async (regId: string) => {
    try {
      const updated = await markAttendance(regId);
      setRoster((prev) =>
        prev.map((r) => (r._id === regId ? { ...r, status: updated.status, attendedAt: updated.attendedAt } : r))
      );
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to record attendance.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Organizer Operations
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Publish events, manage venue bookings, monitor registrations, and record attendance.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 border border-slate-200 bg-white rounded-lg text-slate-600 hover:bg-slate-50 shadow-xs"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => {
              setFormError(null);
              setIsCreateModalOpen(true);
            }}
            className="inline-flex items-center px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold shadow-sm hover:shadow transition-all"
          >
            <PlusCircle className="w-4 h-4 mr-2" />
            Create New Event
          </button>
        </div>
      </div>

      {/* Notifications */}
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

      {/* Events Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800">Managed Campus Events</h2>
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
            {events.length} Total
          </span>
        </div>

        {loading ? (
          <div className="py-20 text-center">
            <RefreshCw className="w-8 h-8 text-brand-600 animate-spin mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-500">Loading events...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-700">No events found</p>
            <p className="text-xs text-slate-400 mt-1">
              Click "Create New Event" above to schedule an event in a college venue.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-6 py-3.5">Event Title</th>
                  <th className="px-6 py-3.5">Venue</th>
                  <th className="px-6 py-3.5">Time Interval</th>
                  <th className="px-6 py-3.5">Capacity</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {events.map((ev) => {
                  const venue = typeof ev.venueId === 'object' ? (ev.venueId as Venue) : null;
                  const activeCount = ev.activeRegistrationsCount ?? 0;

                  return (
                    <tr key={ev._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">{ev.title}</div>
                        <div className="text-[11px] text-slate-400 line-clamp-1 max-w-xs">
                          {ev.description}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-slate-800">
                          {venue ? venue.name : 'Unknown Venue'}
                        </span>
                        {venue && (
                          <div className="text-[11px] text-slate-400">
                            Max Cap: {venue.capacity}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-[11px]">
                        <div>{new Date(ev.startDate).toLocaleDateString()}</div>
                        <div className="text-slate-400">
                          {new Date(ev.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                          {new Date(ev.endDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-semibold text-slate-900">{activeCount}</span>
                        <span className="text-slate-400"> / {ev.capacity}</span>
                      </td>
                      <td className="px-6 py-4">
                        <StatusTag status={ev.status} size="sm" />
                      </td>
                      <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                        <button
                          onClick={() => handleViewRoster(ev)}
                          className="inline-flex items-center px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold shadow-2xs"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1 text-slate-400" />
                          Roster
                        </button>

                        {ev.status !== 'cancelled' && (
                          <button
                            onClick={() => handleCancelEvent(ev)}
                            className="inline-flex items-center px-2.5 py-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold shadow-2xs"
                          >
                            <XCircle className="w-3.5 h-3.5 mr-1 text-rose-500" />
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Event Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Schedule a New Campus Event"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Event Title</label>
            <input
              type="text"
              required
              placeholder="e.g., Annual Hackathon 2026"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Description</label>
            <textarea
              required
              rows={3}
              placeholder="Provide a comprehensive summary of the event schedule, prerequisites, and keynote speakers..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Host Organizer</label>
              <select
                required
                value={formData.organizerId}
                onChange={(e) => setFormData({ ...formData, organizerId: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
              >
                {organizers.map((org) => (
                  <option key={org._id} value={org._id}>
                    {org.name} ({org.department})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Venue Assignment</label>
              <select
                required
                value={formData.venueId}
                onChange={(e) => setFormData({ ...formData, venueId: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
              >
                {venues.map((v) => (
                  <option key={v._id} value={v._id}>
                    {v.name} (Cap: {v.capacity})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Start Date & Time</label>
              <input
                type="datetime-local"
                required
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">End Date & Time</label>
              <input
                type="datetime-local"
                required
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Event Registration Capacity
            </label>
            <input
              type="number"
              min={1}
              required
              value={formData.capacity}
              onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value, 10) || 1 })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Enforces maximum student bookings. Cannot exceed physical venue ceiling.
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-semibold shadow-xs"
            >
              Create Event
            </button>
          </div>
        </form>
      </Modal>

      {/* Roster & Attendance Modal */}
      <Modal
        isOpen={isRosterModalOpen}
        onClose={() => setIsRosterModalOpen(false)}
        title={`Roster: ${selectedEventForRoster?.title || ''}`}
        maxWidth="xl"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 border-b border-slate-100 pb-3">
            <span>
              Total Registrations: <strong className="text-slate-800">{roster.length}</strong>
            </span>
            <span>
              Attended:{' '}
              <strong className="text-emerald-700">
                {roster.filter((r) => r.status === 'attended').length}
              </strong>
            </span>
          </div>

          {rosterLoading ? (
            <div className="py-12 text-center">
              <RefreshCw className="w-6 h-6 text-brand-600 animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-500">Loading attendee roster...</p>
            </div>
          ) : roster.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              No students have registered for this event yet.
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
              {roster.map((reg) => {
                const student = typeof reg.studentId === 'object' ? (reg.studentId as Student) : null;
                return (
                  <div key={reg._id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-slate-800">
                        {student ? student.fullName : 'Registered Student'}
                      </p>
                      <p className="text-[11px] text-slate-400 font-mono">
                        {student ? `${student.rollNumber} • ${student.department}` : ''}
                      </p>
                    </div>

                    <div className="flex items-center space-x-3">
                      <StatusTag status={reg.status} size="sm" />
                      {reg.status === 'registered' && (
                        <button
                          onClick={() => handleMarkAttendance(reg._id)}
                          className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] shadow-2xs"
                        >
                          Mark Present
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <button
              onClick={() => setIsRosterModalOpen(false)}
              className="px-4 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 text-xs font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

