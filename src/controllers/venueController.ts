import { Request, Response, NextFunction } from 'express';
import { Venue, IVenue } from '../models/Venue';
import { Event, IEvent } from '../models/Event';
import { AppError } from '../middleware/errorHandler';

export interface CreateVenueDTO {
  name: string;
  location: string;
  capacity: number;
  facilities?: string[];
}

export interface VenueResponse {
  success: boolean;
  data: IVenue | IVenue[];
  message?: string;
  total?: number;
}

export interface AvailabilityResponse {
  success: boolean;
  isAvailable: boolean;
  conflictingEvents?: IEvent[];
  message?: string;
}

/**
 * List all venues.
 * Status: 200 OK
 */
export const getVenues = async (
  req: Request<{}, {}, {}, { minCapacity?: string }>,
  res: Response<VenueResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const filter: Record<string, unknown> = {};

    if (req.query.minCapacity) {
      const minCap: number = parseInt(req.query.minCapacity, 10);
      if (!isNaN(minCap)) {
        filter.capacity = { $gte: minCap };
      }
    }

    const venues: IVenue[] = await Venue.find(filter).sort({ name: 1 });

    res.status(200).json({
      success: true,
      total: venues.length,
      data: venues,
    });
  } catch (error: unknown) {
    next(error as Error);
  }
};

export const getAllVenues = getVenues;

/**
 * Create a new venue with validation.
 * Status: 201 Created | 400 Bad Request | 409 Conflict
 */
export const createVenue = async (
  req: Request<{}, {}, CreateVenueDTO>,
  res: Response<VenueResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, location, capacity, facilities } = req.body;

    if (!name || !location || capacity === undefined) {
      return next(new AppError('Name, location, and capacity are required fields', 400));
    }

    if (typeof capacity !== 'number' || capacity < 1) {
      return next(new AppError('Capacity must be a positive integer of at least 1', 400));
    }

    // Check unique conflict
    const existingVenue = await Venue.findOne({ name: name.trim() });
    if (existingVenue) {
      return next(new AppError(`Venue with name "${name.trim()}" already exists`, 409));
    }

    const venue: IVenue = await Venue.create({
      name: name.trim(),
      location: location.trim(),
      capacity,
      facilities: facilities || [],
    });

    res.status(201).json({
      success: true,
      message: 'Venue created successfully',
      data: venue,
    });
  } catch (error: unknown) {
    next(error as Error);
  }
};

/**
 * Fetch a single venue by its ID.
 * Status: 200 OK | 404 Not Found
 */
export const getVenueById = async (
  req: Request<{ id: string }>,
  res: Response<VenueResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const venue: IVenue | null = await Venue.findById(req.params.id);
    if (!venue) {
      return next(new AppError('Venue not found', 404));
    }

    res.status(200).json({
      success: true,
      data: venue,
    });
  } catch (error: unknown) {
    next(error as Error);
  }
};

/**
 * Checks venue availability for a specified timeframe.
 * Status: 200 OK | 400 Bad Request | 404 Not Found
 */
export const checkVenueAvailability = async (
  req: Request<{ id: string }, {}, {}, { startDate: string; endDate: string }>,
  res: Response<AvailabilityResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return next(new AppError('Both startDate and endDate query parameters are required', 400));
    }

    const start: Date = new Date(startDate);
    const end: Date = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return next(new AppError('Invalid date format provided for startDate or endDate', 400));
    }

    if (end.getTime() <= start.getTime()) {
      return next(new AppError('endDate must be greater than startDate', 400));
    }

    const venue: IVenue | null = await Venue.findById(req.params.id);
    if (!venue) {
      return next(new AppError('Venue not found', 404));
    }

    const conflicts: IEvent[] = await Event.find({
      venueId: req.params.id,
      status: { $in: ['upcoming', 'ongoing'] },
      $or: [{ startDate: { $lt: end }, endDate: { $gt: start } }],
    });

    const isAvailable: boolean = conflicts.length === 0;

    res.status(200).json({
      success: true,
      isAvailable,
      conflictingEvents: conflicts,
      message: isAvailable ? 'Venue is available' : 'Venue has schedule conflicts',
    });
  } catch (error: unknown) {
    next(error as Error);
  }
};
