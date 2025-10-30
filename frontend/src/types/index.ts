// Add this to your existing types:

export interface User {
  id: number;
  name: string;
  email: string;
  is_admin: boolean;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
  last_ip?: string;
}

export interface Subject {
  id: number;
  title: string;
  course_id: number;
  professor_name?: string;
  hours?: number;
  description?: string;
  is_active?: boolean;
  order_index?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Course {
  id: number;
  title: string;
  description: string;
  category?: string;
  cover_image?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  thumbnail_path?: string;
  // Subject-level access info (populated by backend)
  hasFullAccess?: boolean;
  subjects?: Subject[];
}

export interface Video {
  id: number;
  title: string;
  description: string;
  duration?: number; // Made optional
  course_id: number;
  created_at: string;
  updated_at: string;
  // Additional optional properties for extended use
  url?: string;
  order?: number;
}

export interface BlogPost {
  id: number;
  title: string;
  slug: string;
  content: string;
  excerpt?: string; // Made optional to handle undefined
  cover_image?: string;
  published: boolean;
  author_id: number;
  author_name?: string; // Added optional author_name
  created_at: string;
  updated_at: string;
}

export interface BlogPostWithStats extends BlogPost {
  author: string;
  read_time: number;
  views: number;
  likes: number;
  category: string;
  tags: string[];
  is_featured: boolean;
}

// Login response interface
