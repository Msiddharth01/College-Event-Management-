import { Schema, model, Document, Model } from 'mongoose';

export interface IOrganizer extends Document {
  name: string;
  email: string;
  department: string;
  contactNumber: string;
  createdAt: Date;
  updatedAt: Date;
}

const organizerSchema: Schema<IOrganizer> = new Schema<IOrganizer>(
  {
    name: {
      type: String,
      required: [true, 'Organizer name is required'],
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
    contactNumber: {
      type: String,
      required: false,
      default: 'N/A',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Organizer: Model<IOrganizer> = model<IOrganizer>('Organizer', organizerSchema);

