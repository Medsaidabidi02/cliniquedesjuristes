import React, { useRef, useEffect, useState } from 'react';
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

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  video,
  isAuthenticated,
  onTimeUpdate,
  maxPreviewTime = 10,
  className = "",
  autoPlay = false
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [error, setError] = useState<string>('');
  const [hasPlayed, setHasPlayed] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(!isAuthenticated);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    // Get the HLS URL from the video
    const hlsUrl = videoService.getVideoPlaybackUrl(video);
    
    if (!hlsUrl) {
      setError('Video URL not available');
      setIsLoading(false);
      return;
    }

    console.log('🎬 Loading HLS video:', hlsUrl);

    // Check if HLS.js is supported
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
      });

      hlsRef.current = hls;

      // Load the HLS manifest
      hls.loadSource(hlsUrl);
      hls.attachMedia(videoElement);

      // Handle HLS events
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('✅ HLS manifest parsed successfully');
        setIsLoading(false);
        if (autoPlay) {
          videoElement.play().catch(err => {
            console.warn('⚠️ Autoplay prevented:', err);
          });
        }
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('❌ HLS error:', data);
        
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.error('Fatal network error encountered, trying to recover');
              setError('Network error loading video. Please check your connection.');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.error('Fatal media error encountered, trying to recover');
              hls.recoverMediaError();
              break;
            default:
              console.error('Fatal error, cannot recover');
              setError('Error loading video. Please try again later.');
              hls.destroy();
              break;
          }
        }
      });

    } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari, iOS)
      console.log('✅ Using native HLS support');
      videoElement.src = hlsUrl;
      setIsLoading(false);
      
      videoElement.addEventListener('loadedmetadata', () => {
        console.log('✅ Video metadata loaded');
        if (autoPlay) {
          videoElement.play().catch(err => {
            console.warn('⚠️ Autoplay prevented:', err);
          });
        }
      });
      
      videoElement.addEventListener('error', () => {
        console.error('❌ Native video error');
        setError('Error loading video. Please try again later.');
      });
    } else {
      setError('HLS not supported in this browser');
      setIsLoading(false);
    }

    // Cleanup function
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [video, autoPlay]);

  // Security: Disable right-click context menu
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    videoElement.addEventListener('contextmenu', handleContextMenu);

    return () => {
      videoElement.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

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
    if (!error) {
      setError('Error playing video. Please try again.');
    }
  };

  // Security styles
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
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-20">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p>Loading video...</p>
          </div>
        </div>
      )}

      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        controls
        controlsList="nodownload"
        disablePictureInPicture
        onTimeUpdate={handleTimeUpdate}
        onPlay={handlePlay}
        onError={handleError}
        onContextMenu={(e) => e.preventDefault()}
        style={securityStyles}
        crossOrigin="anonymous"
        preload="metadata"
        playsInline
        draggable={false}
      />

      {/* Security warning overlay for preview mode */}
      {isPreviewMode && hasPlayed && !error && (
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
              }}
              className="mt-3 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
            >
              Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;

console.log('🎬 VideoPlayer component loaded - HLS.js mode');
