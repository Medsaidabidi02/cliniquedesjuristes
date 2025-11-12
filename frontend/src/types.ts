// ===========================================
// LEGAL EDUCATION PLATFORM TYPES
// ===========================================

export interface User {
  id: number;
  name: string;
  email: string;
  password?: string;
  is_admin: boolean;
  is_approved: boolean;
  created_at: string;
  // allow nullable/optional updated_at to match DB responses
  updated_at?: string | null;
  last_ip?: string;
}

export interface Video {
  id: number;
  title: string;
  description?: string;
  course_id: number;
  file_path: string;
  file_size?: number;
  duration?: number;
  mime_type?: string;
  is_active: boolean;
  is_free?: boolean;
  order_index?: number;
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
  video_count?: number;
  enrolled_count?: number;
  videos?: Video[];
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
  author_name?: string;
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
  is_featured?: boolean;
}

export interface BlogPostDetail extends BlogPostWithStats {
  is_liked: boolean;
}

export interface CourseDetail extends Course {
  videos: Video[];
}

export interface EnrolledCourse extends Course {
  enrollment_date: string;
  progress: number;
  completed: boolean;
}

export interface UserStats {
  coursesEnrolled: number;
  coursesCompleted: number;
  totalWatchTime: number;
  certificatesEarned: number;
}

export interface DashboardStats {
  totalUsers: number;
  totalCourses: number;
  totalVideos: number;
  totalArticles: number;
  recentRegistrations: User[];
  popularCourses: Course[];
}

export interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
  text?: string;
  className?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface ContactForm {
  name: string;
  email: string;
  subject: string;
  message: string;
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

export interface VideoWithCourse {
  id: number;
  title: string;
  description?: string;
  course_id: number;
  course_title?: string;
  file_path: string;
  file_size?: string;
  duration?: number;
  mime_type?: string;
  is_active: boolean;
  is_free?: boolean;
  order_index?: number;
  upload_progress?: number;
  created_at: string;
  updated_at: string;
}

export interface VideoFormData {
  title: string;
  description: string;
  order_index: number;
  is_free: boolean;
  duration: string;
}