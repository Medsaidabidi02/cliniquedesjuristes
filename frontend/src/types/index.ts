// Add this to your existing types:

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
