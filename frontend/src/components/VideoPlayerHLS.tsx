import React, { useRef, useEffect, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { Video, videoService } from '../lib/videoService';

interface VideoPlayerProps {
  video: Video;
  isAuthenticated: boolean;
  onTimeUpdate?: (currentTime: number) => void;
  maxPreviewTime?: number;
  className?: string;
  autoPlay?: boolean;
}

interface PlaybackInfo {
  url: string;
  expiresAt: string;
  expiresIn: number;
  storageType?: string;
  isHLS?: boolean;
}

const VideoPlayerHLS: React.FC<VideoPlayerProps> = ({
  video,
  isAuthenticated,
  onTimeUpdate,
  maxPreviewTime = 10,
  className = "",
  autoPlay = false
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const [error, setError] = useState<string>('');
  const [hasPlayed, setHasPlayed] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(!isAuthenticated);
  const [playbackInfo, setPlaybackInfo] = useState<PlaybackInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Determine if video is HLS based on path or extension
   */
  const isHLSVideo = useCallback((videoPath: string): boolean => {
    if (!videoPath) return false;
    return videoPath.endsWith('.m3u8') || videoPath.includes('/hls/');
  }, []);

  /**
   * Fetch playback info from backend (URL + expiration)
   */
  const fetchPlaybackInfo = useCallback(async (): Promise<PlaybackInfo | null> => {
    try {
      console.log('🎬 Fetching playback info for video:', video.id);
      
      // Check if this is an HLS video
      const isHLS = isHLSVideo(video.video_path);
      
      // For now, use existing URL building logic
      // In future: call backend endpoint /api/videos/:id/playback-info
      const url = videoService.getVideoStreamUrl(video);
      
      // Add auth token if authenticated
      let finalUrl = url;
      if (isAuthenticated) {
        const token = localStorage.getItem('token');
        if (token) {
          finalUrl = `${url}${url.includes('?') ? '&' : '?'}auth=${encodeURIComponent(token)}`;
        }
      }
      
      // Calculate expiration (15 minutes from now)
      const expiresIn = 900; // 15 minutes
      const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
      
      return {
        url: finalUrl,
        expiresAt,
        expiresIn,
        isHLS
      };
    } catch (error) {
      console.error('❌ Error fetching playback info:', error);
      return null;
    }
  }, [video, isAuthenticated, isHLSVideo]);

  /**
   * Refresh token/URL before expiration
   */
  const refreshPlaybackUrl = useCallback(async () => {
    console.log('🔄 Refreshing playback URL...');
    
    try {
      const newPlaybackInfo = await fetchPlaybackInfo();
      
      if (!newPlaybackInfo) {
        console.error('❌ Failed to refresh playback URL');
        return;
      }
      
      const videoElement = videoRef.current;
      if (!videoElement) return;
      
      // Store current playback position
      const currentTime = videoElement.currentTime;
      const wasPlaying = !videoElement.paused;
      
      console.log('💾 Current position:', currentTime, 'Playing:', wasPlaying);
      
      // Update playback info
      setPlaybackInfo(newPlaybackInfo);
      
      // Update source based on video type
      if (newPlaybackInfo.isHLS && hlsRef.current) {
        // For HLS, update the manifest URL
        console.log('🎬 Updating HLS manifest URL');
        hlsRef.current.loadSource(newPlaybackInfo.url);
        
        // Restore position after manifest loads
        hlsRef.current.once(Hls.Events.MANIFEST_PARSED, () => {
          videoElement.currentTime = currentTime;
          if (wasPlaying) {
            videoElement.play().catch(console.error);
          }
        });
      } else {
        // For MP4, update video source
        console.log('🎬 Updating MP4 source');
        videoElement.src = newPlaybackInfo.url;
        videoElement.currentTime = currentTime;
        
        if (wasPlaying) {
          videoElement.play().catch(console.error);
        }
      }
      
      console.log('✅ Playback URL refreshed successfully');
      
      // Schedule next refresh at 80% of expiration time
      scheduleRefresh(newPlaybackInfo.expiresIn);
      
    } catch (error) {
      console.error('❌ Error refreshing playback URL:', error);
      setError('Failed to refresh video URL. Please reload the page.');
    }
  }, [fetchPlaybackInfo]);

  /**
   * Schedule auto-refresh at 80% of expiration time
   */
  const scheduleRefresh = useCallback((expiresIn: number) => {
    // Clear existing timer
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }
    
    // Calculate refresh time (80% of expiration)
    const refreshTime = expiresIn * 0.8 * 1000; // Convert to milliseconds
    
    console.log(`⏰ Scheduling refresh in ${refreshTime / 1000} seconds`);
    
    refreshTimerRef.current = setTimeout(() => {
      refreshPlaybackUrl();
    }, refreshTime);
  }, [refreshPlaybackUrl]);

  /**
   * Initialize video player (HLS or native)
   */
  const initializePlayer = useCallback(async () => {
    const videoElement = videoRef.current;
    if (!videoElement) return;
    
    setIsLoading(true);
    
    try {
      // Fetch playback info
      const info = await fetchPlaybackInfo();
      if (!info) {
        setError('Failed to load video. Please try again.');
        setIsLoading(false);
        return;
      }
      
      setPlaybackInfo(info);
      
      // Check if this is HLS video
      if (info.isHLS) {
        console.log('🎬 Initializing HLS player');
        
        // Check if browser supports native HLS (Safari)
        if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
          console.log('✅ Native HLS support detected');
          videoElement.src = info.url;
        }
        // Use hls.js for other browsers
        else if (Hls.isSupported()) {
          console.log('✅ Using hls.js for HLS playback');
          
          const hls = new Hls({
            enableWorker: true,
            lowLatencyMode: false,
            backBufferLength: 90,
          });
          
          hlsRef.current = hls;
          
          hls.loadSource(info.url);
          hls.attachMedia(videoElement);
          
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            console.log('✅ HLS manifest parsed');
            setIsLoading(false);
            if (autoPlay) {
              videoElement.play().catch(console.error);
            }
          });
          
          hls.on(Hls.Events.ERROR, (event, data) => {
            console.error('❌ HLS error:', data);
            if (data.fatal) {
              switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                  console.log('🔄 Trying to recover from network error');
                  hls.startLoad();
                  break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                  console.log('🔄 Trying to recover from media error');
                  hls.recoverMediaError();
                  break;
                default:
                  setError('Fatal error loading HLS video');
                  hls.destroy();
                  break;
              }
            }
          });
        } else {
          setError('Your browser does not support HLS video playback');
          setIsLoading(false);
          return;
        }
      } else {
        // Standard MP4 playback
        console.log('🎬 Using native MP4 playback');
        videoElement.src = info.url;
        setIsLoading(false);
      }
      
      // Schedule refresh at 80% of expiration time
      scheduleRefresh(info.expiresIn);
      
    } catch (error) {
      console.error('❌ Error initializing player:', error);
      setError('Failed to initialize video player');
      setIsLoading(false);
    }
  }, [video, fetchPlaybackInfo, autoPlay, scheduleRefresh]);

  /**
   * Initialize player on mount
   */
  useEffect(() => {
    initializePlayer();
    
    // Cleanup on unmount
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, [initializePlayer]);

  /**
   * Security: Disable context menu and shortcuts
   */
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey && e.key === 's') ||
        (e.ctrlKey && e.shiftKey && e.key === 'I') ||
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && e.key === 'C') ||
        (e.ctrlKey && e.key === 'u')
      ) {
        e.preventDefault();
        return false;
      }
      return true;
    };

    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
      return false;
    };

    const handleSelectStart = (e: Event) => {
      e.preventDefault();
      return false;
    };

    videoElement.addEventListener('contextmenu', handleContextMenu);
    videoElement.addEventListener('dragstart', handleDragStart);
    videoElement.addEventListener('selectstart', handleSelectStart);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      videoElement.removeEventListener('contextmenu', handleContextMenu);
      videoElement.removeEventListener('dragstart', handleDragStart);
      videoElement.removeEventListener('selectstart', handleSelectStart);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  /**
   * Handle time update
   */
  const handleTimeUpdate = () => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const currentTime = videoElement.currentTime;
    onTimeUpdate?.(currentTime);

    // For non-authenticated users, stop after preview time
    if (isPreviewMode && currentTime >= maxPreviewTime) {
      videoElement.pause();
      videoElement.currentTime = 0;
      setError(`Preview limited to ${maxPreviewTime} seconds. Please login to watch the full video.`);
    }
  };

  const handlePlay = () => {
    setHasPlayed(true);
    setError('');
  };

  const handleError = (e: any) => {
    console.error('Video playback error:', e);
    setError('Error playing video. Please try again.');
  };

  const securityStyles: React.CSSProperties = {
    userSelect: 'none',
    WebkitUserSelect: 'none',
    MozUserSelect: 'none',
    msUserSelect: 'none',
    WebkitTouchCallout: 'none',
    KhtmlUserSelect: 'none'
  };

  return (
    <div className={`relative w-full ${className}`} style={securityStyles}>
      {/* Security overlay to prevent interactions */}
      <div 
        className="absolute inset-0 z-10 pointer-events-none"
        style={{ 
          background: 'transparent',
          ...securityStyles
        }}
        onContextMenu={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
      />
      
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-2"></div>
            <p>Loading video...</p>
          </div>
        </div>
      )}
      
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        controls
        controlsList="nodownload nofullscreen noremoteplaybook"
        disablePictureInPicture
        onTimeUpdate={handleTimeUpdate}
        onPlay={handlePlay}
        onError={handleError}
        onContextMenu={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
        style={securityStyles}
        crossOrigin="use-credentials"
        preload="metadata"
        autoPlay={autoPlay}
        playsInline
        draggable={false}
      >
        Your browser does not support the video tag.
      </video>

      {/* HLS indicator */}
      {playbackInfo?.isHLS && (
        <div className="absolute top-4 right-4 bg-blue-600 bg-opacity-90 text-white px-2 py-1 rounded text-xs z-20">
          HLS
        </div>
      )}

      {/* Security warning overlay for preview mode */}
      {isPreviewMode && hasPlayed && (
        <div className="absolute bottom-4 left-4 right-4 bg-black bg-opacity-75 text-white p-2 rounded text-sm z-20">
          🔒 Preview mode - Login to watch full video ({maxPreviewTime}s limit)
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-30">
          <div className="bg-white p-4 rounded-lg max-w-md text-center">
            <div className="text-red-600 text-lg mb-2">⚠️</div>
            <p className="text-gray-800">{error}</p>
            <button
              onClick={() => {
                setError('');
                if (videoRef.current) {
                  videoRef.current.currentTime = 0;
                }
                initializePlayer();
              }}
              className="mt-3 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Anti-screenshot protection CSS */}
      <style>{`
        video::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: transparent;
          pointer-events: none;
          z-index: 1;
        }
        
        @media print {
          video {
            display: none !important;
          }
        }
        
        .video-container * {
          user-select: none !important;
          -webkit-user-select: none !important;
          -moz-user-select: none !important;
          -ms-user-select: none !important;
        }
        
        video {
          -webkit-user-drag: none !important;
          -khtml-user-drag: none !important;
          -moz-user-drag: none !important;
          -o-user-drag: none !important;
          user-drag: none !important;
          pointer-events: auto;
        }
        
        video::-webkit-media-controls-panel {
          -webkit-appearance: none;
        }
        
        video::-webkit-media-controls-play-button {
          -webkit-appearance: none;
        }
        
        video::-webkit-media-controls-start-playback-button {
          -webkit-appearance: none;
        }
      `}</style>
    </div>
  );
};

export default VideoPlayerHLS;
