import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Role } from '@prisma/client';

export default async function DeveloperDashboardPlaceholder() {
  const session = await getSession();
  if (!session || session.role !== Role.DEVELOPER) {
    redirect('/forbidden');
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex justify-between items-center border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold">Dashboard Developer</h1>
            <p className="text-sm text-slate-400">Observabilitas Sistem & Modul Luvira 2.0</p>
          </div>
          <div className="text-right">
            <span className="inline-block px-3 py-1 bg-cyan-900/60 text-cyan-300 border border-cyan-700/50 rounded-full text-xs font-mono font-medium">
              ROLE: {session.role}
            </span>
            <p className="text-xs text-slate-400 mt-1">{session.name} ({session.email})</p>
          </div>
        </header>

        <div className="p-6 bg-slate-800/60 border border-slate-700 rounded-xl space-y-4">
          <h2 className="text-lg font-semibold text-cyan-400">Status Fondasi Fase 1 (OK)</h2>
          <ul className="text-sm space-y-2 text-slate-300">
            <li>✓ Autentikasi 4 Peran Sistem & JWT Session Terverifikasi</li>
            <li>✓ Matriks Otorisasi RBAC & Pengaman Wilayah Aktif</li>
            <li>✓ Skema PostgreSQL 2.0 & Seed Berhasil Termigrasi</li>
            <li>✓ HPP / Biaya Modal Terpisah & Terproteksi</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
