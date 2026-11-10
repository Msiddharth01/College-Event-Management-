import { Schema, model, Document, Model } from 'mongoose';

export interface IVenue extends Document {
  name: string;
  location: string;
  capacity: number;
  facilities: string[];
  createdAt: Date;
  updatedAt: Date;
}

const venueSchema: Schema<IVenue> = new Schema<IVenue>(
  {
    name: {
      type: String,
      required: [true, 'Venue name is required'],
      unique: true,
      trim: true,
    },
    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true,
    },
    capacity: {
      type: Number,
      required: [true, 'Capacity is required'],
      min: [1, 'Capacity must be at least 1'],
    },
    facilities: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

export const Venue: Model<IVenue> = model<IVenue>('Venue', venueSchema);

