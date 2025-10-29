import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Video } from '../lib/videoService';

interface ProfessionalVideoPlayerProps {
  video: Video;
  isAuthenticated: boolean;
  onTimeUpdate?: (currentTime: number) => void;
  onEnded?: () => void;
  onClose?: () => void;
  className?: string;
  autoPlay?: boolean;
}

const ProfessionalVideoPlayer: React.FC<ProfessionalVideoPlayerProps> = ({
  video,
  isAuthenticated,
  onTimeUpdate,
  onEnded,
  onClose,
  className = '',
  autoPlay = false
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  console.log(`🎬 Professional Video Player initialized for: ${video.title} (User: Azizkh07) at 2025-08-20 14:30:38`);

  // ✅ FIXED: Disable right-click context menu
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    const container = containerRef.current;
    
    if (container) {
      container.addEventListener('contextmenu', handleContextMenu);
      return () => container.removeEventListener('contextmenu', handleContextMenu);
    }
    // ✅ FIXED: Return statement for all code paths
    return undefined;
  }, []);

  // Disable text selection and drag
  useEffect(() => {
    const handleSelectStart = (e: Event) => e.preventDefault();
    const handleDragStart = (e: Event) => e.preventDefault();
    
    document.addEventListener('selectstart', handleSelectStart);
    document.addEventListener('dragstart', handleDragStart);
    
    return () => {
      document.removeEventListener('selectstart', handleSelectStart);
      document.removeEventListener('dragstart', handleDragStart);
    };
  }, []);

  // Auto-hide controls
  const resetControlsTimeout = useCallback(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    setShowControls(true);
    
    if (isPlaying && !isDragging) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  }, [isPlaying, isDragging]);

  // Format time
  const formatTime = (time: number): string => {
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Video event handlers
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      console.log(`📺 Video metadata loaded: ${formatTime(videoRef.current.duration)} - Azizkh07`);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current && !isDragging) {
      const current = videoRef.current.currentTime;
      setCurrentTime(current);
      onTimeUpdate?.(current);
      
      // Enforce 10-second limit for non-authenticated users
      if (!isAuthenticated && current >= 10) {
        videoRef.current.pause();
        setIsPlaying(false);
        console.log('⏹️ Preview limit reached (10 seconds) - Azizkh07');
      }
    }
  };

  const handlePlay = () => {
    setIsPlaying(true);
    setIsBuffering(false);
    resetControlsTimeout();
    console.log('▶️ Video playback started - Azizkh07');
  };

  const handlePause = () => {
    setIsPlaying(false);
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    console.log('⏸️ Video playback paused - Azizkh07');
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setShowControls(true);
    onEnded?.();
    console.log('🏁 Video playback ended - Azizkh07');
  };

  const handleWaiting = () => {
    setIsBuffering(true);
    console.log('⏳ Video buffering... - Azizkh07');
  };

  const handleCanPlay = () => {
    setIsBuffering(false);
    console.log('✅ Video ready to play - Azizkh07');
  };

  // Control handlers
  const togglePlayPause = () => {
    if (videoRef.current) {
      if (!isAuthenticated && currentTime >= 10) {
        console.log('🔒 Login required to continue watching - Azizkh07');
        return;
      }
      
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  const handleProgressMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    handleProgressClick(e);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (videoRef.current && progressRef.current) {
      const rect = progressRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const newTime = (clickX / rect.width) * duration;
      
      if (!isAuthenticated && newTime > 10) {
        console.log('⚠️ Seeking beyond preview limit blocked - Azizkh07');
        return;
      }
      
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setVolume(newVolume);
      setIsMuted(newVolume === 0);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      const newMuted = !isMuted;
      videoRef.current.muted = newMuted;
      setIsMuted(newMuted);
      
      if (newMuted) {
        videoRef.current.volume = 0;
      } else {
        videoRef.current.volume = volume;
      }
    }
  };

  const changePlaybackRate = (rate: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
      setPlaybackRate(rate);
      setShowSpeedMenu(false);
      console.log(`⚡ Playback speed changed to ${rate}x - Azizkh07`);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  // ✅ FIXED: Mouse move handlers
  useEffect(() => {
    const handleMouseMove = () => resetControlsTimeout();
    const handleMouseUp = () => setIsDragging(false);
    
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
    // ✅ FIXED: Return statement for all code paths
    return undefined;
  }, [isDragging, resetControlsTimeout]);

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!videoRef.current) return;

    // Prevent default browser behavior
    e.preventDefault();

    switch (e.code) {
      case 'Space':
        togglePlayPause();
        break;
      case 'KeyF':
        toggleFullscreen();
        break;
      case 'KeyM':
        toggleMute();
        break;
      case 'Escape':
        if (isFullscreen) {
          document.exitFullscreen();
        } else {
          onClose?.();
        }
        break;
      case 'ArrowLeft':
        if (isAuthenticated || currentTime - 10 >= 0) {
          videoRef.current.currentTime = Math.max(0, currentTime - 10);
        }
        break;
      case 'ArrowRight':
        if (isAuthenticated || currentTime + 10 <= 10) {
          videoRef.current.currentTime = Math.min(duration, currentTime + 10);
        }
        break;
      case 'ArrowUp':
        handleVolumeChange(Math.min(1, volume + 0.1));
        break;
      case 'ArrowDown':
        handleVolumeChange(Math.max(0, volume - 0.1));
        break;
    }
  }, [currentTime, duration, volume, isAuthenticated, isFullscreen, onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Fullscreen change handler
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Auto-play handling
  useEffect(() => {
    if (autoPlay && videoRef.current) {
      videoRef.current.play().catch(console.error);
    }
  }, [autoPlay]);

  // Get video stream URL
  const getVideoUrl = () => {
    const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001';
    const filename = video.video_path.split('/').pop();
    return `${baseUrl}/api/videos/stream/${filename}`;
  };

  return (
    <div 
      ref={containerRef}
      className={`relative bg-black overflow-hidden select-none ${className}`}
      onMouseMove={resetControlsTimeout}
      onMouseLeave={() => {
        if (!isDragging) {
          setShowControls(false);
        }
      }}
      style={{ 
        userSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none'
      }}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        className="w-full h-full"
        src={getVideoUrl()}
        autoPlay={autoPlay}
        playsInline
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handleEnded}
        onWaiting={handleWaiting}
        onCanPlay={handleCanPlay}
        crossOrigin="anonymous"
        controlsList="nodownload noremoteplayback"
        disablePictureInPicture
        disableRemotePlayback
        onContextMenu={(e) => e.preventDefault()}
      />

      {/* Loading Spinner */}
      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
            <p className="text-white text-sm mt-2">Chargement...</p>
          </div>
        </div>
      )}

      {/* Center Play Button */}
      {!isPlaying && !isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center">
          <button
            onClick={togglePlayPause}
            className="bg-green-600 hover:bg-green-700 text-white rounded-full p-6 transition-all duration-200 transform hover:scale-110 shadow-lg"
          >
            <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </button>
        </div>
      )}

      {/* Preview Warning */}
      {!isAuthenticated && (
        <div className="absolute top-4 left-4 bg-orange-600 bg-opacity-95 text-white px-4 py-2 rounded-lg shadow-lg">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">Aperçu - {Math.max(0, 10 - Math.floor(currentTime))}s restantes</span>
          </div>
        </div>
      )}

      {/* User Badge */}
   

      {/* Close Button */}
   

      {/* Custom Controls */}
      <div 
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Progress Bar */}
        <div className="px-4 pb-4">
          <div 
            ref={progressRef}
            className="group relative w-full h-1 bg-gray-600 rounded cursor-pointer hover:h-2 transition-all duration-200"
            onMouseDown={handleProgressMouseDown}
            onClick={handleProgressClick}
          >
            {/* Progress */}
            <div 
              className="h-full bg-green-600 rounded transition-all duration-100"
              style={{ 
                width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
                maxWidth: !isAuthenticated ? '8.33%' : '100%'
              }}
            />
            
            {/* Preview limit indicator */}
            {!isAuthenticated && duration > 0 && (
              <div 
                className="absolute top-0 h-full w-1 bg-green-500 rounded"
                style={{ left: `${Math.min((10 / duration) * 100, 100)}%` }}
              />
            )}
            
            {/* Scrubber */}
            <div 
              className="absolute top-1/2 w-4 h-4 bg-green-600 rounded-full transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
              style={{ 
                left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
                marginLeft: '-8px'
              }}
            />
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-between px-4 pb-4">
          <div className="flex items-center space-x-4">
            {/* Play/Pause */}
            <button
              onClick={togglePlayPause}
              className="text-white hover:text-green-400 transition-colors duration-200"
            >
              {isPlaying ? (
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                </svg>
              ) : (
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              )}
            </button>

            {/* Volume */}
            <div 
              className="flex items-center space-x-2 group"
              onMouseEnter={() => setShowVolumeSlider(true)}
              onMouseLeave={() => setShowVolumeSlider(false)}
            >
              <button
                onClick={toggleMute}
                className="text-white hover:text-green-400 transition-colors duration-200"
              >
                {isMuted || volume === 0 ? (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3.63 3.63a.996.996 0 000 1.41L7.29 8.7 7 9H4c-.55 0-1 .45-1 1v4c0 .55.45 1 1 1h3l3.29 3.29c.63.63 1.71.18 1.71-.71v-4.17l4.18 4.18c-.49.37-1.02.68-1.6.91-.36.15-.58.53-.58.92 0 .72.73 1.18 1.39.91.8-.33 1.55-.77 2.22-1.31l2.01 2.01a.996.996 0 101.41-1.41L5.05 3.63c-.39-.39-1.02-.39-1.42 0zM19 12c0 .82-.15 1.61-.41 2.34l1.53 1.53c.56-1.17.88-2.48.88-3.87 0-3.83-2.4-7.11-5.78-8.4-.59-.23-1.22.23-1.22.86v.19c0 .38.25.71.61.85C17.18 6.54 19 9.06 19 12zm-8.71-6.29l-.17.17L12 7.76V6.41c0-.89-1.08-1.33-1.71-.7zM16.5 12c0-1.77-1.02-3.29-2.5-4.03v1.79l2.48 2.48c.01-.08.02-.16.02-.24z"/>
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 9v6h4l5 5V4L7 9H3zm7-.17v6.34L7.83 13H5v-2h2.83L10 8.83zM16.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77 0-4.28-2.99-7.86-7-8.77z"/>
                  </svg>
                )}
              </button>

              {/* Volume Slider */}
              <div className={`transition-all duration-200 overflow-hidden ${
                showVolumeSlider ? 'w-20 opacity-100' : 'w-0 opacity-0'
              }`}>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>

            {/* Time Display */}
            <div className="text-white text-sm font-mono">
              {formatTime(currentTime)} / {formatTime(duration)}
              {!isAuthenticated && (
                <span className="text-orange-400 ml-2">(Aperçu)</span>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Speed Control */}
            <div className="relative">
              <button
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                className="text-white hover:text-green-400 transition-colors duration-200 text-sm font-medium px-2 py-1 rounded hover:bg-black hover:bg-opacity-30"
              >
                {playbackRate}x
              </button>

              {showSpeedMenu && (
                <div className="absolute bottom-full right-0 mb-2 bg-black bg-opacity-95 rounded-lg p-2 min-w-20 shadow-lg">
                  <div className="text-xs text-gray-300 mb-2 px-2">Vitesse</div>
                  {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map(rate => (
                    <button
                      key={rate}
                      onClick={() => changePlaybackRate(rate)}
                      className={`block w-full text-left px-2 py-1 text-sm hover:bg-green-600 rounded transition-colors ${
                        playbackRate === rate ? 'text-green-400 bg-green-600 bg-opacity-30' : 'text-white'
                      }`}
                    >
                      {rate}x {rate === 1 && '(Normal)'}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="text-white hover:text-green-400 transition-colors duration-200"
            >
              {isFullscreen ? (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Keyboard Shortcuts Info */}
        <div className="text-xs text-gray-400 px-4 pb-2 opacity-70">
          Espace: Lecture/Pause • F: Plein écran • M: Muet • ←→: Navigation • ↑↓: Volume • Échap: Fermer
        </div>
      </div>
    </div>
  );
};

export default ProfessionalVideoPlayer;