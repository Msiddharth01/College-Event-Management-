import { Request, Response, NextFunction } from 'express';
import { Registration } from '../models/Registration';
import { Event } from '../models/Event';
import { Student } from '../models/Student';
import { Venue } from '../models/Venue';

export interface EventRegistrationSummary {
  eventId: string;
  title: string;
  capacity: number;
  status: string;
  totalRegistrations: number;
}

export interface DashboardMetrics {
  totalUpcomingEvents: number;
  totalActiveStudents: number;
  totalVenues: number;
  totalConfirmedRegistrations: number;
  upcomingEvents?: number;
  activeStudents?: number;
  collegeVenues?: number;
  totalRegistrations?: number;
}

export interface AnalyticsResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
  total?: number;
}

/**
 * Aggregates registration counts by event.
 * Implements the exact 6-stage aggregation pipeline from Code 4.2:
 * Stage 1: $match registrations with status: { $in: ['registered', 'attended'] }
 * Stage 2: $group by _id: '$eventId', computing total: { $sum: 1 }
 * Stage 3: $lookup from 'events', localField: '_id', foreignField: '_id', as: 'event'
 * Stage 4: $unwind: '$event'
 * Stage 5: $project: { _id: 0, eventId: '$_id', title: '$event.title', capacity: '$event.capacity', status: '$event.status', totalRegistrations: '$total' }
 * Stage 6: $sort: { totalRegistrations: -1 }
 * Status: 200 OK
 */
export const getEventRegistrationSummary = async (
  _req: Request,
  res: Response<AnalyticsResponse<EventRegistrationSummary[]>>,
  next: NextFunction
): Promise<void> => {
  try {
    const summary: EventRegistrationSummary[] = await Registration.aggregate<EventRegistrationSummary>([
      // Stage 1: Filter confirmed/attended registrations
      {
        $match: {
          status: { $in: ['registered', 'attended'] },
        },
      },
      // Stage 2: Group by eventId and calculate sum
      {
        $group: {
          _id: '$eventId',
          total: { $sum: 1 },
        },
      },
      // Stage 3: Join with events collection
      {
        $lookup: {
          from: 'events',
          localField: '_id',
          foreignField: '_id',
          as: 'event',
        },
      },
      // Stage 4: Deconstruct the joined event array
      {
        $unwind: '$event',
      },
      // Stage 5: Project required shape
      {
        $project: {
          _id: 0,
          eventId: '$_id',
          title: '$event.title',
          capacity: '$event.capacity',
          status: '$event.status',
          totalRegistrations: '$total',
        },
      },
      // Stage 6: Sort by total registrations descending
      {
        $sort: {
          totalRegistrations: -1,
        },
      },
    ]);

    res.status(200).json({
      success: true,
      total: summary.length,
      data: summary,
    });
  } catch (error: unknown) {
    next(error as Error);
  }
};

/**
 * Computes high-level system summary dashboard metrics concurrently:
 * - Total upcoming events count
 * - Total active students count
 * - Total venues registered count
 * - Total confirmed registrations count
 * Status: 200 OK
 */
export const getDashboardMetrics = async (
  _req: Request,
  res: Response<AnalyticsResponse<DashboardMetrics>>,
  next: NextFunction
): Promise<void> => {
  try {
    const [
      totalUpcomingEvents,
      totalActiveStudents,
      totalVenues,
      totalConfirmedRegistrations,
    ] = await Promise.all([
      Event.countDocuments({ status: 'upcoming' }),
      Student.countDocuments(),
      Venue.countDocuments(),
      Registration.countDocuments({ status: { $in: ['registered', 'attended'] } }),
    ]);

    const metrics: DashboardMetrics = {
      totalUpcomingEvents,
      totalActiveStudents,
      totalVenues,
      totalConfirmedRegistrations,
      upcomingEvents: totalUpcomingEvents,
      activeStudents: totalActiveStudents,
      collegeVenues: totalVenues,
      totalRegistrations: totalConfirmedRegistrations,
    };

    res.status(200).json({
      success: true,
      data: metrics,
    });
  } catch (error: unknown) {
    next(error as Error);
  }
};

