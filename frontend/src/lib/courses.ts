import { api } from './api';

// Course interface matching backend
export interface Course {
  id: number | string;
  title: string;
  description: string;
  cover_image?: string | null;
  category?: string;
  thumbnail_path?: string | null;
  cover_image_thumb?: string | null; // normalized thumbnail field (added client-side)
  is_active: boolean;
  created_at: string;
  updated_at: string;
  video_count?: number; // From aggregation
  subject_count?: number;

  videos?: Video[];
  // level is intentionally removed as requested
}

// Video interface matching backend
export interface Video {
  id: number | string;
  title: string;
  course_id: number | string;
  file_path: string;
  file_size?: number;
  duration?: number;
  mime_type?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// API response wrapper interface
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

// Course service
export const courseService = {
  // Get all courses
  async getCourses(): Promise<Course[]> {
    try {
      const response = await api.get<ApiResponse<Course[]>>('/courses');

      // If backend returned wrapper with data array, use it
      let items: any[] = [];
      if (response && response.success && Array.isArray(response.data)) {
        items = response.data;
      } else if (response && response.success && !response.data) {
        return [];
      } else if (Array.isArray(response)) {
        // some api.get implementations may return array directly
        items = response as any[];
      } else if (response && typeof response === 'object') {
        // fallback: try to find first array inside object (robust)
        for (const k of Object.keys(response as any)) {
          const val = (response as any)[k];
          if (Array.isArray(val)) {
            items = val;
            break;
          }
        }
      }

      // Normalize each course so UI can rely on cover_image / cover_image_thumb
      const normalized: Course[] = (items || []).map((c: any) => {
        const cover =
          c.cover_image ||
          c.cover ||
          c.image ||
          c.image_url ||
          (c.media && c.media.image) ||
          null;

        const thumb =
          c.cover_image_thumb ||
          c.thumbnail_path ||
          c.thumbnail ||
          c.thumb ||
          c.thumb_url ||
          c.thumbnail_url ||
          (c.media && (c.media.thumb || c.media.thumbnail)) ||
          cover ||
          null;

        return {
          // keep original fields but ensure normalized thumbnail keys exist
          id: c.id ?? c._id ?? null,
          title: c.title ?? c.name ?? 'Untitled Course',
          description: c.description ?? c.excerpt ?? '',
          cover_image: cover,
          thumbnail_path: c.thumbnail_path ?? null,
          cover_image_thumb: thumb,
          category: c.category ?? null,
          is_active: typeof c.is_active === 'boolean' ? c.is_active : true,
          created_at: c.created_at ?? c.createdAt ?? '',
          updated_at: c.updated_at ?? c.updatedAt ?? '',
          video_count: c.video_count ?? c.videos_count ?? c.count_videos ?? 0,
          subject_count: c.subject_count ?? 0,
          videos: c.videos ?? c.resources ?? [],
          ...c
        } as Course;
      });

      return normalized;
    } catch (error) {
      console.error('Get courses error:', error);
      return []; // Return empty array instead of throwing error
    }
  },

  // Get single course with videos
  async getCourse(id: number | string): Promise<Course | null> {
    try {
      const response = await api.get<ApiResponse<Course>>(`/courses/${id}`);

      if (response && response.success && response.data) {
        // normalize single object similarly
        const c: any = response.data;
        const cover =
          c.cover_image ||
          c.cover ||
          c.image ||
          c.image_url ||
          (c.media && c.media.image) ||
          null;

        const thumb =
          c.cover_image_thumb ||
          c.thumbnail_path ||
          c.thumbnail ||
          c.thumb ||
          c.thumb_url ||
          c.thumbnail_url ||
          (c.media && (c.media.thumb || c.media.thumbnail)) ||
          cover ||
          null;

        return {
          ...c,
          cover_image: cover,
          cover_image_thumb: thumb
        } as Course;
      }

      console.warn('API returned unsuccessful response or no data:', (response as any)?.message);
      return null;
    } catch (error) {
      console.error('Get course error:', error);
      return null; // Return null instead of throwing error
    }
  },

  // Create course (admin only)
  async createCourse(courseData: Partial<Course>): Promise<Course | null> {
    try {
      const response = await api.post<ApiResponse<Course>>('/courses', courseData);

      if (response && response.success && response.data) {
        return response.data;
      }

      console.warn('API returned unsuccessful response or no data:', (response as any)?.message);
      return null;
    } catch (error) {
      console.error('Create course error:', error);
      return null;
    }
  },

  // Update course (admin only)
  async updateCourse(id: number | string, courseData: Partial<Course>): Promise<Course | null> {
    try {
      const response = await api.put<ApiResponse<Course>>(`/courses/${id}`, courseData);

      if (response && response.success && response.data) {
        return response.data;
      }

      console.warn('API returned unsuccessful response or no data:', (response as any)?.message);
      return null;
    } catch (error) {
      console.error('Update course error:', error);
      return null;
    }
  },

  // Delete course (admin only)
  async deleteCourse(id: number | string): Promise<boolean> {
    try {
      const response = await api.delete<ApiResponse<void>>(`/courses/${id}`);

      if (response && response.success) {
        return true;
      }

      console.warn('API returned unsuccessful response:', (response as any)?.message);
      return false;
    } catch (error) {
      console.error('Delete course error:', error);
      return false;
    }
  }
};