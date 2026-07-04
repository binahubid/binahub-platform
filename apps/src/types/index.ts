import { Context } from 'hono';

// ============================================
// API TYPES
// ============================================

export type ApiContext = Context;

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  limit: number;
  offset: number;
}

// ============================================
// AUTH TYPES
// ============================================

export interface AuthUser {
  id: string;
  email: string;
  role: 'admin' | 'associate' | 'reviewer';
}

export interface AuthContext {
  user: AuthUser;
  token: string;
}

// ============================================
// REQUEST TYPES
// ============================================

export interface PaginationParams {
  limit?: number;
  offset?: number;
}

export interface SortParams {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
