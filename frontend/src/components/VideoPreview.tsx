import React, { useRef, useState, useEffect } from 'react';
import { Video, videoService } from '../lib/videoService';

interface VideoPreviewProps {
  video: Video;
  maxDuration?: number;
  showPlayButton?: boolean;
  className?: string;
  onPreviewClick?: () => void;
}

const VideoPreview: React.FC<VideoPreviewProps> = ({
  video,
  maxDuration = 10,
  showPlayButton = true,
  className = '',
  onPreviewClick
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  console.log(`🎬 VideoPreview for ${video.title} - Azizkh07 at 2025-08-20 14:30:38`);

  const getVideoUrl = () => {
    return videoService.getVideoStreamUrl(video);
  };

  const getThumbnailUrl = () => {
    return videoService.getThumbnailUrl(video);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(console.error);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime;
      setCurrentTime(current);
      
      // Stop preview at maxDuration
      if (current >= maxDuration) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
        setIsPlaying(false);
      }
    }
  };

  const handlePlay = () => setIsPlaying(true);
  const handlePause = () => setIsPlaying(false);

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      className={`relative overflow-hidden cursor-pointer group ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onPreviewClick}
    >
      {/* Thumbnail */}
      <img
        src={getThumbnailUrl()}
        alt={video.title}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          isHovered && isPlaying ? 'opacity-0' : 'opacity-100'
        }`}
      />

      {/* Preview Video */}
      <video
        ref={videoRef}
        src={getVideoUrl()}
        muted
        playsInline
        onTimeUpdate={handleTimeUpdate}
        onPlay={handlePlay}
        onPause={handlePause}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
          isHovered && isPlaying ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ pointerEvents: 'none' }}
      />

      {/* Video Duration Badge */}
      <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
        {video.duration ? formatDuration(video.duration) : '0:00'}
      </div>

      {/* Preview Progress Bar */}
      {isHovered && isPlaying && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-600">
          <div 
            className="h-full bg-red-500 transition-all duration-100"
            style={{ width: `${(currentTime / maxDuration) * 100}%` }}
          />
        </div>
      )}

      {/* Play Button Overlay */}
      {showPlayButton && (
        <div className={`absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 transition-opacity duration-300 ${
          isHovered ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}>
          <div className="bg-red-600 hover:bg-red-700 text-white rounded-full p-3 transform transition-transform duration-200 hover:scale-110">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
        </div>
      )}

      {/* Preview Badge */}
      {isHovered && (
        <div className="absolute top-2 left-2 bg-orange-600 bg-opacity-90 text-white text-xs px-2 py-1 rounded">
          Aperçu {maxDuration}s
        </div>
      )}

      {/* Login Required Badge */}
      <div className="absolute top-2 right-2 bg-blue-600 bg-opacity-90 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
        Connexion requise
      </div>
    </div>
  );
};

export default VideoPreview;