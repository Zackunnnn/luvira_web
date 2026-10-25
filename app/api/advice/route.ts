import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const advices = await prisma.advice.findMany({
      where: { isPublished: true },
      include: {
        author: {
          select: {
            name: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      advices,
    });
  } catch (error: any) {
    console.error('[Public Advice API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal memuat artikel nasihat' },
      { status: 500 }
    );
  }
}
