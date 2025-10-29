import { api } from './api';

export interface Video {
  id: number;
  title: string;
  description?: string;
  subject_id?: number;
  course_id?: number;
  course_title?: string;
  subject_title?: string;
  professor_name?: string;
  video_path: string;
  file_path?: string; // Legacy field for backward compatibility
  file_size?: number;
  duration?: number;
  mime_type?: string;
  thumbnail_path?: string;
  preview_url?: string;
  is_active: boolean;
  order_index?: number;
  created_at: string;
  updated_at: string;
  views_count?: number;
  likes_count?: number;
}

export interface VideoStats {
  total_videos: number;
  active_videos: number;
  subjects_with_videos: number;
  total_size: number;
}

export interface VideoUploadData {
  title: string;
  description: string;
  subject_id?: number;
  order_index?: number;
  is_active: boolean;
}

export interface UploadOption {
  course_id: number;
  course_title: string;
  category: string;
  subjects: Array<{
    subject_id: number;
    subject_title: string;
    professor_name: string;
    hours: number;
    video_count: number;
  }>;
}

export class VideoService {
  // Get all videos with subject information
  async getAllVideosWithSubjects(): Promise<Video[]> {
    try {
      console.log('🎬 Fetching all videos with subjects for Azizkh07 at 2025-08-20 14:16:05...');
      
      const response = await api.get<Video[]>('/api/videos');
      
      // Ensure video_path is available (fallback to file_path for legacy data)
      const videos = Array.isArray(response) ? response.map(video => ({
        ...video,
        video_path: video.video_path || video.file_path || '',
        course_title: video.course_title || 'Aucun cours',
        subject_title: video.subject_title || 'Aucune matière',
        professor_name: video.professor_name || 'Aucun professeur',
        file_size: video.file_size || 0,
        duration: video.duration || 0,
        order_index: video.order_index || 0,
        views_count: video.views_count || 0,
        likes_count: video.likes_count || 0
      })) : [];
      
      console.log(`✅ Fetched ${videos.length} videos for Azizkh07 at 2025-08-20 14:16:05`);
      return videos;
    } catch (error) {
      console.error('❌ Error fetching videos with subjects for Azizkh07 at 2025-08-20 14:16:05:', error);
      return [];
    }
  }

  // Get video statistics from the dedicated endpoint
  async getVideoStats(): Promise<VideoStats> {
    try {
      console.log('📊 Fetching video statistics for Azizkh07 at 2025-08-20 14:16:05...');
      
      const response = await api.get<VideoStats>('/api/videos/admin/stats');
      
      const stats: VideoStats = {
        total_videos: response.total_videos || 0,
        active_videos: response.active_videos || 0,
        subjects_with_videos: response.subjects_with_videos || 0,
        total_size: response.total_size || 0
      };
      
      console.log('✅ Video stats fetched for Azizkh07 at 2025-08-20 14:16:05:', stats);
      return stats;
    } catch (error) {
      console.error('❌ Error fetching video stats for Azizkh07 at 2025-08-20 14:16:05:', error);
      
      // Fallback: calculate stats from video list
      try {
        console.log('🔄 Calculating stats from video list as fallback for Azizkh07...');
        const videos = await this.getAllVideosWithSubjects();
        
        const fallbackStats: VideoStats = {
          total_videos: videos.length,
          active_videos: videos.filter(v => v.is_active).length,
          subjects_with_videos: new Set(videos.map(v => v.subject_id).filter(Boolean)).size,
          total_size: videos.reduce((sum, v) => sum + (v.file_size || 0), 0)
        };
        
        console.log('✅ Fallback stats calculated for Azizkh07:', fallbackStats);
        return fallbackStats;
      } catch (fallbackError) {
        console.error('❌ Fallback stats calculation failed for Azizkh07:', fallbackError);
        return {
          total_videos: 0,
          active_videos: 0,
          subjects_with_videos: 0,
          total_size: 0
        };
      }
    }
  }

  // Get videos by subject
  async getVideosBySubject(subjectId: number): Promise<Video[]> {
    try {
      console.log(`🎬 Fetching videos for subject ${subjectId} for Azizkh07 at 2025-08-20 14:16:05...`);
      
      const allVideos = await this.getAllVideosWithSubjects();
      const subjectVideos = allVideos.filter(video => video.subject_id === subjectId);
      
      console.log(`✅ Found ${subjectVideos.length} videos for subject ${subjectId} at 2025-08-20 14:16:05`);
      return subjectVideos;
    } catch (error) {
      console.error(`❌ Error fetching videos by subject ${subjectId} for Azizkh07 at 2025-08-20 14:16:05:`, error);
      return [];
    }
  }

  // Get single video by ID
  async getVideoById(videoId: number): Promise<Video | null> {
    try {
      console.log(`🎬 Fetching video ${videoId} for Azizkh07 at 2025-08-20 14:16:05...`);
      
      const response = await api.get<Video>(`/api/videos/${videoId}`);
      
      const video: Video = {
        ...response,
        video_path: response.video_path || response.file_path || '',
        course_title: response.course_title || 'Aucun cours',
        subject_title: response.subject_title || 'Aucune matière',
        professor_name: response.professor_name || 'Aucun professeur'
      };
      
      console.log(`✅ Fetched video ${videoId} for Azizkh07 at 2025-08-20 14:16:05`);
      return video;
    } catch (error) {
      console.error(`❌ Error fetching video ${videoId} for Azizkh07 at 2025-08-20 14:16:05:`, error);
      return null;
    }
  }

  // Get upload options for video form
  async getUploadOptions(): Promise<UploadOption[]> {
    try {
      console.log('📋 Fetching upload options for Azizkh07 at 2025-08-20 14:16:05...');
      
      // Get courses and subjects using existing endpoints
      const [coursesResponse, subjectsResponse] = await Promise.all([
        api.get<any[]>('/api/courses'),
        api.get<any[]>('/api/subjects')
      ]);
      
      const courses = Array.isArray(coursesResponse) ? coursesResponse : [];
      const subjects = Array.isArray(subjectsResponse) ? subjectsResponse : [];
      
      console.log(`📊 Loaded ${courses.length} courses and ${subjects.length} subjects for Azizkh07`);
      
      const uploadOptions: UploadOption[] = [];
      
      for (const course of courses) {
        if (course.is_active) {
          // Filter subjects for this course
          const courseSubjects = subjects.filter(s => s.course_id === course.id && s.is_active);
          
          if (courseSubjects.length > 0) {
            // Get video count for each subject
            const allVideos = await this.getAllVideosWithSubjects();
            
            uploadOptions.push({
              course_id: course.id,
              course_title: course.title,
              category: course.category || 'Général',
              subjects: courseSubjects.map(subject => ({
                subject_id: subject.id,
                subject_title: subject.title,
                professor_name: subject.professor_name,
                hours: subject.hours || 0,
                video_count: allVideos.filter(v => v.subject_id === subject.id).length
              }))
            });
          }
        }
      }
      
      console.log(`✅ Generated ${uploadOptions.length} upload options for Azizkh07 at 2025-08-20 14:16:05`);
      return uploadOptions;
    } catch (error) {
      console.error('❌ Error fetching upload options for Azizkh07 at 2025-08-20 14:16:05:', error);
      return [];
    }
  }

  // Get video stream URL for playback
  getVideoStreamUrl(video: Video): string {
    const videoPath = video.video_path || video.file_path;
    if (videoPath) {
      // Use the streaming endpoint for better video delivery
      const streamUrl = `${window.location.origin}/api/videos/stream/${videoPath}`;
      console.log(`🎬 Generated stream URL for video ${video.id} for Azizkh07: ${streamUrl}`);
      return streamUrl;
    }
    console.log(`⚠️ No video path found for video ${video.id} for Azizkh07`);
    return '';
  }

  // Get video download URL
  getVideoDownloadUrl(video: Video): string {
    const videoPath = video.video_path || video.file_path;
    if (videoPath) {
      const downloadUrl = `${window.location.origin}/uploads/videos/${videoPath}`;
      console.log(`📥 Generated download URL for video ${video.id} for Azizkh07: ${downloadUrl}`);
      return downloadUrl;
    }
    return '';
  }

  // Get thumbnail URL
  getThumbnailUrl(video: Video): string {
    if (video.thumbnail_path) {
      // If it's already a full URL, return as is
      if (video.thumbnail_path.startsWith('http')) {
        return video.thumbnail_path;
      }
      
      // Use the thumbnail endpoint for better delivery
      const thumbnailUrl = `${window.location.origin}/api/videos/thumbnail/${video.thumbnail_path}`;
      console.log(`🖼️ Generated thumbnail URL for video ${video.id} for Azizkh07: ${thumbnailUrl}`);
      return thumbnailUrl;
    }
    
    // Fallback to placeholder
    console.log(`⚠️ No thumbnail found for video ${video.id} for Azizkh07, using placeholder`);
    return '/api/placeholder/320/180';
  }

  // Delete video
  async deleteVideo(id: number): Promise<boolean> {
    try {
      console.log(`🗑️ Deleting video ${id} for Azizkh07 at 2025-08-20 14:16:05...`);
      
      await api.delete(`/api/videos/${id}`);
      
      console.log(`✅ Video ${id} deleted successfully for Azizkh07 at 2025-08-20 14:16:05`);
      return true;
    } catch (error) {
      console.error(`❌ Error deleting video ${id} for Azizkh07 at 2025-08-20 14:16:05:`, error);
      return false;
    }
  }

  // Upload video with progress tracking
  async uploadVideo(
    videoData: FormData, 
    onProgress?: (percentage: number) => void
  ): Promise<Video> {
    try {
      console.log('📤 Starting video upload for Azizkh07 at 2025-08-20 14:16:05...');
      
      // Log FormData contents for debugging
      const entries = Array.from(videoData.entries());
      console.log('📋 FormData entries for Azizkh07:', entries.map(([key, value]) => 
        value instanceof File ? `${key}: ${value.name} (${value.size} bytes)` : `${key}: ${value}`
      ));
      
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        // Handle upload progress
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable && onProgress) {
            const percentage = Math.round((event.loaded / event.total) * 100);
            console.log(`📊 Upload progress for Azizkh07: ${percentage}% (${event.loaded}/${event.total} bytes)`);
            onProgress(percentage);
          }
        });
        
        // Handle completion
        xhr.addEventListener('load', () => {
          console.log(`📥 Upload response for Azizkh07: ${xhr.status} ${xhr.statusText}`);
          
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const result = JSON.parse(xhr.responseText);
              console.log('✅ Video uploaded successfully for Azizkh07 at 2025-08-20 14:16:05:', {
                id: result.id,
                title: result.title,
                video_path: result.video_path,
                file_size: result.file_size
              });
              resolve(result);
            } catch (parseError) {
              console.error('❌ Error parsing upload response for Azizkh07 at 2025-08-20 14:16:05:', parseError);
              reject(new Error('Invalid response format from server'));
            }
          } else {
            console.error(`❌ Upload failed for Azizkh07 at 2025-08-20 14:16:05: ${xhr.status} ${xhr.statusText}`);
            
            // Try to parse error message
            try {
              const errorResponse = JSON.parse(xhr.responseText);
              reject(new Error(errorResponse.message || `Upload failed: ${xhr.status} ${xhr.statusText}`));
            } catch (e) {
              reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
            }
          }
        });
        
        // Handle errors
        xhr.addEventListener('error', () => {
          console.error('❌ Network error during upload for Azizkh07 at 2025-08-20 14:16:05');
          reject(new Error('Network error during upload. Please check your connection.'));
        });
        
        // Handle timeout
        xhr.addEventListener('timeout', () => {
          console.error('❌ Upload timeout for Azizkh07 at 2025-08-20 14:16:05');
          reject(new Error('Upload timeout. The file may be too large.'));
        });
        
        // Set up the request
        xhr.open('POST', '/api/videos');
        xhr.timeout = 30 * 60 * 1000; // 30 minutes timeout for large files
        
        // Add auth header if available
        const token = localStorage.getItem('authToken');
        if (token) {
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
          console.log('🔐 Auth header added to upload request for Azizkh07');
        } else {
          console.log('⚠️ No auth token found for upload request - Azizkh07');
        }
        
        // Don't set Content-Type header - let browser set it with boundary for FormData
        console.log('📤 Sending upload request for Azizkh07 at 2025-08-20 14:16:05...');
        xhr.send(videoData);
      });
      
    } catch (error) {
      console.error('❌ Error during video upload for Azizkh07 at 2025-08-20 14:16:05:', error);
      throw error;
    }
  }

  // Update video metadata
  async updateVideo(
    id: number,
    updateData: Partial<VideoUploadData>
  ): Promise<Video> {
    try {
      console.log(`📝 Updating video ${id} for Azizkh07 at 2025-08-20 14:16:05...`);
      
      const response = await api.put<Video>(`/api/videos/${id}`, updateData);
      
      console.log(`✅ Video ${id} updated successfully for Azizkh07 at 2025-08-20 14:16:05`);
      return response;
    } catch (error) {
      console.error(`❌ Error updating video ${id} for Azizkh07 at 2025-08-20 14:16:05:`, error);
      throw error;
    }
  }

  // Format file size to human readable format
  formatFileSize(bytes?: number): string {
    if (!bytes || bytes === 0) return 'Inconnu';
    
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    const formatted = size.toFixed(unitIndex === 0 ? 0 : 1) + ' ' + units[unitIndex];
    console.log(`📏 Formatted file size for Azizkh07: ${bytes} bytes → ${formatted}`);
    return formatted;
  }

  // Format date to French locale
  formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      const formatted = date.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      console.log(`📅 Formatted date for Azizkh07: ${dateString} → ${formatted}`);
      return formatted;
    } catch (error) {
      console.error('❌ Error formatting date for Azizkh07:', error);
      return 'Date invalide';
    }
  }

  // Format duration from seconds to readable format
  formatDuration(seconds?: number): string {
    if (!seconds || seconds === 0) return 'Inconnu';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    let formatted: string;
    if (hours > 0) {
      formatted = `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    } else {
      formatted = `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    
    console.log(`⏱️ Formatted duration for Azizkh07: ${seconds}s → ${formatted}`);
    return formatted;
  }

  // Get video file extension from path
  getVideoFileExtension(video: Video): string {
    const videoPath = video.video_path || video.file_path;
    if (videoPath) {
      const extension = videoPath.split('.').pop()?.toLowerCase() || '';
      console.log(`📁 Video file extension for ${video.id}: ${extension}`);
      return extension;
    }
    return '';
  }

  // Check if video is supported format
  isVideoFormatSupported(video: Video): boolean {
    const supportedFormats = ['mp4', 'webm', 'ogg', 'mov', 'avi'];
    const extension = this.getVideoFileExtension(video);
    const isSupported = supportedFormats.includes(extension);
    
    console.log(`🎬 Video format support check for ${video.id}: ${extension} → ${isSupported ? 'supported' : 'not supported'}`);
    return isSupported;
  }

  // Calculate video quality based on file size and duration
  estimateVideoQuality(video: Video): 'SD' | 'HD' | 'FHD' | 'Unknown' {
    if (!video.file_size || !video.duration) return 'Unknown';
    
    // Rough estimation based on bitrate (bytes per second)
    const bytesPerSecond = video.file_size / video.duration;
    const bitsPerSecond = bytesPerSecond * 8;
    
    let quality: 'SD' | 'HD' | 'FHD' | 'Unknown';
    if (bitsPerSecond > 8000000) { // > 8 Mbps
      quality = 'FHD';
    } else if (bitsPerSecond > 3000000) { // > 3 Mbps
      quality = 'HD';
    } else if (bitsPerSecond > 1000000) { // > 1 Mbps
      quality = 'SD';
    } else {
      quality = 'Unknown';
    }
    
    console.log(`📺 Estimated video quality for ${video.id}: ${quality} (${Math.round(bitsPerSecond)} bps)`);
    return quality;
  }

  // Validate video upload data
  validateUploadData(data: FormData): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check required fields
    if (!data.get('title') || (data.get('title') as string).trim() === '') {
      errors.push('Le titre de la vidéo est requis');
    }
    
    if (!data.get('subject_id')) {
      errors.push('La matière est requise');
    }
    
    if (!data.get('video')) {
      errors.push('Le fichier vidéo est requis');
    }
    
    // Validate video file if present
    const videoFile = data.get('video') as File;
    if (videoFile && videoFile instanceof File) {
      // Check file type
      if (!videoFile.type.startsWith('video/')) {
        errors.push('Le fichier doit être une vidéo');
      }
      
      // Check file size (20GB limit)
      const maxSize = 20 * 1024 * 1024 * 1024; // 20GB
      if (videoFile.size > maxSize) {
        errors.push('La vidéo doit faire moins de 20GB');
      }
      
      if (videoFile.size === 0) {
        errors.push('Le fichier vidéo est vide');
      }
    }
    
    // Validate thumbnail if present
    const thumbnailFile = data.get('thumbnail') as File;
    if (thumbnailFile && thumbnailFile instanceof File) {
      if (!thumbnailFile.type.startsWith('image/')) {
        errors.push('La miniature doit être une image');
      }
      
      const maxThumbnailSize = 10 * 1024 * 1024; // 10MB
      if (thumbnailFile.size > maxThumbnailSize) {
        errors.push('La miniature doit faire moins de 10MB');
      }
    }
    
    const isValid = errors.length === 0;
    console.log(`✅ Upload validation for Azizkh07 at 2025-08-20 14:16:05: ${isValid ? 'passed' : 'failed'}`, 
                isValid ? '' : errors);
    
    return { valid: isValid, errors };
  }
}

// Export singleton instance
export const videoService = new VideoService();

console.log('🎬 VideoService initialized for Azizkh07 at 2025-08-20 14:16:05');

// Additional utility functions for video management
export const videoUtils = {
  // Generate video thumbnail from video element
  generateThumbnail(videoElement: HTMLVideoElement, width = 320, height = 180): Promise<Blob> {
    return new Promise((resolve, reject) => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        ctx.drawImage(videoElement, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            console.log(`🖼️ Generated thumbnail for Azizkh07: ${width}x${height}, ${blob.size} bytes`);
            resolve(blob);
          } else {
            reject(new Error('Failed to generate thumbnail blob'));
          }
        }, 'image/jpeg', 0.8);
        
      } catch (error) {
        console.error('❌ Error generating thumbnail for Azizkh07:', error);
        reject(error);
      }
    });
  },

  // Create FormData for video upload
  createUploadFormData(data: {
    title: string;
    description?: string;
    subject_id: number;
    is_active?: boolean;
    video: File;
    thumbnail?: File;
  }): FormData {
    const formData = new FormData();
    
    formData.append('title', data.title.trim());
    formData.append('description', data.description?.trim() || '');
    formData.append('subject_id', data.subject_id.toString());
    formData.append('is_active', (data.is_active !== false).toString());
    formData.append('video', data.video);
    
    if (data.thumbnail) {
      formData.append('thumbnail', data.thumbnail);
    }
    
    console.log('📋 Created FormData for video upload for Azizkh07:', {
      title: data.title,
      subject_id: data.subject_id,
      video_size: data.video.size,
      has_thumbnail: !!data.thumbnail
    });
    
    return formData;
  },

  // Extract video metadata
  extractVideoMetadata(file: File): Promise<{
    duration: number;
    width: number;
    height: number;
  }> {
    return new Promise((resolve, reject) => {
      try {
        const video = document.createElement('video');
        const url = URL.createObjectURL(file);
        
        video.addEventListener('loadedmetadata', () => {
          const metadata = {
            duration: Math.floor(video.duration),
            width: video.videoWidth,
            height: video.videoHeight
          };
          
          console.log('📊 Extracted video metadata for Azizkh07:', metadata);
          URL.revokeObjectURL(url);
          resolve(metadata);
        });
        
        video.addEventListener('error', () => {
          console.error('❌ Error loading video metadata for Azizkh07');
          URL.revokeObjectURL(url);
          reject(new Error('Failed to load video metadata'));
        });
        
        video.src = url;
      } catch (error) {
        console.error('❌ Error extracting video metadata for Azizkh07:', error);
        reject(error);
      }
    });
  }
};

console.log('🛠️ VideoService utilities loaded for Azizkh07 at 2025-08-20 14:16:05');