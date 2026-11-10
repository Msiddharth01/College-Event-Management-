import axios, { AxiosInstance } from 'axios';
import {
  Event,
  CreateEventPayload,
  EventFilters,
  Registration,
  Student,
  Venue,
  Organizer,
  AnalyticsSummary,
  DashboardMetrics,
  ActiveProfile,
  RegisterStudentPayload,
  RegisterOrganizerPayload,
} from '../types';

export const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

let currentActiveUser: ActiveProfile | null = null;

export const setActiveUser = (user: ActiveProfile | null): void => {
  currentActiveUser = user;
  if (user) {
    try {
      localStorage.setItem('active_user_profile', JSON.stringify(user));
    } catch {
      // ignore localStorage errors
    }
  } else {
    try {
      localStorage.removeItem('active_user_profile');
    } catch {
      // ignore
    }
  }
};

export const getActiveUser = (): ActiveProfile | null => {
  if (currentActiveUser) return currentActiveUser;
  try {
    const stored = localStorage.getItem('active_user_profile');
    if (stored) {
      currentActiveUser = JSON.parse(stored);
      return currentActiveUser;
    }
  } catch {
    // ignore
  }
  return null;
};

// Automatically attach Authorization: Bearer <token> and role headers to every outbound request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const user = getActiveUser();
  if (user) {
    config.headers['x-user-role'] = user.role;
    config.headers['x-user-id'] = user.id;
  }
  return config;
});

// Response wrapper types from backend
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  count?: number;
}

/**
 * Event Services
 */
export const getEvents = async (filters?: EventFilters): Promise<Event[]> => {
  const response = await apiClient.get<ApiResponse<Event[]>>('/events', { params: filters });
  return response.data.data;
};

export const getEventById = async (id: string): Promise<Event> => {
  const response = await apiClient.get<ApiResponse<Event>>(`/events/${id}`);
  return response.data.data;
};

export const createEvent = async (data: CreateEventPayload): Promise<Event> => {
  const response = await apiClient.post<ApiResponse<Event>>('/events', data);
  return response.data.data;
};

export const cancelEvent = async (id: string): Promise<Event> => {
  const response = await apiClient.patch<ApiResponse<Event>>(`/events/${id}/cancel`);
  return response.data.data;
};

/**
 * Registration Services
 */
export const registerForEvent = async (studentId: string, eventId: string): Promise<Registration> => {
  const response = await apiClient.post<ApiResponse<Registration>>('/registrations', {
    studentId,
    eventId,
  });
  return response.data.data;
};

export const getStudentRegistrations = async (studentId: string): Promise<Registration[]> => {
  const response = await apiClient.get<ApiResponse<Registration[]>>(`/registrations/student/${studentId}`);
  return response.data.data;
};

export const cancelRegistration = async (registrationId: string): Promise<void> => {
  await apiClient.delete<ApiResponse<null>>(`/registrations/${registrationId}`);
};

export const getEventRegistrations = async (eventId: string): Promise<Registration[]> => {
  const response = await apiClient.get<ApiResponse<Registration[]>>(`/registrations/event/${eventId}`);
  return response.data.data;
};

export const markAttendance = async (registrationId: string): Promise<Registration> => {
  const response = await apiClient.patch<ApiResponse<Registration>>(`/registrations/${registrationId}/attend`);
  return response.data.data;
};

/**
 * Analytics & Reporting Services
 */
export const getAnalyticsSummary = async (): Promise<AnalyticsSummary[]> => {
  const response = await apiClient.get<ApiResponse<AnalyticsSummary[]>>('/analytics/events-summary');
  return response.data.data;
};

export const getDashboardMetrics = async (): Promise<DashboardMetrics> => {
  const response = await apiClient.get<ApiResponse<DashboardMetrics>>('/analytics/dashboard');
  return response.data.data;
};

/**
 * Auxiliary Master Data Services
 */
export const getStudents = async (): Promise<Student[]> => {
  const response = await apiClient.get<ApiResponse<Student[]>>('/students');
  return response.data.data;
};

export const getVenues = async (): Promise<Venue[]> => {
  const response = await apiClient.get<ApiResponse<Venue[]>>('/venues');
  return response.data.data;
};

export const getOrganizers = async (): Promise<Organizer[]> => {
  const response = await apiClient.get<ApiResponse<Organizer[]>>('/organizers');
  return response.data.data;
};

/**
 * Authentication Services
 */
export interface LoginResult {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: 'student' | 'organizer';
    department?: string;
    rollNumber?: string;
    year?: number;
  };
}

export const loginApi = async (email: string, password?: string): Promise<LoginResult> => {
  const response = await apiClient.post<LoginResult>('/auth/login', { email, password });
  return response.data;
};

export const registerApi = async (data: RegisterStudentPayload): Promise<LoginResult> => {
  const response = await apiClient.post<LoginResult>('/auth/register', data);
  return response.data;
};

export const registerOrganizerApi = async (data: RegisterOrganizerPayload): Promise<LoginResult> => {
  const response = await apiClient.post<LoginResult>('/auth/register-organizer', data);
  return response.data;
};


