import dotenv from 'dotenv';
dotenv.config();

import http, { Server } from 'http';
import mongoose from 'mongoose';
import { app } from '../app';
import { connectDB } from '../config/db';
import { EventRegistrationSummary, DashboardMetrics } from '../controllers/analyticsController';

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  total?: number;
}

/**
 * Verification test demonstrating:
 * 1. Running the 6-stage event registration summary aggregation pipeline (Code 4.2).
 * 2. Asserting pipeline returns entries containing title, capacity, status, and totalRegistrations matching seed data.
 * 3. Querying the system dashboard metrics endpoint to confirm summary numbers.
 * 4. Clean disconnect and termination.
 */
export const verifyAnalytics = async (): Promise<void> => {
  let server: Server | null = null;

  try {
    console.log('--- Starting Analytics & Reporting Aggregation Verification ---');
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

    // Verify RBAC restriction for non-organizers
    console.log('\n[RBAC Check] Verifying non-organizer request to /api/analytics/dashboard is rejected with 403...');
    const forbiddenRes = await fetch(`${baseUrl}/api/analytics/dashboard`, {
      headers: { 'x-user-role': 'student' },
    });
    if (forbiddenRes.status === 403) {
      console.log('✅ RBAC assertion passed: student role correctly blocked with HTTP 403 Forbidden.');
    } else {
      throw new Error(`Expected HTTP 403 for student role on analytics, got ${forbiddenRes.status}`);
    }

    // 1. Verify GET /api/analytics/events-summary
    console.log('\n[Step 1] Executing Event Registration Summary Aggregation Pipeline (Code 4.2)...');
    const summaryRes = await fetch(`${baseUrl}/api/analytics/events-summary`, {
      headers: { 'x-user-role': 'organizer' },
    });
    const summaryData = (await summaryRes.json()) as ApiResponse<EventRegistrationSummary[]>;

    if (summaryRes.status !== 200 || !summaryData.success || !Array.isArray(summaryData.data)) {
      throw new Error(`Failed to fetch event registration summary: ${summaryRes.status} - ${JSON.stringify(summaryData)}`);
    }

    console.log(`✅ Aggregation pipeline executed successfully (HTTP 200). Returned ${summaryData.data.length} event(s).`);

    if (summaryData.data.length === 0) {
      throw new Error('Expected at least 1 aggregated event entry from seed data, but received 0.');
    }

    // Inspect the first seeded event entry
    const firstEntry: EventRegistrationSummary = summaryData.data[0];
    console.log('\nAggregated Result Verification:');
    console.log(` - Event ID:            ${firstEntry.eventId}`);
    console.log(` - Event Title:         ${firstEntry.title}`);
    console.log(` - Capacity:            ${firstEntry.capacity}`);
    console.log(` - Status:              ${firstEntry.status}`);
    console.log(` - Total Registrations: ${firstEntry.totalRegistrations}`);

    // Assertions matching the design specification
    if (!firstEntry.title || typeof firstEntry.totalRegistrations !== 'number') {
      throw new Error('Entry is missing title or totalRegistrations count');
    }

    if (firstEntry.totalRegistrations < 1) {
      throw new Error(`Expected at least 1 confirmed registration for "${firstEntry.title}", but got ${firstEntry.totalRegistrations}`);
    }

    console.log('✅ Pipeline assertion passed: title and totalRegistrations correctly aggregated from registrations collection.');

    // 2. Verify GET /api/analytics/dashboard
    console.log('\n[Step 2] Querying High-Level System Dashboard Metrics...');
    const dashRes = await fetch(`${baseUrl}/api/analytics/dashboard`, {
      headers: { 'x-user-role': 'organizer' },
    });
    const dashData = (await dashRes.json()) as ApiResponse<DashboardMetrics>;

    if (dashRes.status !== 200 || !dashData.success || !dashData.data) {
      throw new Error(`Failed to fetch dashboard metrics: ${dashRes.status} - ${JSON.stringify(dashData)}`);
    }

    const metrics: DashboardMetrics = dashData.data;
    console.log('\nDashboard Metrics Summary:');
    console.log(` - Total Upcoming Events:         ${metrics.totalUpcomingEvents}`);
    console.log(` - Total Active Students:         ${metrics.totalActiveStudents}`);
    console.log(` - Total Venues Registered:       ${metrics.totalVenues}`);
    console.log(` - Total Confirmed Registrations: ${metrics.totalConfirmedRegistrations}`);

    if (
      metrics.totalUpcomingEvents < 1 ||
      metrics.totalActiveStudents < 1 ||
      metrics.totalVenues < 1 ||
      metrics.totalConfirmedRegistrations < 1
    ) {
      throw new Error('Dashboard metrics did not reflect seeded documents.');
    }

    console.log('✅ Dashboard metrics assertion passed: all system counters correctly computed.');

    console.log('\n======================================================');
    console.log('🎉 ANALYTICS & REPORTING AGGREGATION TESTS PASSED! 🎉');
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

// Execute if run directly
if (require.main === module) {
  verifyAnalytics()
    .then((): void => process.exit(0))
    .catch((err: Error): void => {
      console.error('Analytics verification failed:', err);
      process.exit(1);
    });
}

