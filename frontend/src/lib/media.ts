export const API_BASE = (process.env.REACT_APP_API_URL ||'').replace(/\/$/, '');

export function resolveMediaUrl(src?: string, fallbackPath = '/api/placeholder/400/200'): string {
  if (!src) {
    // If frontend has an API base, use it for the placeholder route; otherwise use relative path
    return (API_BASE ? `${API_BASE}${fallbackPath}` : fallbackPath);
  }

  const s = String(src).trim();
  if (!s) return (API_BASE ? `${API_BASE}${fallbackPath}` : fallbackPath);

  // If already absolute
  if (/^https?:\/\//i.test(s) || /^\/\//.test(s)) return s;
  // If starts with slash (e.g. /uploads/...), prefix API_BASE if exists
  if (s.startsWith('/')) return API_BASE ? `${API_BASE}${s}` : s;
  // If a relative uploads path (uploads/...), prefix with API_BASE/uploads
  if (s.startsWith('uploads/') || s.startsWith('upload/')) return API_BASE ? `${API_BASE}/${s}` : `/${s}`;
  // Otherwise treat as relative path and prefix API_BASE
  return API_BASE ? `${API_BASE}/${s}` : `/${s}`;
}