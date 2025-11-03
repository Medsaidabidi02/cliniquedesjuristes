import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { api } from '../lib/api';
import { videoService } from '../lib/videoService';
import Header from '../components/Header';
import Loading from '../components/Loading';

interface Video {
  id: number;
  title: string;
  description?: string;
  video_path: string;
  thumbnail_path?: string;
  duration?: number;
  is_active: boolean;
  is_locked?: boolean;
  order_index?: number;
  subject_id?: number;
}

interface Subject {
  id: number;
  title: string;
  description?: string;
  videos: Video[];
}

interface Course {
  id: number;
  title: string;
  description?: string;
  subjects: Subject[];
}

const CoursePlayerPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentVideo, setCurrentVideo] = useState<Video | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [loadingVideo, setLoadingVideo] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    loadCourseData();
  }, [courseId]);

  useEffect(() => {
    if (course && course.subjects.length > 0) {
      // Auto-select first unlocked video
      const firstSubject = course.subjects[0];
      if (firstSubject.videos.length > 0) {
        const firstUnlockedVideo = firstSubject.videos.find(v => !v.is_locked);
        if (firstUnlockedVideo) {
          handleVideoSelect(firstUnlockedVideo);
        }
      }
    }
  }, [course]);

  const loadCourseData = async () => {
    try {
      setLoading(true);
      setError('');

      // Get course with subjects and videos
      const courseResponse = await api.get(`/api/courses/${courseId}`);
      const subjectsResponse = await api.get(`/api/subjects?course_id=${courseId}`);
      
      // Get videos for all subjects
      const subjects: Subject[] = [];
      for (const subject of subjectsResponse) {
        const videosResponse = await api.get(`/api/videos?subject_id=${subject.id}`);
        subjects.push({
          ...subject,
          videos: videosResponse || []
        });
      }

      const courseData: Course = {
        ...courseResponse,
        subjects
      };

      setCourse(courseData);

      // Check if user has access to this course
      if (isAuthenticated) {
        try {
          const accessResponse = await api.get(`/user-courses/me`);
          const userCourses = accessResponse.courses || [];
          const hasEnrollment = userCourses.some((c: any) => c.id === parseInt(courseId || '0'));
          setHasAccess(hasEnrollment || user?.is_admin || false);
        } catch (err) {
          setHasAccess(false);
        }
      }

    } catch (err: any) {
      console.error('Error loading course:', err);
      setError(err.message || 'Failed to load course');
    } finally {
      setLoading(false);
    }
  };

  const handleVideoSelect = async (video: Video) => {
    if (video.is_locked && !hasAccess) {
      alert('Cette vidéo est verrouillée. Vous devez vous inscrire au cours pour y accéder.');
      return;
    }

    setCurrentVideo(video);
    setLoadingVideo(true);
    setVideoUrl('');

    try {
      // Get signed URL from backend
      const streamUrl = await videoService.getVideoStreamUrl(video);
      setVideoUrl(streamUrl);
    } catch (err: any) {
      console.error('Error loading video URL:', err);
      alert('Erreur lors du chargement de la vidéo: ' + (err.message || 'Unknown error'));
    } finally {
      setLoadingVideo(false);
    }
  };

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <Loading fullScreen text="Chargement du cours..." />
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-600 font-medium">{error || 'Cours introuvable'}</p>
            <button
              onClick={() => navigate('/courses')}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded transition"
            >
              Retour aux cours
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-6">
        {/* Course Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/courses')}
            className="text-blue-600 hover:text-blue-700 flex items-center gap-2 mb-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Retour aux cours
          </button>
          <h1 className="text-3xl font-bold text-gray-900">{course.title}</h1>
          {course.description && (
            <p className="text-gray-600 mt-2">{course.description}</p>
          )}
        </div>

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Player - Left/Center Column (2 cols on lg) */}
          <div className="lg:col-span-2">
            <div className="bg-black rounded-lg overflow-hidden shadow-lg" style={{ aspectRatio: '16/9' }}>
              {loadingVideo ? (
                <div className="w-full h-full flex items-center justify-center">
                  <Loading text="Chargement de la vidéo..." />
                </div>
              ) : currentVideo && videoUrl ? (
                <video
                  key={videoUrl}
                  className="w-full h-full"
                  controls
                  controlsList="nodownload"
                  disablePictureInPicture
                  preload="none"
                  src={videoUrl}
                  poster={currentVideo.thumbnail_path ? videoService.getThumbnailUrl(currentVideo) : undefined}
                >
                  Votre navigateur ne supporte pas la lecture de vidéos.
                </video>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white">
                  <div className="text-center">
                    <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p>Sélectionnez une vidéo pour commencer</p>
                  </div>
                </div>
              )}
            </div>

            {/* Video Info */}
            {currentVideo && (
              <div className="mt-4 bg-white rounded-lg shadow p-4">
                <h2 className="text-xl font-bold text-gray-900">{currentVideo.title}</h2>
                {currentVideo.description && (
                  <p className="text-gray-600 mt-2">{currentVideo.description}</p>
                )}
                {currentVideo.duration && (
                  <p className="text-sm text-gray-500 mt-2">
                    Durée: {formatDuration(currentVideo.duration)}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Lesson List - Right Column */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden sticky top-6">
              <div className="bg-blue-600 text-white px-4 py-3">
                <h3 className="font-semibold">Contenu du cours</h3>
              </div>
              
              <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
                {course.subjects.map((subject) => (
                  <div key={subject.id} className="border-b border-gray-200 last:border-b-0">
                    {/* Subject Header */}
                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                      <h4 className="font-medium text-gray-900 text-sm">{subject.title}</h4>
                    </div>
                    
                    {/* Videos List */}
                    {subject.videos.map((video) => {
                      const isLocked = video.is_locked && !hasAccess;
                      const isActive = currentVideo?.id === video.id;
                      
                      return (
                        <button
                          key={video.id}
                          onClick={() => handleVideoSelect(video)}
                          disabled={isLocked}
                          className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition ${
                            isActive ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                          } ${isLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          {/* Thumbnail */}
                          <div className="relative flex-shrink-0">
                            <div 
                              className="w-20 h-12 bg-gray-200 rounded overflow-hidden"
                              style={{ 
                                backgroundImage: video.thumbnail_path 
                                  ? `url(${videoService.getThumbnailUrl(video)})` 
                                  : undefined,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center'
                              }}
                            >
                              {!video.thumbnail_path && (
                                <div className="w-full h-full flex items-center justify-center">
                                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                  </svg>
                                </div>
                              )}
                            </div>
                            
                            {/* Lock Badge */}
                            {isLocked && (
                              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                              </div>
                            )}
                            
                            {/* Duration */}
                            {video.duration && (
                              <div className="absolute bottom-1 right-1 bg-black bg-opacity-75 text-white text-xs px-1 rounded">
                                {formatDuration(video.duration)}
                              </div>
                            )}
                          </div>
                          
                          {/* Video Info */}
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${isActive ? 'text-blue-600' : 'text-gray-900'} truncate`}>
                              {video.title}
                            </p>
                            {isLocked && (
                              <p className="text-xs text-gray-500 mt-1">
                                <svg className="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                Verrouillé
                              </p>
                            )}
                          </div>
                        </button>
                      );
                    })}
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

export default CoursePlayerPage;
