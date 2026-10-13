'use client';

import * as React from 'react';
import Image from 'next/image';
import { Camera, UploadCloud, X, Loader2 } from 'lucide-react';
import { apiFetch } from '../../lib/api/client';

interface AvatarUploaderProps {
  currentUrl?: string | null;
  onAvatarUploaded: (key: string) => void;
  className?: string;
}

export function AvatarUploader({
  currentUrl,
  onAvatarUploaded,
  className = '',
}: AvatarUploaderProps) {
  const [preview, setPreview] = React.useState<string | null>(currentUrl || null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Please choose a JPEG, PNG, or WebP photo.');
      return;
    }

    // Validate size (5 MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be 5 MB or less.');
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      // 1. Get presigned upload URL from backend
      const presign = await apiFetch<{
        uploadUrl: string;
        downloadUrl: string;
        key: string;
      }>('/uploads/presign', {
        method: 'POST',
        body: JSON.stringify({
          contentType: file.type,
          fileSize: file.size,
          filename: file.name,
        }),
      });

      // 2. Upload file directly to signed upload URL
      const uploadRes = await fetch(presign.uploadUrl, {
        method: 'POST',
        headers: {
          'Content-Type': file.type,
        },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error('Upload to storage provider failed');
      }

      // 3. Set preview and notify parent of key
      const localUrl = URL.createObjectURL(file);
      setPreview(localUrl);
      onAvatarUploaded(presign.key);
    } catch (err: any) {
      setError(err.message || 'Failed to upload photo. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const clearPhoto = () => {
    setPreview(null);
    onAvatarUploaded('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <label className="block text-xs font-semibold text-[var(--color-charcoal-800)] uppercase tracking-wider">
        Pet Portrait
      </label>

      <div className="flex items-center gap-5">
        {/* Arch-framed photo box */}
        <div className="relative w-24 h-28 rounded-[var(--radius-arch)] bg-[var(--color-ivory-200)] border border-[var(--color-ivory-300)] overflow-hidden shrink-0 shadow-sm flex items-center justify-center">
          {preview ? (
            <Image
              src={preview}
              alt="Pet avatar preview"
              fill
              className="object-cover"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-[var(--color-charcoal-400)]">
              <Camera className="w-6 h-6 stroke-[1.5]" />
              <span className="text-[10px] mt-1 font-medium">Add Photo</span>
            </div>
          )}

          {isUploading && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          )}
        </div>

        {/* Upload Controls */}
        <div className="space-y-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            id="pet-avatar-input"
          />

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[var(--radius-md)] border border-[var(--color-ivory-300)] bg-[var(--color-ivory-50)] hover:bg-[var(--color-ivory-200)] text-xs font-semibold text-[var(--color-charcoal-800)] transition-colors shadow-sm disabled:opacity-50"
            >
              <UploadCloud className="w-3.5 h-3.5 text-[var(--color-sage-700)]" />
              <span>{preview ? 'Change Photo' : 'Upload Photo'}</span>
            </button>

            {preview && (
              <button
                type="button"
                onClick={clearPhoto}
                className="p-1.5 rounded-[var(--radius-md)] text-[var(--color-charcoal-500)] hover:text-red-600 hover:bg-red-50 transition-colors"
                title="Remove photo"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <p className="text-[11px] text-[var(--color-charcoal-500)] leading-tight">
            JPEG, PNG or WebP up to 5 MB. Natural lighting works best.
          </p>

          {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
        </div>
      </div>
    </div>
  );
}
