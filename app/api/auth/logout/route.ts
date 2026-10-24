import { NextResponse } from 'next/server';
import { clearSession, getSession } from '@/lib/auth';
import { audit } from '@/lib/audit';

export async function POST() {
  try {
    const session = await getSession();
    if (session) {
      await audit({
        actor: { id: session.userId, name: session.name, role: session.role },
        action: 'LOGOUT',
        entity: 'User',
        entityId: session.userId,
      });
    }

    await clearSession();
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[Logout API Error]', error);
    return NextResponse.json({ error: 'Gagal keluar.' }, { status: 500 });
  }
}
