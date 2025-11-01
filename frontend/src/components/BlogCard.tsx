import React from 'react';
import { Link } from 'react-router-dom';
import { BlogPost } from '../lib/blog';

const DEFAULT_BLOG_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImciIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiMyMmM1NWUiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiMxNmEzNGEiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cmVjdCB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgZmlsbD0idXJsKCNnKSIvPjx0ZXh0IHg9IjQwMCIgeT0iMzAwIiBmb250LWZhbWlseT0iSW50ZXIiIGZvbnQtc2l6ZT0iMzQiIGZpbGw9IiNmZmZmZmYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGFsaWdubWVudC1iYXNlbGluZT0ibWlkZGxlIiBmb250LXdlaWdodD0iNzAwIj7wn5OSKSBBY3R1YWxpdMOpcyBKdXJpZGlxdWVzPC90ZXh0Pjwvc3ZnPg==';

interface BlogCardProps {
  blog: BlogPost;
}

const BlogCard: React.FC<BlogCardProps> = ({ blog }) => {
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
    // Strip HTML tags first
    const strippedContent = content.replace(/<[^>]*>/g, '');
    return strippedContent.substring(0, 150) + (strippedContent.length > 150 ? '...' : '');
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col">
      {blog.cover_image && (
        <div className="h-48 overflow-hidden">
          <img
            src={blog.cover_image}
            alt={blog.title}
            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
            onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = DEFAULT_BLOG_IMAGE;
            }}
            loading="lazy"
          />
        </div>
      )}
      
      <div className="p-6 flex-grow">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          <Link to={`/blog/${blog.slug}`} className="hover:text-blue-600 transition">
            {blog.title}
          </Link>
        </h3>
        
        <p className="text-sm text-gray-500 mb-3">
          {formatDate(blog.created_at)}
          {blog.author_name && <span> • By {blog.author_name}</span>}
        </p>
        
        <div className="text-gray-600 mb-4">
          {getExcerpt(blog.content, blog.excerpt)}
        </div>
      </div>
      
      <div className="px-6 pb-6">
        <Link
          to={`/blog/${blog.slug}`}
          className="text-blue-600 hover:text-blue-800 font-medium transition"
        >
          Read more →
        </Link>
      </div>
    </div>
  );
};

export default BlogCard;