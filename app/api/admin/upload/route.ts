// app/api/admin/upload/route.ts
// ============================================================================
// API Unggah Gambar Admin (ImageKit Live & Local-Stub Adapter)
// Sesuai docs/LUVIRA_2_PLAN.md Bagian 7 & docs/PHASE_PROMPTS.md Bagian 3
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { uploadImage } from '@/lib/storage/image-storage';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    if (!can(user, 'catalog:manage')) {
      return NextResponse.json({ error: 'Akses ditolak: Hanya Admin Pusat dan Owner yang dapat mengunggah gambar produk.' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = (formData.get('file') || formData.get('image')) as File | null;
    const folder = (formData.get('folder') as string) || 'luvira/products';

    if (!file) {
      return NextResponse.json({ error: 'Tidak ada berkas gambar yang dipilih.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const result = await uploadImage(buffer, file.name, file.type, {
      folder,
      tags: ['luvira', 'product', user.role],
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Gagal mengunggah gambar.' }, { status: 400 });
    }

    // Catat ke tabel Media untuk riwayat
    const media = await prisma.media.create({
      data: {
        originalName: result.name,
        fileName: result.name,
        mimeType: 'image/webp',
        size: result.size,
        width: result.width || 0,
        height: result.height || 0,
        originalPath: '',
        optimizedPath: result.url,
        thumbnailPath: result.url,
      },
    });

    return NextResponse.json({
      success: true,
      url: result.url,
      mediaId: media.id,
      name: result.name,
      width: result.width,
      height: result.height,
    });
  } catch (error: any) {
    console.error('[API Admin Upload Error]', error);
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan saat mengunggah gambar.' }, { status: 500 });
  }
}
