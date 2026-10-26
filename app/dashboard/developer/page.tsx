// app/dashboard/developer/page.tsx
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/db';

import { DeveloperLogoutButton } from '@/components/developer/DeveloperLogoutButton';

export const dynamic = 'force-dynamic';

async function getDatabaseHealth() {
  const startDb = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'UP', latency: Date.now() - startDb };
  } catch {
    return { status: 'DOWN', latency: 0 };
  }
}

export default async function DeveloperDashboard() {
  const session = await getSession();
  if (!session || session.role !== Role.DEVELOPER) {
    redirect('/forbidden');
  }

  const { status: dbStatus, latency: dbLatency } = await getDatabaseHealth();

  const [orderCount, errorCount, auditCount] = await Promise.all([
    prisma.order.count(),
    prisma.errorLog.count(),
    prisma.auditLog.count(),
  ]);

  const recentErrors = await prisma.errorLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-800 pb-5 gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
              <h1 className="text-2xl font-bold tracking-tight text-white">Observabilitas Developer Luvira 2.0</h1>
            </div>
            <p className="text-sm text-slate-400 mt-1">Pemantauan Kesehatan Sistem, Antrean Bermasalah & Log Kesalahan</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="px-3 py-1 bg-cyan-950 text-cyan-400 border border-cyan-800 rounded-lg text-xs font-mono font-semibold">
              ROLE: {session.role}
            </span>
            <span className="text-xs text-slate-400">{session.name}</span>
            <DeveloperLogoutButton />
          </div>
        </header>

        {/* Status Indikator Utama */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-xl space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Neon PostgreSQL Database</p>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">Serverless</span>
            </div>
            <div className="flex items-baseline justify-between pt-1">
              <p className={`text-xl font-bold ${dbStatus === 'UP' ? 'text-emerald-400' : 'text-rose-400'}`}>{dbStatus}</p>
              <span className="text-xs text-slate-400 font-mono">Latensi: {dbLatency} ms</span>
            </div>
            <p className="text-[10px] text-slate-500 truncate font-mono">ep-holy-meadow-awct0q2f-pooler</p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-xl space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Asset Pipeline & CDN</p>
              <span className="text-xs text-emerald-400">READY</span>
            </div>
            <div className="flex items-baseline justify-between pt-1">
              <p className="text-base font-bold text-cyan-400">ImageKit.io & WebP Fallback</p>
            </div>
            <p className="text-[10px] text-slate-500">Pipeline foto 26 varian WebP resolusi tinggi</p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-xl space-y-1">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Integrasi Eksternal</p>
            <div className="text-xs text-slate-300 space-y-1">
              <p>RajaOngkir: <span className="text-cyan-400 font-mono">{process.env.SHIPPING_MODE || 'mock'}</span></p>
              <p>Midtrans: <span className="text-cyan-400 font-mono">{process.env.MIDTRANS_MODE || 'mock'}</span></p>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-xl space-y-1">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Pesanan & Log</p>
            <div className="flex items-baseline justify-between">
              <p className="text-xl font-bold text-white">{orderCount}</p>
              <span className="text-xs text-slate-400">{errorCount} errors / {auditCount} audit</span>
            </div>
          </div>
        </div>

        {/* Ringkasan Kesalahan Terbaru */}
        <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-white">Log Kesalahan Server Terbaru (ErrorLog)</h2>
            <span className="text-xs text-slate-400 font-mono">Batas laju aktif (max 30/menit)</span>
          </div>

          {recentErrors.length === 0 ? (
            <p className="text-sm text-slate-400 italic py-4 text-center">Tidak ada catatan kesalahan sistem (sistem berjalan prima).</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-2 px-3">Waktu</th>
                    <th className="py-2 px-3">Rute</th>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 px-3">Pesan Kesalahan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {recentErrors.map((err) => (
                    <tr key={err.id} className="hover:bg-slate-800/40">
                      <td className="py-2 px-3 text-slate-400">{new Date(err.createdAt).toLocaleTimeString()}</td>
                      <td className="py-2 px-3 text-cyan-300">{err.method} {err.route}</td>
                      <td className="py-2 px-3 text-rose-400">{err.statusCode}</td>
                      <td className="py-2 px-3 text-slate-200 truncate max-w-md">{err.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Endpoint Observabilitas Developer */}
        <section className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-6 space-y-3">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">REST API Observabilitas Developer</h3>
          <ul className="text-xs font-mono space-y-2 text-slate-400">
            <li><span className="text-emerald-400 font-bold">GET</span> /api/developer/health - Pemeriksaan kesehatan sistem, DB latency, adapter check</li>
            <li><span className="text-emerald-400 font-bold">GET</span> /api/developer/queues - Deteksi pesanan macet (&gt;24h verif, &gt;3d diproses) &amp; selisih stok reserved</li>
            <li><span className="text-emerald-400 font-bold">GET</span> /api/developer/errors - Kueri log kesalahan dengan filter rute dan status code</li>
            <li><span className="text-emerald-400 font-bold">GET</span> /api/developer/audit - Kueri audit trail sistem read-only</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
