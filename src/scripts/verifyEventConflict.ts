import dotenv from 'dotenv';
dotenv.config();

import http, { Server } from 'http';
import mongoose from 'mongoose';
import { app } from '../app';
import { connectDB } from '../config/db';
import { Organizer, IOrganizer } from '../models/Organizer';
import { Venue, IVenue } from '../models/Venue';
import { Event, IEvent } from '../models/Event';

export interface EventApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
}

/**
 * Verification test demonstrating:
 * 1. Creating Event 1 in a venue (201 Created).
 * 2. Creating Event 2 in the same venue with an overlapping timeframe returns HTTP 409 Conflict.
 * 3. Soft-cancelling Event 1 via PATCH /api/events/:id/cancel (200 OK).
 * 4. Creating Event 3 in the same timeframe now succeeds because Event 1 is cancelled.
 */
export const verifyEventConflict = async (): Promise<void> => {
  let server: Server | null = null;
  const createdEventIds: string[] = [];

  try {
    console.log('--- Starting Venue Scheduling Conflict Verification ---');
    await connectDB();

    server = http.createServer(app);
    await new Promise<void>((resolve): void => {
      server!.listen(0, (): void => resolve());
    });

    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Unable to bind test server');
    }

    const baseUrl: string = `http://127.0.0.1:${address.port}`;
    console.log(`Test server running at ${baseUrl}`);

    // Retrieve or create organizer
    let organizer: IOrganizer | null = await Organizer.findOne();
    if (!organizer) {
      organizer = await Organizer.create({
        name: 'Robotics Club',
        email: 'robotics@college.edu',
        department: 'Mechanical',
        contactNumber: '+1-555-0155',
      });
    }

    // Retrieve or create venue
    let venue: IVenue | null = await Venue.findOne();
    if (!venue) {
      venue = await Venue.create({
        name: 'Conference Hall A',
        location: 'Technology Block Floor 2',
        capacity: 100,
        facilities: ['Smart Board', 'Microphones'],
      });
    }

    const nowMs: number = Date.now();
    const event1Start = new Date(nowMs + 10 * 24 * 60 * 60 * 1000); // 10 days ahead
    const event1End = new Date(nowMs + 10 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000); // +4 hours

    // Overlapping interval: starts 2 hours into Event 1 and ends 2 hours after Event 1
    const event2Start = new Date(event1Start.getTime() + 2 * 60 * 60 * 1000); // +2 hours (overlap!)
    const event2End = new Date(event1End.getTime() + 2 * 60 * 60 * 1000);

    // Step 1: Create Event 1
    console.log('\n[Step 1] Creating Event 1 in venue...');
    const res1 = await fetch(`${baseUrl}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-role': 'organizer' },
      body: JSON.stringify({
        title: 'Robotics Workshop 2026',
        description: 'Hands-on autonomous robotics workshop',
        startDate: event1Start.toISOString(),
        endDate: event1End.toISOString(),
        capacity: 60,
        organizerId: organizer._id.toString(),
        venueId: venue._id.toString(),
      }),
    });

    const data1 = (await res1.json()) as EventApiResponse<IEvent>;
    if (res1.status === 201 && data1.success && data1.data?._id) {
      createdEventIds.push(data1.data._id.toString());
      console.log(`✅ Event 1 created successfully (HTTP 201): "${data1.data.title}"`);
    } else {
      throw new Error(`Failed to create Event 1: ${res1.status} - ${JSON.stringify(data1)}`);
    }

    // Step 2: Attempt to create Event 2 with overlapping time in the same venue
    console.log('\n[Step 2] Attempting to create Event 2 in same venue with overlapping interval...');
    const res2 = await fetch(`${baseUrl}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-role': 'organizer' },
      body: JSON.stringify({
        title: 'Conflicting AI Seminar',
        description: 'Overlapping seminar in the same venue',
        startDate: event2Start.toISOString(),
        endDate: event2End.toISOString(),
        capacity: 50,
        organizerId: organizer._id.toString(),
        venueId: venue._id.toString(),
      }),
    });

    const data2 = (await res2.json()) as EventApiResponse;
    if (res2.status === 409 && data2.success === false) {
      console.log(`✅ Correctly caught venue scheduling conflict (HTTP 409 Conflict): "${data2.message}"`);
    } else {
      throw new Error(`Expected HTTP 409 Conflict, received ${res2.status}: ${JSON.stringify(data2)}`);
    }

    // Step 3: Soft-cancel Event 1 via PATCH /api/events/:id/cancel
    console.log('\n[Step 3] Soft-cancelling Event 1 via PATCH /api/events/:id/cancel...');
    const event1Id = createdEventIds[0];
    const cancelRes = await fetch(`${baseUrl}/api/events/${event1Id}/cancel`, {
      method: 'PATCH',
      headers: { 'x-user-role': 'organizer' },
    });
    const cancelData = (await cancelRes.json()) as EventApiResponse<IEvent>;
    if (cancelRes.status === 200 && cancelData.data?.status === 'cancelled') {
      console.log(`✅ Event 1 successfully cancelled (Status: ${cancelData.data.status})`);
    } else {
      throw new Error(`Failed to cancel Event 1: ${cancelRes.status} - ${JSON.stringify(cancelData)}`);
    }

    // Step 4: Now Event 2 timeframe should succeed because Event 1 is cancelled
    console.log('\n[Step 4] Re-attempting Event 2 in the same interval after cancellation of Event 1...');
    const res3 = await fetch(`${baseUrl}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-role': 'organizer' },
      body: JSON.stringify({
        title: 'Conflicting AI Seminar (Now Unblocked)',
        description: 'Seminar in the same venue after prior event cancelled',
        startDate: event2Start.toISOString(),
        endDate: event2End.toISOString(),
        capacity: 50,
        organizerId: organizer._id.toString(),
        venueId: venue._id.toString(),
      }),
    });

    const data3 = (await res3.json()) as EventApiResponse<IEvent>;
    if (res3.status === 201 && data3.success && data3.data?._id) {
      createdEventIds.push(data3.data._id.toString());
      console.log(`✅ Event 2 created successfully (HTTP 201) now that prior event is cancelled!`);
    } else {
      throw new Error(`Failed to create unblocked event: ${res3.status} - ${JSON.stringify(data3)}`);
    }

    console.log('\n======================================================');
    console.log('🎉 VENUE SCHEDULING CONFLICT VERIFICATION PASSED! 🎉');
    console.log('======================================================\n');
  } finally {
    // Cleanup created test events
    if (createdEventIds.length > 0) {
      await Event.deleteMany({ _id: { $in: createdEventIds } });
      console.log(`Cleaned up ${createdEventIds.length} temporary test event(s).`);
    }

    if (server) {
      server.close();
    }
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log('Database disconnected cleanly.');
    }
  }
};

// Execute if run directly
if (require.main === module) {
  verifyEventConflict()
    .then((): void => process.exit(0))
    .catch((err: Error): void => {
      console.error('Verification failed:', err);
      process.exit(1);
    });
}
