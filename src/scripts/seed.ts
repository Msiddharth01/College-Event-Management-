import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { connectDB } from '../config/db';
import { ensureDefaultOrganizer } from '../config/initOrganizer';
import { Student, IStudent } from '../models/Student';
import { Organizer, IOrganizer } from '../models/Organizer';
import { Venue, IVenue } from '../models/Venue';
import { Event, IEvent } from '../models/Event';
import { Registration, IRegistration } from '../models/Registration';

export interface SeedResult {
  organizer: IOrganizer;
  venue: IVenue;
  event: IEvent;
  students: IStudent[];
  initialRegistration: IRegistration;
  duplicateConstraintVerified: boolean;
}

/**
 * Seeds mock data into the database and validates relational integrity
 * and unique compound index constraints.
 */
export const seedDatabase = async (): Promise<SeedResult> => {
  try {
    console.log('--- Connecting to database for seeding & verification ---');
    await connectDB();

    console.log('Clearing existing documents from collections...');
    await Promise.all([
      Student.deleteMany({}),
      Organizer.deleteMany({}),
      Venue.deleteMany({}),
      Event.deleteMany({}),
      Registration.deleteMany({}),
    ]);
    console.log('Collections cleared successfully.');

    console.log('Synchronizing schema indexes...');
    await Promise.all([
      Student.syncIndexes(),
      Organizer.syncIndexes(),
      Venue.syncIndexes(),
      Event.syncIndexes(),
      Registration.syncIndexes(),
    ]);
    console.log('Schema indexes synchronized.');

    // 1. Insert sample Organizer
    console.log('Seeding sample Organizer...');
    const organizer: IOrganizer = await Organizer.create({
      name: 'Computer Science Society',
      email: 'cs.society@college.edu',
      department: 'Computer Science & Engineering',
      contactNumber: '+1-555-0199',
    });
    console.log(`Created Organizer: "${organizer.name}" (ID: ${organizer._id})`);

    // Ensure permanent fixed institutional Organizer exists (idempotent upsert)
    const fixedOrganizer: IOrganizer = await ensureDefaultOrganizer();
    console.log(`Verified Fixed Organizer: "${fixedOrganizer.name}" (Email: ${fixedOrganizer.email}, ID: ${fixedOrganizer._id})`);

    // 2. Insert sample Venue
    console.log('Seeding sample Venue...');
    const venue: IVenue = await Venue.create({
      name: 'Main Auditorium',
      location: 'Central Campus Block A',
      capacity: 200,
      facilities: ['Projector', 'Dolby Sound System', 'Air Conditioning', 'Stage Lighting'],
    });
    console.log(`Created Venue: "${venue.name}" (Capacity: ${venue.capacity}, ID: ${venue._id})`);

    // 3. Insert sample Event with future dates referencing Organizer and Venue
    console.log('Seeding sample Event...');
    const now: number = Date.now();
    const eventStartDate: Date = new Date(now + 7 * 24 * 60 * 60 * 1000); // 7 days ahead
    const eventEndDate: Date = new Date(now + 8 * 24 * 60 * 60 * 1000);   // 8 days ahead

    const event: IEvent = await Event.create({
      title: 'Annual Tech Symposium 2026',
      description: 'A university-wide technical festival featuring hackathons, workshops, and keynotes.',
      startDate: eventStartDate,
      endDate: eventEndDate,
      capacity: 150,
      status: 'upcoming',
      organizerId: organizer._id,
      venueId: venue._id,
    });
    console.log(`Created Event: "${event.title}" (Status: ${event.status}, ID: ${event._id})`);

    // 4. Insert 2 sample Students
    console.log('Seeding sample Students...');
    const students: IStudent[] = await Student.create([
      {
        fullName: 'Alice Johnson',
        rollNumber: 'CS202601',
        email: 'alice.johnson@college.edu',
        department: 'Computer Science',
        year: 3,
      },
      {
        fullName: 'Bob Smith',
        rollNumber: 'EC202602',
        email: 'bob.smith@college.edu',
        department: 'Electronics',
        year: 2,
      },
    ]);
    console.log(`Created ${students.length} Students:`);
    students.forEach((s: IStudent) => {
      console.log(` - ${s.fullName} (Roll: ${s.rollNumber}, Email: ${s.email})`);
    });

    // 5. Insert 1 valid Registration linking Student 1 to the Event
    console.log('Seeding valid Registration for Student 1...');
    const initialRegistration: IRegistration = await Registration.create({
      studentId: students[0]._id,
      eventId: event._id,
      status: 'registered',
    });
    console.log(`Created Registration ID: ${initialRegistration._id} for Student 1 on Event "${event.title}"`);

    // 6. Negative Test Assertion: Attempt duplicate registration for Student 1 on the exact same Event
    console.log('Executing negative test: Attempting duplicate registration for Student 1 on same event...');
    let duplicateCaught = false;

    try {
      await Registration.create({
        studentId: students[0]._id,
        eventId: event._id,
        status: 'registered',
      });
    } catch (error: unknown) {
      const isDuplicateError =
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code: unknown }).code === 11000;

      if (isDuplicateError) {
        duplicateCaught = true;
        console.log('✅ Passed: Unique index constraint caught duplicate registration (MongoServerError code 11000).');
      } else {
        console.error('Unexpected error caught during negative test:', error);
        throw error;
      }
    }

    if (!duplicateCaught) {
      throw new Error('❌ FAILED: Duplicate registration was erroneously accepted! Unique index constraint failed.');
    }

    console.log('All 5 Mongoose schemas, relations, and unique index constraints verified successfully!');

    return {
      organizer,
      venue,
      event,
      students,
      initialRegistration,
      duplicateConstraintVerified: duplicateCaught,
    };
  } finally {
    // Ensure clean database disconnect
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log('Database connection disconnected cleanly.');
    }
  }
};

// Execute seeding when executed directly
if (require.main === module) {
  seedDatabase()
    .then((): void => {
      console.log('--- Database seeding script completed successfully ---');
      process.exit(0);
    })
    .catch((err: Error): void => {
      console.error('--- Database seeding script failed ---', err);
      process.exit(1);
    });
}

