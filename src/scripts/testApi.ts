import http, { Server } from 'http';
import mongoose from 'mongoose';
import { app } from '../index';
import { connectDB } from '../config/db';
import { IStudent } from '../models/Student';
import { IOrganizer } from '../models/Organizer';
import { IVenue } from '../models/Venue';
import { IEvent } from '../models/Event';
import { IRegistration } from '../models/Registration';

export interface ApiResponse<T = unknown> {
  success: boolean;
  total?: number;
  data?: T;
  message?: string;
  isAvailable?: boolean;
}

/**
 * End-to-end API test runner to verify all REST endpoints and error handlers.
 */
const runApiTests = async (): Promise<void> => {
  let server: Server | null = null;

  try {
    console.log('--- Starting API Integration Tests ---');
    await connectDB();

    server = http.createServer(app);
    await new Promise<void>((resolve): void => {
      server!.listen(0, (): void => {
        resolve();
      });
    });

    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Unable to bind test server');
    }

    const baseUrl: string = `http://127.0.0.1:${address.port}`;
    console.log(`Test server running at ${baseUrl}`);

    // 1. Test /health
    console.log('\n[Test 1] GET /health');
    const healthRes = await fetch(`${baseUrl}/health`);
    const healthData = (await healthRes.json()) as { status: string };
    if (healthRes.status === 200 && healthData.status === 'ok') {
      console.log('✅ Health check passed (200 OK)');
    } else {
      throw new Error(`Health check failed: ${JSON.stringify(healthData)}`);
    }

    // 2. Test GET /api/students
    console.log('\n[Test 2] GET /api/students');
    const studentsRes = await fetch(`${baseUrl}/api/students`);
    const studentsData = (await studentsRes.json()) as ApiResponse<IStudent[]>;
    if (studentsRes.status === 200 && Array.isArray(studentsData.data) && studentsData.data.length >= 2) {
      console.log(`✅ Retrieved ${studentsData.data.length} students from database`);
    } else {
      throw new Error(`GET /api/students failed: ${JSON.stringify(studentsData)}`);
    }
    const student1: IStudent = studentsData.data![0];

    // 3. Test GET /api/organizers
    console.log('\n[Test 3] GET /api/organizers');
    const orgRes = await fetch(`${baseUrl}/api/organizers`);
    const orgData = (await orgRes.json()) as ApiResponse<IOrganizer[]>;
    if (orgRes.status === 200 && Array.isArray(orgData.data) && orgData.data.length >= 1) {
      console.log(`✅ Retrieved organizer: "${orgData.data[0].name}"`);
    } else {
      throw new Error(`GET /api/organizers failed: ${JSON.stringify(orgData)}`);
    }

    // 4. Test GET /api/venues
    console.log('\n[Test 4] GET /api/venues');
    const venueRes = await fetch(`${baseUrl}/api/venues`);
    const venueData = (await venueRes.json()) as ApiResponse<IVenue[]>;
    if (venueRes.status === 200 && Array.isArray(venueData.data) && venueData.data.length >= 1) {
      console.log(`✅ Retrieved venue: "${venueData.data[0].name}" (Capacity: ${venueData.data[0].capacity})`);
    } else {
      throw new Error(`GET /api/venues failed: ${JSON.stringify(venueData)}`);
    }
    const venue1: IVenue = venueData.data![0];

    // 5. Test GET /api/events (with populated organizer and venue)
    console.log('\n[Test 5] GET /api/events');
    const eventsRes = await fetch(`${baseUrl}/api/events`);
    const eventsData = (await eventsRes.json()) as ApiResponse<IEvent[]>;
    if (eventsRes.status === 200 && Array.isArray(eventsData.data) && eventsData.data.length >= 1) {
      const ev = eventsData.data[0] as unknown as {
        title: string;
        organizerId: { name: string };
        venueId: { name: string };
      };
      console.log(
        `✅ Retrieved event: "${ev.title}" (Organizer: "${ev.organizerId.name}", Venue: "${ev.venueId.name}")`
      );
    } else {
      throw new Error(`GET /api/events failed: ${JSON.stringify(eventsData)}`);
    }
    const event1: IEvent = eventsData.data![0];

    // 6. Test GET /api/venues/:id/availability
    console.log('\n[Test 6] GET /api/venues/:id/availability');
    const futureStart = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const futureEnd = new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString();
    const availRes = await fetch(
      `${baseUrl}/api/venues/${venue1._id}/availability?startDate=${futureStart}&endDate=${futureEnd}`
    );
    const availData = (await availRes.json()) as ApiResponse;
    if (availRes.status === 200 && availData.isAvailable === true) {
      console.log(`✅ Venue availability check passed: ${availData.message}`);
    } else {
      throw new Error(`Venue availability check failed: ${JSON.stringify(availData)}`);
    }

    // 7. Test GET /api/registrations/event/:eventId
    console.log('\n[Test 7] GET /api/registrations/event/:eventId');
    const regRes = await fetch(`${baseUrl}/api/registrations/event/${event1._id}`);
    const regData = (await regRes.json()) as ApiResponse<IRegistration[]>;
    if (regRes.status === 200 && Array.isArray(regData.data) && regData.data.length >= 1) {
      console.log(`✅ Retrieved ${regData.data.length} active registration(s) for event`);
    } else {
      throw new Error(`GET registrations failed: ${JSON.stringify(regData)}`);
    }

    // 8. Test Duplicate Registration Prevention (POST /api/registrations)
    console.log('\n[Test 8] POST /api/registrations (Duplicate prevention check)');
    const dupRes = await fetch(`${baseUrl}/api/registrations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': 'student',
      },
      body: JSON.stringify({
        studentId: student1._id,
        eventId: event1._id,
      }),
    });
    const dupData = (await dupRes.json()) as ApiResponse;
    if (dupRes.status === 409 && dupData.success === false) {
      console.log(`✅ Duplicate registration correctly rejected with HTTP 409: "${dupData.message}"`);
    } else {
      throw new Error(`Expected 409 duplicate rejection, got ${dupRes.status}: ${JSON.stringify(dupData)}`);
    }

    // 9. Test 404 Route handling
    console.log('\n[Test 9] 404 Not Found Handling');
    const notFoundRes = await fetch(`${baseUrl}/api/nonexistent`);
    const notFoundData = (await notFoundRes.json()) as ApiResponse;
    if (notFoundRes.status === 404 && notFoundData.success === false) {
      console.log(`✅ 404 Not Found correctly handled: "${notFoundData.message}"`);
    } else {
      throw new Error(`Expected 404 for unknown route, got ${notFoundRes.status}`);
    }

    console.log('\n==========================================');
    console.log('🎉 ALL 9 API INTEGRATION TESTS PASSED! 🎉');
    console.log('==========================================\n');
  } finally {
    if (server) {
      server.close();
    }
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log('Database disconnected cleanly.');
    }
  }
};

runApiTests()
  .then((): void => {
    process.exit(0);
  })
  .catch((err: Error): void => {
    console.error('API Tests failed:', err);
    process.exit(1);
  });

