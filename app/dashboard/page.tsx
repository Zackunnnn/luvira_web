import Link from 'next/link';
import { ArrowRight, Lock } from 'lucide-react';

export default function DashboardLandingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-warm-cream px-6">
      <div className="w-full max-w-md bg-white p-10 rounded-3xl shadow-sm border border-neutral-100 text-center">
        <div className="flex justify-center mb-6">
          <div className="h-16 w-16 bg-deep-forest/5 rounded-2xl flex items-center justify-center">
            <Lock className="w-8 h-8 text-deep-forest" />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold tracking-tight text-deep-forest mb-3">Portal Internal</h1>
        <p className="text-neutral-500 mb-8 leading-relaxed">
          Selamat datang di sistem manajemen internal Luvira. Silakan masuk untuk mengelola toko, pesanan, dan operasional Anda.
        </p>

        <Link 
          href="/dashboard/login" 
          className="w-full flex items-center justify-center gap-2 py-4 px-6 bg-deep-forest hover:bg-deep-forest/90 text-white font-medium rounded-xl shadow-sm hover:shadow transition-all group"
        >
          Masuk Sekarang
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </div>
  );
}
