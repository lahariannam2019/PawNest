'use client';

import * as React from 'react';
import Image from 'next/image';
import { RotateCw, ZoomIn, Eye, Sparkles } from 'lucide-react';
import { canUse3D } from '../../lib/three/canUse3D';
import { Badge } from '../ui/Badge';

interface ProductViewer3DProps {
  productName: string;
  imageKeys: string[];
  model3dKey?: string | null;
}

export function ProductViewer3D({ productName, imageKeys, model3dKey }: ProductViewer3DProps) {
  const [activeImageIndex, setActiveImageIndex] = React.useState(0);
  const [is3DMode, setIs3DMode] = React.useState(false);
  const [supports3D, setSupports3D] = React.useState(false);
  const [rotationY, setRotationY] = React.useState(0);
  const [isDragging, setIsDragging] = React.useState(false);
  const [startX, setStartX] = React.useState(0);

  React.useEffect(() => {
    // Check hardware & reduced motion eligibility
    setSupports3D(canUse3D() || process.env.NODE_ENV !== 'production');
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!is3DMode) return;
    setIsDragging(true);
    setStartX(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !is3DMode) return;
    const delta = e.clientX - startX;
    setRotationY((prev) => prev + delta * 0.8);
    setStartX(e.clientX);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const currentImage = imageKeys[activeImageIndex] || imageKeys[0] || '/images/svc-shop-01.jpg';

  return (
    <div className="space-y-4">
      {/* Main Display Stage */}
      <div
        className="relative aspect-square w-full rounded-[var(--radius-xl)] bg-[var(--color-ivory-200)] border border-[var(--color-ivory-300)] overflow-hidden shadow-[var(--shadow-1)] flex items-center justify-center select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: is3DMode ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
      >
        {is3DMode ? (
          <div
            className="w-full h-full flex flex-col items-center justify-center relative p-8 transition-transform ease-out duration-75"
            style={{
              perspective: '1000px',
            }}
          >
            {/* 3D Interactive Model Pedestal */}
            <div
              className="relative w-64 h-64 transition-transform duration-75 ease-out"
              style={{
                transform: `rotateY(${rotationY}deg) rotateX(10deg)`,
                transformStyle: 'preserve-3d',
              }}
            >
              <div className="absolute inset-0 rounded-[var(--radius-lg)] overflow-hidden shadow-2xl border-2 border-[var(--color-sage-300)] bg-[var(--color-ivory-50)] flex items-center justify-center">
                <Image
                  src={currentImage}
                  alt={productName}
                  fill
                  className="object-cover"
                />
              </div>

              {/* 3D Pedestal shadow effect */}
              <div
                className="absolute -bottom-8 inset-x-8 h-8 rounded-full bg-black/15 blur-md"
                style={{ transform: 'rotateX(90deg) translateZ(-40px)' }}
              />
            </div>

            <div className="absolute bottom-4 inset-x-0 flex justify-center">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-[var(--color-ivory-50)]/90 backdrop-blur-sm text-[var(--color-charcoal-700)] shadow-sm">
                <RotateCw className="w-3.5 h-3.5 text-[var(--color-sage-600)] animate-spin-slow" />
                Drag left or right to inspect in 360°
              </span>
            </div>
          </div>
        ) : (
          <div className="relative w-full h-full">
            <Image
              src={currentImage}
              alt={productName}
              fill
              priority
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
        )}

        {/* Top Badges */}
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
          <Badge variant="demo">Demo Catalogue</Badge>
          {is3DMode && (
            <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-[var(--color-sage-700)] text-[var(--color-ivory-50)] shadow-sm">
              3D Interactive
            </span>
          )}
        </div>

        {/* 3D Mode Toggle Button */}
        {supports3D && (
          <div className="absolute top-4 right-4 z-10">
            <button
              onClick={() => setIs3DMode(!is3DMode)}
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-all duration-200 shadow-sm ${
                is3DMode
                  ? 'bg-[var(--color-sage-700)] text-[var(--color-ivory-50)]'
                  : 'bg-[var(--color-ivory-50)]/90 text-[var(--color-charcoal-800)] hover:bg-[var(--color-ivory-50)] border border-[var(--color-ivory-300)]'
              }`}
            >
              <RotateCw className="w-3.5 h-3.5" />
              {is3DMode ? 'Photo Gallery' : '3D Orbit View'}
            </button>
          </div>
        )}
      </div>

      {/* Thumbnails Row */}
      {imageKeys.length > 1 && (
        <div className="flex items-center gap-3 overflow-x-auto pb-1">
          {imageKeys.map((img, idx) => (
            <button
              key={idx}
              onClick={() => {
                setActiveImageIndex(idx);
                setIs3DMode(false);
              }}
              className={`relative w-16 h-16 rounded-[var(--radius-md)] overflow-hidden border-2 transition-all flex-shrink-0 ${
                activeImageIndex === idx && !is3DMode
                  ? 'border-[var(--color-sage-700)] scale-105 shadow-sm'
                  : 'border-[var(--color-ivory-300)] opacity-70 hover:opacity-100'
              }`}
            >
              <Image src={img} alt={`View ${idx + 1}`} fill className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
