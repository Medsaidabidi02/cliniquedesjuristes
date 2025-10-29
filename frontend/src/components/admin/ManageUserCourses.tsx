import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import type { Course } from '../../types';

type ManageCoursesProps = {
  userId: number;
  open: boolean;
  onClose: () => void;
  onUpdated?: () => void;
};

const ManageUserCourses: React.FC<ManageCoursesProps> = ({ userId, open, onClose, onUpdated }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrolledIds, setEnrolledIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchCourses();
      fetchUserEnrollments();
    }
    // cleanup when closed
    if (!open) {
      setCourses([]);
      setEnrolledIds(new Set());
    }
  }, [open]);

  const fetchCourses = async () => {
    try {
      const res: any = await api.get('/courses');
      if (Array.isArray(res)) setCourses(res);
      else if (res && res.success && Array.isArray(res.courses)) setCourses(res.courses);
      else if (res && Array.isArray(res.data)) setCourses(res.data);
      else if (res && Array.isArray(res)) setCourses(res);
    } catch (err) {
      console.error('Error fetching courses:', err);
    }
  };

  const fetchUserEnrollments = async () => {
    try {
      const res: any = await api.get(`/user-courses/user/${userId}`);
      if (res && res.success) {
        const ids = res.courseIds || (res.courses || []).map((c: any) => c.id) || [];
        setEnrolledIds(new Set(ids));
      }
    } catch (err) {
      console.error('Error fetching user enrollments:', err);
    }
  };

  const toggle = async (courseId: number) => {
    try {
      const token = localStorage.getItem('authToken');
      const userRaw = localStorage.getItem('user');
      console.log('🔧 toggle called', { userRaw, tokenPresent: !!token, courseId });

      if (!token || !userRaw) {
        alert("Vous n'êtes pas connecté (ou la session a expiré). Connectez-vous en tant qu'administrateur.");
        return;
      }

      const user = JSON.parse(userRaw);
      if (!user.is_admin && !user.isAdmin) {
        alert('Accès refusé — privilèges administrateur requis.');
        return;
      }

      if (enrolledIds.has(courseId)) {
        // use api.delete now supporting body
        const res = await api.delete('/user-courses/enroll', { userId, courseId } as any);
        console.log('delete response', res);
        const copy = new Set(enrolledIds);
        copy.delete(courseId);
        setEnrolledIds(copy);
      } else {
        const res = await api.post('/user-courses/enroll', { userId, courseId });
        console.log('post response', res);
        const copy = new Set(enrolledIds);
        copy.add(courseId);
        setEnrolledIds(copy);
      }
      if (onUpdated) onUpdated();
    } catch (err) {
      console.error('Error toggling enrollment:', err);
      const msg = (err as any)?.message || 'Erreur lors de la mise à jour de l\'inscription';
      if (msg.toLowerCase().includes('authentication')) {
        alert('Session invalide. Veuillez vous reconnecter en tant qu\'administrateur.');
      } else {
        alert(msg);
      }
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Gérer les cours pour l'utilisateur #{userId}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-auto">
          {courses.map(c => (
            <div key={c.id} className="flex items-center justify-between p-3 border rounded">
              <div>
                <div className="font-medium">{c.title}</div>
                <div className="text-sm text-gray-500">{(c as any).category || ''}</div>
              </div>
              <div>
                <button onClick={() => toggle(c.id)} className={`px-3 py-1 rounded ${enrolledIds.has(c.id) ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                  {enrolledIds.has(c.id) ? 'Retirer' : 'Ajouter'}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200">Fermer</button>
        </div>
      </div>
    </div>
  );
};

export default ManageUserCourses;