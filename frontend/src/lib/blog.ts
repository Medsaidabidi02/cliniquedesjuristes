import { api } from './api';

// Blog post interface matching backend exactly
export interface BlogPost {
  id: number;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  cover_image?: string;
  published: boolean;
  author_id: number;
  author_name?: string; // From join with users table
  created_at: string;
  updated_at: string;
}

// Helper function to normalize image URLs to work in any environment
const normalizeImageUrl = (imageUrl: string | undefined | null): string | undefined => {
  if (!imageUrl) return undefined;
  
  // If it's a data URL (base64), return as-is
  if (imageUrl.startsWith('data:')) {
    return imageUrl;
  }
  
  // If it's already a relative URL starting with /, return as-is
  if (imageUrl.startsWith('/') && !imageUrl.startsWith('//')) {
    return imageUrl;
  }
  
  // If it's an absolute URL, extract just the path part
  try {
    const url = new URL(imageUrl);
    // Return just the pathname (e.g., /uploads/blog/image.jpg)
    return url.pathname;
  } catch (e) {
    // If URL parsing fails, check if it looks like a path
    if (imageUrl.includes('/uploads/')) {
      // Extract the path starting from /uploads/
      const match = imageUrl.match(/\/uploads\/.+/);
      if (match) {
        return match[0];
      }
    }
    // Otherwise return the original URL
    return imageUrl;
  }
};

// Define response interfaces for better type safety
interface BlogListResponse {
  success?: boolean;
  posts?: BlogPost[];
  message?: string;
}

interface BlogSingleResponse {
  success?: boolean;
  data?: BlogPost;
  post?: BlogPost;
  message?: string;
}

interface DeleteResponse {
  success: boolean;
  message?: string;
}

// Blog service
export const blogService = {
  // Get all published blog posts (PUBLIC)
  async getBlogPosts(): Promise<BlogPost[]> {
    try {
      console.log('🔍 Fetching blogs from /blog...');
      
      const response = await api.get<BlogListResponse | BlogPost[]>('/blog');
      console.log('📄 Blog API response:', response);
      
      let posts: BlogPost[] = [];
      
      // Check if response is an array directly
      if (Array.isArray(response)) {
        posts = response;
      } else {
        // Check for BlogListResponse structure
        const typedResponse = response as BlogListResponse;
        if (typedResponse && typedResponse.posts) {
          posts = typedResponse.posts;
        } else {
          console.warn('⚠️ Unexpected blog response format:', response);
          return [];
        }
      }
      
      // Normalize image URLs for all posts
      return posts.map(post => ({
        ...post,
        cover_image: normalizeImageUrl(post.cover_image)
      }));
      
    } catch (error) {
      console.error('❌ Error fetching blogs:', error);
      return [];
    }
  },

  // Get single blog post by slug (PUBLIC)
 // Update the getBlogBySlug method in your blog.ts file

// Get single blog post by slug (PUBLIC)
async getBlogBySlug(slug: string): Promise<BlogPost | null> {
  try {
    console.log(`🔍 Fetching blog by slug: ${slug}`);
    
    // First try the direct slug endpoint
    try {
      const response = await api.get<BlogSingleResponse | BlogPost>(`/blog/${slug}`);
      
      let post: BlogPost | null = null;
      
      // Check if response is a blog post directly
      if (response && 'id' in response && 'title' in response) {
        post = response as BlogPost;
      } else {
        // Check for different possible response structures
        const typedResponse = response as BlogSingleResponse;
        if (typedResponse.data) {
          post = typedResponse.data;
        } else if (typedResponse.post) {
          post = typedResponse.post;
        }
      }
      
      // Normalize image URL if post found
      if (post) {
        return {
          ...post,
          cover_image: normalizeImageUrl(post.cover_image)
        };
      }
      
      return null;
    } catch (firstError) {
      console.warn('⚠️ Error with direct slug lookup:', firstError);
      
      // Fallback: Get all posts and find the one with matching slug
      try {
        const allPosts = await this.getBlogPosts();
        const matchingPost = allPosts.find(p => 
          p.slug === slug || 
          p.id.toString() === slug
        );
        
        return matchingPost || null;
      } catch (secondError) {
        console.error('❌ Fallback post lookup also failed:', secondError);
        return null;
      }
    }
  } catch (error) {
    console.error('❌ All attempts to fetch blog failed:', error);
    return null;
  }
},
  // Admin: Get all blogs (including drafts)
  async getAdminBlogs(): Promise<BlogPost[]> {
    // Just use the regular endpoint since this is what your API supports
    return this.getBlogPosts();
  },

  // Admin: Create blog post (handles both FormData and JSON)
  async createBlogPost(blog: any): Promise<BlogPost | null> {
    try {
      console.log('📝 Creating blog post...');
      
      let response;
      
      // Check if blog is FormData (for image uploads)
      if (blog instanceof FormData) {
        console.log('📝 Creating blog post with image...');
        response = await api.upload<BlogSingleResponse | BlogPost>('/blog', blog);
      } else {
        console.log('📝 Creating blog post without image:', blog);
        response = await api.post<BlogSingleResponse | BlogPost>('/blog', blog);
      }
      
      console.log('📄 Create blog response:', response);
      
      let post: BlogPost | null = null;
      
      // Check if response is a blog post directly
      if (response && 'id' in response && 'title' in response && 'content' in response) {
        post = response as BlogPost;
      } else {
        // Check for different possible response structures
        const typedResponse = response as BlogSingleResponse;
        if (typedResponse.post) {
          post = typedResponse.post;
        } else if (typedResponse.data) {
          post = typedResponse.data;
        }
      }
      
      // Normalize image URL if post created
      if (post) {
        return {
          ...post,
          cover_image: normalizeImageUrl(post.cover_image)
        };
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error creating blog post:', error);
      throw error;
    }
  },

  // Admin: Update blog post (handles both FormData and JSON)
  async updateBlogPost(id: number, blog: any): Promise<BlogPost | null> {
    try {
      console.log(`📝 Updating blog post ${id}...`);
      
      let response;
      
      // Check if blog is FormData (for image uploads)
      if (blog instanceof FormData) {
        console.log('📝 Updating blog post with image...');
        // Some APIs expect a method override for FormData PUTs
        blog.append('_method', 'PUT');
        response = await api.upload<BlogSingleResponse | BlogPost>(`/blog/${id}`, blog);
      } else {
        console.log('📝 Updating blog post without image:', blog);
        response = await api.put<BlogSingleResponse | BlogPost>(`/blog/${id}`, blog);
      }
      
      console.log('📄 Update blog response:', response);
      
      let post: BlogPost | null = null;
      
      // Check if response is a blog post directly
      if (response && 'id' in response && 'title' in response && 'content' in response) {
        post = response as BlogPost;
      } else {
        // Check for different possible response structures
        const typedResponse = response as BlogSingleResponse;
        if (typedResponse.post) {
          post = typedResponse.post;
        } else if (typedResponse.data) {
          post = typedResponse.data;
        }
      }
      
      // Normalize image URL if post updated
      if (post) {
        return {
          ...post,
          cover_image: normalizeImageUrl(post.cover_image)
        };
      }
      
      return null;
    } catch (error) {
      console.error(`❌ Error updating blog post ${id}:`, error);
      throw error;
    }
  },

  // Admin: Delete blog post
  async deleteBlogPost(id: number): Promise<boolean> {
    try {
      console.log(`🗑️ Deleting blog post ${id}...`);
      
      const response = await api.delete<DeleteResponse>(`/blog/${id}`);
      
      console.log('📄 Delete blog response:', response);
      
      // Check if response indicates success
      if (response && 'success' in response && response.success) {
        return true;
      }
      
      return false;
    } catch (error) {
      console.error(`❌ Error deleting blog post ${id}:`, error);
      throw error;
    }
  }
};