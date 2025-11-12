import React, { useState, useEffect } from 'react';
import { api, getErrorMessage } from '../../lib/api';
import CourseForm from './CourseForm';
import SubjectForm from './SubjectForm';

interface Course {
  id: number;
  title: string;
  description?: string;
  cover_image?: string;
  category?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  subject_count?: number;
  video_count?: number;
  total_hours?: number;
}

interface Subject {
  id: number;
  title: string;
  description?: string;
  professor_name: string;
  hours: number;
  order_index: number;
  course_id: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  video_count?: number;
}

const CourseManagement: React.FC = () => {
  // State - NO MOCK DATA
  const [courses, setCourses] = useState<Course[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [activeView, setActiveView] = useState<'courses' | 'subjects'>('courses');
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [showSubjectForm, setShowSubjectForm] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

  console.log('📚 CLEAN Course Management - NO MOCK DATA - Azizkh07 at 2025-08-20 12:57:15');

  // Load real data only
  useEffect(() => {
    loadRealCourses();
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      loadRealSubjects(selectedCourse.id);
    }
  }, [selectedCourse]);

  // REAL DATA ONLY - Load courses from database
  const loadRealCourses = async () => {
    try {
      setLoading(true);
      setError('');
      console.log('📚 Loading REAL courses from database for Azizkh07...');
      
      const response = await api.get<Course[]>('/api/courses');
      console.log('📊 Real course response from database:', response);
      
      // Handle response - expecting array directly
      let courseData: Course[] = [];
      
      if (Array.isArray(response)) {
        courseData = response;
      } else {
        console.error('❌ Expected array of courses but got:', typeof response, response);
        throw new Error('Invalid response format from server');
      }
      
      setCourses(courseData);
      console.log(`✅ Loaded ${courseData.length} REAL courses from database for Azizkh07`);
      
      if (courseData.length === 0) {
        setError('No courses found in database. Database appears to be empty.');
      }
      
    } catch (error: any) {
      console.error('❌ Error loading REAL courses for Azizkh07:', error);
      const errorMessage = getErrorMessage(error);
      setError(`Failed to load courses from database: ${errorMessage}`);
      setCourses([]); // NO MOCK FALLBACK
    } finally {
      setLoading(false);
    }
  };

  // REAL DATA ONLY - Load subjects from database
  const loadRealSubjects = async (courseId: number) => {
    try {
      setError('');
      console.log(`📖 Loading REAL subjects for course ${courseId} from database for Azizkh07...`);
      
      const response = await api.get<Subject[]>(`/api/subjects/course/${courseId}`);
      console.log('📊 Real subjects response from database:', response);
      
      // Handle response - expecting array directly
      let subjectData: Subject[] = [];
      
      if (Array.isArray(response)) {
        subjectData = response;
      } else {
        console.error('❌ Expected array of subjects but got:', typeof response, response);
        subjectData = [];
      }
      
      setSubjects(subjectData);
      console.log(`✅ Loaded ${subjectData.length} REAL subjects for course ${courseId} from database for Azizkh07`);
      
    } catch (error: any) {
      console.error('❌ Error loading REAL subjects for Azizkh07:', error);
      const errorMessage = getErrorMessage(error);
      setError(`Failed to load subjects from database: ${errorMessage}`);
      setSubjects([]); // NO MOCK FALLBACK
    }
  };

  // Course handlers - REAL DATABASE OPERATIONS ONLY
  const handleCourseSelect = (course: Course) => {
    setSelectedCourse(course);
    setActiveView('subjects');
  };

  const handleCreateCourse = () => {
    console.log('🎯 Create course button clicked for Azizkh07');
    setEditingCourse(null);
    setShowCourseForm(true);
  };

  const handleEditCourse = (course: Course) => {
    console.log('✏️ Edit course button clicked for Azizkh07:', course.title);
    setEditingCourse(course);
    setShowCourseForm(true);
  };

  const handleCourseFormSuccess = (course: Course) => {
    console.log('✅ Course form success - reloading REAL data from database:', course);
    setShowCourseForm(false);
    setEditingCourse(null);
    // ALWAYS reload from database - NO LOCAL STATE UPDATES
    loadRealCourses();
  };

  const handleDeleteCourse = async (course: Course) => {
    if (!window.confirm(`Are you sure you want to delete the course "${course.title}"? This action is irreversible and will delete all subjects and videos in this course.`)) {
      return;
    }

    try {
      console.log(`🗑️ Deleting REAL course ${course.id} from database for Azizkh07...`);
      const response = await api.delete(`/api/courses/${course.id}`);
      console.log('✅ Course deleted successfully from database:', response);
      
      // ALWAYS reload from database - NO LOCAL STATE UPDATES
      await loadRealCourses();
      
      // Reset selected course if it was deleted
      if (selectedCourse?.id === course.id) {
        setSelectedCourse(null);
        setActiveView('courses');
      }
      
    } catch (error) {
      console.error('❌ Error deleting REAL course for Azizkh07:', error);
      setError(`Failed to delete course from database: ${getErrorMessage(error)}`);
    }
  };

  // Subject handlers - REAL DATABASE OPERATIONS ONLY
  const handleCreateSubject = () => {
    console.log('🎯 Create subject button clicked for Azizkh07');
    setEditingSubject(null);
    setShowSubjectForm(true);
  };

  const handleEditSubject = (subject: Subject) => {
    console.log('✏️ Edit subject button clicked for Azizkh07:', subject.title);
    setEditingSubject(subject);
    setShowSubjectForm(true);
  };

  const handleSubjectFormSuccess = (subject: Subject) => {
    console.log('✅ Subject form success - reloading REAL data from database:', subject);
    setShowSubjectForm(false);
    setEditingSubject(null);
    
    // ALWAYS reload from database - NO LOCAL STATE UPDATES
    if (selectedCourse) {
      loadRealSubjects(selectedCourse.id);
    }
  };

  const handleDeleteSubject = async (subject: Subject) => {
    if (!window.confirm(`Are you sure you want to delete the subject "${subject.title}" and all its videos?`)) {
      return;
    }

    try {
      console.log(`🗑️ Deleting REAL subject ${subject.id} from database for Azizkh07...`);
      const response = await api.delete(`/api/subjects/${subject.id}`);
      console.log('✅ Subject deleted successfully from database:', response);
      
      // ALWAYS reload from database - NO LOCAL STATE UPDATES
      if (selectedCourse) {
        await loadRealSubjects(selectedCourse.id);
      }
      
    } catch (error) {
      console.error('❌ Error deleting REAL subject for Azizkh07:', error);
      setError(`Failed to delete subject from database: ${getErrorMessage(error)}`);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading REAL courses from database...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">📚 Course & Subject Management</h2>
         
            {error && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                <p className="text-xs text-red-600">⚠️ {error}</p>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setActiveView('courses')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeView === 'courses'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              📚 Courses ({courses.length})
            </button>
           
          </div>
        </div>
      </div>

      {/* Courses View */}
      {activeView === 'courses' && (
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900">📚 Courses List</h3>
             
            </div>
            <button
              onClick={handleCreateCourse}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              ➕ New Course
            </button>
          </div>

          {courses.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📚</div>
              <p className="text-gray-600 mb-2">No courses found in database</p>
              <p className="text-xs text-gray-500 mb-4">
                {error ? 'Database connection error' : 'Database is empty'}
              </p>
              <button
                onClick={handleCreateCourse}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create your first course
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map(course => (
                <div
                  key={course.id}
                  className="border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-200"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">📚</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        course.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {course.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                  
                  <h4 className="font-semibold text-gray-900 mb-2 cursor-pointer" onClick={() => handleCourseSelect(course)}>
                    {course.title}
                  </h4>
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                    {course.description || 'No description available'}
                  </p>
                  {course.category && (
                    <p className="text-xs text-blue-600 mb-4">📂 {course.category}</p>
                  )}
                  
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <span>📖 {course.subject_count || 0} subjects</span>
                    <span>🎥 {course.video_count || 0} videos</span>
                    <span>⏰ {course.total_hours || 0}h</span>
                  </div>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <button
                      onClick={() => handleCourseSelect(course)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      👁️ View Subjects
                    </button>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEditCourse(course)}
                        className="text-green-600 hover:text-green-800 text-sm"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => handleDeleteCourse(course)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Subjects View */}
      {activeView === 'subjects' && selectedCourse && (
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                📖 Subjects in: {selectedCourse.title}
              </h3>
              <p className="text-sm text-gray-600">
                Manage subjects for this course from real database
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setActiveView('courses')}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                ← Back to Courses
              </button>
              <button
                onClick={handleCreateSubject}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                ➕ New Subject
              </button>
            </div>
          </div>

          {subjects.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📖</div>
              <p className="text-gray-600 mb-4">No subjects in this course</p>
              <button
                onClick={handleCreateSubject}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Add first subject
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {subjects.map(subject => (
                <div
                  key={subject.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="text-2xl">📖</span>
                        <h4 className="font-semibold text-gray-900">{subject.title}</h4>
                        <span className="text-sm text-gray-500">#{subject.order_index}</span>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          subject.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {subject.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-6 text-sm text-gray-600">
                        <span>👨‍🏫 {subject.professor_name}</span>
                        <span>⏰ {subject.hours}h</span>
                        <span>🎥 {subject.video_count || 0} videos</span>
                        <span>📅 {new Date(subject.created_at).toLocaleDateString()}</span>
                      </div>
                      
                      {subject.description && (
                        <p className="text-sm text-gray-500 mt-2">{subject.description}</p>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button 
                        className="text-blue-600 hover:text-blue-800 text-sm"
                        onClick={() => handleEditSubject(subject)}
                      >
                        ✏️ Edit
                      </button>
                      <button 
                        className="text-red-600 hover:text-red-800 text-sm"
                        onClick={() => handleDeleteSubject(subject)}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Statistics */}
   

      {/* Course Form Modal */}
      <CourseForm
        isOpen={showCourseForm}
        onClose={() => {
          setShowCourseForm(false);
          setEditingCourse(null);
        }}
        onSuccess={handleCourseFormSuccess}
        editCourse={editingCourse}
      />

      {/* Subject Form Modal */}
      {selectedCourse && (
        <SubjectForm
          isOpen={showSubjectForm}
          onClose={() => {
            setShowSubjectForm(false);
            setEditingSubject(null);
          }}
          onSuccess={handleSubjectFormSuccess}
          courseId={selectedCourse.id}
          editSubject={editingSubject}
        />
      )}

   
    </div>
  );
};

export default CourseManagement;