/**
 * Generate a URL-friendly slug from a name
 * Example: "Faisal Alfarizi" → "faisal-alfarizi"
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_]+/g, '-')   // Replace spaces and underscores with hyphens
    .replace(/-+/g, '-')       // Replace multiple hyphens with single
    .replace(/^-|-$/g, '');    // Remove leading/trailing hyphens
}

/**
 * Generate a short random suffix
 * Example: "x7k2", "a9b3"
 */
export function generateRandomSuffix(length: number = 4): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate a unique slug with random suffix
 * Example: "faisal-alfarizi" → "faisal-alfarizi-x7k2"
 */
export function generateUniqueSlug(name: string): string {
  const baseSlug = generateSlug(name);
  const suffix = generateRandomSuffix();
  return `${baseSlug}-${suffix}`;
}

/**
 * Validate slug format
 * Accepts: "faisal-alfarizi-x7k2"
 * Rejects: "Faisal Alfarizi", "faisal_alfarizi"
 */
export function isValidSlug(slug: string): boolean {
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  return slugRegex.test(slug);
}

/**
 * Ensure slug is unique by appending suffix if needed
 */
export async function ensureUniqueSlug(
  baseSlug: string,
  checkExists: (slug: string) => Promise<boolean>
): Promise<string> {
  let slug = baseSlug;
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const exists = await checkExists(slug);
    if (!exists) {
      return slug;
    }
    slug = `${baseSlug}-${generateRandomSuffix()}`;
    attempts++;
  }

  // If all attempts fail, use timestamp as last resort
  return `${baseSlug}-${Date.now().toString(36)}`;
}
