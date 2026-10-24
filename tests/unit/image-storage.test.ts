// tests/unit/image-storage.test.ts
import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { uploadImage, optimizeImageBuffer } from '@/lib/storage/image-storage';

describe('Image Storage Adapter (Sharp & Local-Stub)', () => {
  it('mengompres dan me-resize gambar yang lebih besar dari 2000px ke maksimal 2000px', async () => {
    // Buat gambar uji 2400x1200 px
    const testImageBuffer = await sharp({
      create: {
        width: 2400,
        height: 1200,
        channels: 3,
        background: { r: 218, g: 165, b: 32 },
      },
    })
      .jpeg()
      .toBuffer();

    const { buffer, info } = await optimizeImageBuffer(testImageBuffer, { maxDimension: 2000 });

    expect(info.format).toBe('webp');
    expect(info.width).toBe(2000);
    expect(info.height).toBe(1000);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it('tidak membesarkan gambar yang sudah kecil (misal 400x300 px)', async () => {
    const smallImageBuffer = await sharp({
      create: {
        width: 400,
        height: 300,
        channels: 3,
        background: { r: 100, g: 150, b: 200 },
      },
    })
      .png()
      .toBuffer();

    const { info } = await optimizeImageBuffer(smallImageBuffer, { maxDimension: 2000 });
    expect(info.width).toBe(400);
    expect(info.height).toBe(300);
    expect(info.format).toBe('webp');
  });

  it('menolak format berkas yang tidak didukung', async () => {
    const invalidBuffer = Buffer.from('fake pdf data content');
    const result = await uploadImage(invalidBuffer, 'dokumen.pdf', 'application/pdf');

    expect(result.success).toBe(false);
    expect(result.error).toContain('tidak didukung');
  });

  it('menolak berkas yang melebihi batas 5MB', async () => {
    // 6 MB dummy buffer
    const largeBuffer = Buffer.alloc(6 * 1024 * 1024);
    const result = await uploadImage(largeBuffer, 'huge.jpg', 'image/jpeg');

    expect(result.success).toBe(false);
    expect(result.error).toContain('terlalu besar');
  });

  it('berhasil mengunggah dalam mode local-stub dan menghasilkan URL ImageKit', async () => {
    const sampleBuffer = await sharp({
      create: {
        width: 800,
        height: 800,
        channels: 3,
        background: { r: 232, g: 190, b: 158 },
      },
    })
      .jpeg()
      .toBuffer();

    const result = await uploadImage(sampleBuffer, 'kaus-kaki-est1.jpg', 'image/jpeg', {
      folder: 'luvira/products',
    });

    expect(result.success).toBe(true);
    expect(result.url).toContain('https://ik.imagekit.io/');
    expect(result.url).toContain('.webp');
    expect(result.format).toBe('webp');
    expect(result.width).toBe(800);
  });
});
