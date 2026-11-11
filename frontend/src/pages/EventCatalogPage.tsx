import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Shield,
  Radio,
  Star,
  MessageSquare,
} from 'lucide-react';
import { Event, Registration, Feedback, Student } from '../types';
import {
  getEvents,
  registerForEvent,
  joinWaitlist,
  getStudentRegistrations,
  getEventFeedback,
} from '../api/client';
import { EventCard } from '../components/EventCard';
import { Modal } from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import { socket, SeatUpdatedEvent } from '../utils/socket';
import { getEventStatus } from '../utils/eventStatus';

export const EventCatalogPage: React.FC = () => {
  const { user: activeUser } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [studentRegistrations, setStudentRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [, setClockTick] = useState(0);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Feedback / Reviews Modal State
  const [selectedEventForReviews, setSelectedEventForReviews] = useState<Event | null>(null);
  const [eventReviews, setEventReviews] = useState<Feedback[]>([]);
  const [reviewsAverage, setReviewsAverage] = useState(0);
  const [reviewsLoading, setReviewsLoading] = useState(false);

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

  // Live Seat Availability & Waitlist Subscription via Socket.io
  useEffect(() => {
    const handleSeatUpdated = (payload: SeatUpdatedEvent) => {
      setEvents((prevEvents) =>
        prevEvents.map((ev) =>
          ev._id === payload.eventId
            ? {
                ...ev,
                registeredCount: payload.registeredCount,
                activeRegistrationsCount: payload.registeredCount,
                availableSeats: payload.availableSeats,
                waitlistCount: payload.waitlistCount,
              }
            : ev
        )
      );

      // Keep logged-in student's waitlist/auto-promotion state synced in real time
      if (activeUser && activeUser.role === 'student') {
        getStudentRegistrations(activeUser.id)
          .then((regs) => setStudentRegistrations(regs))
          .catch(() => {});
      }
    };

    socket.on('seat_updated', handleSeatUpdated);
    return () => {
      socket.off('seat_updated', handleSeatUpdated);
    };
  }, [activeUser]);

  // Periodically refresh computed status badges as time progresses
  useEffect(() => {
    const timer = setInterval(() => setClockTick((tick) => tick + 1), 30000);
    return () => clearInterval(timer);
  }, []);

  const ensureEventOpenForStudentAction = (event: Event, errorMessage: string): boolean => {
    if (!activeUser || activeUser.role !== 'student') {
      setNotification({ type: 'error', message: errorMessage });
      return false;
    }

    const computedStatus = getEventStatus(event);
    if (computedStatus === 'Completed') {
      setNotification({
        type: 'error',
        message: 'Registration is closed. This event has already concluded.',
      });
      return false;
    }
    if (computedStatus === 'Cancelled') {
      setNotification({
        type: 'error',
        message: 'This event has been cancelled.',
      });
      return false;
    }

    return true;
  };

  const handleRegister = async (event: Event) => {
    if (!ensureEventOpenForStudentAction(event, 'Only student accounts can register for campus events.')) {
      return;
    }

    try {
      await registerForEvent(activeUser!.id, event._id);
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

  const handleJoinWaitlist = async (event: Event) => {
    if (!ensureEventOpenForStudentAction(event, 'Only student accounts can join event waitlists.')) {
      return;
    }

    try {
      const res = await joinWaitlist(activeUser!.id, event._id);
      setNotification({
        type: 'success',
        message:
          res.status === 'waitlisted'
            ? `Added to waitlist for "${event.title}" at Position #${res.waitlistPosition}.`
            : `A seat opened up! You have been confirmed for "${event.title}".`,
      });
      await fetchCatalogData();
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Unable to join waitlist. Please try again.';
      setNotification({
        type: 'error',
        message: msg,
      });
    }
  };

  const handleViewFeedback = async (event: Event) => {
    setSelectedEventForReviews(event);
    setReviewsLoading(true);
    try {
      const res = await getEventFeedback(event._id);
      setEventReviews(res.data || []);
      setReviewsAverage(res.averageRating || 0);
    } catch (err) {
      console.error('Failed to load event reviews:', err);
      setEventReviews([]);
      setReviewsAverage(0);
    } finally {
      setReviewsLoading(false);
    }
  };

  // Filter events by search & dynamically computed lifecycle status
  const filteredEvents = events.filter((ev) => {
    const matchesSearch =
      ev.title.toLowerCase().includes(search.toLowerCase()) ||
      ev.description.toLowerCase().includes(search.toLowerCase());
    const computedStatus = getEventStatus(ev);
    const matchesStatus =
      statusFilter === 'all' || computedStatus.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const registeredEventIds = new Set(
    studentRegistrations
      .filter((r) => r.status === 'registered' || r.status === 'attended')
      .map((r) => (typeof r.eventId === 'object' ? r.eventId._id : r.eventId))
  );

  const waitlistedMap = new Map<string, number | null>();
  studentRegistrations
    .filter((r) => r.status === 'waitlisted')
    .forEach((r) => {
      const evId = typeof r.eventId === 'object' ? r.eventId._id : r.eventId;
      waitlistedMap.set(evId, r.waitlistPosition ?? null);
    });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Campus Event Catalog
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Radio className="w-3 h-3 mr-1 animate-pulse text-emerald-600" />
              Live Seats
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {isOrganizer
              ? 'Read-only catalog view for organizers. To publish or manage events, use the Organizer Dashboard.'
              : 'Discover workshops, symposiums, hackathons, and cultural events with real-time seat updates.'}
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
          {filteredEvents.map((event) => {
            const isWaitlisted = waitlistedMap.has(event._id);
            const waitlistPos = waitlistedMap.get(event._id) ?? null;

            return (
              <EventCard
                key={event._id}
                event={event}
                onRegister={handleRegister}
                onJoinWaitlist={handleJoinWaitlist}
                onViewFeedback={handleViewFeedback}
                isRegistered={registeredEventIds.has(event._id)}
                isWaitlisted={isWaitlisted}
                waitlistPosition={waitlistPos}
                actionSlot={
                  isOrganizer ? (
                    <span className="w-full text-center py-2 px-3 rounded-lg bg-slate-100 text-slate-500 font-semibold text-xs border border-slate-200">
                      Organizer View (Read-Only)
                    </span>
                  ) : undefined
                }
              />
            );
          })}
        </div>
      )}

      {/* Event Reviews Modal */}
      <Modal
        isOpen={!!selectedEventForReviews}
        onClose={() => setSelectedEventForReviews(null)}
        title={`Feedback & Ratings: ${selectedEventForReviews?.title || ''}`}
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80">
            <div className="flex items-center space-x-2">
              <Star className="w-5 h-5 text-amber-500 fill-amber-400" />
              <span className="text-lg font-black text-slate-800">
                {reviewsAverage > 0 ? reviewsAverage.toFixed(1) : '—'}
              </span>
              <span className="text-xs text-slate-500">/ 5.0 average</span>
            </div>
            <span className="text-xs font-semibold text-slate-600">
              {eventReviews.length} {eventReviews.length === 1 ? 'review' : 'reviews'}
            </span>
          </div>

          {reviewsLoading ? (
            <div className="py-8 text-center">
              <RefreshCw className="w-6 h-6 text-brand-600 animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-500">Loading student reviews...</p>
            </div>
          ) : eventReviews.length === 0 ? (
            <div className="py-10 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-600">No feedback submitted yet</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Registered or attended students can submit a review from My Registrations.
              </p>
            </div>
          ) : (
            <div className="max-h-72 overflow-y-auto space-y-3 pr-1">
              {eventReviews.map((review) => {
                const reviewer =
                  typeof review.studentId === 'object' ? (review.studentId as Student) : null;
                return (
                  <div
                    key={review._id}
                    className="p-3.5 rounded-xl border border-slate-200/80 bg-white space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">
                        {reviewer ? reviewer.fullName : 'Student Reviewer'}
                      </span>
                      <div className="flex items-center space-x-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-3.5 h-3.5 ${
                              star <= review.rating
                                ? 'text-amber-400 fill-amber-400'
                                : 'text-slate-200'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    {review.comment && (
                      <p className="text-xs text-slate-600 leading-relaxed">{review.comment}</p>
                    )}
                    <p className="text-[10px] text-slate-400">
                      {reviewer?.department ? `${reviewer.department} • ` : ''}
                      {new Date(review.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
