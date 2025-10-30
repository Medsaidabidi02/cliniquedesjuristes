import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import type { Course } from '../../types';

interface Subject {
  id: number;
  title: string;
  course_id: number;
  professor_name?: string;
  hours?: number;
  description?: string;
  is_active?: boolean;
  order_index?: number;
  created_at?: string;
  updated_at?: string;
}

type ManageCoursesProps = {
  userId: number;
  open: boolean;
  onClose: () => void;
  onUpdated?: () => void;
};

interface CourseEnrollment {
  courseId: number;
  hasFullAccess: boolean;
  subjectIds: number[];
}

const ManageUserCourses: React.FC<ManageCoursesProps> = ({ userId, open, onClose, onUpdated }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [subjects, setSubjects] = useState<Record<number, Subject[]>>({});
  const [enrollments, setEnrollments] = useState<Record<number, CourseEnrollment>>({});
  const [expandedCourse, setExpandedCourse] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchCourses();
      fetchUserEnrollments();
    }
    // cleanup when closed
    if (!open) {
      setCourses([]);
      setSubjects({});
      setEnrollments({});
      setExpandedCourse(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, userId]);

  const fetchCourses = async () => {
    try {
      const res: any = await api.get('/courses');
      let coursesData: Course[] = [];
      if (Array.isArray(res)) coursesData = res;
      else if (res && res.success && Array.isArray(res.courses)) coursesData = res.courses;
      else if (res && Array.isArray(res.data)) coursesData = res.data;
      else if (res && Array.isArray(res)) coursesData = res;
      
      setCourses(coursesData);
      
      // Fetch subjects for each course
      const subjectsData: Record<number, Subject[]> = {};
      for (const course of coursesData) {
        try {
          const subRes: any = await api.get(`/subjects/course/${course.id}`);
          if (subRes && subRes.success && Array.isArray(subRes.data)) {
            subjectsData[course.id] = subRes.data;
          } else if (Array.isArray(subRes)) {
            subjectsData[course.id] = subRes;
          } else {
            subjectsData[course.id] = [];
          }
        } catch (err) {
          console.error(`Error fetching subjects for course ${course.id}:`, err);
          subjectsData[course.id] = [];
        }
      }
      setSubjects(subjectsData);
    } catch (err) {
      console.error('Error fetching courses:', err);
    }
  };

  const fetchUserEnrollments = async () => {
    try {
      const res: any = await api.get(`/user-courses/user/${userId}`);
      if (res && res.success && Array.isArray(res.courses)) {
        const enrollmentData: Record<number, CourseEnrollment> = {};
        
        res.courses.forEach((course: any) => {
          enrollmentData[course.id] = {
            courseId: course.id,
            hasFullAccess: course.hasFullAccess || false,
            subjectIds: course.subjects ? course.subjects.map((s: any) => s.id) : []
          };
        });
        
        setEnrollments(enrollmentData);
      }
    } catch (err) {
      console.error('Error fetching user enrollments:', err);
    }
  };

  const toggleCourseAccess = async (courseId: number) => {
    try {
      const token = localStorage.getItem('authToken');
      const userRaw = localStorage.getItem('user');

      if (!token || !userRaw) {
        alert("Vous n'êtes pas connecté (ou la session a expiré). Connectez-vous en tant qu'administrateur.");
        return;
      }

      const user = JSON.parse(userRaw);
      if (!user.is_admin && !user.isAdmin) {
        alert('Accès refusé — privilèges administrateur requis.');
        return;
      }

      const enrollment = enrollments[courseId];
      
      if (enrollment && enrollment.hasFullAccess) {
        // Remove full course access
        await api.delete('/user-courses/enroll', { userId, courseId } as any);
        const newEnrollments = { ...enrollments };
        delete newEnrollments[courseId];
        setEnrollments(newEnrollments);
      } else {
        // Add full course access (remove any subject-specific enrollments first)
        if (enrollment && enrollment.subjectIds.length > 0) {
          await api.delete('/user-courses/enroll', { 
            userId, 
            courseId,
            subjectIds: enrollment.subjectIds 
          } as any);
        }
        
        await api.post('/user-courses/enroll', { userId, courseId });
        setEnrollments({
          ...enrollments,
          [courseId]: {
            courseId,
            hasFullAccess: true,
            subjectIds: []
          }
        });
      }
      
      if (onUpdated) onUpdated();
    } catch (err) {
      console.error('Error toggling course access:', err);
      const msg = (err as any)?.message || 'Erreur lors de la mise à jour de l\'inscription';
      alert(msg);
    }
  };

  const toggleSubjectAccess = async (courseId: number, subjectId: number) => {
    try {
      const token = localStorage.getItem('authToken');
      const userRaw = localStorage.getItem('user');

      if (!token || !userRaw) {
        alert("Vous n'êtes pas connecté (ou la session a expiré). Connectez-vous en tant qu'administrateur.");
        return;
      }

      const user = JSON.parse(userRaw);
      if (!user.is_admin && !user.isAdmin) {
        alert('Accès refusé — privilèges administrateur requis.');
        return;
      }

      const enrollment = enrollments[courseId] || { courseId, hasFullAccess: false, subjectIds: [] };
      
      // If user has full course access, don't allow individual subject toggling
      if (enrollment.hasFullAccess) {
        alert('L\'utilisateur a déjà accès au cours complet. Retirez l\'accès au cours pour gérer les matières individuelles.');
        return;
      }

      const hasSubject = enrollment.subjectIds.includes(subjectId);
      
      if (hasSubject) {
        // Remove subject access
        await api.delete('/user-courses/enroll', { 
          userId, 
          courseId,
          subjectIds: [subjectId]
        } as any);
        
        const newSubjectIds = enrollment.subjectIds.filter(id => id !== subjectId);
        const newEnrollments = { ...enrollments };
        
        if (newSubjectIds.length === 0) {
          delete newEnrollments[courseId];
        } else {
          newEnrollments[courseId] = {
            ...enrollment,
            subjectIds: newSubjectIds
          };
        }
        
        setEnrollments(newEnrollments);
      } else {
        // Add subject access
        await api.post('/user-courses/enroll', { 
          userId, 
          courseId,
          subjectIds: [subjectId]
        });
        
        setEnrollments({
          ...enrollments,
          [courseId]: {
            ...enrollment,
            subjectIds: [...enrollment.subjectIds, subjectId]
          }
        });
      }
      
      if (onUpdated) onUpdated();
    } catch (err) {
      console.error('Error toggling subject access:', err);
      const msg = (err as any)?.message || 'Erreur lors de la mise à jour de l\'inscription';
      alert(msg);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-auto">
        <div className="flex justify-between items-center mb-4 sticky top-0 bg-white pb-2 border-b">
          <h3 className="text-lg font-semibold">Gérer les cours pour l'utilisateur #{userId}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <div className="space-y-3">
          {courses.map(c => {
            const enrollment = enrollments[c.id];
            const hasFullAccess = enrollment?.hasFullAccess || false;
            const hasAnyAccess = hasFullAccess || (enrollment?.subjectIds.length || 0) > 0;
            const courseSubjects = subjects[c.id] || [];
            const isExpanded = expandedCourse === c.id;

            return (
              <div key={c.id} className="border rounded-lg overflow-hidden">
                <div className="flex items-center justify-between p-3 bg-gray-50">
                  <div className="flex-1">
                    <div className="font-medium">{c.title}</div>
                    <div className="text-sm text-gray-500">
                      {(c as any).category || ''} • {courseSubjects.length} matière(s)
                    </div>
                    {enrollment && !hasFullAccess && enrollment.subjectIds.length > 0 && (
                      <div className="text-xs text-blue-600 mt-1">
                        {enrollment.subjectIds.length} matière(s) assignée(s)
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {courseSubjects.length > 0 && (
                      <button
                        onClick={() => setExpandedCourse(isExpanded ? null : c.id)}
                        className="px-3 py-1 text-sm rounded bg-gray-100 hover:bg-gray-200"
                      >
                        {isExpanded ? '▼ Masquer' : '▶ Matières'}
                      </button>
                    )}
                    <button
                      onClick={() => toggleCourseAccess(c.id)}
                      className={`px-3 py-1 rounded ${
                        hasFullAccess
                          ? 'bg-green-100 text-green-700'
                          : hasAnyAccess
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {hasFullAccess ? '✓ Cours complet' : hasAnyAccess ? 'Partiel' : 'Ajouter cours'}
                    </button>
                  </div>
                </div>

                {isExpanded && courseSubjects.length > 0 && (
                  <div className="p-3 bg-white border-t">
                    <div className="text-sm font-medium mb-2 text-gray-700">Matières disponibles :</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {courseSubjects.map(subject => {
                        const hasSubject = enrollment?.subjectIds.includes(subject.id) || false;
                        
                        return (
                          <div key={subject.id} className="flex items-center justify-between p-2 border rounded bg-gray-50">
                            <div className="flex-1">
                              <div className="text-sm font-medium">{subject.title}</div>
                              {subject.professor_name && (
                                <div className="text-xs text-gray-500">{subject.professor_name}</div>
                              )}
                            </div>
                            <button
                              onClick={() => toggleSubjectAccess(c.id, subject.id)}
                              disabled={hasFullAccess}
                              className={`px-2 py-1 text-xs rounded ${
                                hasFullAccess
                                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                  : hasSubject
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-green-100 text-green-700'
                              }`}
                            >
                              {hasFullAccess ? 'Inclus' : hasSubject ? 'Retirer' : 'Ajouter'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex justify-end sticky bottom-0 bg-white pt-2 border-t">
          <button onClick={onClose} className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200">Fermer</button>
        </div>
      </div>
    </div>
  );
};

export default ManageUserCourses;