import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { videoService, Video } from '../lib/videoService';
import { api } from '../lib/api';
import { useAuth } from '../lib/AuthContext';
import ProfessionalVideoPlayer from '../components/ProfessionalVideoPlayer';
import Header from '../components/Header';
import '../styles/VideoPlayerPage.css';

interface Subject {
  id: number;
  title: string;
  description: string;
  professor_name: string;
  hours: number;
  course_id: number;
  is_active: boolean;
}

const VideoPlayerPage: React.FC = () => {
  const { subjectId, videoId } = useParams<{ subjectId: string; videoId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  const [subject, setSubject] = useState<Subject | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [currentVideo, setCurrentVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { state: { returnTo: location.pathname } });
      return;
    }
    
    loadSubjectAndVideos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId, isAuthenticated]);

  useEffect(() => {
    if (videoId && videos.length > 0) {
      const video = videos.find(v => v.id === parseInt(videoId));
      if (video) {
        setCurrentVideo(video);
      }
    } else if (videos.length > 0 && !currentVideo) {
      // Set first video as current if no specific video is selected
      setCurrentVideo(videos[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, videos]);

  const loadSubjectAndVideos = async () => {
    if (!subjectId) return;

    try {
      setLoading(true);
      
      // Fetch subject details
      const subjectResponse = await api.get(`/api/subjects/${subjectId}`);
      setSubject(subjectResponse);

      // Fetch videos for this subject
      const videosList = await videoService.getVideosBySubject(parseInt(subjectId));
      const sortedVideos = videosList.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
      setVideos(sortedVideos);

      // Check user access
      const accessResponse = await api.get(`/api/user-courses/me`);
      if (accessResponse && accessResponse.success) {
        const userSubjects = accessResponse.courses.flatMap((c: any) => c.subjects || []);
        const hasSubjectAccess = userSubjects.some((s: any) => s.id === parseInt(subjectId));
        setHasAccess(hasSubjectAccess);

        if (!hasSubjectAccess) {
          setError("You don't have access to this subject. Please contact admin.");
        }
      }

      setLoading(false);
    } catch (err) {
      console.error('Error loading subject and videos:', err);
      setError('Failed to load subject videos');
      setLoading(false);
    }
  };

  const handleVideoSelect = (video: Video) => {
    if (!hasAccess) {
      alert("You don't have access to this video");
      return;
    }
    
    setCurrentVideo(video);
    // Update URL without reloading the page
    navigate(`/subject/${subjectId}/video/${video.id}`, { replace: true });
  };

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="video-player-page">
        <Header />
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading videos...</p>
        </div>
      </div>
    );
  }

  if (error || !subject) {
    return (
      <div className="video-player-page">
        <Header />
        <div className="error-container">
          <h2>⚠️ Error</h2>
          <p>{error || 'Subject not found'}</p>
          <button onClick={() => navigate('/courses')} className="back-button">
            Back to Courses
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="video-player-page">
      <Header />
      
      <div className="video-player-container">
        {/* Main Video Player */}
        <div className="video-player-main">
          <div className="subject-header">
            <button onClick={() => navigate('/courses')} className="back-link">
              ← Back to Courses
            </button>
            <h1>{subject.title}</h1>
            <p className="professor-name">👨‍🏫 {subject.professor_name}</p>
          </div>

          {currentVideo && hasAccess ? (
            <div className="player-wrapper">
              <ProfessionalVideoPlayer
                video={currentVideo}
                isAuthenticated={isAuthenticated}
                autoPlay={true}
              />
              <div className="video-info">
                <h2>{currentVideo.title}</h2>
                {currentVideo.description && (
                  <p className="video-description">{currentVideo.description}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="no-access-message">
              <div className="lock-icon">🔒</div>
              <h2>Access Restricted</h2>
              <p>You need to enroll in this subject to watch the videos.</p>
              <button onClick={() => navigate('/courses')} className="enroll-button">
                View Enrollment Options
              </button>
            </div>
          )}
        </div>

        {/* Video List Sidebar */}
        <div className="video-list-sidebar">
          <div className="sidebar-header">
            <h3>Course Content</h3>
            <span className="video-count">{videos.length} videos</span>
          </div>

          <div className="video-list">
            {videos.map((video, index) => (
              <div
                key={video.id}
                className={`video-list-item ${currentVideo?.id === video.id ? 'active' : ''} ${!hasAccess ? 'locked' : ''}`}
                onClick={() => handleVideoSelect(video)}
              >
                <div className="video-item-thumbnail">
                  {video.thumbnail_path ? (
                    <img 
                      src={videoService.getThumbnailUrl(video)} 
                      alt={video.title}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder-video.png';
                      }}
                    />
                  ) : (
                    <div className="thumbnail-placeholder">
                      <span>🎬</span>
                    </div>
                  )}
                  
                  {video.duration && (
                    <span className="video-duration">{formatDuration(video.duration)}</span>
                  )}
                  
                  {!hasAccess && (
                    <div className="video-lock-overlay">
                      <span className="lock-icon">🔒</span>
                    </div>
                  )}
                </div>

                <div className="video-item-info">
                  <div className="video-item-number">{index + 1}</div>
                  <div className="video-item-details">
                    <h4 className="video-item-title">{video.title}</h4>
                    {video.duration && (
                      <span className="video-item-duration">{formatDuration(video.duration)}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayerPage;
