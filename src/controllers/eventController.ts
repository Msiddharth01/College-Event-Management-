import { Request, Response, NextFunction } from 'express';
import { Event, IEvent, EventStatus } from '../models/Event';
import { Organizer } from '../models/Organizer';
import { Venue, IVenue } from '../models/Venue';
import { AppError } from '../middleware/errorHandler';

export interface CreateEventDTO {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  capacity: number;
  organizerId: string;
  venueId: string;
  status?: EventStatus;
}

export interface UpdateEventDTO {
  title?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  capacity?: number;
  organizerId?: string;
  venueId?: string;
  status?: EventStatus;
}

export interface EventResponse {
  success: boolean;
  data: IEvent | IEvent[];
  message?: string;
  total?: number;
}

export interface EventFilterQuery {
  status?: EventStatus;
  organizerId?: string;
  venueId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

/**
 * List events with query filters (status, organizerId, startDate, endDate),
 * populated references (organizerId, venueId), sorted by startDate ascending.
 * Status: 200 OK
 */
export const getEvents = async (
  req: Request<{}, {}, {}, EventFilterQuery>,
  res: Response<EventResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const filter: Record<string, unknown> = {};

    if (req.query.status) {
      filter.status = req.query.status;
    }
    if (req.query.organizerId) {
      filter.organizerId = req.query.organizerId;
    }
    if (req.query.venueId) {
      filter.venueId = req.query.venueId;
    }
    if (req.query.startDate) {
      const start: Date = new Date(req.query.startDate);
      if (!isNaN(start.getTime())) {
        filter.startDate = { $gte: start };
      }
    }
    if (req.query.endDate) {
      const end: Date = new Date(req.query.endDate);
      if (!isNaN(end.getTime())) {
        filter.endDate = { $lte: end };
      }
    }
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search.trim(), 'i');
      filter.$or = [{ title: searchRegex }, { description: searchRegex }];
    }

    const events: IEvent[] = await Event.find(filter)
      .populate('organizerId', 'name email')
      .populate('venueId', 'name location capacity')
      .sort({ startDate: 1 });

    res.status(200).json({
      success: true,
      total: events.length,
      data: events,
    });
  } catch (error: unknown) {
    next(error as Error);
  }
};

export const getAllEvents = getEvents;

/**
 * Fetch a single event with populated organizer and venue details.
 * Status: 200 OK | 404 Not Found
 */
export const getEventById = async (
  req: Request<{ id: string }>,
  res: Response<EventResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const event: IEvent | null = await Event.findById(req.params.id)
      .populate('organizerId', 'name email')
      .populate('venueId', 'name location capacity');

    if (!event) {
      return next(new AppError('Event not found', 404));
    }

    res.status(200).json({
      success: true,
      data: event,
    });
  } catch (error: unknown) {
    next(error as Error);
  }
};

/**
 * Creates a new event with venue scheduling conflict detection and capacity enforcement.
 * Enforces:
 * - organizerId and venueId existence (404)
 * - endDate > startDate (400)
 * - capacity <= venue.capacity (400)
 * - Overlap check: existingEvent.startDate < newEndDate && existingEvent.endDate > newStartDate (409)
 * Status: 201 Created | 400 Bad Request | 404 Not Found | 409 Conflict
 */
export const createEvent = async (
  req: Request<{}, {}, CreateEventDTO>,
  res: Response<EventResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      title,
      description,
      startDate,
      endDate,
      capacity,
      organizerId,
      venueId,
      status,
    } = req.body;

    if (!title || !description || !startDate || !endDate || capacity === undefined || !organizerId || !venueId) {
      return next(
        new AppError(
          'Title, description, startDate, endDate, capacity, organizerId, and venueId are required',
          400
        )
      );
    }

    const newStartDate: Date = new Date(startDate);
    const newEndDate: Date = new Date(endDate);

    if (isNaN(newStartDate.getTime()) || isNaN(newEndDate.getTime())) {
      return next(new AppError('Invalid date format for startDate or endDate', 400));
    }

    if (newEndDate.getTime() <= newStartDate.getTime()) {
      return next(new AppError('End date must be greater than start date', 400));
    }

    // 1. Validate organizer existence
    const organizer = await Organizer.findById(organizerId);
    if (!organizer) {
      return next(new AppError('Organizer not found', 404));
    }

    // 2. Validate venue existence
    const venue: IVenue | null = await Venue.findById(venueId);
    if (!venue) {
      return next(new AppError('Venue not found', 404));
    }

    // 3. Ensure capacity does not exceed physical venue capacity
    if (capacity > venue.capacity) {
      return next(
        new AppError(
          `Event capacity (${capacity}) exceeds the physical venue capacity (${venue.capacity})`,
          400
        )
      );
    }

    // 4. Enforce Venue Scheduling Conflict Rule:
    // Check if venue is already booked for any non-cancelled event where:
    // existingEvent.startDate < newEndDate && existingEvent.endDate > newStartDate
    const conflict: IEvent | null = await Event.findOne({
      venueId,
      status: { $ne: 'cancelled' },
      startDate: { $lt: newEndDate },
      endDate: { $gt: newStartDate },
    });

    if (conflict) {
      return next(
        new AppError('Venue is already booked during this time interval', 409)
      );
    }

    const event: IEvent = await Event.create({
      title: title.trim(),
      description: description.trim(),
      startDate: newStartDate,
      endDate: newEndDate,
      capacity,
      organizerId,
      venueId,
      status: status || 'upcoming',
    });

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      data: event,
    });
  } catch (error: unknown) {
    next(error as Error);
  }
};

/**
 * Updates an existing event.
 * If dates or venue change, re-runs the venue overlap check excluding the current event.
 * Status: 200 OK | 400 Bad Request | 404 Not Found | 409 Conflict
 */
export const updateEvent = async (
  req: Request<{ id: string }, {}, UpdateEventDTO>,
  res: Response<EventResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const event: IEvent | null = await Event.findById(req.params.id);
    if (!event) {
      return next(new AppError('Event not found', 404));
    }

    const {
      title,
      description,
      startDate,
      endDate,
      capacity,
      organizerId,
      venueId,
      status,
    } = req.body;

    const targetStart: Date = startDate ? new Date(startDate) : event.startDate;
    const targetEnd: Date = endDate ? new Date(endDate) : event.endDate;
    const targetVenueId = venueId || event.venueId;

    if (isNaN(targetStart.getTime()) || isNaN(targetEnd.getTime())) {
      return next(new AppError('Invalid date format for startDate or endDate', 400));
    }

    if (targetEnd.getTime() <= targetStart.getTime()) {
      return next(new AppError('End date must be greater than start date', 400));
    }

    // Check organizer if updating
    if (organizerId && organizerId.toString() !== event.organizerId.toString()) {
      const organizer = await Organizer.findById(organizerId);
      if (!organizer) {
        return next(new AppError('Organizer not found', 404));
      }
      event.organizerId = organizerId as any;
    }

    // Check venue and capacity if updating
    const venue: IVenue | null = await Venue.findById(targetVenueId);
    if (!venue) {
      return next(new AppError('Venue not found', 404));
    }

    const targetCapacity = capacity !== undefined ? capacity : event.capacity;
    if (targetCapacity > venue.capacity) {
      return next(
        new AppError(
          `Event capacity (${targetCapacity}) exceeds the physical venue capacity (${venue.capacity})`,
          400
        )
      );
    }

    // If dates or venue change, re-run overlap check excluding current event
    const datesChanged: boolean = Boolean(
      (startDate && new Date(startDate).getTime() !== event.startDate.getTime()) ||
      (endDate && new Date(endDate).getTime() !== event.endDate.getTime()) ||
      (venueId && venueId.toString() !== event.venueId.toString())
    );

    if (datesChanged) {
      const conflict: IEvent | null = await Event.findOne({
        _id: { $ne: event._id },
        venueId: targetVenueId,
        status: { $ne: 'cancelled' },
        startDate: { $lt: targetEnd },
        endDate: { $gt: targetStart },
      });

      if (conflict) {
        return next(
          new AppError('Venue is already booked during this time interval', 409)
        );
      }
    }

    if (title) event.title = title.trim();
    if (description) event.description = description.trim();
    if (startDate) event.startDate = targetStart;
    if (endDate) event.endDate = targetEnd;
    if (capacity !== undefined) event.capacity = targetCapacity;
    if (venueId) event.venueId = venueId as any;
    if (status) event.status = status;

    await event.save();

    res.status(200).json({
      success: true,
      message: 'Event updated successfully',
      data: event,
    });
  } catch (error: unknown) {
    next(error as Error);
  }
};

/**
 * Soft-cancel an event by updating its status to 'cancelled'.
 * Status: 200 OK | 404 Not Found
 */
export const cancelEvent = async (
  req: Request<{ id: string }>,
  res: Response<EventResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const event: IEvent | null = await Event.findById(req.params.id);
    if (!event) {
      return next(new AppError('Event not found', 404));
    }

    event.status = 'cancelled';
    await event.save();

    res.status(200).json({
      success: true,
      message: 'Event cancelled successfully',
      data: event,
    });
  } catch (error: unknown) {
    next(error as Error);
  }
};
