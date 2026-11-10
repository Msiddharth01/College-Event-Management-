import { Request, Response, NextFunction } from 'express';
import { Registration, IRegistration, RegistrationStatus } from '../models/Registration';
import { Event, IEvent } from '../models/Event';
import { Student } from '../models/Student';
import { AppError, isDuplicateKeyError } from '../middleware/errorHandler';

export interface CreateRegistrationDTO {
  studentId: string;
  eventId: string;
}

export interface RegistrationResponse {
  success: boolean;
  data: IRegistration | IRegistration[];
  message?: string;
  total?: number;
}

export interface RegistrationFilterQuery {
  eventId?: string;
  studentId?: string;
  status?: RegistrationStatus;
}

/**
 * Registers a student for an event.
 * Steps:
 * 1. Validate that both Student and Event documents exist (404).
 * 2. Check event status: if 'completed' or 'cancelled', reject (400).
 * 3. Enforce Capacity Safeguard: count existing active registrations (status: ['registered', 'attended']).
 *    If count >= event.capacity, reject (400).
 * 4. Create new registration with status: 'registered'.
 * 5. Catch MongoDB duplicate key error (code 11000) from { studentId: 1, eventId: 1 } and return 409 Conflict.
 * Status: 201 Created | 400 Bad Request | 404 Not Found | 409 Conflict
 */
export const createRegistration = async (
  req: Request<{}, {}, CreateRegistrationDTO>,
  res: Response<RegistrationResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const { studentId, eventId } = req.body;

    if (!studentId || !eventId) {
      return next(new AppError('Both studentId and eventId are required fields', 400));
    }

    // Step 1: Validate existence of Student document
    const student = await Student.findById(studentId);
    if (!student) {
      return next(new AppError('Student not found', 404));
    }

    // Step 1 (cont.): Validate existence of Event document
    const event: IEvent | null = await Event.findById(eventId);
    if (!event) {
      return next(new AppError('Event not found', 404));
    }

    // Step 2: Check event status
    if (event.status === 'completed' || event.status === 'cancelled') {
      return next(new AppError('Event is not open for registration', 400));
    }

    // Pre-check for duplicate active registration
    const existingRegistration = await Registration.findOne({
      studentId,
      eventId,
      status: { $in: ['registered', 'attended'] },
    });
    if (existingRegistration) {
      return next(new AppError('Student is already registered for this event', 409));
    }

    // Step 3: Enforce Capacity Safeguard
    // Count active registrations ('registered' or 'attended')
    const activeRegistrationsCount: number = await Registration.countDocuments({
      eventId,
      status: { $in: ['registered', 'attended'] },
    });

    if (activeRegistrationsCount >= event.capacity) {
      return next(new AppError('Event has reached maximum capacity', 400));
    }

    // Step 4 & 5: Create new registration, catching MongoDB duplicate index errors (code 11000)
    try {
      const registration: IRegistration = await Registration.create({
        studentId,
        eventId,
        status: 'registered',
        registeredAt: new Date(),
      });

      res.status(201).json({
        success: true,
        message: 'Student registered successfully',
        data: registration,
      });
    } catch (createError: unknown) {
      if (isDuplicateKeyError(createError)) {
        return next(new AppError('Student is already registered for this event', 409));
      }
      throw createError;
    }
  } catch (error: unknown) {
    if (isDuplicateKeyError(error)) {
      return next(new AppError('Student is already registered for this event', 409));
    }
    next(error as Error);
  }
};

export const registerStudent = createRegistration;

/**
 * Return all registrations for the specified event,
 * populating student fields (fullName, rollNumber, email, department, year).
 * Route: GET /api/events/:eventId/registrations
 * Status: 200 OK
 */
export const getEventRegistrations = async (
  req: Request<{ eventId: string }, {}, {}, { status?: RegistrationStatus }>,
  res: Response<RegistrationResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const { eventId } = req.params;
    const filter: Record<string, unknown> = { eventId };

    if (req.query.status) {
      filter.status = req.query.status;
    }

    const registrations: IRegistration[] = await Registration.find(filter)
      .populate('studentId', 'fullName rollNumber email department year')
      .sort({ registeredAt: -1 });

    res.status(200).json({
      success: true,
      total: registrations.length,
      data: registrations,
    });
  } catch (error: unknown) {
    next(error as Error);
  }
};

/**
 * Return all registrations for the specified student,
 * populating event fields (title, startDate, endDate, status, venueId).
 * Route: GET /api/students/:studentId/registrations
 * Status: 200 OK
 */
export const getStudentRegistrations = async (
  req: Request<{ studentId: string }>,
  res: Response<RegistrationResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const { studentId } = req.params;

    const registrations: IRegistration[] = await Registration.find({ studentId })
      .populate('eventId', 'title startDate endDate status venueId')
      .sort({ registeredAt: -1 });

    res.status(200).json({
      success: true,
      total: registrations.length,
      data: registrations,
    });
  } catch (error: unknown) {
    next(error as Error);
  }
};

/**
 * Soft-cancel a registration by updating status to 'cancelled'.
 * Route: PATCH /api/registrations/:id/cancel
 * Status: 200 OK | 404 Not Found
 */
export const cancelRegistration = async (
  req: Request<{ id: string }>,
  res: Response<RegistrationResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const registration: IRegistration | null = await Registration.findByIdAndUpdate(
      req.params.id,
      { status: 'cancelled' },
      { new: true, runValidators: true }
    );

    if (!registration) {
      return next(new AppError('Registration not found', 404));
    }

    res.status(200).json({
      success: true,
      message: 'Registration cancelled successfully',
      data: registration,
    });
  } catch (error: unknown) {
    next(error as Error);
  }
};

/**
 * Marks attendance for a registration by updating status to 'attended'.
 * Route: PATCH /api/registrations/:id/attend
 * Status: 200 OK | 404 Not Found
 */
export const markAttendance = async (
  req: Request<{ id: string }>,
  res: Response<RegistrationResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const registration: IRegistration | null = await Registration.findByIdAndUpdate(
      req.params.id,
      { status: 'attended' },
      { new: true, runValidators: true }
    );

    if (!registration) {
      return next(new AppError('Registration not found', 404));
    }

    res.status(200).json({
      success: true,
      message: 'Attendance recorded successfully',
      data: registration,
    });
  } catch (error: unknown) {
    next(error as Error);
  }
};

/**
 * List all registrations with optional query filters.
 * Status: 200 OK
 */
export const getRegistrations = async (
  req: Request<{}, {}, {}, RegistrationFilterQuery>,
  res: Response<RegistrationResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const filter: Record<string, unknown> = {};

    if (req.query.eventId) {
      filter.eventId = req.query.eventId;
    }
    if (req.query.studentId) {
      filter.studentId = req.query.studentId;
    }
    if (req.query.status) {
      filter.status = req.query.status;
    }

    const registrations: IRegistration[] = await Registration.find(filter)
      .populate('studentId', 'fullName rollNumber email department year')
      .populate('eventId', 'title startDate endDate status venueId')
      .sort({ registeredAt: -1 });

    res.status(200).json({
      success: true,
      total: registrations.length,
      data: registrations,
    });
  } catch (error: unknown) {
    next(error as Error);
  }
};
