import { Schema, model, Document, Model, Types } from 'mongoose';

export type RegistrationStatus = 'registered' | 'waitlisted' | 'cancelled' | 'attended';

export interface IRegistration extends Document {
  studentId: Types.ObjectId;
  eventId: Types.ObjectId;
  status: RegistrationStatus;
  waitlistPosition: number | null;
  registeredAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const registrationSchema: Schema<IRegistration> = new Schema<IRegistration>(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student ID is required'],
    },
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: [true, 'Event ID is required'],
    },
    status: {
      type: String,
      enum: {
        values: ['registered', 'waitlisted', 'cancelled', 'attended'],
        message: '{VALUE} is not a valid registration status',
      },
      default: 'registered',
    },
    waitlistPosition: {
      type: Number,
      default: null,
    },
    registeredAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Critical Integrity Rule: Compound unique index prevents duplicate registration for the same event by the same student
registrationSchema.index({ studentId: 1, eventId: 1 }, { unique: true });

export const Registration: Model<IRegistration> = model<IRegistration>(
  'Registration',
  registrationSchema
);
