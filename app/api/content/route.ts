import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { SiteContent } from '@/types/content';

export async function GET() {
  try {
    if (!process.env.DATABASE_URL) {
      return Response.json({ warning: 'Database belum dikonfigurasi', data: null });
    }

    const contentRecord = await prisma.siteContent.findUnique({
      where: { id: 'singleton' },
    });

    if (!contentRecord) {
      return Response.json({ data: null });
    }

    return Response.json({
      data: {
        hero: contentRecord.hero,
        about: contentRecord.about,
        features: contentRecord.features,
        microcopy: contentRecord.microcopy,
      } as unknown as SiteContent
    });
  } catch (error) {
    console.error('[Content API] Error GET:', error);
    return Response.json({ error: 'Gagal mengambil data konten' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!process.env.DATABASE_URL) {
      return Response.json({ error: 'Database belum dikonfigurasi' }, { status: 503 });
    }

    const body: SiteContent = await request.json();

    const updatedContent = await prisma.siteContent.upsert({
      where: { id: 'singleton' },
      update: {
        hero: body.hero as any,
        about: body.about as any,
        features: body.features as any,
        microcopy: body.microcopy as any,
      },
      create: {
        id: 'singleton',
        hero: body.hero as any,
        about: body.about as any,
        features: body.features as any,
        microcopy: body.microcopy as any,
      },
    });

    return Response.json({ success: true, data: updatedContent });
  } catch (error) {
    console.error('[Content API] Error PUT:', error);
    return Response.json({ error: 'Gagal memperbarui konten' }, { status: 500 });
  }
}
