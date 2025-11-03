import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Video } from '../lib/videoService';

interface CustomVideoPlayerProps {
  video: Video;
  isAuthenticated: boolean;
  onTimeUpdate?: (currentTime: number) => void;
  onEnded?: () => void;
  className?: string;
  autoPlay?: boolean;
}

const CustomVideoPlayer: React.FC<CustomVideoPlayerProps> = ({
  video,
  isAuthenticated,
  onTimeUpdate,
  onEnded,
  className = '',
  autoPlay = false
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
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

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  console.log(`🎬 Custom Video Player initialized for: ${video.title} (User: Azizkh07)`);

  // Auto-hide controls
  const resetControlsTimeout = useCallback(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    setShowControls(true);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying && !isFullscreen) {
        setShowControls(false);
      }
    }, 3000);
  }, [isPlaying, isFullscreen]);

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
      console.log(`📺 Video metadata loaded: ${formatTime(videoRef.current.duration)}`);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime;
      setCurrentTime(current);
      onTimeUpdate?.(current);
      
      // Limit preview to 10 seconds for non-authenticated users
      if (!isAuthenticated && current >= 10) {
        videoRef.current.pause();
        setIsPlaying(false);
        console.log('⏹️ Preview limit reached (10 seconds)');
      }
    }
  };

  const handlePlay = () => {
    setIsPlaying(true);
    setIsBuffering(false);
    resetControlsTimeout();
    console.log('▶️ Video playback started');
  };

  const handlePause = () => {
    setIsPlaying(false);
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    console.log('⏸️ Video playback paused');
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setShowControls(true);
    onEnded?.();
    console.log('🏁 Video playback ended');
  };

  const handleWaiting = () => {
    setIsBuffering(true);
    console.log('⏳ Video buffering...');
  };

  const handleCanPlay = () => {
    setIsBuffering(false);
    console.log('✅ Video ready to play');
  };

  // Control handlers
  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (videoRef.current && progressRef.current) {
      const rect = progressRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const newTime = (clickX / rect.width) * duration;
      
      if (!isAuthenticated && newTime > 10) {
        console.log('⚠️ Seeking beyond preview limit blocked');
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
      console.log(`⚡ Playback speed changed to ${rate}x`);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      videoRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!videoRef.current) return;

    switch (e.code) {
      case 'Space':
        e.preventDefault();
        togglePlayPause();
        break;
      case 'KeyF':
        e.preventDefault();
        toggleFullscreen();
        break;
      case 'KeyM':
        e.preventDefault();
        toggleMute();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        videoRef.current.currentTime = Math.max(0, currentTime - 10);
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (isAuthenticated || currentTime + 10 <= 10) {
          videoRef.current.currentTime = Math.min(duration, currentTime + 10);
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        handleVolumeChange(Math.min(1, volume + 0.1));
        break;
      case 'ArrowDown':
        e.preventDefault();
        handleVolumeChange(Math.max(0, volume - 0.1));
        break;
    }
  }, [currentTime, duration, volume, isAuthenticated]);

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

  // Get video stream URL
  const getVideoUrl = () => {
    const videoPath = video.video_path || video.file_path;
    
    // Check if it's already a full Bunny.net URL
    if (videoPath && videoPath.startsWith('https://')) {
      console.log(`📺 Using Bunny.net CDN URL: ${videoPath}`);
      return videoPath;
    }
    
    // Legacy: construct streaming URL for local files
    const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001';
    const filename = videoPath ? videoPath.split('/').pop() : '';
    const streamUrl = `${baseUrl}/api/videos/stream/${filename}`;
    console.log(`📺 Using local stream URL: ${streamUrl}`);
    return streamUrl;
  };

  return (
    <div 
      className={`relative bg-black rounded-lg overflow-hidden group ${className}`}
      onMouseMove={resetControlsTimeout}
      onMouseLeave={() => setShowControls(isPlaying ? false : true)}
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
        controlsList="nodownload"
        disablePictureInPicture
      />

      {/* Buffering Spinner */}
      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        </div>
      )}

      {/* Center Play Button */}
      {!isPlaying && !isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
          <button
            onClick={togglePlayPause}
            className="bg-red-600 hover:bg-red-700 text-white rounded-full p-4 transition-all duration-200 transform hover:scale-110"
          >
            <div 
              style={{
                width: 0,
                height: 0,
                borderLeft: '24px solid white',
                borderTop: '16px solid transparent',
                borderBottom: '16px solid transparent',
                marginLeft: '6px'
              }}
            />
          </button>
        </div>
      )}

      {/* Preview Warning for Non-Authenticated Users */}
      {!isAuthenticated && (
        <div className="absolute top-4 left-4 bg-orange-600 bg-opacity-90 text-white px-3 py-1 rounded text-sm">
          Preview Mode - 10 seconds only
        </div>
      )}

      {/* User Badge */}
      <div className="absolute top-4 right-4 bg-blue-600 bg-opacity-90 text-white px-3 py-1 rounded text-sm">
        User: Azizkh07
      </div>

      {/* Custom Controls */}
      <div 
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/50 to-transparent p-4 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Progress Bar */}
        <div 
          ref={progressRef}
          className="w-full h-2 bg-gray-600 rounded cursor-pointer mb-4 hover:h-3 transition-all duration-200"
          onClick={handleProgressClick}
        >
          <div 
            className="h-full bg-red-600 rounded transition-all duration-100"
            style={{ 
              width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
              maxWidth: !isAuthenticated ? '8.33%' : '100%' // 10 seconds limit for preview
            }}
          />
          
          {/* Preview limit indicator */}
          {!isAuthenticated && duration > 0 && (
            <div 
              className="absolute h-full w-1 bg-orange-500"
              style={{ left: `${(10 / duration) * 100}%` }}
            />
          )}
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Play/Pause */}
            <button
              onClick={togglePlayPause}
              className="text-white hover:text-red-400 transition-colors duration-200"
            >
              {isPlaying ? (
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 4a1 1 0 011 1v10a1 1 0 11-2 0V5a1 1 0 011-1zM14 4a1 1 0 011 1v10a1 1 0 11-2 0V5a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
              )}
            </button>

            {/* Volume */}
            <div 
              className="flex items-center space-x-2"
              onMouseEnter={() => setShowVolumeSlider(true)}
              onMouseLeave={() => setShowVolumeSlider(false)}
            >
              <button
                onClick={toggleMute}
                className="text-white hover:text-red-400 transition-colors duration-200"
              >
                {isMuted || volume === 0 ? (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.776L4.83 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.83l3.553-3.776z" clipRule="evenodd" />
                    <path d="M16.707 9.293a1 1 0 010 1.414L15.414 12l1.293 1.293a1 1 0 01-1.414 1.414L14 13.414l-1.293 1.293a1 1 0 01-1.414-1.414L12.586 12l-1.293-1.293a1 1 0 011.414-1.414L14 10.586l1.293-1.293a1 1 0 011.414 0z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.776L4.83 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.83l3.553-3.776zM13 8a1 1 0 011.414 0L16 9.586l1.586-1.586A1 1 0 1119 9.414L17.414 11 19 12.586A1 1 0 1117.586 14L16 12.414 14.414 14A1 1 0 0113 12.586L14.586 11 13 9.414A1 1 0 0113 8z" clipRule="evenodd" />
                  </svg>
                )}
              </button>

              {/* Volume Slider */}
              {showVolumeSlider && (
                <div className="w-20">
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
              )}
            </div>

            {/* Time Display */}
            <div className="text-white text-sm font-mono">
              {formatTime(currentTime)} / {formatTime(duration)}
              {!isAuthenticated && (
                <span className="text-orange-400 ml-2">(Preview)</span>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Speed Control */}
            <div className="relative">
              <button
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                className="text-white hover:text-red-400 transition-colors duration-200 text-sm font-medium"
              >
                {playbackRate}x
              </button>

              {showSpeedMenu && (
                <div className="absolute bottom-full right-0 mb-2 bg-black bg-opacity-90 rounded p-2 min-w-16">
                  {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map(rate => (
                    <button
                      key={rate}
                      onClick={() => changePlaybackRate(rate)}
                      className={`block w-full text-left px-2 py-1 text-sm hover:bg-red-600 rounded ${
                        playbackRate === rate ? 'text-red-400' : 'text-white'
                      }`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="text-white hover:text-red-400 transition-colors duration-200"
            >
              {isFullscreen ? (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M2 4a2 2 0 012-2h3a1 1 0 010 2H4v3a1 1 0 01-2 0V4zM18 4a2 2 0 00-2-2h-3a1 1 0 000 2h3v3a1 1 0 002 0V4zM2 16a2 2 0 002 2h3a1 1 0 000-2H4v-3a1 1 0 00-2 0v3zM18 16a2 2 0 01-2 2h-3a1 1 0 010-2h3v-3a1 1 0 012 0v3z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h3a1 1 0 010 2H5.414l2.293 2.293a1 1 0 11-1.414 1.414L4 6.414V8a1 1 0 01-2 0V4zM17 4a1 1 0 00-1-1h-3a1 1 0 000 2h1.586l-2.293 2.293a1 1 0 101.414 1.414L16 6.414V8a1 1 0 002 0V4zM3 16a1 1 0 001 1h3a1 1 0 000-2H5.414l2.293-2.293a1 1 0 00-1.414-1.414L4 13.586V12a1 1 0 00-2 0v4zM17 16a1 1 0 01-1 1h-3a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L16 13.586V12a1 1 0 012 0v4z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Keyboard Shortcuts Info */}
        <div className="text-xs text-gray-400 mt-2 opacity-70">
          Space: Play/Pause • F: Fullscreen • M: Mute • ←→: Seek • ↑↓: Volume
        </div>
      </div>
    </div>
  );
};

export default CustomVideoPlayer;

// Last updated: 2025-08-19 20:13:34 | Azizkh07