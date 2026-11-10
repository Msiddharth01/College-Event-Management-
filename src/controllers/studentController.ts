import { Request, Response, NextFunction } from 'express';
import { Student, IStudent } from '../models/Student';
import { AppError } from '../middleware/errorHandler';

export interface CreateStudentDTO {
  fullName: string;
  rollNumber: string;
  email: string;
  department: string;
  year: number;
}

export interface UpdateStudentDTO {
  fullName?: string;
  rollNumber?: string;
  email?: string;
  department?: string;
  year?: number;
}

export interface StudentResponse {
  success: boolean;
  data: IStudent | IStudent[];
  message?: string;
  total?: number;
}

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

/**
 * List students with optional search/filtering by roll number, email, or general search.
 * Status: 200 OK
 */
export const getStudents = async (
  req: Request<{}, {}, {}, { rollNumber?: string; email?: string; department?: string; year?: string; search?: string }>,
  res: Response<StudentResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const filter: Record<string, unknown> = {};

    if (req.query.rollNumber) {
      filter.rollNumber = req.query.rollNumber.trim().toUpperCase();
    }

    if (req.query.email) {
      filter.email = req.query.email.trim().toLowerCase();
    }

    if (req.query.department) {
      filter.department = req.query.department.trim();
    }

    if (req.query.year) {
      const yearNum: number = parseInt(req.query.year, 10);
      if (!isNaN(yearNum)) {
        filter.year = yearNum;
      }
    }

    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search.trim(), 'i');
      filter.$or = [
        { fullName: searchRegex },
        { rollNumber: searchRegex },
        { email: searchRegex },
      ];
    }

    const students: IStudent[] = await Student.find(filter).sort({ rollNumber: 1 });

    res.status(200).json({
      success: true,
      total: students.length,
      data: students,
    });
  } catch (error: unknown) {
    next(error as Error);
  }
};

export const getAllStudents = getStudents;

/**
 * Fetch student profile by MongoDB ID.
 * Status: 200 OK | 404 Not Found
 */
export const getStudentById = async (
  req: Request<{ id: string }>,
  res: Response<StudentResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const student: IStudent | null = await Student.findById(req.params.id);
    if (!student) {
      return next(new AppError('Student not found', 404));
    }

    res.status(200).json({
      success: true,
      data: student,
    });
  } catch (error: unknown) {
    next(error as Error);
  }
};

/**
 * Fetch a student by unique uppercase roll number.
 * Status: 200 OK | 404 Not Found
 */
export const getStudentByRollNumber = async (
  req: Request<{ rollNumber: string }>,
  res: Response<StudentResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const rollNumber: string = req.params.rollNumber.trim().toUpperCase();
    const student: IStudent | null = await Student.findOne({ rollNumber });

    if (!student) {
      return next(new AppError(`Student with roll number ${rollNumber} not found`, 404));
    }

    res.status(200).json({
      success: true,
      data: student,
    });
  } catch (error: unknown) {
    next(error as Error);
  }
};

/**
 * Register a student profile with uniqueness checks.
 * Status: 201 Created | 400 Bad Request | 409 Conflict
 */
export const createStudent = async (
  req: Request<{}, {}, CreateStudentDTO>,
  res: Response<StudentResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const { fullName, rollNumber, email, department, year } = req.body;

    if (!fullName || !rollNumber || !email || !department || year === undefined) {
      return next(new AppError('Full name, roll number, email, department, and year are required fields', 400));
    }

    const trimmedRoll: string = rollNumber.trim().toUpperCase();
    const trimmedEmail: string = email.trim().toLowerCase();

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      return next(new AppError('Please provide a valid email address format', 400));
    }

    if (typeof year !== 'number' || year < 1 || year > 5) {
      return next(new AppError('Year must be an integer between 1 and 5', 400));
    }

    // Uniqueness checks: rollNumber and email
    const existingRoll = await Student.findOne({ rollNumber: trimmedRoll });
    if (existingRoll) {
      return next(new AppError(`Student with roll number "${trimmedRoll}" already exists`, 409));
    }

    const existingEmail = await Student.findOne({ email: trimmedEmail });
    if (existingEmail) {
      return next(new AppError(`Student with email "${trimmedEmail}" already exists`, 409));
    }

    const student: IStudent = await Student.create({
      fullName: fullName.trim(),
      rollNumber: trimmedRoll,
      email: trimmedEmail,
      department: department.trim(),
      year,
    });

    res.status(201).json({
      success: true,
      message: 'Student registered successfully',
      data: student,
    });
  } catch (error: unknown) {
    next(error as Error);
  }
};

/**
 * Update existing student details.
 * Status: 200 OK | 400 Bad Request | 404 Not Found | 409 Conflict
 */
export const updateStudent = async (
  req: Request<{ id: string }, {}, UpdateStudentDTO>,
  res: Response<StudentResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const student: IStudent | null = await Student.findById(req.params.id);
    if (!student) {
      return next(new AppError('Student not found', 404));
    }

    const { fullName, rollNumber, email, department, year } = req.body;

    // Check rollNumber uniqueness if updated
    if (rollNumber) {
      const trimmedRoll = rollNumber.trim().toUpperCase();
      if (trimmedRoll !== student.rollNumber) {
        const duplicateRoll = await Student.findOne({ rollNumber: trimmedRoll, _id: { $ne: student._id } });
        if (duplicateRoll) {
          return next(new AppError(`Student with roll number "${trimmedRoll}" already exists`, 409));
        }
        student.rollNumber = trimmedRoll;
      }
    }

    // Check email uniqueness and validity if updated
    if (email) {
      const trimmedEmail = email.trim().toLowerCase();
      if (!EMAIL_REGEX.test(trimmedEmail)) {
        return next(new AppError('Please provide a valid email address format', 400));
      }
      if (trimmedEmail !== student.email) {
        const duplicateEmail = await Student.findOne({ email: trimmedEmail, _id: { $ne: student._id } });
        if (duplicateEmail) {
          return next(new AppError(`Student with email "${trimmedEmail}" already exists`, 409));
        }
        student.email = trimmedEmail;
      }
    }

    if (fullName) {
      student.fullName = fullName.trim();
    }

    if (department) {
      student.department = department.trim();
    }

    if (year !== undefined) {
      if (typeof year !== 'number' || year < 1 || year > 5) {
        return next(new AppError('Year must be an integer between 1 and 5', 400));
      }
      student.year = year;
    }

    await student.save();

    res.status(200).json({
      success: true,
      message: 'Student updated successfully',
      data: student,
    });
  } catch (error: unknown) {
    next(error as Error);
  }
};
