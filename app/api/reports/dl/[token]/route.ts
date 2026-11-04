// app/api/reports/dl/[token]/route.ts
// ============================================================================
// Endpoint Unduh Berkas Laporan Bertoken (FT-6, Asumsi F9)
// Tautan jangka pendek (15 menit), satu kali pakai, tanpa halaman web HTML
// Langsung menghasilkan payload berkas CSV terenkripsi aman
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { consumeReportDownloadToken } from '@/lib/reports/report-token';
import { generateReportCsvContent } from '@/lib/reports/wa-report-generator';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return new NextResponse('Token unduhan tidak valid atau hilang.', { status: 400 });
    }

    // Validasi & konsumsi token sekali pakai (15 menit)
    const tokenData = consumeReportDownloadToken(token);

    if (!tokenData) {
      return new NextResponse(
        'Tautan unduhan laporan telah kedaluwarsa atau sudah digunakan. Silakan minta laporan baru melalui WhatsApp atau Dashboard.',
        {
          status: 410,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        }
      );
    }

    // Bangkitkan data CSV sesuai cakupan token
    const csvContent = await generateReportCsvContent({
      userId: tokenData.userId,
      scopeType: tokenData.scopeType,
      scopeId: tokenData.scopeId,
      reportType: tokenData.reportType,
    });

    const filename = `laporan-luvira-${tokenData.reportType.toLowerCase()}-${Date.now()}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (error: any) {
    console.error('[Report DL Token Error]', error);
    return new NextResponse('Terjadi kesalahan sistem saat memproses berkas laporan.', { status: 500 });
  }
}
