import React, { useState } from 'react';
import { User } from '../../types';
import ManageUserCourses from './ManageUserCourses';
import ConfirmDialog from '../ui/ConfirmDialog';

interface UserManagementProps {
  users: User[];
  onCreateUser: (user: Omit<User, 'id' | 'created_at' | 'updated_at'>) => void;
  onApproveUser: (userId: number) => void;
  onEditUser: (userId: number, updates: Partial<User>) => void;
  onDeleteUser: (userId: number) => void;
  onRefresh?: () => void;
}

const UserManagement: React.FC<UserManagementProps> = ({
  users = [], // ✅ FIXED: Add default empty array
  onCreateUser,
  onApproveUser,
  onEditUser,
  onDeleteUser,
  onRefresh
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'approved' | 'pending'>('all');

  const [manageCoursesOpen, setManageCoursesOpen] = useState(false);
  const [manageUserId, setManageUserId] = useState<number | null>(null);

  // confirmation modal state for delete
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingDeleteUserId, setPendingDeleteUserId] = useState<number | null>(null);

  // Create User Form State
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    password: '',
    is_admin: false,
    is_approved: true
  });

  // Edit User Form State
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    is_admin: false,
    is_approved: true
  });

  // ✅ FIXED: Add safety checks for users array and user properties
  const safeUsers = Array.isArray(users) ? users : [];
  
  const filteredUsers = safeUsers.filter(user => {
    // ✅ FIXED: Add safety checks for user properties
    if (!user || typeof user !== 'object') return false;
    
    const userName = user.name || '';
    const userEmail = user.email || '';
    const userIsApproved = user.is_approved !== undefined ? user.is_approved : false;
    
    const matchesSearch = userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         userEmail.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' ||
                         (filterStatus === 'approved' && userIsApproved) ||
                         (filterStatus === 'pending' && !userIsApproved);

    return matchesSearch && matchesStatus;
  });

  // ✅ FIXED: Add safety check for pendingUsers
  const pendingUsers = safeUsers.filter(user => 
    user && typeof user === 'object' && user.is_approved === false
  );

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      onCreateUser(createForm);
      setCreateForm({ name: '', email: '', password: '', is_admin: false, is_approved: true });
      setShowCreateModal(false);
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('❌ Error creating user for Medsaidabidi02:', error);
      alert('Erreur lors de la création de l\'utilisateur');
    }
  };

  const handleEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedUser && selectedUser.id) {
        onEditUser(selectedUser.id, editForm);
        setShowEditModal(false);
        setSelectedUser(null);
        if (onRefresh) onRefresh();
      }
    } catch (error) {
      console.error('❌ Error editing user for Medsaidabidi02:', error);
      alert('Erreur lors de la modification de l\'utilisateur');
    }
  };

  const openEditModal = (user: User) => {
    // ✅ FIXED: Add safety checks for user properties
    if (!user || typeof user !== 'object') {
      console.error('❌ Invalid user object for editing:', user);
      return;
    }
    
    setSelectedUser(user);
    setEditForm({
      name: user.name || '',
      email: user.email || '',
      is_admin: user.is_admin || false,
      is_approved: user.is_approved !== undefined ? user.is_approved : false
    });
    setShowEditModal(true);
  };

  const openManageCourses = (userId: number) => {
    setManageUserId(userId);
    setManageCoursesOpen(true);
  };

  const requestDelete = (userId: number) => {
    setPendingDeleteUserId(userId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    try {
      if (pendingDeleteUserId !== null) {
        onDeleteUser(pendingDeleteUserId);
        if (onRefresh) onRefresh();
      }
    } catch (error) {
      console.error('❌ Error deleting user for Medsaidabidi02:', error);
      alert('Erreur lors de la suppression de l\'utilisateur');
    } finally {
      setShowDeleteConfirm(false);
      setPendingDeleteUserId(null);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      if (!dateString) return 'Date inconnue';
      return new Date(dateString).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('❌ Error formatting date for Medsaidabidi02:', error);
      return 'Date invalide';
    }
  };

  // ✅ FIXED: Add loading state for when users is undefined
  if (!Array.isArray(users)) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des utilisateurs...</p>
        </div>
      </div>
    );
  }

  console.log('👥 UserManagement rendered for Medsaidabidi02 at 2025-09-09 17:57:00', {
    totalUsers: safeUsers.length,
    filteredUsers: filteredUsers.length,
    pendingUsers: pendingUsers.length
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestion des Utilisateurs</h2>
          <p className="text-gray-600">Créez, approuvez et gérez les comptes utilisateurs</p>
        </div>
        
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          Créer Utilisateur
        </button>
      </div>

      {/* Pending Approvals Alert */}
      {pendingUsers.length > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-yellow-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <h3 className="text-yellow-800 font-medium">
                {pendingUsers.length} utilisateur{pendingUsers.length > 1 ? 's' : ''} en attente d'approbation
              </h3>
              <p className="text-yellow-700 text-sm">
                Vérifiez et approuvez les nouveaux comptes ci-dessous.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <input
              type="text"
              placeholder="Rechercher un utilisateur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
        
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as any)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="all">Tous les statuts</option>
          <option value="approved">Approuvés</option>
          <option value="pending">En attente</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Utilisateur</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rôle</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Inscription</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {/* ✅ FIXED: Filter out admin users safely */}
              {safeUsers.filter(u => u && typeof u === 'object' && !u.is_admin).map(user => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-medium text-sm">
                          {(user.name || 'U').charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.name || 'Nom inconnu'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.email || 'Email inconnu'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${user.is_admin ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                      {user.is_admin ? 'Admin' : 'Utilisateur'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${user.is_approved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {user.is_approved ? 'Approuvé' : 'En attente'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(user.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      {!user.is_approved && (
                        <button
                          onClick={() => onApproveUser(user.id)}
                          className="text-green-600 hover:text-green-900 px-3 py-1 border border-green-300 rounded hover:bg-green-50 transition-colors"
                        >
                          Approuver
                        </button>
                      )}
                      <button
                        onClick={() => openEditModal(user)}
                        className="text-primary-600 hover:text-primary-900 px-3 py-1 border border-primary-300 rounded hover:bg-primary-50 transition-colors"
                      >
                        Modifier
                      </button>

                      <button
                        onClick={() => openManageCourses(user.id)}
                        className="text-indigo-600 hover:text-indigo-900 px-3 py-1 border border-indigo-300 rounded hover:bg-indigo-50 transition-colors"
                      >
                        Gérer Cours
                      </button>

                      <button
                        onClick={() => requestDelete(user.id)}
                        className="text-red-600 hover:text-red-900 px-3 py-1 border border-red-300 rounded hover:bg-red-50 transition-colors"
                      >
                        Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-1">Aucun utilisateur trouvé</h3>
            <p className="text-gray-500">Essayez de modifier vos critères de recherche.</p>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Créer un Utilisateur</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nom complet *</label>
                <input 
                  type="text" 
                  required 
                  value={createForm.name} 
                  onChange={(e) => setCreateForm({...createForm, name: e.target.value})} 
                  className="input-field" 
                  placeholder="Nom de l'utilisateur" 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                <input 
                  type="email" 
                  required 
                  value={createForm.email} 
                  onChange={(e) => setCreateForm({...createForm, email: e.target.value})} 
                  className="input-field" 
                  placeholder="email@exemple.com" 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mot de passe *</label>
                <input 
                  type="password" 
                  required 
                  value={createForm.password} 
                  onChange={(e) => setCreateForm({...createForm, password: e.target.value})} 
                  className="input-field" 
                  placeholder="Mot de passe" 
                />
              </div>

              <div className="space-y-3">
                <label className="flex items-center">
                  <input 
                    type="checkbox" 
                    checked={createForm.is_approved} 
                    onChange={(e) => setCreateForm({...createForm, is_approved: e.target.checked})} 
                    className="w-4 h-4" 
                  />
                  <span className="ml-2 text-sm text-gray-900">Compte approuvé</span>
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setShowCreateModal(false)} 
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button type="submit" className="flex-1 btn-primary">Créer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Modifier Utilisateur</h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <form onSubmit={handleEditUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nom complet *</label>
                <input 
                  type="text" 
                  required 
                  value={editForm.name} 
                  onChange={(e) => setEditForm({...editForm, name: e.target.value})} 
                  className="input-field" 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                <input 
                  type="email" 
                  required 
                  value={editForm.email} 
                  onChange={(e) => setEditForm({...editForm, email: e.target.value})} 
                  className="input-field" 
                />
              </div>

              <div className="space-y-3">
                <label className="flex items-center">
                  <input 
                    type="checkbox" 
                    checked={editForm.is_approved} 
                    onChange={(e) => setEditForm({...editForm, is_approved: e.target.checked})} 
                    className="w-4 h-4" 
                  />
                  <span className="ml-2 text-sm text-gray-900">Compte approuvé</span>
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setShowEditModal(false)} 
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button type="submit" className="flex-1 btn-primary">Sauvegarder</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage courses modal */}
      <ManageUserCourses 
        open={manageCoursesOpen} 
        userId={manageUserId ?? 0} 
        onClose={() => { 
          setManageCoursesOpen(false); 
          if (onRefresh) onRefresh(); 
        }} 
        onUpdated={() => { 
          if (onRefresh) onRefresh(); 
        }} 
      />

      {/* Delete confirmation modal */}
      <ConfirmDialog
        open={showDeleteConfirm}
        title="Supprimer l'utilisateur"
        message="Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible."
        onCancel={() => { 
          setShowDeleteConfirm(false); 
          setPendingDeleteUserId(null); 
        }}
        onConfirm={confirmDelete}
      />
    </div>
  );
};

export default UserManagement;