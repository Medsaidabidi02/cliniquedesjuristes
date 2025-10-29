import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { blogService, BlogPost } from '../lib/blog';
import Header from '../components/Header';
import Loading from '../components/Loading';
import '../styles/BlogPage.css';

const DEFAULT_BLOG_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImciIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiMyMmM1NWUiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiMxNmEzNGEiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cmVjdCB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgZmlsbD0idXJsKCNnKSIvPjx0ZXh0IHg9IjQwMCIgeT0iMzAwIiBmb250LWZhbWlseT0iSW50ZXIiIGZvbnQtc2l6ZT0iMzQiIGZpbGw9IiNmZmZmZmYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGFsaWdubWVudC1iYXNlbGluZT0ibWlkZGxlIiBmb250LXdlaWdodD0iNzAwIj7wn5OSKSBBY3R1YWxpdMOpcyBKdXJpZGlxdWVzPC90ZXh0Pjwvc3ZnPg==';

/** Detect if a text contains common RTL characters (Arabic/Hebrew/etc.) */
const containsRTL = (text?: string) => {
  if (!text) return false;
  const rtlRegex = /[\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC]/;
  return rtlRegex.test(text);
};

const BlogPage: React.FC = () => {
  const { t } = useTranslation();
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        setLoading(true);
        const fetchedBlogs = await blogService.getBlogPosts();
        setBlogs(fetchedBlogs);
      } catch (err) {
        console.error("Failed to fetch blogs:", err);
        setError(t('blog.error_loading', 'Failed to load blog posts. Please try again later.'));
      } finally {
        setLoading(false);
      }
    };

    fetchBlogs();

    // Trigger animations
    setTimeout(() => setIsVisible(true), 300);
  }, [t]);

  // Function to format date
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Function to create excerpt if none exists
  const getExcerpt = (content: string, excerpt?: string) => {
    if (excerpt) return excerpt;
    return content.substring(0, 150) + (content.length > 150 ? '...' : '');
  };

  if (loading) return <Loading />;

  return (
    <div className="blog-page-container">
      <Header />

      {/* Hero Section */}
      <section className="blog-hero-section" aria-label={t('blog.hero_section', 'Blog')}>
        <div className="blog-hero-grid" />

        <div className="blog-particles-container">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="blog-particle" />
          ))}
        </div>

        <div className="blog-hero-content">
          <div className="blog-hero-badge">
            <span className="blog-badge-icon">✍️</span>
            <span className="blog-badge-text">{t('blog.hero_badge', 'News & Legal Advice')}</span>
            <div className="blog-badge-glow" />
          </div>

          <h1 className="blog-hero-title">
            {t('blog.hero_title_prefix', 'Latest')} <span className="blog-title-highlight">{t('blog.hero_title_highlight', 'Articles')}</span>
          </h1>

          <p className="blog-hero-description">
            {t('blog.hero_description', "Discover expert tips, legal news and learning resources to stay up-to-date with the latest legal developments.")}
          </p>
        </div>
      </section>

      {/* Main Content */}
      <main className="blog-main-content">
        <div className="blog-container">
          {error && (
            <div className="blog-error-card">
              <p className="blog-error-text">{error}</p>
            </div>
          )}

          {blogs.length === 0 && !error ? (
            <div className="blog-empty-state">
              <div className="blog-empty-animation">📝</div>
              <p className="blog-empty-text">{t('blog.empty_text', 'Our articles are coming soon! Check back later for legal content.')}</p>
            </div>
          ) : (
            <div className="blog-grid">
              {blogs.map((blog, index) => {
                // Determine whether the blog has a usable slug. Avoid linking to "-1" or empty slugs.
                const rawSlug = (blog.slug ?? '').toString();
                const hasValidSlug = rawSlug && rawSlug !== '-1';
                // Prefer slug in link, fallback to numeric id (if available)
                const linkTarget = hasValidSlug
                  ? `/blog/${encodeURIComponent(rawSlug)}`
                  : (blog.id !== undefined && blog.id !== null) ? `/blog/${blog.id}` : null;

                // Detect RTL by checking title, excerpt and content
                const isRtl = containsRTL(`${blog.title || ''}\n${blog.excerpt || ''}\n${blog.content || ''}`);

                return (
                  <article
                    key={blog.id ?? index}
                    className={`blog-card ${isVisible ? 'animate-in' : ''} ${isRtl ? 'rtl' : ''}`}
                    style={{ animationDelay: `${index * 0.1}s` }}
                    dir={isRtl ? 'rtl' : 'ltr'}
                    lang={isRtl ? 'ar' : undefined}
                  >
                    <div className="blog-image-container">
                      <img
                        src={blog.cover_image || DEFAULT_BLOG_IMAGE}
                        alt={blog.title}
                        className="blog-image"
                        onError={(e: any) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = DEFAULT_BLOG_IMAGE;
                        }}
                        loading="lazy"
                      />
                      <div className="blog-image-overlay" />
                    </div>

                    <div className="blog-content">
                      <h2 className="blog-title">
                        {linkTarget ? (
                          <Link to={linkTarget} className="blog-title-link">
                            {blog.title}
                          </Link>
                        ) : (
                          <span className="blog-title-text">{blog.title}</span>
                        )}
                      </h2>

                      <div className="blog-date">
                        {formatDate(blog.created_at)}
                      </div>

                      <div className="blog-excerpt" style={{ textAlign: isRtl ? 'right' : 'left' }}>
                        {getExcerpt(blog.content, blog.excerpt)}
                      </div>

                      {linkTarget ? (
                        <Link
                          to={linkTarget}
                          className="blog-read-more"
                        >
                          <span>{t('blog.read_more', 'Read more')}</span>
                          <span className="blog-read-more-icon">→</span>
                        </Link>
                      ) : (
                        <div className="blog-read-more disabled" aria-disabled>
                          <span>{t('blog.unavailable', 'Article unavailable')}</span>
                        </div>
                      )}
                    </div>

                    <div className="blog-card-glow" />
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </main>

    </div>
  );
};

export default BlogPage;