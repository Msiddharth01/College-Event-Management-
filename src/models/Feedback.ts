import { Schema, model, Document, Model, Types } from 'mongoose';

export interface IFeedback extends Document {
  eventId: Types.ObjectId;
  studentId: Types.ObjectId;
  rating: number;
  comment: string;
  createdAt: Date;
}

const feedbackSchema: Schema<IFeedback> = new Schema<IFeedback>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: [true, 'Event ID is required'],
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student ID is required'],
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be between 1 and 5'],
      max: [5, 'Rating must be between 1 and 5'],
    },
    comment: {
      type: String,
      trim: true,
      maxlength: [500, 'Comment cannot exceed 500 characters'],
      default: '',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

// Compound unique index enforces one feedback submission per student per event
feedbackSchema.index({ eventId: 1, studentId: 1 }, { unique: true });

export const Feedback: Model<IFeedback> = model<IFeedback>('Feedback', feedbackSchema);

