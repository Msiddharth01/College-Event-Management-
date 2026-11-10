import express, { Application, Request, Response } from 'express';
import cors from 'cors';

// Import domain routes
import authRoutes from './routes/authRoutes';
import venueRoutes from './routes/venueRoutes';
import organizerRoutes from './routes/organizerRoutes';
import studentRoutes from './routes/studentRoutes';
import eventRoutes from './routes/eventRoutes';
import registrationRoutes from './routes/registrationRoutes';
import analyticsRoutes from './routes/analyticsRoutes';

// Import error-handling middleware
import { notFoundHandler } from './middleware/notFound';
import { errorHandler } from './middleware/errorHandler';

export interface HealthResponse {
  status: string;
}

const app: Application = express();

// Standard middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

// Health check endpoint
app.get('/health', (_req: Request, res: Response<HealthResponse>): void => {
  res.status(200).json({ status: 'ok' });
});

// Mount domain routes
app.use('/api/auth', authRoutes);
app.use('/api/venues', venueRoutes);
app.use('/api/organizers', organizerRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/registrations', registrationRoutes);
app.use('/api/analytics', analyticsRoutes);

// Catch unhandled routes and forward to error handler
app.use(notFoundHandler);
app.use(errorHandler);

export { app };
export default app;

