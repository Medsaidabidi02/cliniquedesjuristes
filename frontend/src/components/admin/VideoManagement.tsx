import React, { useState, useEffect } from 'react';
import { api, getErrorMessage } from '../../lib/api';
import VideoUploadForm from './VideoUploadForm';

interface Video {
  id: number;
  title: string;
  description: string;
  video_path: string;
  thumbnail_path: string;
  duration: number;
  subject_id: number;
  file_size: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // From joins
  subject_title?: string;
  course_title?: string;
  professor_name?: string;
  course_id?: number;
}

interface Course {
  id: number;
  title: string;
  subject_count: number;
}

interface Subject {
  id: number;
  title: string;
  course_id: number;
  professor_name: string;
  hours: number;
  is_active: boolean;
}

const VideoManagement: React.FC = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  
  // Filters
  const [filterCourse, setFilterCourse] = useState<string>('all');
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  console.log(`🎬 VideoManagement loaded for Medsaidabidi02 at 2025-09-09 17:05:28`);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      setError('');
      console.log('📊 Loading all video management data for Medsaidabidi02...');
      
      // Load all data in parallel
      const [videosRes, coursesRes, subjectsRes] = await Promise.all([
        api.get<Video[]>('/api/videos'),
        api.get<Course[]>('/api/courses'),
        api.get<Subject[]>('/api/subjects')
      ]);
      
      console.log('✅ Data loaded successfully:', {
        videos: videosRes.length,
        courses: coursesRes.length,
        subjects: subjectsRes.length
      });
      
      setVideos(videosRes);
      setCourses(coursesRes);
      setSubjects(subjectsRes);
      
    } catch (error) {
      console.error('❌ Error loading data for Medsaidabidi02:', error);
      setError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSuccess = (newVideo: Video) => {
    console.log('✅ Video upload successful for Medsaidabidi02 at 2025-09-09 17:05:28, updating UI instantly...');
    console.log('📝 Received video data:', newVideo);
    
    // ✅ FIXED: Handle different response structures from MySQL5
    let actualVideo: Video;
    
    if (newVideo && typeof newVideo === 'object') {
      // Check if it's wrapped in a success response
      if ('success' in newVideo && 'data' in newVideo) {
        actualVideo = (newVideo as any).data;
        console.log('✅ Extracted video data from success wrapper:', actualVideo);
      } 
      // Check if it has video properties directly
      else if ('id' in newVideo && 'title' in newVideo) {
        actualVideo = newVideo;
        console.log('✅ Using direct video object:', actualVideo);
      }
      // Fallback - try to find video data in any nested structure
      else {
        // Look for video-like object in any property
        const possibleVideo = Object.values(newVideo).find(
          (value: any) => value && typeof value === 'object' && 'id' in value && 'title' in value
        );
        
        if (possibleVideo) {
          actualVideo = possibleVideo as Video;
          console.log('✅ Found video data in nested structure:', actualVideo);
        } else {
          console.error('❌ Could not extract video data from response:', newVideo);
          // Show success message but reload data to get the actual video
          setShowUploadForm(false);
          loadAllData();
          return;
        }
      }
    } else {
      console.error('❌ Invalid video data received:', newVideo);
      // Show success message but reload data
      setShowUploadForm(false);
      loadAllData();
      return;
    }
    
    // Validate that we have the essential video properties
    if (!actualVideo.id || !actualVideo.title) {
      console.error('❌ Video data missing essential properties:', actualVideo);
      setShowUploadForm(false);
      loadAllData();
      return;
    }
    
    setShowUploadForm(false);
    
    // ✅ FIXED: Add new video to state instantly instead of reloading
    setVideos(prevVideos => [actualVideo, ...prevVideos]);
    console.log('✅ Video added to UI instantly for Medsaidabidi02');
  };

  const handleDeleteVideo = async (id: number) => {
    try {
      console.log(`🗑️ Deleting video ${id} for Medsaidabidi02 at 2025-09-09 17:05:28...`);
      await api.delete(`/api/videos/${id}`);
      console.log('✅ Video deleted successfully');
      
      // ✅ FIXED: Remove from UI instantly instead of reloading
      setVideos(prevVideos => prevVideos.filter(video => video.id !== id));
      setShowDeleteConfirm(null);
      setSelectedVideo(null);
      console.log('✅ Video removed from UI instantly for Medsaidabidi02');
      
    } catch (error) {
      console.error('❌ Error deleting video for Medsaidabidi02:', error);
      setError('Erreur lors de la suppression de la vidéo');
    }
  };

  const confirmDelete = (id: number) => {
    setShowDeleteConfirm(id);
  };

  // ✅ FIXED: Enhanced filtering with proper subject-course relationships
  const getFilteredVideos = () => {
    let filtered = videos;
    
    // Search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(video => 
        video.title.toLowerCase().includes(search) ||
        video.description?.toLowerCase().includes(search) ||
        getVideoSubjectTitle(video).toLowerCase().includes(search) ||
        getVideoCourseTitle(video).toLowerCase().includes(search)
      );
    }
    
    // Course filter
    if (filterCourse !== 'all') {
      const courseId = parseInt(filterCourse);
      filtered = filtered.filter(video => {
        const subject = subjects.find(s => s.id === video.subject_id);
        return subject?.course_id === courseId;
      });
    }
    
    // Subject filter
    if (filterSubject !== 'all') {
      const subjectId = parseInt(filterSubject);
      filtered = filtered.filter(video => video.subject_id === subjectId);
    }
    
    return filtered;
  };

  // Helper functions to get video relationships
  const getVideoSubjectTitle = (video: Video): string => {
    const subject = subjects.find(s => s.id === video.subject_id);
    return subject?.title || 'Aucune matière';
  };

  const getVideoCourseTitle = (video: Video): string => {
    const subject = subjects.find(s => s.id === video.subject_id);
    if (!subject) return 'Aucun cours';
    const course = courses.find(c => c.id === subject.course_id);
    return course?.title || 'Aucun cours';
  };

  const getVideoProfessorName = (video: Video): string => {
    const subject = subjects.find(s => s.id === video.subject_id);
    return subject?.professor_name || 'Aucun professeur';
  };

  // Get available subjects for course filter
  const getAvailableSubjects = () => {
    if (filterCourse === 'all') {
      return subjects;
    }
    const courseId = parseInt(filterCourse);
    return subjects.filter(s => s.course_id === courseId);
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format duration
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const filteredVideos = getFilteredVideos();
  const availableSubjects = getAvailableSubjects();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">🔄 Chargement des vidéos pour Medsaidabidi02...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">🎬 Gestion des Vidéos</h1>
        </div>
        <button
          onClick={() => setShowUploadForm(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
        >
          ➕ Ajouter une Vidéo
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          ❌ {error}
          <button 
            onClick={() => setError('')}
            className="ml-4 text-red-600 hover:text-red-800 underline"
          >
            Fermer
          </button>
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-blue-900">Total Vidéos</h3>
          <p className="text-2xl font-bold text-blue-600">{videos.length}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-green-900">Vidéos Actives</h3>
          <p className="text-2xl font-bold text-green-600">
            {videos.filter(v => v.is_active).length}
          </p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-purple-900">Matières avec Vidéos</h3>
          <p className="text-2xl font-bold text-purple-600">
            {new Set(videos.map(v => v.subject_id)).size}
          </p>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-orange-900">Taille Totale</h3>
          <p className="text-2xl font-bold text-orange-600">
            {formatFileSize(videos.reduce((sum, v) => sum + (v.file_size || 0), 0))}
          </p>
        </div>
      </div>

      {/* ✅ FIXED: Filter Controls */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold mb-4">🔍 Filtres</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Recherche
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Titre, description..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Course Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cours
            </label>
            <select
              value={filterCourse}
              onChange={(e) => {
                setFilterCourse(e.target.value);
                setFilterSubject('all'); // Reset subject when course changes
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">Tous les cours</option>
              {courses.map(course => (
                <option key={course.id} value={course.id.toString()}>
                  {course.title}
                </option>
              ))}
            </select>
          </div>

          {/* Subject Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Matière
            </label>
            <select
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">Toutes les matières</option>
              {availableSubjects.map(subject => (
                <option key={subject.id} value={subject.id.toString()}>
                  {subject.title}
                </option>
              ))}
            </select>
          </div>

          {/* Clear Filters */}
          <div className="flex items-end">
            <button
              onClick={() => {
                setFilterCourse('all');
                setFilterSubject('all');
                setSearchTerm('');
              }}
              className="w-full px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
            >
              🗑️ Effacer
            </button>
          </div>
        </div>

        <div className="mt-4 text-sm text-gray-600">
          📊 {filteredVideos.length} vidéo(s) affichée(s) sur {videos.length} total
        </div>
      </div>

      {/* Videos Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredVideos.map(video => (
          <div key={video.id} className="bg-white rounded-lg shadow-sm border overflow-hidden">
            {/* Video Thumbnail */}
            <div className="relative aspect-video bg-gray-100">
              {video.thumbnail_path ? (
                <img
                  src={`/api/videos/thumbnail/${video.thumbnail_path}`}
                  alt={video.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    console.log(`❌ Thumbnail failed to load for video ${video.id}`);
                    e.currentTarget.style.display = 'none';
                    const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                    if (nextElement) {
                      nextElement.classList.remove('hidden');
                    }
                  }}
                />
              ) : null}
              
              {/* Fallback thumbnail */}
              <div className={`w-full h-full flex items-center justify-center bg-gray-200 ${video.thumbnail_path ? 'hidden' : ''}`}>
                <span className="text-gray-400 text-4xl">🎬</span>
              </div>
              
              {/* Preview Button */}
              <button
                onClick={() => setSelectedVideo(video)}
                className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center opacity-0 hover:opacity-100"
              >
                <div className="bg-white bg-opacity-90 rounded-full p-3">
                  <span className="text-2xl">▶️</span>
                </div>
              </button>
              
              {/* Duration Badge */}
              {video.duration > 0 && (
                <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                  {formatDuration(video.duration)}
                </div>
              )}
              
              {/* Status Badge */}
              <div className={`absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-medium ${
                video.is_active 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {video.is_active ? '✅ Actif' : '❌ Inactif'}
              </div>
            </div>

            {/* Video Info */}
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2" title={video.title}>
                {video.title}
              </h3>
              
              <div className="text-sm text-gray-600 space-y-1">
                <p title={getVideoCourseTitle(video)}>📚 {getVideoCourseTitle(video)}</p>
                <p title={getVideoSubjectTitle(video)}>📖 {getVideoSubjectTitle(video)}</p>
                <p title={getVideoProfessorName(video)}>👨‍🏫 {getVideoProfessorName(video)}</p>
                <p>📁 {formatFileSize(video.file_size || 0)}</p>
                <p>📅 {new Date(video.created_at).toLocaleDateString('fr-FR')}</p>
              </div>

              {/* Description preview */}
              {video.description && (
                <div className="mt-2">
                  <p className="text-xs text-gray-500 line-clamp-2" title={video.description}>
                    {video.description}
                  </p>
                </div>
              )}

              <div className="mt-3 flex items-center justify-between">
                <div className="text-xs text-gray-400">
                  
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => setSelectedVideo(video)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
                    title="Voir la vidéo"
                  >
                    👁️ Voir
                  </button>
                  <button
                    onClick={() => confirmDelete(video.id)}
                    className="text-red-600 hover:text-red-800 text-sm font-medium transition-colors"
                    title="Supprimer la vidéo"
                  >
                    🗑️ Suppr.
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* No Results */}
      {filteredVideos.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🎬</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Aucune vidéo trouvée
          </h3>
          <p className="text-gray-600 mb-4">
            {videos.length === 0 
              ? "Aucune vidéo n'a été uploadée pour le moment."
              : "Aucune vidéo ne correspond à vos critères de recherche."
            }
          </p>
          <button
            onClick={() => setShowUploadForm(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            ➕ Ajouter une Vidéo
          </button>
        </div>
      )}

      {/* Upload Form */}
      <VideoUploadForm
        isOpen={showUploadForm}
        onSuccess={handleUploadSuccess}
        onCancel={() => setShowUploadForm(false)}
      />

      {/* ✅ FIXED: Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="text-center">
              <div className="text-6xl mb-4">⚠️</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Confirmer la suppression
              </h3>
              <p className="text-gray-600 mb-6">
                Êtes-vous sûr de vouloir supprimer cette vidéo ? Cette action est irréversible et supprimera définitivement la vidéo du système.
              </p>
              
              <div className="flex space-x-4 justify-center">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg font-medium transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={() => handleDeleteVideo(showDeleteConfirm)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                >
                  🗑️ Supprimer définitivement
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ✅ FIXED: Video Preview Modal with proper video streaming */}
      {selectedVideo && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-5xl w-full max-h-screen overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900">{selectedVideo.title}</h3>
                <button
                  onClick={() => setSelectedVideo(null)}
                  className="text-gray-500 hover:text-gray-700 text-2xl transition-colors"
                  title="Fermer"
                >
                  ✕
                </button>
              </div>
              
              {/* ✅ FIXED: Video Player with proper streaming endpoint */}
              <div className="aspect-video bg-black rounded-lg overflow-hidden mb-4">
                <video
                  controls
                  className="w-full h-full"
                  poster={selectedVideo.thumbnail_path ? `/api/videos/thumbnail/${selectedVideo.thumbnail_path}` : undefined}
                  preload="metadata"
                  onError={(e) => {
                    console.error('❌ Video playback error for Medsaidabidi02:', e);
                    console.error('❌ Video source:', `/api/videos/stream/${selectedVideo.video_path}`);
                  }}
                  onLoadStart={() => {
                    console.log('🎬 Starting to load video for Medsaidabidi02:', selectedVideo.title);
                  }}
                  onCanPlay={() => {
                    console.log('✅ Video ready to play for Medsaidabidi02:', selectedVideo.title);
                  }}
                >
                  <source 
                    src={`/api/videos/stream/${selectedVideo.video_path}`} 
                    type="video/mp4" 
                  />
                  {/* Fallback for older browsers */}
                  <source 
                    src={`/uploads/videos/${selectedVideo.video_path}`} 
                    type="video/mp4" 
                  />
                  <p className="text-white p-4 text-center">
                    Votre navigateur ne supporte pas la lecture vidéo.
                    <br />
                    <a 
                      href={`/api/videos/stream/${selectedVideo.video_path}`} 
                      className="underline text-blue-300 hover:text-blue-100 ml-2"
                      download={selectedVideo.title}
                    >
                      📥 Télécharger la vidéo
                    </a>
                  </p>
                </video>
              </div>
              
              {/* Video Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900 mb-3">📋 Informations générales</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium text-gray-700">Titre:</span> {selectedVideo.title}</div>
                    <div><span className="font-medium text-gray-700">Description:</span> {selectedVideo.description || 'Aucune description'}</div>
                    <div><span className="font-medium text-gray-700">Statut:</span> 
                      <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                        selectedVideo.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {selectedVideo.is_active ? '✅ Actif' : '❌ Inactif'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900 mb-3">🎓 Informations académiques</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium text-gray-700">Cours:</span> {getVideoCourseTitle(selectedVideo)}</div>
                    <div><span className="font-medium text-gray-700">Matière:</span> {getVideoSubjectTitle(selectedVideo)}</div>
                    <div><span className="font-medium text-gray-700">Professeur:</span> {getVideoProfessorName(selectedVideo)}</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900 mb-3">📊 Détails techniques</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium text-gray-700">Durée:</span> {formatDuration(selectedVideo.duration)}</div>
                    <div><span className="font-medium text-gray-700">Taille:</span> {formatFileSize(selectedVideo.file_size || 0)}</div>
                    <div><span className="font-medium text-gray-700">Fichier:</span> {selectedVideo.video_path}</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900 mb-3">📅 Dates</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium text-gray-700">Créé le:</span> {new Date(selectedVideo.created_at).toLocaleString('fr-FR')}</div>
                    <div><span className="font-medium text-gray-700">Modifié le:</span> {new Date(selectedVideo.updated_at).toLocaleString('fr-FR')}</div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex items-center justify-between pt-4 border-t border-gray-200">
                <div className="flex space-x-3">
              
                  
              
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setSelectedVideo(null);
                      confirmDelete(selectedVideo.id);
                    }}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    🗑️ Supprimer
                  </button>
                  
                  <button
                    onClick={() => setSelectedVideo(null)}
                    className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoManagement;