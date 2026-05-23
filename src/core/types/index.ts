import { Request } from 'express';

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  roles: string[];
  permissions: string[];
}

export interface AuthApiKey {
  id: string;
  userId: string;
  scopes: string[];
  isBeta: boolean;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
  apiKey?: AuthApiKey;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  code?: string;
  errors?: Array<{
    field?: string;
    message: string;
  }>;
  meta?: Record<string, unknown>;
}

export interface WebSocketMessage {
  type: string;
  event: string;
  data: unknown;
  timestamp: string;
  userId?: string;
}

export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}
