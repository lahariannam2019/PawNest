import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { ValidationError, UnauthorizedError } from '../../lib/errors.js';

export interface PresignUploadResult {
  uploadUrl: string;
  downloadUrl: string;
  key: string;
  expiresAt: string;
}

export interface StorageAdapter {
  presignUpload(options: {
    userId: string;
    contentType: string;
    fileSize: number;
    filename?: string;
  }): Promise<PresignUploadResult>;
  getSignedDownloadUrl(key: string, expiresInSeconds?: number): Promise<string>;
  saveFile(key: string, buffer: Buffer, contentType: string): Promise<void>;
  getFile(key: string): Promise<{ buffer: Buffer; contentType: string } | null>;
  deleteFile(key: string): Promise<void>;
}

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

class LocalStorageAdapter implements StorageAdapter {
  private baseDir: string;
  private secret: string;

  constructor() {
    this.baseDir = path.resolve(process.cwd(), '.data', 'uploads');
    this.secret = process.env.STORAGE_SIGNING_SECRET || 'dev_storage_signing_secret_entropy_64_bytes_pawnest';
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  private signUrl(key: string, expiresUnix: number): string {
    const data = `${key}:${expiresUnix}`;
    return crypto.createHmac('sha256', this.secret).update(data).digest('hex');
  }

  public verifyToken(key: string, expiresUnix: number, token: string): boolean {
    if (Date.now() > expiresUnix * 1000) return false;
    const expected = this.signUrl(key, expiresUnix);
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token));
  }

  async presignUpload(options: {
    userId: string;
    contentType: string;
    fileSize: number;
    filename?: string;
  }): Promise<PresignUploadResult> {
    if (!ALLOWED_MIME_TYPES.includes(options.contentType)) {
      throw new ValidationError(`Unsupported file type: ${options.contentType}. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`);
    }

    if (options.fileSize > MAX_AVATAR_SIZE_BYTES) {
      throw new ValidationError(`File size exceeds limit of 5 MB (provided ${Math.round(options.fileSize / 1024 / 1024 * 10) / 10} MB)`);
    }

    const ext = options.contentType === 'image/png' ? 'png' : options.contentType === 'image/webp' ? 'webp' : 'jpg';
    const key = `avatars/${options.userId}/${crypto.randomUUID()}.${ext}`;

    const expiresUnix = Math.floor(Date.now() / 1000) + 3600; // 1 hour for upload
    const token = this.signUrl(key, expiresUnix);

    const apiBase = process.env.API_PUBLIC_URL || 'http://localhost:3001/api/v1';
    const uploadUrl = `${apiBase}/uploads/direct?key=${encodeURIComponent(key)}&token=${token}&expires=${expiresUnix}`;
    const downloadUrl = await this.getSignedDownloadUrl(key);

    return {
      uploadUrl,
      downloadUrl,
      key,
      expiresAt: new Date(expiresUnix * 1000).toISOString(),
    };
  }

  async getSignedDownloadUrl(key: string, expiresInSeconds = 86400): Promise<string> {
    const expiresUnix = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const token = this.signUrl(key, expiresUnix);
    const apiBase = process.env.API_PUBLIC_URL || 'http://localhost:3001/api/v1';
    return `${apiBase}/uploads/file?key=${encodeURIComponent(key)}&token=${token}&expires=${expiresUnix}`;
  }

  async saveFile(key: string, buffer: Buffer, _contentType: string): Promise<void> {
    const filePath = path.join(this.baseDir, key);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    await fs.promises.writeFile(filePath, buffer);
  }

  async getFile(key: string): Promise<{ buffer: Buffer; contentType: string } | null> {
    const filePath = path.join(this.baseDir, key);
    if (!fs.existsSync(filePath)) return null;

    const buffer = await fs.promises.readFile(filePath);
    const ext = path.extname(key).toLowerCase();
    const contentType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
    return { buffer, contentType };
  }

  async deleteFile(key: string): Promise<void> {
    const filePath = path.join(this.baseDir, key);
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  }
}

// Development and production adapter export
export const storageAdapter: StorageAdapter = new LocalStorageAdapter();
export const localStorageAdapter = storageAdapter as LocalStorageAdapter;
