import Link from 'next/link';

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-6">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-sm border border-neutral-200 text-center">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
          403
        </div>
        <h1 className="text-2xl font-bold text-neutral-900 mb-2">Akses Ditolak</h1>
        <p className="text-sm text-neutral-600 mb-6">
          Anda tidak memiliki izin untuk mengakses halaman ini. Halaman ini dibatasi khusus untuk peran tertentu.
        </p>
        <div className="space-y-3">
          <Link
            href="/dashboard/login"
            className="block w-full py-2.5 px-4 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-sm font-medium transition"
          >
            Beralih Akun / Login Ulang
          </Link>
          <Link
            href="/"
            className="block w-full py-2.5 px-4 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-sm font-medium transition"
          >
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    </div>
  );
}
