import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { blogService, BlogPost } from '../lib/blog';
import Header from '../components/Header';
import '../styles/BlogDetailPage.css';
import DOMPurify from 'dompurify';

// Fallback images
const DEFAULT_BLOG_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImciIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiMyMmM1NWUiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiMxNmEzNGEiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cmVjdCB3aWR0aD0iODAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0idXJsKCNnKSIvPjx0ZXh0IHg9IjQwMCIgeT0iMjAwIiBmb250LWZhbWlseT0iSW50ZXIiIGZvbnQtc2l6ZT0iMzQiIGZpbGw9IiNmZmZmZmYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGFsaWdubWVudC1iYXNlbGluZT0ibWlkZGxlIiBmb250LXdlaWdodD0iNzAwIj7wn5OSKSBBY3R1YWxpdMOpcyBKdXJpZGlxdWVzPC90ZXh0Pjwvc3ZnPg==';
const DEFAULT_AVATAR = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJnIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj48c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjMjJjNTVlIi8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjMTZhMzRhIi8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMzAiIGZpbGw9InVybCgjZykiLz48dGV4dCB4PSIzMCIgeT0iMzYiIGZvbnQtZmFtaWx5PSJJbnRlciIgZm9udC1zaXplPSIxOCIgZmlsbD0iI2ZmZmZmZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgYWxpZ25tZW50LWJhc2VsaW5lPSJtaWRkbGUiIGZvbnQtd2VpZ2h0PSI3MDAiPkNKPC90ZXh0Pjwvc3ZnPg==';

const LoadingSpinner: React.FC = () => (
  <div className="blog-loading-container">
    <div className="blog-loading-spinner"></div>
  </div>
);

/** RTL detector */
const containsRTL = (text?: string) => {
  if (!text) return false;
  const rtlRegex = /[\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC]/;
  return rtlRegex.test(text);
};

/** Simple HTML detection to avoid wrapping block HTML in <p> */
const looksLikeHtml = (s?: string) => {
  if (!s) return false;
  return /<\s*[a-zA-Z][^>]*>/.test(s);
};

const BlogDetailPage: React.FC = () => {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isRtl, setIsRtl] = useState<boolean>(false);

  useEffect(() => {
    const fetchBlogPost = async () => {
      setLoading(true);
      setErrorMsg(null);
      setPost(null);

      if (!slug) {
        setErrorMsg(t('blog.detail_invalid_url', 'Invalid blog URL'));
        setLoading(false);
        return;
      }

      try {
        // 1) Try slug lookup first (raw slug)
        let found: BlogPost | null = null;
        try {
          found = await blogService.getBlogBySlug(slug);
        } catch (errRaw: any) {
          console.warn('getBlogBySlug(raw) failed:', errRaw?.message || errRaw);
          const statusRaw = errRaw?.response?.status || errRaw?.status;
          if (statusRaw === 401) {
            setErrorMsg(t('blog.error_unauthorized', 'Unauthorized (401) — blog API requires authentication. Check token/session.'));
            setLoading(false);
            return;
          }
          // try encoded slug next
          try {
            const encoded = encodeURIComponent(slug);
            found = await (blogService as any).getBlogBySlug(encoded);
          } catch (errEnc: any) {
            console.warn('getBlogBySlug(encoded) failed:', errEnc?.message || errEnc);
            const statusEnc = errEnc?.response?.status || errEnc?.status;
            if (statusEnc === 401) {
              setErrorMsg(t('blog.error_unauthorized', 'Unauthorized (401) — blog API requires authentication. Check token/session.'));
              setLoading(false);
              return;
            }
          }
        }

        // 2) If slug lookup did not find anything, and slug looks numeric, try ID lookup as a fallback
        if (!found) {
          const maybeNum = Number(slug);
          if (!Number.isNaN(maybeNum)) {
            try {
              if (typeof (blogService as any).getBlogById === 'function') {
                found = await (blogService as any).getBlogById(maybeNum);
              } else {
                const all = await blogService.getBlogPosts();
                found = all.find(p => p.id === maybeNum) || null;
              }
            } catch (errId: any) {
              console.warn('ID fallback failed:', errId?.message || errId);
              const statusId = errId?.response?.status || errId?.status;
              if (statusId === 401) {
                setErrorMsg(t('blog.error_unauthorized', 'Unauthorized (401) — check blog API credentials.'));
                setLoading(false);
                return;
              }
            }
          }
        }

        if (!found) {
          setErrorMsg(t('blog.detail_not_found', 'Article not found or inaccessible (404 / permissions).'));
          setLoading(false);
          return;
        }

        // success
        setPost(found);
        const textToCheck = `${found.title || ''}\n${found.excerpt || ''}\n${found.content || ''}`;
        setIsRtl(containsRTL(textToCheck));
        setLoading(false);
      } catch (err: any) {
        console.error('Unhandled error fetching blog detail:', err);
        const status = err?.response?.status || err?.status;
        if (status === 401) setErrorMsg(t('blog.error_unauthorized', 'Unauthorized (401) — check blog API credentials.'));
        else if (status === 404) setErrorMsg(t('blog.detail_not_found', 'Article not found (404).'));
        else setErrorMsg(t('blog.detail_load_failed', 'Failed to load blog post: {{msg}}', { msg: err?.message || 'Unknown error' }));
        setLoading(false);
      }
    };

    fetchBlogPost();
  }, [slug, t]);

  const renderChunk = (chunk: string, idx: number) => {
    const s = chunk.trim();
    if (!s) return null;
    if (looksLikeHtml(s)) {
      const sanitized = DOMPurify.sanitize(s);
      return <div key={idx} dangerouslySetInnerHTML={{ __html: sanitized }} />;
    }
    return <p key={idx}>{s}</p>;
  };

  if (loading) {
    return (
      <div className="blog-detail-container">
        <Header />
        <LoadingSpinner />
      </div>
    );
  }

  if (errorMsg || !post) {
    return (
      <div className="blog-detail-container">
        <Header />
        <div className="blog-error-container">
          <div className="blog-error-card">
            <h1 className="blog-error-title">{t('blog.detail_unavailable_title', 'Article unavailable')}</h1>
            <p className="blog-error-message">{errorMsg || t('blog.detail_unavailable_message', 'Article not available')}</p>
            <Link to="/blog" className="blog-error-back-btn">← {t('blog.back_to_list', 'Back to articles')}</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="blog-detail-container" lang={isRtl ? 'ar' : undefined}>
      <Header />
      <main className="blog-detail-main" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="blog-hero-image-container">
          <div className="blog-hero-image-wrapper">
            <img
              src={post.cover_image || DEFAULT_BLOG_IMAGE}
              alt={post.title}
              className="blog-hero-image"
              onError={(e: any) => { e.currentTarget.onerror = null; e.currentTarget.src = DEFAULT_BLOG_IMAGE; }}
            />
            <div className="blog-hero-overlay" />
          </div>
        </div>

        <div className={`blog-content-card ${isRtl ? 'rtl' : ''}`}>
          <h1 className="blog-article-title">{post.title}</h1>

          <div className="blog-author-section">
            <div className="blog-author-avatar">
              <img src={DEFAULT_AVATAR} alt={t('blog.author_alt', 'Author')} className="blog-author-avatar-img" />
            </div>
            <div className="blog-author-info">
              <div className="blog-author-name">{post.author_name || t('blog.author_default', 'Legal Clinic')}</div>
              <div className="blog-author-date">{new Date(post.created_at).toLocaleDateString()}</div>
            </div>
          </div>

          <div className="blog-article-content">
            <div className="blog-content-prose">
              {post.content.split(/\n\n+/).map((c, i) => renderChunk(c, i))}
            </div>
          </div>

          <div className="blog-navigation-footer">
            <Link to="/blog" className="blog-back-link">← {t('blog.back_to_list', 'Back to articles')}</Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default BlogDetailPage;