import React, { useRef, useEffect, useState } from 'react';
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
  const [error, setError] = useState<string>('');
  const [hasPlayed, setHasPlayed] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(!isAuthenticated);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    // Security: Disable right-click context menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // Security: Disable keyboard shortcuts for downloading/saving
    const handleKeyDown = (e: KeyboardEvent) => {
      // Disable Ctrl+S, Ctrl+Shift+I, F12, etc.
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
      return true; // Fixed: Added return value
    };

    // Security: Disable drag and drop
    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
      return false;
    };

    // Security: Disable selection
    const handleSelectStart = (e: Event) => {
      e.preventDefault();
      return false;
    };

    // Add event listeners
    videoElement.addEventListener('contextmenu', handleContextMenu);
    videoElement.addEventListener('dragstart', handleDragStart);
    videoElement.addEventListener('selectstart', handleSelectStart);
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      videoElement.removeEventListener('contextmenu', handleContextMenu);
      videoElement.removeEventListener('dragstart', handleDragStart);
      videoElement.removeEventListener('selectstart', handleSelectStart);
      document.removeEventListener('keydown', handleKeyDown);
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
    setError('Error playing video. Please try again.');
  };

  const getVideoUrl = () => {
    const streamUrl = videoService.getVideoStreamUrl(video);
    // Add auth token for authenticated users
    if (isAuthenticated) {
      const token = localStorage.getItem('token');
      if (token) {
        return `${streamUrl}&auth=${encodeURIComponent(token)}`;
      }
    }
    return streamUrl;
  };

  // Fixed: Removed invalid CSS properties
  const securityStyles: React.CSSProperties = {
    userSelect: 'none',
    WebkitUserSelect: 'none',
    MozUserSelect: 'none',
    msUserSelect: 'none',
    WebkitTouchCallout: 'none',
    // Removed: WebkitUserDrag - not a valid CSS property
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
        // Fixed: Removed onSelectStart - not a valid video element event
        style={securityStyles}
        crossOrigin="use-credentials"
        preload="metadata"
        autoPlay={autoPlay}
        playsInline
        // Additional security attributes
        draggable={false}
      >
        <source 
          src={getVideoUrl()}
          type="video/mp4" 
        />
        Your browser does not support the video tag.
      </video>

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
              }}
              className="mt-3 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Anti-screenshot protection CSS - Fixed to use regular style tag */}
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
        
        /* Disable text selection on video container */
        .video-container * {
          user-select: none !important;
          -webkit-user-select: none !important;
          -moz-user-select: none !important;
          -ms-user-select: none !important;
        }
        
        /* Enhanced security styles */
        video {
          -webkit-user-drag: none !important;
          -khtml-user-drag: none !important;
          -moz-user-drag: none !important;
          -o-user-drag: none !important;
          user-drag: none !important;
          pointer-events: auto;
        }
        
        /* Disable video element interactions */
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

export default VideoPlayer;

// Last updated: 2025-08-19 16:12:58 | Azizkh07