import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/AuthContext';
import Header from '../components/Header';
import Loading from '../components/Loading';
import '../styles/CoursePlayerPage.css';

interface Video {
  id: number;
  title: string;
  description: string;
  lesson_slug: string;
  duration: number;
  thumbnail_path: string;
  is_locked: boolean;
  is_active: boolean;
  order_index: number;
}

interface CourseMaterial {
  id: number;
  title: string;
  file_path: string;
  file_size: number;
  file_type: string;
}

interface Course {
  id: number;
  title: string;
  description: string;
  instructor: string;
  total_duration: number;
  materials: CourseMaterial[];
}

const CoursePlayerPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const mainContentRef = useRef<HTMLDivElement>(null);

  const [course, setCourse] = useState<Course | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [currentVideo, setCurrentVideo] = useState<Video | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingVideo, setLoadingVideo] = useState(false);
  const [error, setError] = useState<string>('');
  const [showDescription, setShowDescription] = useState(false);

  useEffect(() => {
    loadCourseData();
  }, [courseId]);

  useEffect(() => {
    // Handle scroll to show/hide description
    const handleScroll = () => {
      if (mainContentRef.current) {
        const scrollTop = mainContentRef.current.scrollTop;
        setShowDescription(scrollTop > 100);
      }
    };

    const mainContent = mainContentRef.current;
    if (mainContent) {
      mainContent.addEventListener('scroll', handleScroll);
      return () => mainContent.removeEventListener('scroll', handleScroll);
    }
  }, []);

  const loadCourseData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch course details
      const courseResponse = await api.get(`/api/courses/${courseId}`);
      setCourse(courseResponse);

      // Fetch videos for this course
      const videosResponse = await api.get(`/api/videos`);
      const courseVideos = videosResponse.filter(
        (v: any) => v.course_id === parseInt(courseId!)
      );

      // Sort by order_index
      courseVideos.sort((a: any, b: any) => a.order_index - b.order_index);
      
      setVideos(courseVideos);

      // Auto-select first unlocked video
      const firstUnlocked = courseVideos.find((v: any) => !v.is_locked);
      if (firstUnlocked) {
        await loadVideo(firstUnlocked);
      } else if (courseVideos.length > 0) {
        setCurrentVideo(courseVideos[0]);
      }

    } catch (err: any) {
      console.error('Error loading course data:', err);
      setError(err.response?.data?.message || 'Failed to load course data');
    } finally {
      setLoading(false);
    }
  };

  const loadVideo = async (video: Video) => {
    try {
      setLoadingVideo(true);
      setError('');
      setCurrentVideo(video);
      setSignedUrl(null);
      setThumbnailUrl(null);

      // Request signed URL from backend
      const response = await api.get(`/api/videos/${video.id}/signed-url`);

      if (response.success) {
        setSignedUrl(response.videoUrl);
        
        // Use thumbnail URL from API response if available
        if (response.thumbnailUrl) {
          setThumbnailUrl(response.thumbnailUrl);
        }
        
        // Wait for video element to be ready
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.load();
          }
        }, 100);
      } else {
        throw new Error(response.message || 'Failed to get video URL');
      }

    } catch (err: any) {
      console.error('Error loading video:', err);
      
      if (err.response?.status === 403) {
        setError('Vous n\'avez pas accès à cette vidéo. Veuillez vous inscrire au cours.');
      } else if (err.response?.status === 401) {
        setError('Veuillez vous connecter pour regarder cette vidéo.');
      } else {
        setError(err.response?.data?.message || 'Erreur lors du chargement de la vidéo');
      }
      
      setSignedUrl(null);
      setThumbnailUrl(null);
    } finally {
      setLoadingVideo(false);
    }
  };

  const handleVideoClick = (video: Video) => {
    if (video.is_locked && !isAuthenticated) {
      setError('Cette vidéo est verrouillée. Veuillez vous connecter.');
      return;
    }

    if (video.id === currentVideo?.id) {
      return; // Already playing
    }

    loadVideo(video);
  };

  const formatDuration = (seconds: number): string => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number): string => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const getTotalDuration = (): string => {
    const totalSeconds = videos.reduce((acc, video) => acc + (video.duration || 0), 0);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours}h ${minutes}min`;
  };

  if (loading) {
    return (
      <>
        <Header />
        <Loading fullScreen text="Chargement du cours..." />
      </>
    );
  }

  if (error && !currentVideo) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
            <div className="text-red-500 text-center mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-800 text-center mb-4">Erreur</h2>
            <p className="text-gray-600 text-center mb-6">{error}</p>
            <button
              onClick={() => navigate('/courses')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition"
            >
              Retour aux cours
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="course-player-page">
        <div className="course-player-container">
          {/* Main Video Player and Description */}
          <div className="video-player-section" ref={mainContentRef}>
            <div className="video-player-wrapper">
              {loadingVideo && (
                <div className="video-loading-overlay">
                  <div className="spinner"></div>
                  <p>Chargement de la vidéo...</p>
                </div>
              )}
              
              {error && currentVideo && (
                <div className="video-error-message">
                  <svg className="w-12 h-12 text-red-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p>{error}</p>
                </div>
              )}

              {signedUrl && !loadingVideo && (
                <video
                  ref={videoRef}
                  controls
                  preload="none"
                  className="video-player"
                  poster={thumbnailUrl || undefined}
                >
                  <source src={signedUrl} type="video/mp4" />
                  Votre navigateur ne supporte pas la lecture vidéo.
                </video>
              )}

              {!signedUrl && !loadingVideo && !error && (
                <div className="video-placeholder">
                  <svg className="w-24 h-24 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-gray-600">Sélectionnez une vidéo pour commencer</p>
                </div>
              )}
            </div>

            {currentVideo && (
              <div className="video-info">
                <h2 className="video-title">{currentVideo.title}</h2>
                {currentVideo.description && (
                  <p className="video-description">{currentVideo.description}</p>
                )}
              </div>
            )}

            {/* Course Description Section - Appears on Scroll */}
            <div className={`course-description-section ${showDescription ? 'visible' : ''}`}>
              {course && (
                <>
                  <div className="course-header">
                    <h1 className="course-main-title">{course.title}</h1>
                    <div className="course-meta">
                      {course.instructor && (
                        <div className="course-meta-item">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span>{course.instructor}</span>
                        </div>
                      )}
                      <div className="course-meta-item">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{getTotalDuration()}</span>
                      </div>
                      <div className="course-meta-item">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                        </svg>
                        <span>{videos.length} leçons</span>
                      </div>
                    </div>
                  </div>

                  <div className="course-content">
                    <h3 className="section-title">À propos de ce cours</h3>
                    <p className="course-full-description">{course.description}</p>
                  </div>

                  {/* Course Materials Section */}
                  {course.materials && course.materials.length > 0 && (
                    <div className="course-materials">
                      <h3 className="section-title">Matériel de cours</h3>
                      <div className="materials-list">
                        {course.materials.map((material) => (
                          <div key={material.id} className="material-item">
                            <div className="material-icon">
                              {material.file_type === 'pdf' ? (
                                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                                </svg>
                              ) : (
                                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                            <div className="material-info">
                              <div className="material-title">{material.title}</div>
                              <div className="material-size">{formatFileSize(material.file_size)}</div>
                            </div>
                            <a
                              href={material.file_path}
                              download
                              className="material-download-btn"
                              onClick={(e) => {
                                e.preventDefault();
                                // TODO: Implement download with signed URL
                                window.open(material.file_path, '_blank');
                              }}
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                              Télécharger
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Lesson List Sidebar */}
          <div className="lesson-list-sidebar">
            <div className="lesson-list-header">
              <h3>{course?.title}</h3>
              <p>{videos.length} leçons</p>
            </div>

            <div className="lesson-list">
              {videos.map((video, index) => {
                const isPlaying = currentVideo?.id === video.id;
                const isLocked = video.is_locked && !isAuthenticated;

                return (
                  <div
                    key={video.id}
                    className={`lesson-item ${isPlaying ? 'active' : ''} ${isLocked ? 'locked' : ''}`}
                    onClick={() => !isLocked && handleVideoClick(video)}
                  >
                    <div className="lesson-thumbnail">
                      {video.thumbnail_path ? (
                        <img
                          src={`/api/videos/thumbnail/${video.thumbnail_path}`}
                          alt={video.title}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div className={`lesson-thumbnail-placeholder ${!video.thumbnail_path ? '' : 'hidden'}`}>
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      
                      {isPlaying && (
                        <div className="playing-indicator">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      )}

                      {isLocked && (
                        <div className="lock-badge">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}

                      {isLocked && (
                        <div className="lock-overlay">
                          <span className="lock-message">Cette leçon est verrouillée</span>
                        </div>
                      )}
                    </div>

                    <div className="lesson-details">
                      <div className="lesson-number">Leçon {index + 1}</div>
                      <div className="lesson-title">{video.title}</div>
                      {video.duration > 0 && (
                        <div className="lesson-duration">{formatDuration(video.duration)}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CoursePlayerPage;
