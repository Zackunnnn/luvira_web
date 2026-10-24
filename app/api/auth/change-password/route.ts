import { NextRequest, NextResponse } from 'next/server';
import { getSession, changeUserPassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Tidak diautentikasi.' }, { status: 401 });
    }

    const { oldPassword, newPassword } = await request.json();
    if (!oldPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Kata sandi lama dan kata sandi baru wajib diisi.' },
        { status: 400 }
      );
    }

    const res = await changeUserPassword(session.userId, oldPassword, newPassword);
    if (!res.success) {
      return NextResponse.json({ error: res.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Kata sandi berhasil diperbarui.' }, { status: 200 });
  } catch (error) {
    console.error('[Change Password API Error]', error);
    return NextResponse.json({ error: 'Gagal memperbarui kata sandi.' }, { status: 500 });
  }
}
