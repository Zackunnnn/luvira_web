// lib/storage/image-storage.ts
// ============================================================================
// Adapter Penyimpanan Gambar Luvira 2.0 (ImageKit & Local-Stub)
// Sesuai docs/LUVIRA_2_PLAN.md Bagian 7 & docs/PHASE_PROMPTS.md Bagian 3
// ============================================================================

import sharp, { type OutputInfo } from 'sharp';
import crypto from 'crypto';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export interface UploadOptions {
  folder?: string;
  tags?: string[];
  maxDimension?: number;
  quality?: number;
}

export interface UploadResult {
  success: boolean;
  url: string;
  fileId?: string;
  name: string;
  size: number;
  width?: number;
  height?: number;
  format: string;
  error?: string;
}

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const DEFAULT_MAX_DIMENSION = 2000; // Maksimal sisi panjang 2000px

/**
 * Memproses dan mengoptimalkan buffer gambar (resize sisi panjang max 2000px, WebP q80)
 */
export async function optimizeImageBuffer(
  inputBuffer: Buffer,
  options?: { maxDimension?: number; quality?: number }
): Promise<{ buffer: Buffer; info: OutputInfo }> {
  const maxDim = options?.maxDimension || DEFAULT_MAX_DIMENSION;
  const quality = options?.quality || 80;

  const metadata = await sharp(inputBuffer).metadata();
  if (!metadata.format) {
    throw new Error('Berkas bukan format gambar yang valid.');
  }

  let pipeline = sharp(inputBuffer);

  // Resize sisi terpanjang tanpa membesarkan gambar kecil
  const width = metadata.width || 0;
  const height = metadata.height || 0;
  if (width > maxDim || height > maxDim) {
    if (width >= height) {
      pipeline = pipeline.resize({ width: maxDim, withoutEnlargement: true });
    } else {
      pipeline = pipeline.resize({ height: maxDim, withoutEnlargement: true });
    }
  }

  const { data, info } = await pipeline
    .webp({ quality })
    .toBuffer({ resolveWithObject: true });

  return { buffer: data, info };
}

/**
 * Unggah gambar melalui adapter: mode 'imagekit' atau 'local-stub'
 */
export async function uploadImage(
  fileBuffer: Buffer,
  originalFilename: string,
  mimeType: string,
  options?: UploadOptions
): Promise<UploadResult> {
  // 1. Validasi tipe MIME
  if (!ALLOWED_MIME_TYPES.includes(mimeType.toLowerCase())) {
    return {
      success: false,
      url: '',
      name: originalFilename,
      size: fileBuffer.length,
      format: '',
      error: `Format gambar tidak didukung: ${mimeType}. Gunakan JPG, PNG, WebP, atau AVIF.`,
    };
  }

  // 2. Validasi ukuran berkas awal
  if (fileBuffer.length > MAX_FILE_SIZE_BYTES) {
    return {
      success: false,
      url: '',
      name: originalFilename,
      size: fileBuffer.length,
      format: '',
      error: `Ukuran gambar terlalu besar (${(fileBuffer.length / (1024 * 1024)).toFixed(1)} MB). Maksimal 5 MB.`,
    };
  }

  // 3. Optimasi sisi panjang maksimum 2000px
  let optimizedBuffer: Buffer;
  let info: OutputInfo;
  try {
    const optimized = await optimizeImageBuffer(fileBuffer, {
      maxDimension: options?.maxDimension || DEFAULT_MAX_DIMENSION,
      quality: options?.quality || 80,
    });
    optimizedBuffer = optimized.buffer;
    info = optimized.info;
  } catch (err: any) {
    return {
      success: false,
      url: '',
      name: originalFilename,
      size: fileBuffer.length,
      format: '',
      error: err.message || 'Gagal memproses gambar.',
    };
  }

  const mode = process.env.IMAGE_STORAGE_MODE || 'local-stub';
  const folder = options?.folder || 'luvira/products';
  const safeRandom = crypto.randomBytes(8).toString('hex');
  const cleanOriginalName = originalFilename.replace(/[^a-zA-Z0-9.-]/g, '_').replace(/\.[^/.]+$/, '');
  const finalFilename = `${cleanOriginalName}-${safeRandom}.webp`;

  // 4. Mode ImageKit Live
  if (mode === 'imagekit' && process.env.IMAGEKIT_PRIVATE_KEY) {
    try {
      const base64File = optimizedBuffer.toString('base64');
      const authHeader = Buffer.from(`${process.env.IMAGEKIT_PRIVATE_KEY}:`).toString('base64');

      const formData = new FormData();
      formData.append('file', base64File);
      formData.append('fileName', finalFilename);
      formData.append('folder', folder.startsWith('/') ? folder : `/${folder}`);
      formData.append('useUniqueFileName', 'true');
      if (options?.tags && options.tags.length > 0) {
        formData.append('tags', options.tags.join(','));
      }

      const res = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${authHeader}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error('[ImageKit Live Upload Failed]', errorText);
        throw new Error(`ImageKit API error (${res.status}): ${errorText}`);
      }

      const result = await res.json();
      return {
        success: true,
        url: result.url,
        fileId: result.fileId,
        name: result.name || finalFilename,
        size: result.size || optimizedBuffer.length,
        width: result.width || info.width,
        height: result.height || info.height,
        format: 'webp',
      };
    } catch (liveError: any) {
      console.warn('[ImageKit Live Fallback to local-stub]', liveError.message);
      // Fallback to local-stub to prevent application crash
    }
  }

  // 5. Mode local-stub (Penyimpanan lokal di public/uploads/ dan URL deterministik)
  try {
    const uploadDir = join(process.cwd(), 'public', 'uploads', folder.replace(/[^a-zA-Z0-9/_-]/g, ''));
    await mkdir(uploadDir, { recursive: true });
    await writeFile(join(uploadDir, finalFilename), optimizedBuffer);

    // URL publik
    const endpoint = process.env.IMAGEKIT_URL_ENDPOINT || 'https://ik.imagekit.io/luvira';
    const stubUrl = `${endpoint}/${folder}/${finalFilename}`;

    return {
      success: true,
      url: stubUrl,
      fileId: `stub-${safeRandom}`,
      name: finalFilename,
      size: optimizedBuffer.length,
      width: info.width,
      height: info.height,
      format: 'webp',
    };
  } catch (fsErr: any) {
    return {
      success: false,
      url: '',
      name: originalFilename,
      size: optimizedBuffer.length,
      format: 'webp',
      error: `Gagal menyimpan stub gambar: ${fsErr.message}`,
    };
  }
}
