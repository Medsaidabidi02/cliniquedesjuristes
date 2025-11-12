import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import Header from '../components/Header';
import Loading from '../components/Loading';

interface Draft {
  id: number;
  title: string;
  excerpt?: string;
  content?: string;
  cover_image?: string;
  author_id?: number;
  author_name?: string;
  created_at?: string;
  updated_at?: string;
  published?: boolean;
}

const API_BASE = process.env.REACT_APP_API_URL ? process.env.REACT_APP_API_URL.replace(/\/$/, '') : '';

const resolveImage = (src?: string) => {
  if (!src) return '';
  const s = String(src).trim();
  if (!s) return '';
  if (/^https?:\/\//i.test(s) || /^\/\//.test(s)) return s;
  if (s.startsWith('/')) return API_BASE ? `${API_BASE}${s}` : s;
  if (s.startsWith('uploads/') || s.startsWith('upload/')) return API_BASE ? `${API_BASE}/${s}` : `/${s}`;
  return API_BASE ? `${API_BASE}/uploads/${s}` : `/uploads/${s}`;
};

const DraftsPage: React.FC = () => {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // editor state
  const [editing, setEditing] = useState<Draft | null>(null);
  const [form, setForm] = useState({
    title: '',
    excerpt: '',
    content: '',
    published: false,
    cover_image: null as File | null
  });

  useEffect(() => {
    fetchDrafts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchDrafts = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get<{ success: boolean; posts?: Draft[] }>('/blog/drafts');
      if (res && (res as any).success) {
        setDrafts((res as any).posts || []);
      } else {
        setDrafts([]);
        setError('Unexpected response from server when loading drafts.');
      }
    } catch (err: any) {
      console.error('Error fetching drafts:', err);
      setError(err?.message || 'Failed to load drafts. Check console.');
      setDrafts([]);
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (post: Draft) => {
    setEditing(post);
    setForm({
      title: post.title || '',
      excerpt: post.excerpt || '',
      content: post.content || '',
      published: !!post.published,
      cover_image: null
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closeEditor = () => {
    setEditing(null);
    setForm({ title: '', excerpt: '', content: '', published: false, cover_image: null });
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editing) return;
    try {
      const payload = new FormData();
      payload.append('title', form.title);
      payload.append('excerpt', form.excerpt);
      payload.append('content', form.content);
      payload.append('published', String(form.published));
      if (form.cover_image) payload.append('cover_image', form.cover_image);

      const result = await api.put(`/blog/${editing.id}`, payload);
      if ((result as any).success) {
        alert('✅ Draft updated');
        closeEditor();
        fetchDrafts();
      } else {
        console.error('Update failed', result);
        alert('❌ Update failed');
      }
    } catch (err: any) {
      console.error('Error updating draft:', err);
      alert('❌ Error updating draft. Check console.');
    }
  };

  const handlePublish = async (post: Draft) => {
    try {
      if (!window.confirm(`Publish "${post.title}"?`)) return;
      const result = await api.put(`/blog/${post.id}`, { published: true });
      if ((result as any).success) {
        alert('✅ Published');
        fetchDrafts();
      } else {
        console.error('Publish failed', result);
        alert('❌ Publish failed');
      }
    } catch (err) {
      console.error('Error publishing:', err);
      alert('❌ Error publishing. Check console.');
    }
  };

  const handleDelete = async (post: Draft) => {
    try {
      if (!window.confirm(`Delete draft "${post.title}"? This cannot be undone.`)) return;
      const result = await api.delete(`/blog/${post.id}`);
      if ((result as any).success) {
        alert('✅ Deleted');
        fetchDrafts();
      } else {
        console.error('Delete failed', result);
        alert('❌ Delete failed');
      }
    } catch (err) {
      console.error('Error deleting draft:', err);
      alert('❌ Error deleting draft. Check console.');
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Brouillons</h1>
            <p className="text-gray-600">Gérez vos brouillons — modifiez, supprimez ou publiez.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/blog" className="text-indigo-600 hover:text-indigo-800">Retour au blog</Link>
            <button onClick={fetchDrafts} className="px-3 py-2 bg-white border rounded-md shadow-sm">Rafraîchir</button>
          </div>
        </div>

        {error && <div className="mb-4 text-red-700 bg-red-50 p-3 rounded">{error}</div>}

        {editing && (
          <div className="bg-white rounded-lg p-6 shadow mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Modifier le brouillon</h3>
              <div className="flex gap-2">
                <button onClick={() => { setForm({ ...form, published: !form.published }); }} className="px-3 py-1 bg-indigo-50 rounded">Toggle publish</button>
                <button onClick={closeEditor} className="px-3 py-1 bg-gray-100 rounded">Fermer</button>
              </div>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full p-3 border rounded"
                placeholder="Titre"
                required
              />
              <input
                type="text"
                value={form.excerpt}
                onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
                className="w-full p-3 border rounded"
                placeholder="Résumé (optionnel)"
              />
              <textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                rows={8}
                className="w-full p-3 border rounded font-mono text-sm"
                placeholder="Contenu..."
                required
              />
              <div>
                <label className="block text-sm mb-1">Image de couverture (optionnel)</label>
                <input type="file" accept="image/*" onChange={(e) => setForm({ ...form, cover_image: e.target.files?.[0] || null })} />
              </div>

              <div className="flex gap-2">
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded">Sauvegarder</button>
                <button type="button" onClick={() => handlePublish(editing)} className="px-4 py-2 bg-green-600 text-white rounded">Publier</button>
                <button type="button" onClick={() => handleDelete(editing)} className="px-4 py-2 bg-red-600 text-white rounded">Supprimer</button>
              </div>
            </form>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {drafts.map((d) => (
            <div key={d.id} className="bg-white p-4 rounded-lg shadow flex gap-4">
              <div className="w-28 h-20 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                {d.cover_image ? (
                  // eslint-disable-next-line jsx-a11y/img-redundant-alt
                  <img src={resolveImage(d.cover_image)} alt="cover" className="w-full h-full object-cover" onError={(e: any) => { e.currentTarget.onerror = null; e.currentTarget.src = '/images/placeholder-course.png'; }} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">📝</div>
                )}
              </div>

              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{d.title}</h3>
                <p className="text-xs text-gray-500 mt-1">Par {d.author_name || '—'}</p>
                <p className="text-sm text-gray-600 mt-2 line-clamp-2">{d.excerpt}</p>

                <div className="mt-3 flex items-center gap-2">
                  <button onClick={() => openEdit(d)} className="px-3 py-1 bg-blue-50 text-blue-700 rounded text-sm">Modifier</button>
                  <button onClick={() => handlePublish(d)} className="px-3 py-1 bg-green-50 text-green-700 rounded text-sm">Publier</button>
                  <button onClick={() => handleDelete(d)} className="px-3 py-1 bg-red-50 text-red-700 rounded text-sm">Supprimer</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default DraftsPage;