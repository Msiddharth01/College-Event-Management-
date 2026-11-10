import dotenv from 'dotenv';
dotenv.config();

import http, { Server } from 'http';
import mongoose from 'mongoose';
import { app } from '../app';
import { connectDB } from '../config/db';
import { Student, IStudent } from '../models/Student';
import { Organizer, IOrganizer } from '../models/Organizer';
import { Venue, IVenue } from '../models/Venue';
import { Event, IEvent } from '../models/Event';
import { Registration, IRegistration } from '../models/Registration';

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  total?: number;
}

/**
 * Verification test demonstrating:
 * 1. Event creation with capacity = 1.
 * 2. Successfully registering Student 1 (HTTP 201).
 * 3. Attempting to register Student 2 returns HTTP 400 ("Event has reached maximum capacity").
 * 4. Cancelling Student 1's registration via PATCH /api/registrations/:id/cancel (HTTP 200).
 * 5. Re-attempting to register Student 2 now succeeds (HTTP 201) because capacity was freed up.
 * 6. Attempting to register Student 2 a second time returns HTTP 409 Conflict (duplicate index guard).
 * 7. Clean up test records and disconnect cleanly.
 */
export const verifyRegistrationCapacity = async (): Promise<void> => {
  let server: Server | null = null;
  let testEvent: IEvent | null = null;
  const createdRegistrationIds: string[] = [];

  try {
    console.log('--- Starting Registration Capacity & Attendance Verification ---');
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
        name: 'Coding Club',
        email: 'coding.club@college.edu',
        department: 'Computer Science',
        contactNumber: '+1-555-0988',
      });
    }

    // Retrieve or create venue
    let venue: IVenue | null = await Venue.findOne();
    if (!venue) {
      venue = await Venue.create({
        name: 'Lab 101',
        location: 'CS Block Floor 1',
        capacity: 30,
        facilities: ['Workstations', 'High-speed Internet'],
      });
    }

    // Ensure at least 2 students exist
    let students: IStudent[] = await Student.find().limit(2);
    if (students.length < 2) {
      const rand: number = Math.floor(Math.random() * 10000);
      const s1 = await Student.create({
        fullName: 'Test Student One',
        rollNumber: `T1_${rand}`,
        email: `t1_${rand}@college.edu`,
        department: 'CS',
        year: 1,
      });
      const s2 = await Student.create({
        fullName: 'Test Student Two',
        rollNumber: `T2_${rand}`,
        email: `t2_${rand}@college.edu`,
        department: 'CS',
        year: 2,
      });
      students = [s1, s2];
    }

    const student1: IStudent = students[0];
    const student2: IStudent = students[1];

    // 1. Create a dummy event with capacity: 1
    console.log('\n[Step 1] Creating a dummy event with capacity: 1...');
    const nowMs = Date.now();
    testEvent = await Event.create({
      title: `Exclusive Workshop ${Math.floor(Math.random() * 10000)}`,
      description: 'One-seat exclusive hands-on workshop',
      startDate: new Date(nowMs + 20 * 24 * 60 * 60 * 1000),
      endDate: new Date(nowMs + 20 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
      capacity: 1, // Strict capacity of 1
      status: 'upcoming',
      organizerId: organizer._id,
      venueId: venue._id,
    });
    console.log(`✅ Event created: "${testEvent.title}" (Capacity: ${testEvent.capacity}, ID: ${testEvent._id})`);

    // 2. Successfully register Student 1 (HTTP 201)
    console.log('\n[Step 2] Registering Student 1 for the event...');
    const regRes1 = await fetch(`${baseUrl}/api/registrations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-role': 'student' },
      body: JSON.stringify({
        studentId: student1._id.toString(),
        eventId: testEvent._id.toString(),
      }),
    });
    const regData1 = (await regRes1.json()) as ApiResponse<IRegistration>;
    if (regRes1.status === 201 && regData1.success && regData1.data?._id) {
      createdRegistrationIds.push(regData1.data._id.toString());
      console.log(`✅ Student 1 registered successfully (HTTP 201, Reg ID: ${regData1.data._id})`);
    } else {
      throw new Error(`Failed to register Student 1: ${regRes1.status} - ${JSON.stringify(regData1)}`);
    }

    // 3. Attempt to register Student 2 for the same event -> expect HTTP 400 ("Event has reached maximum capacity")
    console.log('\n[Step 3] Attempting to register Student 2 (Capacity full check)...');
    const regRes2 = await fetch(`${baseUrl}/api/registrations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-role': 'student' },
      body: JSON.stringify({
        studentId: student2._id.toString(),
        eventId: testEvent._id.toString(),
      }),
    });
    const regData2 = (await regRes2.json()) as ApiResponse;
    if (regRes2.status === 400 && regData2.message === 'Event has reached maximum capacity') {
      console.log(`✅ Capacity safeguard enforced correctly (HTTP 400): "${regData2.message}"`);
    } else {
      throw new Error(
        `Expected HTTP 400 "Event has reached maximum capacity", got ${regRes2.status}: ${JSON.stringify(regData2)}`
      );
    }

    // 4. Cancel Student 1's registration via PATCH /api/registrations/:id/cancel
    console.log('\n[Step 4] Cancelling Student 1 registration via PATCH /api/registrations/:id/cancel...');
    const reg1Id = createdRegistrationIds[0];
    const cancelRes = await fetch(`${baseUrl}/api/registrations/${reg1Id}/cancel`, {
      method: 'PATCH',
    });
    const cancelData = (await cancelRes.json()) as ApiResponse<IRegistration>;
    if (cancelRes.status === 200 && cancelData.data?.status === 'cancelled') {
      console.log(`✅ Student 1 registration successfully cancelled (Status: ${cancelData.data.status})`);
    } else {
      throw new Error(`Failed to cancel registration: ${cancelRes.status} - ${JSON.stringify(cancelData)}`);
    }

    // 5. Attempt to register Student 2 again -> expect HTTP 201 (capacity freed up!)
    console.log('\n[Step 5] Registering Student 2 after capacity freed up...');
    const regRes3 = await fetch(`${baseUrl}/api/registrations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-role': 'student' },
      body: JSON.stringify({
        studentId: student2._id.toString(),
        eventId: testEvent._id.toString(),
      }),
    });
    const regData3 = (await regRes3.json()) as ApiResponse<IRegistration>;
    if (regRes3.status === 201 && regData3.success && regData3.data?._id) {
      createdRegistrationIds.push(regData3.data._id.toString());
      console.log(`✅ Student 2 registered successfully (HTTP 201, Reg ID: ${regData3.data._id})`);
    } else {
      throw new Error(`Failed to register Student 2: ${regRes3.status} - ${JSON.stringify(regData3)}`);
    }

    // 6. Attempt to register Student 2 a second time -> expect HTTP 409 Conflict (duplicate index guard)
    console.log('\n[Step 6] Attempting duplicate registration for Student 2...');
    const regRes4 = await fetch(`${baseUrl}/api/registrations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-role': 'student' },
      body: JSON.stringify({
        studentId: student2._id.toString(),
        eventId: testEvent._id.toString(),
      }),
    });
    const regData4 = (await regRes4.json()) as ApiResponse;
    if (regRes4.status === 409 && regData4.message?.includes('already registered')) {
      console.log(`✅ Duplicate registration caught correctly (HTTP 409 Conflict): "${regData4.message}"`);
    } else {
      throw new Error(`Expected HTTP 409 Conflict, got ${regRes4.status}: ${JSON.stringify(regData4)}`);
    }

    // 7. Verify Attendance Tracking: PATCH /api/registrations/:id/attend
    console.log('\n[Step 7] Marking attendance for Student 2...');
    const reg2Id = createdRegistrationIds[1];
    const attendRes = await fetch(`${baseUrl}/api/registrations/${reg2Id}/attend`, {
      method: 'PATCH',
      headers: { 'x-user-role': 'organizer' },
    });
    const attendData = (await attendRes.json()) as ApiResponse<IRegistration>;
    if (attendRes.status === 200 && attendData.data?.status === 'attended') {
      console.log(`✅ Attendance recorded successfully (Status: ${attendData.data.status})`);
    } else {
      throw new Error(`Failed to mark attendance: ${attendRes.status} - ${JSON.stringify(attendData)}`);
    }

    // 8. Verify GET /api/events/:eventId/registrations
    console.log('\n[Step 8] Testing GET /api/events/:eventId/registrations...');
    const eventRegsRes = await fetch(`${baseUrl}/api/events/${testEvent._id}/registrations`);
    const eventRegsData = (await eventRegsRes.json()) as ApiResponse<IRegistration[]>;
    if (eventRegsRes.status === 200 && Array.isArray(eventRegsData.data) && eventRegsData.data.length === 2) {
      console.log(`✅ Retrieved ${eventRegsData.data.length} event registrations with populated student fields`);
    } else {
      throw new Error(`Failed to get event registrations: ${eventRegsRes.status}`);
    }

    // 9. Verify GET /api/students/:studentId/registrations
    console.log('\n[Step 9] Testing GET /api/students/:studentId/registrations...');
    const studentRegsRes = await fetch(`${baseUrl}/api/students/${student2._id}/registrations`);
    const studentRegsData = (await studentRegsRes.json()) as ApiResponse<IRegistration[]>;
    if (studentRegsRes.status === 200 && Array.isArray(studentRegsData.data) && studentRegsData.data.length >= 1) {
      console.log(`✅ Retrieved ${studentRegsData.data.length} student registration(s) with populated event fields`);
    } else {
      throw new Error(`Failed to get student registrations: ${studentRegsRes.status}`);
    }

    console.log('\n======================================================');
    console.log('🎉 REGISTRATION CAPACITY & ATTENDANCE TESTS PASSED! 🎉');
    console.log('======================================================\n');
  } finally {
    // Clean up test registrations & event
    if (createdRegistrationIds.length > 0) {
      await Registration.deleteMany({ _id: { $in: createdRegistrationIds } });
      console.log(`Cleaned up ${createdRegistrationIds.length} test registration(s).`);
    }
    if (testEvent) {
      await Event.findByIdAndDelete(testEvent._id);
      console.log(`Cleaned up test event: ${testEvent._id}`);
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
  verifyRegistrationCapacity()
    .then((): void => process.exit(0))
    .catch((err: Error): void => {
      console.error('Verification failed:', err);
      process.exit(1);
    });
}

