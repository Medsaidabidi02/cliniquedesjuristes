import React from 'react';
import { Link } from 'react-router-dom';
import { BlogPost } from '../lib/blog';

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