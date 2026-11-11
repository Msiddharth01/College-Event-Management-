import { io, Socket } from 'socket.io-client';

export interface SeatUpdatedEvent {
  eventId: string;
  registeredCount: number;
  availableSeats: number;
  waitlistCount: number;
}

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001';

// Singleton Socket.io client connection pointing to backend server
export const socket: Socket = io(SOCKET_URL, {
  autoConnect: true,
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
});

export default socket;

