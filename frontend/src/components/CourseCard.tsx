import React, { useState } from 'react';
import { Video } from '../lib/videoService';
import VideoPreview from './VideoPreview';

interface Course {
  id: number;
  title: string;
  description: string;
  category: string;
  cover_image: string;
  is_active: boolean;
}

interface Subject {
  id: number;
  title: string;
  description: string;
  professor_name: string;
  hours: number;
  course_id: number;
  is_active: boolean;
  videos: Video[];
}

interface CourseCardProps {
  course: Course & {
    subjects: Subject[];
    totalVideos: number;
    totalHours: number;
    professors: string[];
  };
  onVideoClick: (video: Video) => void;
  isAuthenticated: boolean;
}

const CourseCard: React.FC<CourseCardProps> = ({ 
  course, 
  onVideoClick, 
  isAuthenticated 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);

  console.log(`🎯 CourseCard for ${course.title} - Azizkh07 at 2025-08-20 14:37:59`);

  // Get first few videos for preview
  const previewVideos = course.subjects
    .flatMap(s => s.videos)
    .slice(0, 4);

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300">
      {/* Compact Course Header */}
      <div className="relative h-40 bg-gradient-to-r from-purple-600 to-blue-600 rounded-t-lg overflow-hidden">
        {course.cover_image && (
          <img
            src={course.cover_image}
            alt={course.title}
            className="w-full h-full object-cover mix-blend-overlay"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
        
        <div className="absolute bottom-3 left-3 text-white">
          <span className="bg-white/20 text-xs px-2 py-1 rounded-full mb-2 inline-block">
            {course.category}
          </span>
          <h3 className="font-bold text-lg leading-tight">{course.title}</h3>
        </div>

        {/* Quick Stats */}
        <div className="absolute top-3 right-3 text-white text-xs">
          <div className="bg-black/40 rounded px-2 py-1">
            {course.totalVideos} vidéos • {course.totalHours}h
          </div>
        </div>
      </div>

      {/* Course Info */}
      <div className="p-4">
        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
          {course.description}
        </p>

        {/* Compact Stats */}
        <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
          <span className="flex items-center">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4z"/>
            </svg>
            {course.subjects.length} matières
          </span>
          <span className="flex items-center">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
            </svg>
            {course.totalVideos} vidéos
          </span>
          <span className="flex items-center">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
            </svg>
            {course.professors.length} prof(s)
          </span>
        </div>

        {/* Video Preview Grid (2x2) */}
        {previewVideos.length > 0 && (
          <div className="grid grid-cols-2 gap-2 mb-4">
            {previewVideos.map((video, index) => (
              <div 
                key={video.id}
                className="aspect-video rounded overflow-hidden relative group cursor-pointer"
              >
                <VideoPreview
                  video={video}
                  maxDuration={5}
                  showPlayButton={false}
                  className="w-full h-full"
                  onPreviewClick={() => onVideoClick(video)}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <svg className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </div>
                {!isAuthenticated && (
                  <div className="absolute top-1 right-1 bg-orange-600 text-white text-xs px-1 rounded">
                    🔒
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded text-sm font-medium transition-colors"
          >
            {isExpanded ? '↑ Réduire' : '↓ Voir matières'}
          </button>
          <button
            onClick={() => previewVideos.length > 0 && onVideoClick(previewVideos[0])}
            className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded text-sm font-medium transition-colors"
          >
            ▶️ Commencer
          </button>
        </div>

        {/* Expandable Subjects List */}
        {isExpanded && (
          <div className="mt-4 border-t pt-4">
            <div className="space-y-3">
              {course.subjects.map((subject) => (
                <div key={subject.id} className="border rounded-lg">
                  <button
                    onClick={() => setSelectedSubject(
                      selectedSubject === subject.id ? null : subject.id
                    )}
                    className="w-full p-3 text-left hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-sm">{subject.title}</h4>
                        <p className="text-xs text-gray-500">
                          👨‍🏫 {subject.professor_name} • {subject.hours}h • {subject.videos.length} vidéos
                        </p>
                      </div>
                      <svg 
                        className={`w-4 h-4 transform transition-transform ${
                          selectedSubject === subject.id ? 'rotate-180' : ''
                        }`} 
                        fill="currentColor" 
                        viewBox="0 0 20 20"
                      >
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/>
                      </svg>
                    </div>
                  </button>

                  {/* Subject Videos */}
                  {selectedSubject === subject.id && (
                    <div className="px-3 pb-3">
                      <div className="grid grid-cols-1 gap-2">
                        {subject.videos.map((video, videoIndex) => (
                          <button
                            key={video.id}
                            onClick={() => onVideoClick(video)}
                            className="flex items-center p-2 bg-gray-50 hover:bg-gray-100 rounded text-left transition-colors group"
                          >
                            <div className="w-16 h-9 bg-gray-200 rounded mr-3 flex-shrink-0 overflow-hidden">
                              {video.thumbnail_path ? (
                                <img 
                                  src={`${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/api/videos/thumbnail/${video.thumbnail_path}`}
                                  alt={video.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M8 5v14l11-7z"/>
                                  </svg>
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h5 className="text-sm font-medium text-gray-900 truncate group-hover:text-purple-600">
                                {videoIndex + 1}. {video.title}
                              </h5>
                              <div className="flex items-center text-xs text-gray-500">
                                <span>
                                  {video.duration 
                                    ? `${Math.floor(video.duration / 60)}:${(video.duration % 60).toString().padStart(2, '0')}`
                                    : '0:00'
                                  }
                                </span>
                                {!isAuthenticated && (
                                  <span className="ml-2 bg-orange-100 text-orange-700 px-1 rounded text-xs">
                                    Preview only
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CourseCard;