/**
 * Resolves an image key or URL to a safe Next.js <Image> src.
 * Guarantees that the returned path always starts with '/' or 'http://'/'https://',
 * preventing "Failed to parse src on next/image" crashes.
 */
export function resolveImageSrc(
  src?: string | null,
  fallback = '/images/svc-groom-01.jpg'
): string {
  if (!src || typeof src !== 'string' || src.trim() === '') {
    return fallback;
  }

  const trimmed = src.trim();

  // Fully qualified URL
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  // Already starts with leading slash
  if (trimmed.startsWith('/')) {
    return trimmed;
  }

  // Common relative filenames in public/images
  if (
    trimmed.endsWith('.jpg') ||
    trimmed.endsWith('.png') ||
    trimmed.endsWith('.webp') ||
    trimmed.endsWith('.svg')
  ) {
    return `/images/${trimmed}`;
  }

  // Abstract keys or seed keys
  if (trimmed.includes('vet')) return '/images/svc-vet-01.jpg';
  if (trimmed.includes('board')) return '/images/svc-board-01.jpg';
  if (trimmed.includes('groom')) return '/images/svc-groom-01.jpg';
  if (trimmed.includes('shop') || trimmed.includes('product')) return '/images/svc-shop-01.jpg';

  return fallback;
}
