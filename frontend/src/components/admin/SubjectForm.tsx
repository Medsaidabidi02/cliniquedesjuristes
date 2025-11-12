import React, { useState, useEffect } from 'react';
import { api, apiUtils, getErrorMessage } from '../../lib/api';

interface SubjectFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (subject: any) => void;
  courseId: number;
  editSubject?: any;
}

interface SubjectFormData {
  title: string;
  description: string;
  professor_name: string;
  hours: number;
  is_active: boolean;
}

const SubjectForm: React.FC<SubjectFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
  courseId,
  editSubject
}) => {
  const [formData, setFormData] = useState<SubjectFormData>({
    title: '',
    description: '',
    professor_name: '',
    hours: 0,
    is_active: true
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  console.log(`📖 SubjectForm initialized for Azizkh07 at UTC: 2025-08-20 13:45:13`);

  useEffect(() => {
    if (editSubject) {
      console.log('✏️ Loading existing subject data for editing:', editSubject.title);
      setFormData({
        title: editSubject.title || '',
        description: editSubject.description || '',
        professor_name: editSubject.professor_name || '',
        hours: editSubject.hours || 0,
        is_active: editSubject.is_active !== false
      });
    } else {
      setFormData({
        title: '',
        description: '',
        professor_name: '',
        hours: 0,
        is_active: true
      });
    }
    setError('');
  }, [editSubject, isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' 
        ? (e.target as HTMLInputElement).checked
        : type === 'number' 
        ? Number(value) 
        : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
  
    // ENHANCED: Pre-flight authentication check
    if (!apiUtils.isAuthenticated()) {
      setError('❌ Not authenticated. Please log in first.');
      setLoading(false);
      return;
    }
  
    const user = apiUtils.getUserData();
    if (!user?.is_admin) {
      setError('❌ Admin privileges required to create/edit subjects.');
      setLoading(false);
      return;
    }
  
    try {
      const token = apiUtils.getAuthToken();
      console.log(`💾 ${editSubject ? 'Updating' : 'Creating'} subject for Medsaidabidi02 at 2025-09-09 16:38:37...`);
      console.log(`🔐 Using token: ${token ? token.substring(0, 15) + '...' : 'MISSING'}`);
      console.log(`👤 User: ${user.name} (ID: ${user.id}, Admin: ${user.is_admin})`);
  
      const payload = {
        ...formData,
        course_id: courseId
      };
  
      console.log('📤 Sending payload (auto-ordering):', payload);
  
      let response;
      if (editSubject) {
        console.log(`🔄 PUT request to /api/subjects/${editSubject.id}`);
        response = await api.put(`/api/subjects/${editSubject.id}`, payload);
      } else {
        console.log('➕ POST request to /api/subjects');
        response = await api.post('/api/subjects', payload);
      }
  
      console.log('✅ Subject saved successfully with auto-ordering for Medsaidabidi02:', response);
      
      // ✅ FIXED: Extract actual subject data from MySQL5 response
      let actualSubject;
      if (response && typeof response === 'object' && 'success' in response && 'data' in response) {
        actualSubject = response.data;
        console.log('✅ Extracted subject data from MySQL5 response for Medsaidabidi02:', actualSubject);
      } else {
        actualSubject = response;
      }
      
      onSuccess(actualSubject); // Pass the extracted subject data
      onClose();
      
    } catch (error: any) {
      console.error('❌ Error saving subject for Medsaidabidi02:', error);
      
      const errorMessage = getErrorMessage(error);
      
      if (error.message?.includes('401') || errorMessage.includes('Unauthorized')) {
        setError('🔒 Authentication failed. Your session may have expired. Please log in again.');
      } else if (error.message?.includes('403') || errorMessage.includes('Forbidden')) {
        setError('🚫 Access denied. Admin privileges required.');
      } else if (error.message?.includes('400')) {
        setError('📝 Invalid data. Please check all required fields.');
      } else if (error.message?.includes('500')) {
        setError('🛠️ Server error. Please try again later.');
      } else {
        setError(`❌ ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  };

  
  if (!isOpen) return null;

  // Get current auth status
  const isAuthenticated = apiUtils.isAuthenticated();
  const user = apiUtils.getUserData();
  const token = apiUtils.getAuthToken();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-screen overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              📖 {editSubject ? 'Modifier la Matière' : 'Nouvelle Matière'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
              disabled={loading}
            >
              ✕
            </button>
          </div>

  

    

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Titre de la matière *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Ex: Introduction au Droit Civil"
                required
                disabled={loading}
              />
            </div>

            {/* Professor Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom du professeur *
              </label>
              <input
                type="text"
                name="professor_name"
                value={formData.professor_name}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Ex: Prof. Martin Dupont"
                required
                disabled={loading}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Description de la matière..."
                disabled={loading}
              />
            </div>

            {/* Hours - Now full width since we removed order_index */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre d'heures
              </label>
              <input
                type="number"
                name="hours"
                value={formData.hours}
                onChange={handleInputChange}
                min="0"
                max="1000"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Ex: 30"
                disabled={loading}
              />
              <p className="text-xs text-gray-500 mt-1">
                💡 L'ordre d'affichage est géré automatiquement
              </p>
            </div>

            {/* Active Status */}
   

            {/* Form Actions */}
            <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={loading}
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading || !isAuthenticated || !user?.is_admin}
              >
                {loading ? '💾 Enregistrement...' : (editSubject ? '✅ Modifier' : '➕ Créer')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SubjectForm;