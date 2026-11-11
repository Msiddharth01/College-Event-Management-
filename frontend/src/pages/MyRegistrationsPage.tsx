import React, { useState, useEffect, useCallback } from 'react';
import {
  BookmarkCheck,
  Calendar,
  MapPin,
  Clock,
  Trash2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Star,
  MessageSquarePlus,
} from 'lucide-react';
import { Registration, Event, Venue, Feedback } from '../types';
import {
  getStudentRegistrations,
  cancelRegistration,
  submitFeedback,
  getStudentFeedback,
} from '../api/client';
import { StatusTag } from '../components/StatusTag';
import { Modal } from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import { UnauthorizedBanner } from '../components/UnauthorizedBanner';
import { socket } from '../utils/socket';

interface MyRegistrationsPageProps {
  onNavigateHome?: () => void;
}

export const MyRegistrationsPage: React.FC<MyRegistrationsPageProps> = ({ onNavigateHome }) => {
  const { user: activeUser } = useAuth();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [submittedFeedbackMap, setSubmittedFeedbackMap] = useState<Map<string, Feedback>>(new Map());
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Feedback Modal State
  const [feedbackTarget, setFeedbackTarget] = useState<{ eventId: string; title: string } | null>(
    null
  );
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);

  const fetchRegistrations = useCallback(async () => {
    if (!activeUser || activeUser.role !== 'student') {
      setRegistrations([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [regs, feedbacks] = await Promise.all([
        getStudentRegistrations(activeUser.id),
        getStudentFeedback(activeUser.id).catch(() => [] as Feedback[]),
      ]);
      setRegistrations(regs);

      const fbMap = new Map<string, Feedback>();
      feedbacks.forEach((fb) => fbMap.set(fb.eventId, fb));
      setSubmittedFeedbackMap(fbMap);
    } catch (err: unknown) {
      console.error('Failed to fetch student registrations:', err);
    } finally {
      setLoading(false);
    }
  }, [activeUser]);

  useEffect(() => {
    fetchRegistrations();
  }, [fetchRegistrations]);

  // Listen to WebSocket seat_updated events so auto-promotion updates immediately
  useEffect(() => {
    const handleSeatUpdated = () => {
      if (activeUser && activeUser.role === 'student') {
        getStudentRegistrations(activeUser.id)
          .then((regs) => setRegistrations(regs))
          .catch(() => {});
      }
    };

    socket.on('seat_updated', handleSeatUpdated);
    return () => {
      socket.off('seat_updated', handleSeatUpdated);
    };
  }, [activeUser]);

  // Role Guard: Restrict to student accounts only
  if (!activeUser || activeUser.role !== 'student') {
    return (
      <UnauthorizedBanner
        requiredRole="student"
        onNavigateHome={onNavigateHome || (() => {})}
      />
    );
  }

  const handleCancelRegistration = async (
    registrationId: string,
    eventTitle: string,
    isWaitlist: boolean
  ) => {
    const confirmMsg = isWaitlist
      ? `Leave the waitlist for "${eventTitle}"?`
      : `Are you sure you want to cancel your registration for "${eventTitle}"?`;

    if (!window.confirm(confirmMsg)) {
      return;
    }

    try {
      await cancelRegistration(registrationId);
      setNotification({
        type: 'success',
        message: isWaitlist
          ? `Removed from waitlist for "${eventTitle}".`
          : `Your registration for "${eventTitle}" has been cancelled.`,
      });
      await fetchRegistrations();
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Failed to cancel registration.';
      setNotification({
        type: 'error',
        message: msg,
      });
    }
  };

  const openFeedbackModal = (eventId: string, title: string) => {
    setFeedbackTarget({ eventId, title });
    setRating(5);
    setComment('');
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackTarget) return;

    try {
      setFeedbackSubmitting(true);
      await submitFeedback({
        eventId: feedbackTarget.eventId,
        studentId: activeUser.id,
        rating,
        comment: comment.trim(),
      });
      setNotification({
        type: 'success',
        message: `Thank you! Your ${rating}-star feedback for "${feedbackTarget.title}" was submitted.`,
      });
      setFeedbackTarget(null);
      await fetchRegistrations();
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Failed to submit feedback.';
      setNotification({
        type: 'error',
        message: msg,
      });
      setFeedbackTarget(null);
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return '';
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const formatTime = (dateString?: string): string => {
    if (!dateString) return '';
    try {
      const d = new Date(dateString);
      return d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            My Event Registrations
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track confirmed seats, live waitlist promotions, attendance records, and post-event feedback.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-slate-800">{activeUser.name}</p>
            <p className="text-[11px] text-slate-500 font-mono">
              {activeUser.rollNumber ? `${activeUser.rollNumber} • ` : ''}
              {activeUser.department || 'Student'}
            </p>
          </div>
          <button
            onClick={fetchRegistrations}
            disabled={loading}
            className="p-2 border border-slate-200 bg-white rounded-lg text-slate-600 hover:bg-slate-50 shadow-xs"
            title="Refresh Registrations"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
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

      {/* Main Content Area */}
      {loading ? (
        <div className="py-20 text-center">
          <RefreshCw className="w-8 h-8 text-brand-600 animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-500">Retrieving your registered events...</p>
        </div>
      ) : registrations.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-200 p-8 max-w-md mx-auto">
          <BookmarkCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-700">No Registrations Yet</h3>
          <p className="text-xs text-slate-400 mt-1 mb-4">
            You haven't signed up for any campus events yet. Explore the catalog and claim your seat!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {registrations.map((reg) => {
            const event = typeof reg.eventId === 'object' ? (reg.eventId as Event) : null;
            const eventId = event ? event._id : (reg.eventId as string);
            const venue = event && typeof event.venueId === 'object' ? (event.venueId as Venue) : null;
            const eventTitle = event ? event.title : 'Event details unavailable';
            const isWaitlisted = reg.status === 'waitlisted';
            const canCancel = reg.status === 'registered' || isWaitlisted;
            const canSubmitFeedback = reg.status === 'registered' || reg.status === 'attended';
            const existingReview = submittedFeedbackMap.get(eventId);

            const statusLabel = isWaitlisted
              ? `Waitlisted (Position #${reg.waitlistPosition ?? 1})`
              : reg.status === 'registered'
              ? 'Confirmed / Registered'
              : undefined;

            return (
              <div
                key={reg._id}
                className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-all flex flex-col md:flex-row md:items-center md:justify-between gap-4"
              >
                <div className="space-y-2 max-w-2xl">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-base font-bold text-slate-800">{eventTitle}</h3>
                    <StatusTag status={reg.status} label={statusLabel} size="sm" />
                  </div>

                  {event && (
                    <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500">
                      <div className="flex items-center">
                        <Calendar className="w-3.5 h-3.5 mr-1.5 text-brand-600" />
                        <span>{formatDate(event.startDate)}</span>
                      </div>
                      <div className="flex items-center">
                        <Clock className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                        <span>
                          {formatTime(event.startDate)} - {formatTime(event.endDate)}
                        </span>
                      </div>
                      {venue && (
                        <div className="flex items-center">
                          <MapPin className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                          <span>{venue.name}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <p className="text-[11px] text-slate-400">
                    {isWaitlisted ? 'Joined waitlist on: ' : 'Registered on: '}
                    {new Date(reg.registeredAt).toLocaleDateString()} at{' '}
                    {new Date(reg.registeredAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    {reg.attendedAt && (
                      <span className="text-emerald-600 font-semibold ml-2">
                        • Verified Attended on {new Date(reg.attendedAt).toLocaleDateString()}
                      </span>
                    )}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 self-end md:self-auto">
                  {canSubmitFeedback &&
                    (existingReview ? (
                      <span className="px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold inline-flex items-center">
                        <Star className="w-3.5 h-3.5 mr-1 text-amber-500 fill-amber-400" />
                        Rated {existingReview.rating}/5
                      </span>
                    ) : (
                      <button
                        onClick={() => openFeedbackModal(eventId, eventTitle)}
                        className="inline-flex items-center px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 text-xs font-semibold shadow-xs transition-colors"
                      >
                        <MessageSquarePlus className="w-3.5 h-3.5 mr-1.5" />
                        Leave Feedback
                      </button>
                    ))}

                  {canCancel && (
                    <button
                      onClick={() => handleCancelRegistration(reg._id, eventTitle, isWaitlisted)}
                      className="inline-flex items-center px-3 py-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold shadow-xs transition-colors"
                      title={isWaitlistTitle(isWaitlisted)}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                      {isWaitlisted ? 'Leave Waitlist' : 'Cancel Registration'}
                    </button>
                  )}

                  {reg.status === 'attended' && (
                    <span className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold inline-flex items-center">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                      Attendance Confirmed
                    </span>
                  )}

                  {reg.status === 'cancelled' && (
                    <span className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-500 text-xs font-medium">
                      Cancelled
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Post-Event Feedback Modal */}
      <Modal
        isOpen={!!feedbackTarget}
        onClose={() => setFeedbackTarget(null)}
        title={`Rate Event: ${feedbackTarget?.title || ''}`}
      >
        <form onSubmit={handleSubmitFeedback} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Your Overall Rating
            </label>
            <div className="flex items-center space-x-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="p-1.5 rounded-lg hover:bg-amber-50 transition-colors focus:outline-none"
                  aria-label={`Rate ${star} stars`}
                >
                  <Star
                    className={`w-7 h-7 transition-transform ${
                      star <= rating
                        ? 'text-amber-400 fill-amber-400 scale-110'
                        : 'text-slate-300'
                    }`}
                  />
                </button>
              ))}
              <span className="ml-2 text-xs font-bold text-slate-700">{rating} / 5</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Comments & Highlights (Optional, max 500 characters)
            </label>
            <textarea
              rows={4}
              maxLength={500}
              placeholder="Share your experience with the session, speakers, or organization..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
            <p className="text-[10px] text-slate-400 text-right mt-1">{comment.length} / 500</p>
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setFeedbackTarget(null)}
              className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={feedbackSubmitting}
              className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-sm disabled:opacity-50"
            >
              {feedbackSubmitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

function isWaitlistTitle(isWaitlisted: boolean): string {
  return isWaitlisted ? 'Leave waitlist queue' : 'Cancel your reservation';
}
