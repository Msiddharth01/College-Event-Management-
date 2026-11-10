import dotenv from 'dotenv';
dotenv.config();

import http, { Server } from 'http';
import mongoose from 'mongoose';
import { app } from '../app';
import { connectDB } from '../config/db';
import { Student } from '../models/Student';
import { Organizer } from '../models/Organizer';
import { Venue } from '../models/Venue';
import { Event } from '../models/Event';
import { Registration } from '../models/Registration';

const runRbacVerification = async (): Promise<void> => {
  let server: Server | null = null;

  try {
    console.log('--- Starting Strict RBAC Authorization Verification ---');
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

    // Retrieve sample entities from DB
    const student = await Student.findOne();
    const organizer = await Organizer.findOne();
    const venue = await Venue.findOne();
    const event = await Event.findOne();

    if (!student || !organizer || !venue || !event) {
      throw new Error('Database is missing seed entities. Run "npm run seed" first.');
    }

    console.log(`\nActive Test Entities:`);
    console.log(` - Student:   "${student.fullName}" (ID: ${student._id})`);
    console.log(` - Organizer: "${organizer.name}" (ID: ${organizer._id})`);
    console.log(` - Event:     "${event.title}" (ID: ${event._id})`);

    // ---------------------------------------------------------
    // TEST 1: Protect Analytics Endpoints (Organizer Role Required)
    // ---------------------------------------------------------
    console.log('\n[Test 1] Testing RBAC on GET /api/analytics/dashboard...');
    
    // 1a. Missing role header
    const noHeaderRes = await fetch(`${baseUrl}/api/analytics/dashboard`);
    const noHeaderData = (await noHeaderRes.json()) as { message: string };
    if (noHeaderRes.status === 403 && noHeaderData.message === 'Access denied. Insufficient permissions.') {
      console.log('✅ Unauthenticated request correctly rejected (HTTP 403): "Access denied. Insufficient permissions."');
    } else {
      throw new Error(`Expected 403 for unauthenticated request, got ${noHeaderRes.status}`);
    }

    // 1b. Student role attempt
    const studentDashRes = await fetch(`${baseUrl}/api/analytics/dashboard`, {
      headers: { 'x-user-role': 'student', 'x-user-id': student._id.toString() },
    });
    const studentDashData = (await studentDashRes.json()) as { message: string };
    if (studentDashRes.status === 403 && studentDashData.message === 'Access denied. Insufficient permissions.') {
      console.log('✅ Student access to /api/analytics/dashboard correctly rejected (HTTP 403 Forbidden)');
    } else {
      throw new Error(`Expected 403 for student role, got ${studentDashRes.status}`);
    }

    // 1c. Organizer role attempt
    const organizerDashRes = await fetch(`${baseUrl}/api/analytics/dashboard`, {
      headers: { 'x-user-role': 'organizer', 'x-user-id': organizer._id.toString() },
    });
    if (organizerDashRes.status === 200) {
      console.log('✅ Organizer access to /api/analytics/dashboard granted (HTTP 200 OK)');
    } else {
      throw new Error(`Expected 200 for organizer role, got ${organizerDashRes.status}`);
    }

    // ---------------------------------------------------------
    // TEST 2: Protect Event Creation & Cancellation (Organizer Role Required)
    // ---------------------------------------------------------
    console.log('\n[Test 2] Testing RBAC on Event Management (POST /api/events & PATCH /api/events/:id/cancel)...');

    // 2a. Student attempt to create event
    const studentCreateEventRes = await fetch(`${baseUrl}/api/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': 'student',
        'x-user-id': student._id.toString(),
      },
      body: JSON.stringify({
        title: 'Unauthorized Student Event',
        description: 'Should be rejected by RBAC',
        startDate: new Date(Date.now() + 86400000).toISOString(),
        endDate: new Date(Date.now() + 172800000).toISOString(),
        capacity: 50,
        organizerId: organizer._id.toString(),
        venueId: venue._id.toString(),
      }),
    });
    const studentCreateEventData = (await studentCreateEventRes.json()) as { message: string };
    if (studentCreateEventRes.status === 403 && studentCreateEventData.message === 'Access denied. Insufficient permissions.') {
      console.log('✅ Student attempt to POST /api/events correctly rejected (HTTP 403 Forbidden)');
    } else {
      throw new Error(`Expected 403 for student POST /api/events, got ${studentCreateEventRes.status}`);
    }

    // 2b. Student attempt to cancel event
    const studentCancelEventRes = await fetch(`${baseUrl}/api/events/${event._id}/cancel`, {
      method: 'PATCH',
      headers: { 'x-user-role': 'student', 'x-user-id': student._id.toString() },
    });
    const studentCancelData = (await studentCancelEventRes.json()) as { message: string };
    if (studentCancelEventRes.status === 403 && studentCancelData.message === 'Access denied. Insufficient permissions.') {
      console.log('✅ Student attempt to PATCH /api/events/:id/cancel correctly rejected (HTTP 403 Forbidden)');
    } else {
      throw new Error(`Expected 403 for student PATCH cancel event, got ${studentCancelEventRes.status}`);
    }

    // ---------------------------------------------------------
    // TEST 3: Protect Registration Creation (Student Role Required)
    // ---------------------------------------------------------
    console.log('\n[Test 3] Testing RBAC on Student Registration (POST /api/registrations)...');

    // 3a. Organizer attempt to register
    const organizerRegisterRes = await fetch(`${baseUrl}/api/registrations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': 'organizer',
        'x-user-id': organizer._id.toString(),
      },
      body: JSON.stringify({
        studentId: student._id.toString(),
        eventId: event._id.toString(),
      }),
    });
    const organizerRegData = (await organizerRegisterRes.json()) as { message: string };
    if (organizerRegisterRes.status === 403 && organizerRegData.message === 'Access denied. Insufficient permissions.') {
      console.log('✅ Organizer attempt to POST /api/registrations correctly rejected (HTTP 403 Forbidden)');
    } else {
      throw new Error(`Expected 403 for organizer POST /api/registrations, got ${organizerRegisterRes.status}`);
    }

    // ---------------------------------------------------------
    // TEST 4: Protect Attendance Marking (Organizer Role Required)
    // ---------------------------------------------------------
    console.log('\n[Test 4] Testing RBAC on Attendance Tracking (PATCH /api/registrations/:id/attend)...');
    
    // Find or create a registration
    let sampleReg = await Registration.findOne();
    if (!sampleReg) {
      sampleReg = await Registration.create({
        studentId: student._id,
        eventId: event._id,
        status: 'registered',
      });
    }

    // 4a. Student attempt to mark attendance
    const studentAttendRes = await fetch(`${baseUrl}/api/registrations/${sampleReg._id}/attend`, {
      method: 'PATCH',
      headers: { 'x-user-role': 'student', 'x-user-id': student._id.toString() },
    });
    const studentAttendData = (await studentAttendRes.json()) as { message: string };
    if (studentAttendRes.status === 403 && studentAttendData.message === 'Access denied. Insufficient permissions.') {
      console.log('✅ Student attempt to PATCH /api/registrations/:id/attend correctly rejected (HTTP 403 Forbidden)');
    } else {
      throw new Error(`Expected 403 for student PATCH attendance, got ${studentAttendRes.status}`);
    }

    // 4b. Organizer attempt to mark attendance
    const organizerAttendRes = await fetch(`${baseUrl}/api/registrations/${sampleReg._id}/attend`, {
      method: 'PATCH',
      headers: { 'x-user-role': 'organizer', 'x-user-id': organizer._id.toString() },
    });
    if (organizerAttendRes.status === 200) {
      console.log('✅ Organizer attempt to PATCH /api/registrations/:id/attend granted (HTTP 200 OK)');
    } else {
      throw new Error(`Expected 200 for organizer PATCH attendance, got ${organizerAttendRes.status}`);
    }

    console.log('\n======================================================');
    console.log('🎉 STRICT ROLE-BASED ACCESS CONTROL (RBAC) PASSED! 🎉');
    console.log('======================================================\n');
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

runRbacVerification().catch((err) => {
  console.error('RBAC Verification failed:', err);
  process.exit(1);
});

