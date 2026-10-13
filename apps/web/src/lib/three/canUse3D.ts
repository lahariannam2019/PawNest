export function canUse3D(): boolean {
  if (typeof window === 'undefined') return false;

  // 1. Feature flag
  if (process.env.NEXT_PUBLIC_HERO_3D !== 'true') return false;

  // 2. Reduced motion
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  if (localStorage.getItem('pawnest_reduce_motion') === 'true') return false;

  // 3. Viewport width >= 768px
  if (window.innerWidth < 768) return false;

  // 4. Data Saver mode
  const nav = navigator as any;
  if (nav.connection?.saveData) return false;

  // 5. Slow connection check
  const effectiveType = nav.connection?.effectiveType;
  if (effectiveType === 'slow-2g' || effectiveType === '2g' || effectiveType === '3g') {
    return false;
  }

  // 6. Device memory (< 4GB)
  if (nav.deviceMemory && nav.deviceMemory < 4) return false;

  // 7. WebGL2 check
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (!gl) return false;
  } catch {
    return false;
  }

  return true;
}
