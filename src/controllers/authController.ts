import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser, UserRole } from '../models/User';
import { Student } from '../models/Student';
import { Organizer } from '../models/Organizer';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import { ensureDefaultOrganizer, FIXED_ORGANIZER_CREDENTIALS } from '../config/initOrganizer';

export interface RegisterDTO {
  fullName?: string;
  name?: string;
  rollNumber: string;
  email: string;
  password: string;
  department: string;
  year: number;
  role?: UserRole;
  studentId?: string;
}

export interface RegisterOrganizerDTO {
  name: string;
  email: string;
  department: string;
  password: string;
  contactNumber?: string;
}

export interface LoginDTO {
  email: string;
  password?: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  token?: string;
  user?: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    department?: string;
    rollNumber?: string;
    year?: number;
  };
  data?: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    department?: string;
    studentId?: string;
    rollNumber?: string;
    year?: number;
  };
}

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

/**
 * Helper to generate JWT token for a user.
 */
const signToken = (id: string, role: UserRole): string => {
  const secret: string = process.env.JWT_SECRET || 'college_events_jwt_secret_key';
  return jwt.sign({ id, userId: id, role }, secret, { expiresIn: '7d' });
};

/**
 * Register a new student account.
 * Status: 201 Created | 400 Bad Request | 409 Conflict
 */
export const register = async (
  req: Request<{}, {}, RegisterDTO>,
  res: Response<AuthResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const { fullName, name, rollNumber, email, password, department, year } = req.body;

    const studentName = (fullName || name)?.trim();
    const trimmedRollNumber = rollNumber?.trim().toUpperCase();
    const trimmedEmail = email?.trim().toLowerCase();
    const trimmedDept = department?.trim();
    const parsedYear = Number(year);

    if (!studentName || !trimmedRollNumber || !trimmedEmail || !trimmedDept || !year || !password) {
      return next(
        new AppError('Full name, roll number, email, department, year, and password are required', 400)
      );
    }

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      return next(new AppError('Please provide a valid email address format', 400));
    }

    if (password.length < 6) {
      return next(new AppError('Password must be at least 6 characters long', 400));
    }

    if (isNaN(parsedYear) || parsedYear < 1 || parsedYear > 5) {
      return next(new AppError('Year of study must be a number between 1 and 5', 400));
    }

    // Check if student with email already exists
    const existingStudentByEmail = await Student.findOne({ email: trimmedEmail });
    const existingUserByEmail = await User.findOne({ email: trimmedEmail });
    if (existingStudentByEmail || existingUserByEmail) {
      return next(new AppError(`A user with email "${trimmedEmail}" already exists`, 409));
    }

    // Check if student with rollNumber already exists
    const existingStudentByRoll = await Student.findOne({ rollNumber: trimmedRollNumber });
    if (existingStudentByRoll) {
      return next(new AppError(`A student with roll number "${trimmedRollNumber}" already exists`, 409));
    }

    // 1. Create Student record
    const newStudent = await Student.create({
      fullName: studentName,
      rollNumber: trimmedRollNumber,
      email: trimmedEmail,
      department: trimmedDept,
      year: parsedYear,
    });

    // 2. Create User account with password hashing
    await User.create({
      name: studentName,
      email: trimmedEmail,
      password, // hashed by User pre-save hook
      role: 'student',
      department: trimmedDept,
      studentId: newStudent._id.toString(),
    });

    // 3. Issue signed JWT
    const secret: string = process.env.JWT_SECRET || 'college_events_jwt_secret_key';
    const token = jwt.sign(
      {
        userId: newStudent._id.toString(),
        id: newStudent._id.toString(),
        role: 'student',
        name: studentName,
        email: trimmedEmail,
      },
      secret,
      { expiresIn: '7d' }
    );

    const userPayload = {
      id: newStudent._id.toString(),
      name: newStudent.fullName,
      email: newStudent.email,
      role: 'student' as const,
      department: newStudent.department,
      rollNumber: newStudent.rollNumber,
      year: newStudent.year,
    };

    res.status(201).json({
      success: true,
      message: 'Student registered successfully',
      token,
      user: userPayload,
      data: userPayload,
    });
  } catch (error: unknown) {
    next(error as Error);
  }
};

/**
 * Register a new organizer account.
 * Status: 201 Created | 400 Bad Request | 409 Conflict
 */
export const registerOrganizer = async (
  req: Request<{}, {}, RegisterOrganizerDTO>,
  res: Response<AuthResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, email, department, password, contactNumber } = req.body;

    const trimmedName = name?.trim();
    const trimmedEmail = email?.trim().toLowerCase();
    const trimmedDept = department?.trim();

    if (!trimmedName || !trimmedEmail || !trimmedDept || !password) {
      return next(
        new AppError('Organization name, contact email, department/sponsor, and password are required', 400)
      );
    }

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      return next(new AppError('Please provide a valid email address format', 400));
    }

    if (password.length < 6) {
      return next(new AppError('Password must be at least 6 characters long', 400));
    }

    // Check if organizer or user with email already exists
    const existingOrgByEmail = await Organizer.findOne({ email: trimmedEmail });
    const existingUserByEmail = await User.findOne({ email: trimmedEmail });
    if (existingOrgByEmail || existingUserByEmail) {
      return next(new AppError(`An organizer or user with email "${trimmedEmail}" already exists`, 409));
    }

    // Check if organization with same name already exists (case-insensitive)
    const escapedName = trimmedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const existingOrgByName = await Organizer.findOne({
      name: { $regex: new RegExp(`^${escapedName}$`, 'i') },
    });
    if (existingOrgByName) {
      return next(new AppError(`An organization with name "${trimmedName}" already exists`, 409));
    }

    // 1. Create Organizer record
    const newOrganizer = await Organizer.create({
      name: trimmedName,
      email: trimmedEmail,
      department: trimmedDept,
      contactNumber: contactNumber?.trim() || 'N/A',
    });

    // 2. Create User account with password hashing
    await User.create({
      name: trimmedName,
      email: trimmedEmail,
      password, // hashed by User pre-save hook
      role: 'organizer',
      department: trimmedDept,
    });

    // 3. Issue signed JWT
    const secret: string = process.env.JWT_SECRET || 'college_events_jwt_secret_key';
    const token = jwt.sign(
      {
        userId: newOrganizer._id.toString(),
        id: newOrganizer._id.toString(),
        role: 'organizer',
        name: trimmedName,
        email: trimmedEmail,
      },
      secret,
      { expiresIn: '7d' }
    );

    const userPayload = {
      id: newOrganizer._id.toString(),
      name: newOrganizer.name,
      email: newOrganizer.email,
      role: 'organizer' as const,
      department: newOrganizer.department,
    };

    res.status(201).json({
      success: true,
      message: 'Organizer registered successfully',
      token,
      user: userPayload,
      data: userPayload,
    });
  } catch (error: unknown) {
    next(error as Error);
  }
};

/**
 * Log in with existing user credentials and receive JWT token.
 * Accepts { email, password } or { email } for seeded demo accounts.
 * Returns HTTP 404 if user not found, HTTP 401 if invalid password.
 * Status: 200 OK | 400 Bad Request | 401 Unauthorized | 404 Not Found
 */
export const login = async (
  req: Request<{}, {}, LoginDTO>,
  res: Response<AuthResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email) {
      return next(new AppError('Please provide an email address', 400));
    }

    const trimmedEmail = email.trim().toLowerCase();

    let resolvedId: string | undefined;
    let resolvedName: string | undefined;
    let resolvedRole: 'student' | 'organizer' | undefined;
    let resolvedDept: string | undefined;
    let resolvedRollNumber: string | undefined;
    let resolvedYear: number | undefined;

    // 0. Guarantee fixed institutional Organizer ("organizer@college.edu") can always authenticate
    if (trimmedEmail === FIXED_ORGANIZER_CREDENTIALS.email) {
      if (!password) {
        return next(new AppError('Please provide your password.', 401));
      }

      const organizerDoc = await ensureDefaultOrganizer();
      const fixedUser = await User.findOne({ email: trimmedEmail }).select('+password');
      const isMatch = fixedUser
        ? await fixedUser.comparePassword(password)
        : password === FIXED_ORGANIZER_CREDENTIALS.password;

      if (!isMatch) {
        return next(new AppError('Invalid password. Please check your credentials.', 401));
      }

      resolvedId = organizerDoc._id.toString();
      resolvedName = organizerDoc.name;
      resolvedRole = 'organizer';
      resolvedDept = organizerDoc.department;
    }

    // 1. Check if user exists in the User collection (contains hashed password)
    if (!resolvedRole) {
      const user = await User.findOne({ email: trimmedEmail }).select('+password');
      if (user) {
        if (user.password) {
          if (!password) {
            return next(new AppError('Please provide your password.', 401));
          }
          const isMatch: boolean = await user.comparePassword(password);
          if (!isMatch) {
            return next(new AppError('Invalid password. Please check your credentials.', 401));
          }
        }
        resolvedName = user.name;
        resolvedRole = user.role as 'student' | 'organizer';
        resolvedDept = user.department;
        resolvedId = user._id.toString();

        // If user is a student, attach their Student collection ID & metadata
        if (user.role === 'student') {
          const student = await Student.findOne({ email: trimmedEmail });
          if (student) {
            resolvedId = student._id.toString();
            resolvedRollNumber = student.rollNumber;
            resolvedYear = student.year;
          }
        } else if (user.role === 'organizer') {
          const organizer = await Organizer.findOne({ email: trimmedEmail });
          if (organizer) {
            resolvedId = organizer._id.toString();
          }
        }
      }
    }

    // 2. Check if student exists directly in Student collection (e.g. seeded accounts)
    if (!resolvedRole) {
      const student = await Student.findOne({ email: trimmedEmail });
      if (student) {
        resolvedId = student._id.toString();
        resolvedName = student.fullName;
        resolvedRole = 'student';
        resolvedDept = student.department;
        resolvedRollNumber = student.rollNumber;
        resolvedYear = student.year;
      }
    }

    // 3. Check if organizer exists directly in Organizer collection (e.g. seeded accounts)
    if (!resolvedRole) {
      const organizer = await Organizer.findOne({ email: trimmedEmail });
      if (organizer) {
        resolvedId = organizer._id.toString();
        resolvedName = organizer.name;
        resolvedRole = 'organizer';
        resolvedDept = organizer.department;
      }
    }

    // If user is not found anywhere -> return HTTP 404
    if (!resolvedId || !resolvedName || !resolvedRole) {
      return next(new AppError('User not found. Please register or check your email address.', 404));
    }

    const secret: string = process.env.JWT_SECRET || 'college_events_jwt_secret_key';
    const token = jwt.sign(
      {
        userId: resolvedId,
        id: resolvedId,
        role: resolvedRole,
        name: resolvedName,
        email: trimmedEmail,
      },
      secret,
      { expiresIn: '7d' }
    );

    const userProfile = {
      id: resolvedId,
      name: resolvedName,
      email: trimmedEmail,
      role: resolvedRole,
      department: resolvedDept,
      rollNumber: resolvedRollNumber,
      year: resolvedYear,
    };

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: userProfile,
      data: userProfile,
    });
  } catch (error: unknown) {
    next(error as Error);
  }
};

/**
 * Fetch profile details for the currently authenticated user.
 * Status: 200 OK | 401 Unauthorized
 */
export const getMe = async (
  req: AuthenticatedRequest,
  res: Response<AuthResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    res.status(200).json({
      success: true,
      data: {
        id: req.user._id.toString(),
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        department: req.user.department,
        studentId: req.user.studentId,
      },
    });
  } catch (error: unknown) {
    next(error as Error);
  }
};
