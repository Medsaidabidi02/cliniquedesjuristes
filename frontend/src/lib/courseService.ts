import { api } from './api';

export interface Subject {
  id?: number;
  course_id?: number;
  title: string;
  description?: string;
  professor_name: string;
  hours: number;
  order_index: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  video_count?: number;
  active_video_count?: number;
  total_video_size?: number;
  total_video_size_gb?: string;
}

export interface Course {
  id?: number;
  title: string;
  description: string;
  thumbnail_path?: string;
  category?: string;
  difficulty_level?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  total_subjects?: number;
  total_videos?: number;
  total_hours?: number;
  total_professors?: number;
}

export interface CourseWithSubjects extends Course {
  subjects: Subject[];
}

export interface CourseStatistics {
  total_courses: number;
  active_courses: number;
  total_subjects: number;
  total_videos: number;
  total_hours: number;
  total_professors: number;
  total_video_size: number;
  recent_courses: Array<{
    id: number;
    title: string;
    created_at: string;
    subjects_count: number;
    videos_count: number;
  }>;
}

class CourseService {
  private getBaseUrl(): string {
    return process.env.REACT_APP_API_URL || 'http://localhost:5001';
  }

  private logAction(action: string, details?: any): void {
    console.log(`📚 CourseService - ${action} for Azizkh07 at 2025-08-19 20:58:29`, details || '');
  }

  // ========== BASIC COURSE OPERATIONS ==========

  /**
   * Get all courses with basic information and statistics
   */
  async getAllCoursesBasic(): Promise<Course[]> {
    try {
      this.logAction('Fetching basic courses list');
      
      const response = await api.get<Course[]>('/courses');
      const courses = Array.isArray(response) ? response : [];
      
      this.logAction('Basic courses fetched successfully', {
        count: courses.length,
        courses: courses.map(c => ({ id: c.id, title: c.title }))
      });
      
      return courses;
    } catch (error) {
      this.logAction('Error fetching basic courses', { error: error });
      console.error('❌ CourseService.getAllCoursesBasic error:', error);
      return [];
    }
  }

  /**
   * Get single course by ID with basic information
   */
  async getCourseBasic(id: number): Promise<Course | null> {
    try {
      this.logAction(`Fetching basic course ${id}`);
      
      const response = await api.get<Course>(`/courses/${id}`);
      
      this.logAction('Basic course fetched successfully', {
        id: response.id,
        title: response.title
      });
      
      return response;
    } catch (error) {
      this.logAction(`Error fetching basic course ${id}`, { error: error });
      console.error('❌ CourseService.getCourseBasic error:', error);
      return null;
    }
  }

  // ========== COURSE WITH SUBJECTS OPERATIONS ==========

  /**
   * Get all courses with their subjects (full hierarchy)
   */
  async getAllCoursesWithSubjects(): Promise<CourseWithSubjects[]> {
    try {
      this.logAction('Fetching courses with full subject hierarchy');
      
      // First try to get courses with subjects from dedicated endpoint
      try {
        const response = await api.get<CourseWithSubjects[]>('/courses/with-subjects');
        if (Array.isArray(response)) {
          this.logAction('Courses with subjects fetched from dedicated endpoint', {
            count: response.length,
            total_subjects: response.reduce((sum, c) => sum + (c.subjects?.length || 0), 0)
          });
          return response;
        }
      } catch (endpointError) {
        this.logAction('Dedicated endpoint not available, falling back to manual loading');
      }
      
      // Fallback: Get basic courses and load subjects manually
      const basicCourses = await this.getAllCoursesBasic();
      const coursesWithSubjects: CourseWithSubjects[] = [];
      
      for (const course of basicCourses) {
        try {
          const subjects = await this.getSubjectsByCourse(course.id!);
          coursesWithSubjects.push({
            ...course,
            subjects: subjects
          });
          
          this.logAction(`Loaded subjects for course ${course.id}`, {
            course_title: course.title,
            subjects_count: subjects.length
          });
        } catch (error) {
          this.logAction(`Error loading subjects for course ${course.id}`, { error: error });
          coursesWithSubjects.push({
            ...course,
            subjects: []
          });
        }
      }
      
      this.logAction('All courses with subjects loaded via fallback', {
        courses_count: coursesWithSubjects.length,
        total_subjects: coursesWithSubjects.reduce((sum, c) => sum + c.subjects.length, 0)
      });
      
      return coursesWithSubjects;
    } catch (error) {
      this.logAction('Error fetching courses with subjects', { error: error });
      console.error('❌ CourseService.getAllCoursesWithSubjects error:', error);
      return [];
    }
  }

  /**
   * Get single course with its subjects
   */
  async getCourseWithSubjects(id: number): Promise<CourseWithSubjects | null> {
    try {
      this.logAction(`Fetching course ${id} with subjects`);
      
      // Try dedicated endpoint first
      try {
        const response = await api.get<CourseWithSubjects>(`/courses/${id}/with-subjects`);
        this.logAction('Course with subjects fetched from dedicated endpoint', {
          id: response.id,
          title: response.title,
          subjects_count: response.subjects?.length || 0
        });
        return response;
      } catch (endpointError) {
        this.logAction('Dedicated endpoint not available, using fallback approach');
      }
      
      // Fallback: Get basic course and subjects separately
      const course = await this.getCourseBasic(id);
      if (!course) {
        return null;
      }
      
      const subjects = await this.getSubjectsByCourse(id);
      
      const courseWithSubjects: CourseWithSubjects = {
        ...course,
        subjects: subjects
      };
      
      this.logAction('Course with subjects loaded via fallback', {
        id: course.id,
        title: course.title,
        subjects_count: subjects.length
      });
      
      return courseWithSubjects;
    } catch (error) {
      this.logAction(`Error fetching course ${id} with subjects`, { error: error });
      console.error('❌ CourseService.getCourseWithSubjects error:', error);
      return null;
    }
  }

  // ========== COURSE CREATION AND MANAGEMENT ==========

  /**
   * Create course with subjects
   */
  async createCourseWithSubjects(
    courseData: Partial<Course> & { subjects: Partial<Subject>[] },
    thumbnail?: File
  ): Promise<CourseWithSubjects | null> {
    try {
      this.logAction('Creating course with subjects', {
        title: courseData.title,
        subjects_count: courseData.subjects.length,
        total_hours: courseData.subjects.reduce((sum, s) => sum + (s.hours || 0), 0),
        professors: new Set(courseData.subjects.map(s => s.professor_name)).size,
        has_thumbnail: !!thumbnail
      });

      const formData = new FormData();
      
      // Course basic data
      formData.append('title', courseData.title || '');
      formData.append('description', courseData.description || '');
      formData.append('category', courseData.category || '');
      formData.append('difficulty_level', courseData.difficulty_level || 'Beginner');
      
      // Subjects data
      formData.append('subjects', JSON.stringify(courseData.subjects));

      if (thumbnail) {
        formData.append('thumbnail', thumbnail);
        this.logAction('Course thumbnail attached', {
          name: thumbnail.name,
          size: (thumbnail.size / 1024).toFixed(2) + ' KB'
        });
      }

      const response = await api.upload<CourseWithSubjects>('/courses/with-subjects', formData);
      
      this.logAction('Course with subjects created successfully', {
        id: response.id,
        title: response.title,
        subjects_created: response.subjects?.length || 0
      });
      
      return response;
    } catch (error) {
      this.logAction('Error creating course with subjects', { error: error });
      console.error('❌ CourseService.createCourseWithSubjects error:', error);
      return null;
    }
  }

  /**
   * Update course basic information
   */
  async updateCourse(id: number, courseData: Partial<Course>, thumbnail?: File): Promise<Course | null> {
    try {
      this.logAction(`Updating course ${id}`, {
        updates: Object.keys(courseData),
        has_thumbnail: !!thumbnail
      });

      const formData = new FormData();
      
      Object.entries(courseData).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, value.toString());
        }
      });

      if (thumbnail) {
        formData.append('thumbnail', thumbnail);
        this.logAction('Course thumbnail update attached');
      }

      const response = await api.upload<Course>(`/courses/${id}`, formData);
      
      this.logAction('Course updated successfully', {
        id: response.id,
        title: response.title
      });
      
      return response;
    } catch (error) {
      this.logAction(`Error updating course ${id}`, { error: error });
      console.error('❌ CourseService.updateCourse error:', error);
      return null;
    }
  }

  /**
   * Delete course (and all its subjects/videos)
   */
  async deleteCourse(id: number, forceDelete: boolean = false): Promise<boolean> {
    try {
      this.logAction(`Deleting course ${id}`, { force_delete: forceDelete });
      
      const url = forceDelete ? `/courses/${id}?force_delete=true` : `/courses/${id}`;
      await api.delete(url);
      
      this.logAction('Course deleted successfully', { id: id });
      return true;
    } catch (error) {
      this.logAction(`Error deleting course ${id}`, { error: error });
      console.error('❌ CourseService.deleteCourse error:', error);
      return false;
    }
  }

  // ========== SUBJECT OPERATIONS ==========

  /**
   * Get subjects by course ID
   */
  async getSubjectsByCourse(courseId: number): Promise<Subject[]> {
    try {
      this.logAction(`Fetching subjects for course ${courseId}`);
      
      const response = await api.get<Subject[]>(`/courses/${courseId}/subjects`);
      const subjects = Array.isArray(response) ? response : [];
      
      this.logAction('Course subjects fetched', {
        course_id: courseId,
        subjects_count: subjects.length,
        total_hours: subjects.reduce((sum, s) => sum + (s.hours || 0), 0)
      });
      
      return subjects;
    } catch (error) {
      this.logAction(`Error fetching subjects for course ${courseId}`, { error: error });
      console.error('❌ CourseService.getSubjectsByCourse error:', error);
      return [];
    }
  }

  /**
   * Get all subjects with course information
   */
  async getAllSubjects(): Promise<Subject[]> {
    try {
      this.logAction('Fetching all subjects');
      
      const response = await api.get<Subject[]>('/subjects');
      const subjects = Array.isArray(response) ? response : [];
      
      this.logAction('All subjects fetched', {
        subjects_count: subjects.length,
        professors: new Set(subjects.map(s => s.professor_name)).size
      });
      
      return subjects;
    } catch (error) {
      this.logAction('Error fetching all subjects', { error: error });
      console.error('❌ CourseService.getAllSubjects error:', error);
      return [];
    }
  }

  /**
   * Get single subject by ID with details
   */
  async getSubject(id: number): Promise<Subject | null> {
    try {
      this.logAction(`Fetching subject ${id}`);
      
      const response = await api.get<Subject>(`/subjects/${id}`);
      
      this.logAction('Subject fetched successfully', {
        id: response.id,
        title: response.title,
        professor: response.professor_name
      });
      
      return response;
    } catch (error) {
      this.logAction(`Error fetching subject ${id}`, { error: error });
      console.error('❌ CourseService.getSubject error:', error);
      return null;
    }
  }

  /**
   * Add subject to course
   */
  async addSubjectToCourse(courseId: number, subjectData: Partial<Subject>): Promise<Subject | null> {
    try {
      this.logAction(`Adding subject to course ${courseId}`, {
        title: subjectData.title,
        professor: subjectData.professor_name,
        hours: subjectData.hours
      });
      
      const response = await api.post<Subject>(`/courses/${courseId}/subjects`, subjectData);
      
      this.logAction('Subject added to course successfully', {
        subject_id: response.id,
        title: response.title,
        course_id: courseId
      });
      
      return response;
    } catch (error) {
      this.logAction(`Error adding subject to course ${courseId}`, { error: error });
      console.error('❌ CourseService.addSubjectToCourse error:', error);
      return null;
    }
  }

  /**
   * Update subject
   */
  async updateSubject(subjectId: number, subjectData: Partial<Subject>): Promise<Subject | null> {
    try {
      this.logAction(`Updating subject ${subjectId}`, {
        updates: Object.keys(subjectData)
      });
      
      const response = await api.put<Subject>(`/subjects/${subjectId}`, subjectData);
      
      this.logAction('Subject updated successfully', {
        id: response.id,
        title: response.title
      });
      
      return response;
    } catch (error) {
      this.logAction(`Error updating subject ${subjectId}`, { error: error });
      console.error('❌ CourseService.updateSubject error:', error);
      return null;
    }
  }

  /**
   * Delete subject
   */
  async deleteSubject(subjectId: number, forceDelete: boolean = false): Promise<boolean> {
    try {
      this.logAction(`Deleting subject ${subjectId}`, { force_delete: forceDelete });
      
      const url = forceDelete ? `/subjects/${subjectId}?force_delete=true` : `/subjects/${subjectId}`;
      await api.delete(url);
      
      this.logAction('Subject deleted successfully', { id: subjectId });
      return true;
    } catch (error) {
      this.logAction(`Error deleting subject ${subjectId}`, { error: error });
      console.error('❌ CourseService.deleteSubject error:', error);
      return false;
    }
  }

  /**
   * Reorder subject within course
   */
  async reorderSubject(subjectId: number, newOrderIndex: number): Promise<boolean> {
    try {
      this.logAction(`Reordering subject ${subjectId}`, {
        new_order: newOrderIndex
      });
      
      await api.put(`/subjects/${subjectId}/reorder`, { new_order_index: newOrderIndex });
      
      this.logAction('Subject reordered successfully', {
        subject_id: subjectId,
        new_order: newOrderIndex
      });
      
      return true;
    } catch (error) {
      this.logAction(`Error reordering subject ${subjectId}`, { error: error });
      console.error('❌ CourseService.reorderSubject error:', error);
      return false;
    }
  }

  // ========== SEARCH AND FILTER OPERATIONS ==========

  /**
   * Get subjects by professor name
   */
  async getSubjectsByProfessor(professorName: string): Promise<Subject[]> {
    try {
      this.logAction(`Fetching subjects by professor "${professorName}"`);
      
      const response = await api.get<Subject[]>(`/subjects/professor/${encodeURIComponent(professorName)}`);
      const subjects = Array.isArray(response) ? response : [];
      
      this.logAction('Subjects by professor fetched', {
        professor: professorName,
        subjects_count: subjects.length
      });
      
      return subjects;
    } catch (error) {
      this.logAction(`Error fetching subjects by professor "${professorName}"`, { error: error });
      console.error('❌ CourseService.getSubjectsByProfessor error:', error);
      return [];
    }
  }

  /**
   * Search courses by title or description
   */
  async searchCourses(query: string): Promise<Course[]> {
    try {
      this.logAction(`Searching courses for "${query}"`);
      
      const allCourses = await this.getAllCoursesBasic();
      const filteredCourses = allCourses.filter(course => 
        course.title.toLowerCase().includes(query.toLowerCase()) ||
        course.description?.toLowerCase().includes(query.toLowerCase()) ||
        course.category?.toLowerCase().includes(query.toLowerCase())
      );
      
      this.logAction('Course search completed', {
        query: query,
        total_courses: allCourses.length,
        matching_courses: filteredCourses.length
      });
      
      return filteredCourses;
    } catch (error) {
      this.logAction(`Error searching courses for "${query}"`, { error: error });
      console.error('❌ CourseService.searchCourses error:', error);
      return [];
    }
  }

  /**
   * Filter courses by difficulty level
   */
  async getCoursesByDifficulty(difficultyLevel: string): Promise<Course[]> {
    try {
      this.logAction(`Fetching courses by difficulty "${difficultyLevel}"`);
      
      const allCourses = await this.getAllCoursesBasic();
      const filteredCourses = allCourses.filter(course => 
        course.difficulty_level?.toLowerCase() === difficultyLevel.toLowerCase()
      );
      
      this.logAction('Courses by difficulty fetched', {
        difficulty: difficultyLevel,
        courses_count: filteredCourses.length
      });
      
      return filteredCourses;
    } catch (error) {
      this.logAction(`Error fetching courses by difficulty "${difficultyLevel}"`, { error: error });
      console.error('❌ CourseService.getCoursesByDifficulty error:', error);
      return [];
    }
  }

  // ========== STATISTICS AND ANALYTICS ==========

  /**
   * Get comprehensive course statistics
   */
  async getCourseStatistics(): Promise<CourseStatistics | null> {
    try {
      this.logAction('Fetching course statistics');
      
      const response = await api.get<CourseStatistics>('/courses/admin/statistics');
      
      this.logAction('Course statistics fetched', {
        total_courses: response.total_courses,
        total_subjects: response.total_subjects,
        total_videos: response.total_videos,
        total_hours: response.total_hours
      });
      
      return response;
    } catch (error) {
      this.logAction('Error fetching course statistics', { error: error });
      console.error('❌ CourseService.getCourseStatistics error:', error);
      return null;
    }
  }

  /**
   * Get subject statistics
   */
  async getSubjectStatistics(): Promise<any> {
    try {
      this.logAction('Fetching subject statistics');
      
      const response = await api.get('/subjects/admin/statistics');
      
      this.logAction('Subject statistics fetched', response);
      
      return response;
    } catch (error) {
      this.logAction('Error fetching subject statistics', { error: error });
      console.error('❌ CourseService.getSubjectStatistics error:', error);
      return null;
    }
  }

  // ========== UTILITY METHODS ==========

  /**
   * Get course thumbnail URL
   */
  getCourseThumbnailUrl(course: Course): string {
    if (!course.thumbnail_path) {
      this.logAction('Using placeholder thumbnail', { course_id: course.id });
      return '/api/placeholder/400/300';
    }
    
    const baseUrl = this.getBaseUrl();
    const thumbnailUrl = `${baseUrl}${course.thumbnail_path}`;
    
    this.logAction('Generated course thumbnail URL', {
      course_id: course.id,
      url: thumbnailUrl
    });
    
    return thumbnailUrl;
  }

  /**
   * Format course duration from hours
   */
  formatCourseDuration(totalHours: number): string {
    if (totalHours === 0) return 'No duration set';
    
    if (totalHours < 1) {
      const minutes = Math.round(totalHours * 60);
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    } else if (totalHours < 24) {
      return `${totalHours} hour${totalHours !== 1 ? 's' : ''}`;
    } else {
      const days = Math.floor(totalHours / 24);
      const remainingHours = totalHours % 24;
      let result = `${days} day${days !== 1 ? 's' : ''}`;
      if (remainingHours > 0) {
        result += ` ${remainingHours}h`;
      }
      return result;
    }
  }

  /**
   * Get difficulty level styling
   */
  getDifficultyColor(level: string): string {
    const colors = {
      'beginner': 'bg-green-100 text-green-800',
      'intermediate': 'bg-yellow-100 text-yellow-800',
      'advanced': 'bg-orange-100 text-orange-800',
      'expert': 'bg-red-100 text-red-800'
    };
    
    return colors[level?.toLowerCase() as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  }

  /**
   * Format file size
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const size = parseFloat((bytes / Math.pow(k, i)).toFixed(2));
    
    return `${size} ${sizes[i]}`;
  }

  /**
   * Format date for display
   */
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Validate course data before creation/update
   */
  validateCourseData(courseData: Partial<Course>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!courseData.title?.trim()) {
      errors.push('Course title is required');
    }
    
    if (!courseData.description?.trim()) {
      errors.push('Course description is required');
    }
    
    if (courseData.difficulty_level && 
        !['Beginner', 'Intermediate', 'Advanced', 'Expert'].includes(courseData.difficulty_level)) {
      errors.push('Invalid difficulty level');
    }
    
    this.logAction('Course data validation', {
      isValid: errors.length === 0,
      errors: errors
    });
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Validate subject data before creation/update
   */
  validateSubjectData(subjectData: Partial<Subject>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!subjectData.title?.trim()) {
      errors.push('Subject title is required');
    }
    
    if (!subjectData.professor_name?.trim()) {
      errors.push('Professor name is required');
    }
    
    if (!subjectData.hours || subjectData.hours <= 0) {
      errors.push('Subject hours must be greater than 0');
    }
    
    this.logAction('Subject data validation', {
      isValid: errors.length === 0,
      errors: errors
    });
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  // ========== CACHE MANAGEMENT ==========
  
  private courseCache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Get cached data or fetch if expired
   */
  private async getCachedOrFetch<T>(
    cacheKey: string, 
    fetchFunction: () => Promise<T>
  ): Promise<T> {
    const cached = this.courseCache.get(cacheKey);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < this.CACHE_DURATION) {
      this.logAction('Using cached data', { cache_key: cacheKey });
      return cached.data;
    }
    
    const data = await fetchFunction();
    this.courseCache.set(cacheKey, { data, timestamp: now });
    
    this.logAction('Data cached', { cache_key: cacheKey });
    return data;
  }

  /**
   * Clear cache for specific key or all cache
   */
  clearCache(cacheKey?: string): void {
    if (cacheKey) {
      this.courseCache.delete(cacheKey);
      this.logAction('Cache cleared for key', { cache_key: cacheKey });
    } else {
      this.courseCache.clear();
      this.logAction('All cache cleared');
    }
  }
}

// Create and export singleton instance
export const courseService = new CourseService();

console.log('✅ CourseService initialized for Azizkh07');
console.log(`📅 Service ready at: 2025-08-19 20:58:29 UTC`);
console.log('📦 Features: Complete CRUD, caching, validation, statistics, search');

// Last updated: 2025-08-19 20:58:29 | Azizkh07