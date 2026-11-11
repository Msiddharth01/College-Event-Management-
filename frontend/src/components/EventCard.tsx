import React from 'react';
import { Calendar, MapPin, UserCheck, Clock, Users, Star, MessageSquare } from 'lucide-react';
import { Event, Venue, Organizer } from '../types';
import { StatusTag } from './StatusTag';
import { CapacityBadge } from './CapacityBadge';
import { getEventStatus } from '../utils/eventStatus';

interface EventCardProps {
  event: Event;
  onRegister?: (event: Event) => void;
  onJoinWaitlist?: (event: Event) => void;
  onViewFeedback?: (event: Event) => void;
  isRegistered?: boolean;
  isWaitlisted?: boolean;
  waitlistPosition?: number | null;
  actionSlot?: React.ReactNode;
}

export const EventCard: React.FC<EventCardProps> = ({
  event,
  onRegister,
  onJoinWaitlist,
  onViewFeedback,
  isRegistered = false,
  isWaitlisted = false,
  waitlistPosition = null,
  actionSlot,
}) => {
  const venue = typeof event.venueId === 'object' ? (event.venueId as Venue) : null;
  const organizer = typeof event.organizerId === 'object' ? (event.organizerId as Organizer) : null;

  const formatDate = (dateString: string): string => {
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

  const formatTime = (dateString: string): string => {
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

  const dynamicStatus = getEventStatus(event);
  const activeCount = event.registeredCount ?? event.activeRegistrationsCount ?? 0;
  const waitlistCount = event.waitlistCount ?? 0;
  const isFull = activeCount >= event.capacity;
  const isOpen = dynamicStatus === 'Upcoming' || dynamicStatus === 'Ongoing';
  const canRegister = isOpen && !isFull && !isRegistered && !isWaitlisted;
  const canJoinWaitlist = isOpen && isFull && !isRegistered && !isWaitlisted;
  const avgRating = event.averageRating ?? 0;
  const totalReviews = event.totalReviews ?? 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h4 className="text-base font-bold text-slate-800 line-clamp-1 hover:line-clamp-none transition-all">
            {event.title}
          </h4>
          <StatusTag status={dynamicStatus} size="sm" />
        </div>

        <p className="text-sm text-slate-600 line-clamp-2 mb-4 leading-relaxed">
          {event.description}
        </p>

        <div className="space-y-2 text-xs text-slate-500 mb-4">
          <div className="flex items-center">
            <Calendar className="w-3.5 h-3.5 mr-2 text-brand-600 shrink-0" />
            <span>
              {formatDate(event.startDate)}
              {formatDate(event.startDate) !== formatDate(event.endDate) &&
                ` - ${formatDate(event.endDate)}`}
            </span>
          </div>

          <div className="flex items-center">
            <Clock className="w-3.5 h-3.5 mr-2 text-slate-400 shrink-0" />
            <span>
              {formatTime(event.startDate)} - {formatTime(event.endDate)}
            </span>
          </div>

          <div className="flex items-center">
            <MapPin className="w-3.5 h-3.5 mr-2 text-slate-400 shrink-0" />
            <span className="truncate">
              {venue ? `${venue.name} (${venue.location})` : 'Assigned Venue'}
            </span>
          </div>

          <div className="flex items-center">
            <UserCheck className="w-3.5 h-3.5 mr-2 text-slate-400 shrink-0" />
            <span className="truncate">
              By {organizer ? organizer.name : 'College Organizer'}
            </span>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 space-y-2">
          <CapacityBadge current={activeCount} max={event.capacity} />

          <div className="flex items-center justify-between text-[11px] pt-0.5">
            {waitlistCount > 0 ? (
              <span className="inline-flex items-center font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">
                <Users className="w-3 h-3 mr-1" />
                {waitlistCount} on waitlist
              </span>
            ) : (
              <span className="text-slate-400">
                {Math.max(0, event.capacity - activeCount)} seats left
              </span>
            )}

            {onViewFeedback && (
              <button
                type="button"
                onClick={() => onViewFeedback(event)}
                className="inline-flex items-center text-slate-600 hover:text-amber-600 font-semibold transition-colors"
                title="View event ratings & reviews"
              >
                <Star
                  className={`w-3.5 h-3.5 mr-1 ${
                    totalReviews > 0 ? 'text-amber-400 fill-amber-400' : 'text-slate-300'
                  }`}
                />
                {totalReviews > 0 ? (
                  <span>
                    {avgRating.toFixed(1)} <span className="text-slate-400">({totalReviews})</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center text-slate-400">
                    <MessageSquare className="w-3 h-3 mr-1" />
                    Reviews
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
        {actionSlot ? (
          actionSlot
        ) : (
          <>
            {isRegistered ? (
              <span className="w-full text-center text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-200">
                Confirmed / Registered
              </span>
            ) : isWaitlisted ? (
              <span className="w-full text-center text-xs font-semibold text-purple-800 bg-purple-50 px-3 py-2 rounded-lg border border-purple-200">
                Waitlisted {waitlistPosition ? `(Position #${waitlistPosition})` : ''}
              </span>
            ) : dynamicStatus === 'Cancelled' ? (
              <button
                type="button"
                disabled
                className="w-full py-2 px-4 rounded-lg bg-rose-50 text-rose-600 border border-rose-200 font-semibold text-xs cursor-not-allowed opacity-80"
              >
                Closed
              </button>
            ) : dynamicStatus === 'Completed' ? (
              <button
                type="button"
                disabled
                className="w-full py-2 px-4 rounded-lg bg-slate-200/70 text-slate-600 border border-slate-300/80 font-semibold text-xs cursor-not-allowed"
              >
                Event Concluded
              </button>
            ) : canJoinWaitlist ? (
              <button
                onClick={() => onJoinWaitlist && onJoinWaitlist(event)}
                className="w-full py-2 px-4 rounded-lg bg-gradient-to-r from-amber-500 to-purple-600 hover:from-amber-600 hover:to-purple-700 text-white font-semibold text-xs shadow-sm hover:shadow transition-all"
              >
                Join Waitlist
              </button>
            ) : (
              <button
                onClick={() => onRegister && onRegister(event)}
                disabled={!canRegister}
                className="w-full py-2 px-4 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-medium text-xs shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Register Now
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};
