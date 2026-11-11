import { Server } from 'socket.io';

export interface SeatUpdatedPayload {
  eventId: string;
  registeredCount: number;
  availableSeats: number;
  waitlistCount: number;
}

let ioInstance: Server | null = null;

/**
 * Stores the active Socket.io server instance for controller event emission.
 */
export const setSocketServer = (io: Server): void => {
  ioInstance = io;
};

/**
 * Retrieves the active Socket.io server instance, or null in headless test runs.
 */
export const getSocketServer = (): Server | null => ioInstance;

/**
 * Broadcasts live event seat & waitlist counts to all connected WebSocket clients.
 */
export const emitSeatUpdated = (payload: SeatUpdatedPayload): void => {
  if (ioInstance) {
    ioInstance.emit('seat_updated', payload);
  }
};

