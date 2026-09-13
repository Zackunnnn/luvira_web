import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    if (!process.env.DATABASE_URL) {
      console.warn('[Changelog] Database URL missing. Skipping log.');
      return Response.json({ success: true, warning: 'Database belum dikonfigurasi' });
    }

    const body = await request.json();
    const { productName, fieldName, oldValue, newValue } = body;

    const newLog = await prisma.changeLog.create({
      data: {
        entityType: 'Product/Content',
        entityId: productName, // We use productName as entityId just to reuse the old KV structure
        fieldName,
        oldValue,
        newValue,
        changedBy: 'Admin', // In a real app with auth, this would be the logged in user
      },
    });

    return Response.json({ success: true, log: newLog });
  } catch (error) {
    console.error('[Changelog] Error writing log:', error);
    return Response.json({ error: 'Failed to write changelog' }, { status: 500 });
  }
}

export async function GET() {
  try {
    if (!process.env.DATABASE_URL) {
      return Response.json({ logs: [] });
    }

    const logs = await prisma.changeLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100, // Limit to recent 100 logs
    });

    // Map to the old KV UI structure
    const mappedLogs = logs.map(log => ({
      id: log.id,
      timestamp: log.createdAt.toISOString(),
      adminName: log.changedBy,
      productName: log.entityId || 'Unknown',
      fieldName: log.fieldName,
      oldValue: log.oldValue,
      newValue: log.newValue,
      isSynced: false, // For now we keep it false or you could add isSynced to Prisma schema
    }));

    return Response.json({ logs: mappedLogs });
  } catch (error) {
    console.error('[Changelog] Error reading logs:', error);
    return Response.json({ logs: [] });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!process.env.DATABASE_URL) {
      return Response.json({ success: true });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      await prisma.changeLog.delete({
        where: { id },
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('[Changelog] Error deleting log:', error);
    return Response.json({ error: 'Failed to delete log' }, { status: 500 });
  }
}
