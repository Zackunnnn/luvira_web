import { NextRequest } from 'next/server';
import { uploadToImageKit } from '@/lib/imagekit';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return Response.json({ error: 'Tidak ada file yang diunggah' }, { status: 400 });
    }

    // 1. Validasi Tipe File (hanya terima gambar)
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return Response.json({ error: 'Format file tidak didukung. Harap gunakan JPG, PNG, atau WebP.' }, { status: 400 });
    }

    // 2. Validasi Ukuran File (maksimal 5MB)
    const MAX_SIZE_MB = 5;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return Response.json({ error: `Ukuran file terlalu besar. Maksimal ${MAX_SIZE_MB}MB.` }, { status: 400 });
    }

    // 3. Konversi ke Buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // 4. Bersihkan nama file agar aman untuk URL
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '-');
    const uniqueFileName = `${Date.now()}-${cleanFileName}`;

    // 5. Upload ke ImageKit
    const url = await uploadToImageKit(buffer, uniqueFileName);

    return Response.json({ success: true, url });
  } catch (error: any) {
    console.error('[Upload API] Error:', error);
    return Response.json({ error: error.message || 'Gagal mengunggah gambar' }, { status: 500 });
  }
}
