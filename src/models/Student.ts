import { Schema, model, Document, Model } from 'mongoose';

export interface IStudent extends Document {
  fullName: string;
  rollNumber: string;
  email: string;
  department: string;
  year: number;
  createdAt: Date;
  updatedAt: Date;
}

const studentSchema: Schema<IStudent> = new Schema<IStudent>(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },
    rollNumber: {
      type: String,
      required: [true, 'Roll number is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email address is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true,
    },
    year: {
      type: Number,
      required: [true, 'Year of study is required'],
      min: [1, 'Year must be at least 1'],
      max: [5, 'Year cannot exceed 5'],
    },
  },
  {
    timestamps: true,
  }
);

export const Student: Model<IStudent> = model<IStudent>('Student', studentSchema);

