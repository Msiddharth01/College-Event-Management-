import { Request, Response, NextFunction } from 'express';
import { Organizer, IOrganizer } from '../models/Organizer';
import { AppError } from '../middleware/errorHandler';

export interface CreateOrganizerDTO {
  name: string;
  email: string;
  department: string;
  contactNumber: string;
}

export interface OrganizerResponse {
  success: boolean;
  data: IOrganizer | IOrganizer[];
  message?: string;
  total?: number;
}

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

/**
 * List all organizers.
 * Status: 200 OK
 */
export const getOrganizers = async (
  req: Request<{}, {}, {}, { department?: string }>,
  res: Response<OrganizerResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const filter: Record<string, unknown> = {};

    if (req.query.department) {
      filter.department = req.query.department;
    }

    const organizers: IOrganizer[] = await Organizer.find(filter).sort({ name: 1 });

    res.status(200).json({
      success: true,
      total: organizers.length,
      data: organizers,
    });
  } catch (error: unknown) {
    next(error as Error);
  }
};

export const getAllOrganizers = getOrganizers;

/**
 * Create a new organizer with email validation.
 * Status: 201 Created | 400 Bad Request | 409 Conflict
 */
export const createOrganizer = async (
  req: Request<{}, {}, CreateOrganizerDTO>,
  res: Response<OrganizerResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, email, department, contactNumber } = req.body;

    if (!name || !email || !department || !contactNumber) {
      return next(new AppError('Name, email, department, and contactNumber are required fields', 400));
    }

    const trimmedEmail: string = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      return next(new AppError('Please provide a valid email address format', 400));
    }

    // Check unique email conflict
    const existingOrganizer = await Organizer.findOne({ email: trimmedEmail });
    if (existingOrganizer) {
      return next(new AppError(`Organizer with email "${trimmedEmail}" already exists`, 409));
    }

    const organizer: IOrganizer = await Organizer.create({
      name: name.trim(),
      email: trimmedEmail,
      department: department.trim(),
      contactNumber: contactNumber.trim(),
    });

    res.status(201).json({
      success: true,
      message: 'Organizer created successfully',
      data: organizer,
    });
  } catch (error: unknown) {
    next(error as Error);
  }
};

/**
 * Fetch a single organizer by ID.
 * Status: 200 OK | 404 Not Found
 */
export const getOrganizerById = async (
  req: Request<{ id: string }>,
  res: Response<OrganizerResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const organizer: IOrganizer | null = await Organizer.findById(req.params.id);
    if (!organizer) {
      return next(new AppError('Organizer not found', 404));
    }

    res.status(200).json({
      success: true,
      data: organizer,
    });
  } catch (error: unknown) {
    next(error as Error);
  }
};
