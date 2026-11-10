export type EventStatus = 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
export type RegistrationStatus = 'registered' | 'cancelled' | 'attended';

export interface Student {
  _id: string;
  fullName: string;
  rollNumber: string;
  email: string;
  department: string;
  year: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Organizer {
  _id: string;
  name: string;
  email: string;
  department: string;
  contactNumber: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Venue {
  _id: string;
  name: string;
  location: string;
  capacity: number;
  facilities?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Event {
  _id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  capacity: number;
  status: EventStatus;
  organizerId: Organizer | string;
  venueId: Venue | string;
  activeRegistrationsCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Registration {
  _id: string;
  studentId: Student | string;
  eventId: Event | string;
  status: RegistrationStatus;
  registeredAt: string;
  attendedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AnalyticsSummary {
  eventId: string;
  title: string;
  capacity: number;
  status: EventStatus;
  totalRegistrations: number;
}

export interface DashboardMetrics {
  totalUpcomingEvents: number;
  totalActiveStudents: number;
  totalVenues: number;
  totalConfirmedRegistrations: number;
  upcomingEvents?: number;
  activeStudents?: number;
  collegeVenues?: number;
  totalRegistrations?: number;
}

export interface CreateEventPayload {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  capacity: number;
  organizerId: string;
  venueId: string;
}

export interface EventFilters {
  status?: EventStatus;
  organizerId?: string;
  venueId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export type UserRole = 'student' | 'organizer' | 'admin';

export interface ActiveProfile {
  id: string;
  name: string;
  role: 'student' | 'organizer';
  rollNumber?: string;
  department?: string;
  email?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  studentId?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterStudentPayload {
  fullName: string;
  rollNumber: string;
  email: string;
  department: string;
  year: number;
  password: string;
}

export interface RegisterOrganizerPayload {
  name: string;
  email: string;
  department: string;
  password: string;
  contactNumber?: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  department: string;
  role?: UserRole;
  studentId?: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  token?: string;
  data?: User;
}

