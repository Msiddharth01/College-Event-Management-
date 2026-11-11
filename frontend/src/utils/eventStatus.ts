import { Event, EventStatus } from '../types';

export type ComputedEventStatus = 'Upcoming' | 'Ongoing' | 'Completed' | 'Cancelled';

export interface EventDateLike {
  status?: EventStatus | string;
  startDate?: string | Date;
  endDate?: string | Date;
  date?: string | Date;
}

/**
 * Dynamically computes an event's lifecycle status ('Upcoming' | 'Ongoing' | 'Completed' | 'Cancelled')
 * based on the current timestamp against startDate and endDate.
 */
export const getEventStatus = (event: EventDateLike | Event): ComputedEventStatus => {
  if (event.status?.toLowerCase() === 'cancelled') {
    return 'Cancelled';
  }

  const now = new Date();
  const rawStart = event.startDate || ('date' in event ? event.date : undefined);
  const rawEnd = event.endDate || rawStart;

  if (!rawStart) {
    const normalized = (event.status || 'upcoming').toLowerCase();
    if (normalized === 'ongoing') return 'Ongoing';
    if (normalized === 'completed') return 'Completed';
    return 'Upcoming';
  }

  const startDate = new Date(rawStart);
  const endDate = new Date(rawEnd!);

  // If endDate omitted or represents a date-only string without time component, treat as end of day (23:59:59)
  if (
    !event.endDate ||
    (typeof rawEnd === 'string' && !rawEnd.includes('T') && !rawEnd.includes(':'))
  ) {
    endDate.setHours(23, 59, 59, 999);
  }

  if (now < startDate) {
    return 'Upcoming';
  }

  if (now >= startDate && now <= endDate) {
    return 'Ongoing';
  }

  return 'Completed';
};

