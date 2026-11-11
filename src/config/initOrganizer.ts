import bcrypt from 'bcryptjs';
import { Organizer, IOrganizer } from '../models/Organizer';
import { User } from '../models/User';

export const FIXED_ORGANIZER_CREDENTIALS = {
  name: 'Campus Event Society',
  email: 'organizer@college.edu',
  password: 'organizer123',
  department: 'Student Affairs & Campus Activities',
} as const;

/**
 * Idempotently ensures the fixed institutional Organizer account
 * ("Campus Event Society" / organizer@college.edu) exists in MongoDB.
 * Safe to invoke on backend startup and seeding without duplicating records.
 */
export const ensureDefaultOrganizer = async (): Promise<IOrganizer> => {
  const { name, email, password, department } = FIXED_ORGANIZER_CREDENTIALS;

  // 1. Upsert Organizer profile matched by unique email
  const organizer = await Organizer.findOneAndUpdate(
    { email },
    {
      $set: {
        name,
        email,
        department,
      },
      $setOnInsert: {
        contactNumber: 'N/A',
      },
    },
    { upsert: true, new: true, runValidators: true }
  );

  // 2. Upsert corresponding User authentication record with bcrypt-hashed password
  const existingUser = await User.findOne({ email }).select('+password');
  const needsPasswordSync =
    !existingUser ||
    !existingUser.password ||
    !(await bcrypt.compare(password, existingUser.password));

  const userUpdates: Record<string, unknown> = {
    name,
    email,
    role: 'organizer',
    department,
  };

  if (needsPasswordSync) {
    userUpdates.password = await bcrypt.hash(password, 10);
  }

  await User.findOneAndUpdate(
    { email },
    { $set: userUpdates },
    { upsert: true, new: true, runValidators: true }
  );

  return organizer;
};

