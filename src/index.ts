import dotenv from 'dotenv';
dotenv.config();

import { app } from './app';
import { connectDB } from './config/db';

// Ensure all 5 Mongoose models and indexes are registered on server start
import { Student, Organizer, Venue, Event, Registration } from './models';

const PORT: number = parseInt(process.env.PORT || '5000', 10);

/**
 * Initializes database connection and binds Express server to configured port.
 */
const startServer = async (): Promise<void> => {
  try {
    // Initialize MongoDB connection before binding to port
    await connectDB();

    app.listen(PORT, (): void => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(`Failed to start server: ${error.message}`);
    } else {
      console.error('Failed to start server with unknown error:', error);
    }
    process.exit(1);
  }
};

// Start server when executed directly
if (require.main === module) {
  startServer();
}

export { app, Student, Organizer, Venue, Event, Registration, startServer };
export default app;
