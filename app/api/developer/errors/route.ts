// app/api/developer/errors/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { Role } from '@prisma/client';
import { logServerError } from '@/lib/logging/error-logger';
import { recordAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user || user.role !== Role.DEVELOPER) {
    return NextResponse.json({ error: 'Akses ditolak. Khusus Peran Developer.' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const route = searchParams.get('route');
  const statusCode = searchParams.get('statusCode') ? parseInt(searchParams.get('statusCode')!, 10) : undefined;
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));

  const where: any = {};
  if (route) {
    where.route = { contains: route, mode: 'insensitive' };
  }
  if (statusCode) {
    where.statusCode = statusCode;
  }

  const errors = await prisma.errorLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  const totalCount = await prisma.errorLog.count({ where });

  // Catat audit akses error log
  await recordAuditLog({
    actorId: user.id,
    actorName: user.name || 'Lead Developer',
    actorRole: user.role,
    action: 'DEVELOPER_VIEW_ERRORS',
    entity: 'ErrorLog',
    entityId: 'list',
    before: null,
    after: { count: errors.length, total: totalCount },
  });

  return NextResponse.json({
    errors,
    totalCount,
    limit,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body || !body.message) {
      return NextResponse.json({ error: 'Field message wajib diisi.' }, { status: 400 });
    }

    const recorded = await logServerError({
      message: body.message,
      stackTrace: body.stackTrace,
      route: body.route,
      method: body.method,
      statusCode: body.statusCode,
      payload: body.payload,
    });

    return NextResponse.json({
      success: true,
      recorded,
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Gagal memproses pencatatan error.' }, { status: 500 });
  }
}
