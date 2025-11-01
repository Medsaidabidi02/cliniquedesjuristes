/**
 * Tests for blog service image URL normalization
 */

// Mock the api module
jest.mock('../api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    upload: jest.fn(),
  }
}));

import { blogService, BlogPost } from '../blog';
import { api } from '../api';

describe('Blog Service - Image URL Normalization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getBlogPosts', () => {
    it('should normalize absolute URLs to relative paths', async () => {
      const mockPosts: BlogPost[] = [
        {
          id: 1,
          title: 'Test Post 1',
          slug: 'test-post-1',
          content: 'Test content',
          cover_image: 'http://localhost:5001/uploads/blog/image1.jpg',
          published: true,
          author_id: 1,
          created_at: '2025-01-01',
          updated_at: '2025-01-01'
        },
        {
          id: 2,
          title: 'Test Post 2',
          slug: 'test-post-2',
          content: 'Test content',
          cover_image: 'https://cliniquedesjuristes.com/uploads/blog/image2.jpg',
          published: true,
          author_id: 1,
          created_at: '2025-01-01',
          updated_at: '2025-01-01'
        }
      ];

      (api.get as jest.Mock).mockResolvedValue({ posts: mockPosts });

      const result = await blogService.getBlogPosts();

      expect(result).toHaveLength(2);
      expect(result[0].cover_image).toBe('/uploads/blog/image1.jpg');
      expect(result[1].cover_image).toBe('/uploads/blog/image2.jpg');
    });

    it('should preserve data URLs (base64 images)', async () => {
      const dataUrl = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIj4=';
      const mockPosts: BlogPost[] = [
        {
          id: 1,
          title: 'Test Post',
          slug: 'test-post',
          content: 'Test content',
          cover_image: dataUrl,
          published: true,
          author_id: 1,
          created_at: '2025-01-01',
          updated_at: '2025-01-01'
        }
      ];

      (api.get as jest.Mock).mockResolvedValue({ posts: mockPosts });

      const result = await blogService.getBlogPosts();

      expect(result[0].cover_image).toBe(dataUrl);
    });

    it('should preserve relative paths', async () => {
      const mockPosts: BlogPost[] = [
        {
          id: 1,
          title: 'Test Post',
          slug: 'test-post',
          content: 'Test content',
          cover_image: '/uploads/blog/image.jpg',
          published: true,
          author_id: 1,
          created_at: '2025-01-01',
          updated_at: '2025-01-01'
        }
      ];

      (api.get as jest.Mock).mockResolvedValue({ posts: mockPosts });

      const result = await blogService.getBlogPosts();

      expect(result[0].cover_image).toBe('/uploads/blog/image.jpg');
    });

    it('should handle posts without cover images', async () => {
      const mockPosts: BlogPost[] = [
        {
          id: 1,
          title: 'Test Post',
          slug: 'test-post',
          content: 'Test content',
          published: true,
          author_id: 1,
          created_at: '2025-01-01',
          updated_at: '2025-01-01'
        }
      ];

      (api.get as jest.Mock).mockResolvedValue({ posts: mockPosts });

      const result = await blogService.getBlogPosts();

      expect(result[0].cover_image).toBeUndefined();
    });

    it('should handle malformed URLs gracefully', async () => {
      const mockPosts: BlogPost[] = [
        {
          id: 1,
          title: 'Test Post',
          slug: 'test-post',
          content: 'Test content',
          cover_image: 'not-a-valid-url-but-contains-/uploads/blog/image.jpg',
          published: true,
          author_id: 1,
          created_at: '2025-01-01',
          updated_at: '2025-01-01'
        }
      ];

      (api.get as jest.Mock).mockResolvedValue({ posts: mockPosts });

      const result = await blogService.getBlogPosts();

      // Should extract the /uploads/... part
      expect(result[0].cover_image).toBe('/uploads/blog/image.jpg');
    });
  });

  describe('getBlogBySlug', () => {
    it('should normalize image URL for single post', async () => {
      const mockPost: BlogPost = {
        id: 1,
        title: 'Test Post',
        slug: 'test-post',
        content: 'Test content',
        cover_image: 'http://localhost:5001/uploads/blog/image.jpg',
        published: true,
        author_id: 1,
        created_at: '2025-01-01',
        updated_at: '2025-01-01'
      };

      (api.get as jest.Mock).mockResolvedValue({ post: mockPost });

      const result = await blogService.getBlogBySlug('test-post');

      expect(result).not.toBeNull();
      expect(result?.cover_image).toBe('/uploads/blog/image.jpg');
    });
  });

  describe('createBlogPost', () => {
    it('should normalize image URL for newly created post', async () => {
      const mockPost: BlogPost = {
        id: 1,
        title: 'New Post',
        slug: 'new-post',
        content: 'New content',
        cover_image: 'http://localhost:5001/uploads/blog/newimage.jpg',
        published: true,
        author_id: 1,
        created_at: '2025-01-01',
        updated_at: '2025-01-01'
      };

      (api.post as jest.Mock).mockResolvedValue({ post: mockPost });

      const result = await blogService.createBlogPost({
        title: 'New Post',
        content: 'New content'
      });

      expect(result).not.toBeNull();
      expect(result?.cover_image).toBe('/uploads/blog/newimage.jpg');
    });
  });

  describe('updateBlogPost', () => {
    it('should normalize image URL for updated post', async () => {
      const mockPost: BlogPost = {
        id: 1,
        title: 'Updated Post',
        slug: 'updated-post',
        content: 'Updated content',
        cover_image: 'https://cliniquedesjuristes.com/uploads/blog/updated.jpg',
        published: true,
        author_id: 1,
        created_at: '2025-01-01',
        updated_at: '2025-01-02'
      };

      (api.put as jest.Mock).mockResolvedValue({ post: mockPost });

      const result = await blogService.updateBlogPost(1, {
        title: 'Updated Post'
      });

      expect(result).not.toBeNull();
      expect(result?.cover_image).toBe('/uploads/blog/updated.jpg');
    });
  });
});
