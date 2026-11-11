import { Request, Response, NextFunction } from 'express';
import { Registration, IRegistration, RegistrationStatus } from '../models/Registration';
import { Event, IEvent } from '../models/Event';
import { Student } from '../models/Student';
import { AppError, isDuplicateKeyError } from '../middleware/errorHandler';
import { emitSeatUpdated } from '../config/socket';

export interface CreateRegistrationDTO {
  studentId?: string;
  eventId: string;
  joinWaitlist?: boolean;
}

export interface RegistrationResponse {
  success: boolean;
  data: IRegistration | IRegistration[];
  message?: string;
  total?: number;
  status?: RegistrationStatus;
  waitlistPosition?: number | null;
  promotedRegistration?: IRegistration | null;
}

export interface RegistrationFilterQuery {
  eventId?: string;
  studentId?: string;
  status?: RegistrationStatus;
}

/**
 * Helper: Calculates live active & waitlisted counts for an event and emits 'seat_updated' via Socket.io.
 */
const broadcastEventSeatUpdate = async (
  eventId: string,
  knownCapacity?: number
): Promise<void> => {
  try {
    let capacity = knownCapacity;
    if (capacity === undefined) {
      const ev = await Event.findById(eventId).select('capacity');
      capacity = ev ? ev.capacity : 0;
    }

    const [registeredCount, waitlistCount] = await Promise.all([
      Registration.countDocuments({
        eventId,
        status: { $in: ['registered', 'attended'] },
      }),
      Registration.countDocuments({
        eventId,
        status: 'waitlisted',
      }),
    ]);

    emitSeatUpdated({
      eventId: eventId.toString(),
      registeredCount,
      availableSeats: Math.max(0, capacity - registeredCount),
      waitlistCount,
    });
  } catch (err) {
    console.warn('Failed to emit seat_updated socket event:', err);
  }
};

/**
 * Helper: Recalculates sequential 1..N waitlist positions for an event's remaining queue.
 */
const renumberEventWaitlist = async (eventId: string): Promise<void> => {
  const remainingQueue = await Registration.find({
    eventId,
    status: 'waitlisted',
  }).sort({ waitlistPosition: 1, createdAt: 1 });

  const ops = remainingQueue
    .map((doc, idx) => {
      const targetPos = idx + 1;
      if (doc.waitlistPosition !== targetPos) {
        return {
          updateOne: {
            filter: { _id: doc._id },
            update: { $set: { waitlistPosition: targetPos } },
          },
        };
      }
      return null;
    })
    .filter((op): op is NonNullable<typeof op> => op !== null);

  if (ops.length > 0) {
    await Registration.bulkWrite(ops);
  }
};

/**
 * Shared internal logic for adding a student to an event waitlist.
 */
const addToEventWaitlist = async (
  studentId: string,
  event: IEvent,
  existingRecord: IRegistration | null
): Promise<{ registration: IRegistration; position: number }> => {
  const highestWaitlisted = await Registration.findOne({
    eventId: event._id,
    status: 'waitlisted',
  })
    .sort({ waitlistPosition: -1, createdAt: -1 })
    .select('waitlistPosition');

  const nextPosition = (highestWaitlisted?.waitlistPosition ?? 0) + 1;

  let registration: IRegistration;
  if (existingRecord && existingRecord.status === 'cancelled') {
    existingRecord.status = 'waitlisted';
    existingRecord.waitlistPosition = nextPosition;
    existingRecord.registeredAt = new Date();
    registration = await existingRecord.save();
  } else {
    registration = await Registration.create({
      studentId,
      eventId: event._id,
      status: 'waitlisted',
      waitlistPosition: nextPosition,
      registeredAt: new Date(),
    });
  }

  await broadcastEventSeatUpdate(event._id.toString(), event.capacity);
  return { registration, position: nextPosition };
};

interface RegistrationContextResult {
  studentId: string;
  event: IEvent;
  existingRecord: IRegistration | null;
  activeRegistrationsCount: number;
}

/**
 * Shared validation helper for both direct registration and waitlist enrollment.
 * Enforces existence, lifecycle status, concluded timestamp check, duplicate prevention,
 * and current capacity count.
 */
const validateRegistrationContext = async (
  studentId: string | undefined,
  eventId: string | undefined
): Promise<RegistrationContextResult> => {
  if (!studentId || !eventId) {
    throw new AppError('Both studentId and eventId are required fields', 400);
  }

  const [student, event] = await Promise.all([
    Student.findById(studentId),
    Event.findById(eventId),
  ]);

  if (!student) {
    throw new AppError('Student not found', 404);
  }
  if (!event) {
    throw new AppError('Event not found', 404);
  }

  if (event.status === 'completed' || event.status === 'cancelled') {
    throw new AppError('Event is not open for registration', 400);
  }

  const now = new Date();
  const eventEnd = new Date(event.endDate || event.startDate);
  if (now > eventEnd) {
    throw new AppError('Registration is closed. This event has already concluded.', 400);
  }

  const [existingRecord, activeRegistrationsCount] = await Promise.all([
    Registration.findOne({ studentId, eventId }),
    Registration.countDocuments({
      eventId,
      status: { $in: ['registered', 'attended'] },
    }),
  ]);

  if (existingRecord) {
    if (existingRecord.status === 'registered' || existingRecord.status === 'attended') {
      throw new AppError('Student is already registered for this event', 409);
    }
    if (existingRecord.status === 'waitlisted') {
      throw new AppError('Student is already on the waitlist for this event', 409);
    }
  }

  return { studentId, event, existingRecord, activeRegistrationsCount };
};

/**
 * Shared helper to create or reactivate a confirmed ('registered') seat and broadcast live updates.
 */
const confirmSeatRegistration = async (
  studentId: string,
  event: IEvent,
  existingRecord: IRegistration | null
): Promise<IRegistration> => {
  let registration: IRegistration;
  if (existingRecord && existingRecord.status === 'cancelled') {
    existingRecord.status = 'registered';
    existingRecord.waitlistPosition = null;
    existingRecord.registeredAt = new Date();
    registration = await existingRecord.save();
  } else {
    registration = await Registration.create({
      studentId,
      eventId: event._id,
      status: 'registered',
      waitlistPosition: null,
      registeredAt: new Date(),
    });
  }

  await broadcastEventSeatUpdate(event._id.toString(), event.capacity);
  return registration;
};

/**
 * Registers a student for an event.
 * Supports optional `joinWaitlist: true` when event capacity is full.
 * Status: 201 Created | 400 Bad Request | 404 Not Found | 409 Conflict
 */
export const createRegistration = async (
  req: Request<{}, {}, CreateRegistrationDTO>,
  res: Response<RegistrationResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const resolvedStudentId = req.body.studentId || req.userId;
    const { eventId, joinWaitlist: allowWaitlist } = req.body;

    const { studentId, event, existingRecord, activeRegistrationsCount } =
      await validateRegistrationContext(resolvedStudentId, eventId);

    if (activeRegistrationsCount >= event.capacity) {
      if (allowWaitlist) {
        const { registration, position } = await addToEventWaitlist(
          studentId,
          event,
          existingRecord
        );
        res.status(201).json({
          success: true,
          status: 'waitlisted',
          waitlistPosition: position,
          message: `Event is full. Added to waitlist at position #${position}`,
          data: registration,
        });
        return;
      }

      return next(new AppError('Event has reached maximum capacity', 400));
    }

    try {
      const registration = await confirmSeatRegistration(studentId, event, existingRecord);

      res.status(201).json({
        success: true,
        status: 'registered',
        waitlistPosition: null,
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
 * Adds a student to the waitlist for a full event.
 * Route: POST /api/registrations/waitlist
 * Status: 201 Created | 400 Bad Request | 404 Not Found | 409 Conflict
 */
export const joinWaitlist = async (
  req: Request<{}, {}, CreateRegistrationDTO>,
  res: Response<RegistrationResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const resolvedStudentId = req.body.studentId || req.userId;
    const { eventId } = req.body;

    const { studentId, event, existingRecord, activeRegistrationsCount } =
      await validateRegistrationContext(resolvedStudentId, eventId);

    // If a seat is actually available when joining waitlist, confirm directly as 'registered'
    if (activeRegistrationsCount < event.capacity) {
      const registration = await confirmSeatRegistration(studentId, event, existingRecord);

      res.status(201).json({
        success: true,
        status: 'registered',
        waitlistPosition: null,
        message: 'A seat became available! Student registered directly.',
        data: registration,
      });
      return;
    }

    const { registration, position } = await addToEventWaitlist(
      studentId,
      event,
      existingRecord
    );

    res.status(201).json({
      success: true,
      status: 'waitlisted',
      waitlistPosition: position,
      message: `Joined waitlist at position #${position}`,
      data: registration,
    });
  } catch (error: unknown) {
    if (isDuplicateKeyError(error)) {
      return next(new AppError('Student already has a registration or waitlist entry for this event', 409));
    }
    next(error as Error);
  }
};

/**
 * Return all registrations for the specified event,
 * populating student fields (fullName, rollNumber, email, department, year).
 * Route: GET /api/registrations/event/:eventId
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
      .sort({ waitlistPosition: 1, registeredAt: -1 });

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
 * populating event fields (title, startDate, endDate, status, capacity, venueId).
 * Route: GET /api/registrations/student/:studentId
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
      .populate({
        path: 'eventId',
        select: 'title startDate endDate status capacity venueId',
        populate: { path: 'venueId', select: 'name location' },
      })
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
 * Cancels a registration, automatically promotes the next waitlisted student if a seat opened,
 * recalculates waitlist positions, and broadcasts live 'seat_updated' via Socket.io.
 * Routes: DELETE /api/registrations/:id | PATCH /api/registrations/:id/cancel
 * Status: 200 OK | 404 Not Found
 */
export const cancelRegistration = async (
  req: Request<{ id: string }>,
  res: Response<RegistrationResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const registration: IRegistration | null = await Registration.findById(req.params.id);

    if (!registration) {
      return next(new AppError('Registration not found', 404));
    }

    const previousStatus = registration.status;
    const eventIdStr = registration.eventId.toString();

    if (previousStatus === 'cancelled') {
      res.status(200).json({
        success: true,
        message: 'Registration is already cancelled',
        data: registration,
      });
      return;
    }

    registration.status = 'cancelled';
    registration.waitlistPosition = null;
    await registration.save();

    let promotedRegistration: IRegistration | null = null;

    // Auto-Promotion Engine: if a confirmed seat ('registered') opened, promote first waitlisted student
    if (previousStatus === 'registered') {
      const nextWaitlisted = await Registration.findOne({
        eventId: eventIdStr,
        status: 'waitlisted',
      }).sort({ waitlistPosition: 1, createdAt: 1 });

      if (nextWaitlisted) {
        nextWaitlisted.status = 'registered';
        nextWaitlisted.waitlistPosition = null;
        nextWaitlisted.registeredAt = new Date();
        promotedRegistration = await nextWaitlisted.save();
        await renumberEventWaitlist(eventIdStr);
      }
    } else if (previousStatus === 'waitlisted') {
      await renumberEventWaitlist(eventIdStr);
    }

    await broadcastEventSeatUpdate(eventIdStr);

    res.status(200).json({
      success: true,
      message: promotedRegistration
        ? 'Registration cancelled and next waitlisted student automatically promoted'
        : 'Registration cancelled successfully',
      data: registration,
      promotedRegistration,
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
      { status: 'attended', waitlistPosition: null },
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
