import React from 'react';
import { Calendar, MapPin, UserCheck, Clock } from 'lucide-react';
import { Event, Venue, Organizer } from '../types';
import { StatusTag } from './StatusTag';
import { CapacityBadge } from './CapacityBadge';

interface EventCardProps {
  event: Event;
  onRegister?: (event: Event) => void;
  isRegistered?: boolean;
  actionSlot?: React.ReactNode;
}

export const EventCard: React.FC<EventCardProps> = ({
  event,
  onRegister,
  isRegistered = false,
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

  const activeCount = event.activeRegistrationsCount ?? 0;
  const isFull = activeCount >= event.capacity;
  const canRegister = event.status === 'upcoming' && !isFull && !isRegistered;

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h4 className="text-base font-bold text-slate-800 line-clamp-1 hover:line-clamp-none transition-all">
            {event.title}
          </h4>
          <StatusTag status={event.status} size="sm" />
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

        <div className="pt-2 border-t border-slate-100">
          <CapacityBadge current={activeCount} max={event.capacity} />
        </div>
      </div>

      <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
        {actionSlot ? (
          actionSlot
        ) : (
          <>
            {isRegistered ? (
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                Registered
              </span>
            ) : isFull ? (
              <span className="text-xs font-semibold text-rose-600 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200">
                Registration Full
              </span>
            ) : event.status !== 'upcoming' ? (
              <span className="text-xs font-semibold text-slate-500 bg-slate-200/50 px-3 py-1.5 rounded-lg">
                Closed
              </span>
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

