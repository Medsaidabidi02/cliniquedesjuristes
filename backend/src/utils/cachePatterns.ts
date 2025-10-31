/**
 * Cache key patterns for consistent invalidation
 */

// Pre-compiled regex patterns for efficient cache invalidation
export const CACHE_PATTERNS = {
  COURSES: /^courses:/,
  SUBJECTS: /^subjects:/,
  VIDEOS: /^videos:/,
  BLOG: /^blog:/,
  USERS: /^users:/
};

/**
 * Cache invalidation helper
 * Centralized cache invalidation to ensure consistency
 */
export function invalidateRelatedCaches(cache: any, ...patterns: RegExp[]): void {
  patterns.forEach(pattern => {
    cache.invalidatePattern(pattern);
  });
}
