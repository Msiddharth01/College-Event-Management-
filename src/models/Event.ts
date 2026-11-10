import { Schema, model, Document, Model, Types } from 'mongoose';

export type EventStatus = 'upcoming' | 'ongoing' | 'completed' | 'cancelled';

export interface IEvent extends Document {
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  capacity: number;
  status: EventStatus;
  organizerId: Types.ObjectId;
  venueId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const eventSchema: Schema<IEvent> = new Schema<IEvent>(
  {
    title: {
      type: String,
      required: [true, 'Event title is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Event description is required'],
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
      validate: {
        validator: function (this: IEvent, value: Date): boolean {
          if (!this.startDate || !value) {
            return true;
          }
          return value.getTime() > this.startDate.getTime();
        },
        message: 'End date must be greater than start date',
      },
    },
    capacity: {
      type: Number,
      required: [true, 'Capacity is required'],
      min: [1, 'Capacity must be at least 1'],
    },
    status: {
      type: String,
      enum: {
        values: ['upcoming', 'ongoing', 'completed', 'cancelled'],
        message: '{VALUE} is not a valid event status',
      },
      default: 'upcoming',
    },
    organizerId: {
      type: Schema.Types.ObjectId,
      ref: 'Organizer',
      required: [true, 'Organizer ID is required'],
    },
    venueId: {
      type: Schema.Types.ObjectId,
      ref: 'Venue',
      required: [true, 'Venue ID is required'],
    },
  },
  {
    timestamps: true,
  }
);

export const Event: Model<IEvent> = model<IEvent>('Event', eventSchema);
