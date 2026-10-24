// app/api/developer/audit/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user || user.role !== Role.DEVELOPER) {
    return NextResponse.json({ error: 'Akses ditolak. Khusus Peran Developer.' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');
  const entity = searchParams.get('entity');
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));

  const where: any = {};
  if (action) {
    where.action = { contains: action, mode: 'insensitive' };
  }
  if (entity) {
    where.entity = { contains: entity, mode: 'insensitive' };
  }

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return NextResponse.json({
    logs,
    limit,
  });
}
