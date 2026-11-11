import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import { Server } from 'socket.io';
import { app } from './app';
import { connectDB } from './config/db';
import { ensureDefaultOrganizer } from './config/initOrganizer';
import { setSocketServer } from './config/socket';

// Ensure all Mongoose models and indexes are registered on server start
import { Student, Organizer, Venue, Event, Registration, Feedback } from './models';

const PORT: number = parseInt(process.env.PORT || '5000', 10);

const server = http.createServer(app);

export const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  },
});

setSocketServer(io);

io.on('connection', (socket) => {
  console.log(`WebSocket client connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`WebSocket client disconnected: ${socket.id}`);
  });
});

/**
 * Initializes database connection and binds HTTP/Socket.io server to configured port.
 */
const startServer = async (): Promise<void> => {
  try {
    // Initialize MongoDB connection before binding to port
    await connectDB();

    // Idempotently ensure fixed institutional Organizer account exists
    await ensureDefaultOrganizer();
    console.log('Verified default Organizer account: organizer@college.edu');

    server.listen(PORT, (): void => {
      console.log(`Server is running on port ${PORT} with Socket.io enabled`);
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

export { app, server, Student, Organizer, Venue, Event, Registration, Feedback, startServer };
export default app;
