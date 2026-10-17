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

/**
 * Category-appropriate fallbacks for supplies products.
 * Guarantees that even if an image is missing or fails to load,
 * an authentic, category-specific pet photography fallback is shown.
 */
export const CATEGORY_FALLBACK_IMAGES: Record<string, string> = {
  food: '/images/products/nordic-pasture-raised-salmon-kibble.jpg',
  treats: '/images/products/organic-peanut-butter-pumpkin-biscuits.jpg',
  beds: '/images/products/cloud-haven-orthopedic-memory-foam-lounge-bed.jpg',
  'collars-leashes': '/images/products/atelier-vegetable-tanned-leather-collar.jpg',
  'bowls-feeders': '/images/products/stoneware-slow-feeder-enrichment-bowl.jpg',
  'grooming-tools': '/images/products/beechwood-artisan-pin-and-bristle-brush.jpg',
  toys: '/images/products/organic-hemp-rope-tug-and-floss-ring.jpg',
  'wellness-supplements': '/images/products/botanical-probiotic-digestive-daily-chews.jpg',
};

export function resolveProductImageSrc(
  src?: string | null,
  categorySlug?: string | null
): string {
  const fallback =
    (categorySlug && CATEGORY_FALLBACK_IMAGES[categorySlug]) || '/images/svc-shop-01.jpg';
  return resolveImageSrc(src, fallback);
}
