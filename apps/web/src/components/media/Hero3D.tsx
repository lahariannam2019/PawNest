'use client';

import * as React from 'react';
import { canUse3D } from '../../lib/three/canUse3D';
import { ArchImage } from './ArchImage';

export interface Hero3DProps {
  posterSrc: string;
  alt: string;
}

export function Hero3D({ posterSrc, alt }: Hero3DProps) {
  const [is3DActive, setIs3DActive] = React.useState(false);

  React.useEffect(() => {
    // Check all gating conditions
    if (canUse3D()) {
      setIs3DActive(true);
    }
  }, []);

  // When 3D is active and flag is enabled, it renders WebGL layer; otherwise pristine photographic hero poster
  return (
    <div className="relative w-full">
      <ArchImage
        src={posterSrc}
        alt={alt}
        aspect="hero"
        priority
      />
      {is3DActive && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          {/* Active 3D canvas overlay placeholder behind feature flag */}
          <span className="sr-only">3D Interactive Dog Model Layer</span>
        </div>
      )}
    </div>
  );
}
