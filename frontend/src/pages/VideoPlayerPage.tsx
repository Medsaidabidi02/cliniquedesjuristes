import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api, getErrorMessage } from '../lib/api';
import { Video } from '../lib/videoService';
import { useAuth } from '../lib/AuthContext';
import ProfessionalVideoPlayer from '../components/ProfessionalVideoPlayer';
import Header from '../components/Header';

interface Subject {
  id: number;
  title: string;
  description: string;
  professor_name: string;
  hours: number;
  course_id: number;
  videos: Video[];
}

interface Course {
  id: number;
  title: string;
  description: string;
  category: string;
  cover_image: string;
}

const VideoPlayerPage: React.FC = () => {
  const { courseId, videoId } = useParams<{ courseId: string; videoId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentVideo, setCurrentVideo] = useState<Video | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [allVideos, setAllVideos] = useState<Video[]>([]);
  const [hasAccess, setHasAccess] = useState(false);
  const [enrollmentData, setEnrollmentData] = useState<{
    hasFullAccess: boolean;
    allowedSubjectIds: Set<number>;
  } | null>(null);

  useEffect(() => {
    loadVideoData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, videoId]);

  const loadVideoData = async () => {
    try {
      setLoading(true);
      setError('');

      // Load course data
      const courseRes: any = await api.get(`/courses/${courseId}`);
      if (courseRes && courseRes.success) {
        setCourse(courseRes.course);
      }

      // Load subjects with videos
      const subjectsRes: any = await api.get(`/subjects?course_id=${courseId}`);
      if (subjectsRes && subjectsRes.success && Array.isArray(subjectsRes.subjects)) {
        const subjectsWithVideos = await Promise.all(
          subjectsRes.subjects.map(async (subject: Subject) => {
            const videosRes: any = await api.get(`/videos?subject_id=${subject.id}`);
            const videos = Array.isArray(videosRes) ? videosRes : [];
            return { ...subject, videos };
          })
        );
        
        setSubjects(subjectsWithVideos);
        
        // Flatten all videos
        const videos = subjectsWithVideos.flatMap(s => s.videos);
        setAllVideos(videos);
        
        // Find current video
        const video = videos.find(v => v.id === parseInt(videoId || '0'));
        if (video) {
          setCurrentVideo(video);
        } else {
          setError(t('video.not_found', 'Video not found'));
        }
      }

      // Check enrollment and access
      if (isAuthenticated) {
        const enrollmentRes: any = await api.get('/user-courses/me');
        if (enrollmentRes && enrollmentRes.success && Array.isArray(enrollmentRes.courses)) {
          const enrolledCourse = enrollmentRes.courses.find(
            (c: any) => c.id === parseInt(courseId || '0')
          );
          
          if (enrolledCourse) {
            const subjectIds = enrolledCourse.subjects 
              ? enrolledCourse.subjects.map((s: any) => s.id) 
              : [];
            
            setEnrollmentData({
              hasFullAccess: enrolledCourse.hasFullAccess || false,
              allowedSubjectIds: new Set(subjectIds)
            });
            
            setHasAccess(true);
          }
        }
      }

      setLoading(false);
    } catch (err) {
      console.error('Error loading video data:', err);
      setError(getErrorMessage(err));
      setLoading(false);
    }
  };

  const handleVideoSelect = (video: Video) => {
    // Check access before switching
    if (!hasVideoAccess(video)) {
      alert(t('video.no_access', "You don't have access to this video"));
      return;
    }

    navigate(`/course/${courseId}/video/${video.id}`, { replace: true });
  };

  const hasVideoAccess = (video: Video): boolean => {
    if (!isAuthenticated || !enrollmentData) {
      return false;
    }

    // If user has full course access
    if (enrollmentData.hasFullAccess) {
      return true;
    }

    // Check subject-level access
    if (video.subject_id && enrollmentData.allowedSubjectIds.has(video.subject_id)) {
      return true;
    }

    return false;
  };

  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getThumbnailUrl = (video: Video): string => {
    if (video.thumbnail_path) {
      // Check if it's already a full Bunny.net URL
      if (video.thumbnail_path.startsWith('https://')) {
        return video.thumbnail_path;
      }
      
      // Legacy: construct URL for local thumbnails
      const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001';
      const filename = video.thumbnail_path.split('/').pop();
      return `${baseUrl}/api/videos/thumbnail/${filename}`;
    }
    
    // Return placeholder
    return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180"%3E%3Crect width="320" height="180" fill="%23e5e7eb"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="24" fill="%236b7280"%3ENo Thumbnail%3C/text%3E%3C/svg%3E';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">{t('video.loading', 'Loading video...')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">{t('video.error', 'Error')}</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Link 
              to="/courses" 
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition"
            >
              {t('video.back_to_courses', 'Back to Courses')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!currentVideo) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="text-gray-400 text-6xl mb-4">🎬</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">{t('video.not_found', 'Video not found')}</h2>
            <Link 
              to="/courses" 
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition"
            >
              {t('video.back_to_courses', 'Back to Courses')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center h-screen">
          <div className="text-center max-w-md mx-auto p-8">
            <div className="text-yellow-500 text-6xl mb-4">🔒</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              {t('video.access_denied', 'Access Denied')}
            </h2>
            <p className="text-gray-600 mb-4">
              {t('video.enroll_required', 'You need to be enrolled in this course to watch this video.')}
            </p>
            <Link 
              to="/courses" 
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition"
            >
              {t('video.back_to_courses', 'Back to Courses')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />
      
      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main Video Player */}
          <div className="flex-1">
            {/* Course Breadcrumb */}
            <div className="mb-4">
              <Link 
                to="/courses" 
                className="text-gray-400 hover:text-white transition"
              >
                {t('video.courses', 'Courses')}
              </Link>
              <span className="text-gray-500 mx-2">/</span>
              <Link 
                to={`/courses`} 
                className="text-gray-400 hover:text-white transition"
              >
                {course?.title || t('video.course', 'Course')}
              </Link>
            </div>

            {/* Video Player */}
            <div className="bg-black rounded-lg overflow-hidden shadow-2xl mb-4" style={{ aspectRatio: '16/9' }}>
              <ProfessionalVideoPlayer
                video={currentVideo}
                isAuthenticated={isAuthenticated}
                autoPlay={true}
                className="w-full h-full"
              />
            </div>

            {/* Video Info */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h1 className="text-2xl font-bold text-white mb-2">{currentVideo.title}</h1>
              {currentVideo.description && (
                <p className="text-gray-300 mb-4">{currentVideo.description}</p>
              )}
              {currentVideo.subject_title && (
                <div className="flex items-center gap-4 text-sm text-gray-400">
                  <span className="flex items-center gap-2">
                    <span>📚</span>
                    <span>{currentVideo.subject_title}</span>
                  </span>
                  {currentVideo.professor_name && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-2">
                        <span>👨‍🏫</span>
                        <span>{currentVideo.professor_name}</span>
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Video Sidebar */}
          <div className="lg:w-96">
            <div className="bg-gray-800 rounded-lg overflow-hidden sticky top-4" style={{ maxHeight: 'calc(100vh - 120px)' }}>
              <div className="p-4 border-b border-gray-700">
                <h2 className="text-lg font-bold text-white">
                  {t('video.course_content', 'Course Content')}
                </h2>
                <p className="text-sm text-gray-400">
                  {allVideos.length} {t('video.videos', 'videos')}
                </p>
              </div>
              
              <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 220px)' }}>
                {subjects.map((subject) => (
                  <div key={subject.id} className="border-b border-gray-700">
                    {/* Subject Header */}
                    <div className="p-4 bg-gray-750">
                      <h3 className="font-semibold text-white text-sm mb-1">
                        {subject.title}
                      </h3>
                      <p className="text-xs text-gray-400">
                        {subject.videos.length} {t('video.videos', 'videos')} • {subject.hours}h
                      </p>
                    </div>

                    {/* Video List */}
                    <div className="bg-gray-800">
                      {subject.videos.map((video, index) => {
                        const isCurrentVideo = video.id === currentVideo.id;
                        const hasAccess = hasVideoAccess(video);
                        
                        return (
                          <div
                            key={video.id}
                            onClick={() => hasAccess && handleVideoSelect(video)}
                            className={`
                              flex gap-3 p-3 cursor-pointer transition-colors
                              ${isCurrentVideo ? 'bg-blue-600 bg-opacity-20 border-l-4 border-blue-600' : 'hover:bg-gray-700'}
                              ${!hasAccess ? 'opacity-50 cursor-not-allowed' : ''}
                            `}
                          >
                            {/* Thumbnail */}
                            <div className="flex-shrink-0 relative">
                              <img
                                src={getThumbnailUrl(video)}
                                alt={video.title}
                                className="w-28 h-16 object-cover rounded"
                              />
                              {video.duration && (
                                <span className="absolute bottom-1 right-1 bg-black bg-opacity-75 text-white text-xs px-1 rounded">
                                  {formatDuration(video.duration)}
                                </span>
                              )}
                              {!hasAccess && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-60 rounded">
                                  <span className="text-2xl">🔒</span>
                                </div>
                              )}
                            </div>

                            {/* Video Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start gap-2">
                                <span className={`text-xs font-semibold ${isCurrentVideo ? 'text-blue-400' : 'text-gray-500'}`}>
                                  {index + 1}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <h4 className={`text-sm font-medium line-clamp-2 ${isCurrentVideo ? 'text-white' : 'text-gray-300'}`}>
                                    {video.title}
                                  </h4>
                                  {isCurrentVideo && (
                                    <span className="text-xs text-blue-400 mt-1 inline-block">
                                      ▶ {t('video.now_playing', 'Now playing')}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayerPage;
