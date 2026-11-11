import { Request, Response, NextFunction } from 'express';
import { Feedback, IFeedback } from '../models/Feedback';
import { Event } from '../models/Event';
import { Student } from '../models/Student';
import { Registration } from '../models/Registration';
import { AppError, isDuplicateKeyError } from '../middleware/errorHandler';

export interface SubmitFeedbackDTO {
  eventId: string;
  studentId?: string;
  rating: number;
  comment?: string;
}

export interface FeedbackResponse {
  success: boolean;
  data: IFeedback | IFeedback[];
  message?: string;
  total?: number;
  averageRating?: number;
}

/**
 * Student submits post-event rating (1-5) and comment.
 * Enforces that student registered for or attended the event and allows max 1 feedback per student per event.
 * Route: POST /api/feedback
 * Status: 201 Created | 400 Bad Request | 404 Not Found | 409 Conflict
 */
export const submitFeedback = async (
  req: Request<{}, {}, SubmitFeedbackDTO>,
  res: Response<FeedbackResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const resolvedStudentId = req.body.studentId || req.userId;
    const { eventId, rating, comment } = req.body;

    if (!resolvedStudentId || !eventId || rating === undefined || rating === null) {
      return next(new AppError('eventId, studentId, and rating are required fields', 400));
    }

    const numericRating = Number(rating);
    if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
      return next(new AppError('Rating must be a number between 1 and 5', 400));
    }

    // Validate existence of Student and Event
    const [student, event] = await Promise.all([
      Student.findById(resolvedStudentId),
      Event.findById(eventId),
    ]);

    if (!student) {
      return next(new AppError('Student not found', 404));
    }
    if (!event) {
      return next(new AppError('Event not found', 404));
    }

    // Validate student participated (registered or attended)
    const eligibleRegistration = await Registration.findOne({
      eventId,
      studentId: resolvedStudentId,
      status: { $in: ['attended', 'registered'] },
    });

    if (!eligibleRegistration) {
      return next(
        new AppError(
          'Feedback can only be submitted by students who attended or registered for this event',
          400
        )
      );
    }

    try {
      const feedback = await Feedback.create({
        eventId,
        studentId: resolvedStudentId,
        rating: numericRating,
        comment: comment ? comment.trim() : '',
      });

      res.status(201).json({
        success: true,
        message: 'Thank you! Your feedback has been recorded.',
        data: feedback,
      });
    } catch (createErr: unknown) {
      if (isDuplicateKeyError(createErr)) {
        return next(new AppError('You have already submitted feedback for this event', 409));
      }
      throw createErr;
    }
  } catch (error: unknown) {
    if (isDuplicateKeyError(error)) {
      return next(new AppError('You have already submitted feedback for this event', 409));
    }
    next(error as Error);
  }
};

/**
 * Fetches comments and ratings list for a specific event.
 * Route: GET /api/feedback/event/:eventId
 * Status: 200 OK
 */
export const getEventFeedback = async (
  req: Request<{ eventId: string }>,
  res: Response<FeedbackResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const { eventId } = req.params;

    const reviews = await Feedback.find({ eventId })
      .populate('studentId', 'fullName rollNumber department')
      .sort({ createdAt: -1 });

    const total = reviews.length;
    const averageRating =
      total > 0
        ? Math.round((reviews.reduce((sum, item) => sum + item.rating, 0) / total) * 100) / 100
        : 0;

    res.status(200).json({
      success: true,
      total,
      averageRating,
      data: reviews,
    });
  } catch (error: unknown) {
    next(error as Error);
  }
};

/**
 * Fetches all feedback records submitted by a specific student.
 * Route: GET /api/feedback/student/:studentId
 * Status: 200 OK
 */
export const getStudentFeedback = async (
  req: Request<{ studentId: string }>,
  res: Response<FeedbackResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const { studentId } = req.params;
    const reviews = await Feedback.find({ studentId }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      total: reviews.length,
      data: reviews,
    });
  } catch (error: unknown) {
    next(error as Error);
  }
};

