import { Request } from 'express';
export interface User {
  id: number;
  name: string;
  email: string;
  password?: string;
  is_admin: boolean;
  is_approved: boolean;
  last_ip?: string;
  created_at: string;
  updated_at: string;
}




export interface Course {
  id: number;
  title: string;
  description: string;
  cover_image?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Video {
  id: number;
  title: string;
  course_id: number;
  file_path: string;
  file_size?: number;
  duration?: number;
  mime_type?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BlogPost {
  id: number;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  cover_image?: string;
  published: boolean;
  author_id: number;
  created_at: string;
  updated_at: string;
}

export interface Subject {
  id: number;
  title: string;
  course_id: number;
  professor_name?: string;
  hours?: number;
  description?: string;
  is_active: boolean;
  order_index?: number;
  created_at: string;
  updated_at: string;
}

export interface UserCourse {
  id: number;
  user_id: number;
  course_id: number;
  subject_id?: number | null; // Optional: if null, user has access to entire course
  assigned_at: string;
  expires_at?: string;
  is_active: boolean;
  created_at?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: any[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        name?: string;
        isAdmin?: boolean;
        is_admin?: boolean;
        is_approved?: boolean;
      };
    }
  }
}