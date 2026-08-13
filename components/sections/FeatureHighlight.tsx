import React from 'react';
import { Footprints, Shield, Wind, Sparkles } from 'lucide-react';

const FEATURES = [
  {
    icon: Footprints,
    title: 'Ergonomic Split Toe',
    subtitle: 'Jempol Terpisah Resisi',
    description: 'Konstruksi rajut khusus memisahkan ibu jari kaki secara alami, memberikan kebebasan bergerak dan fleksibilitas optimal saat memakai sandal jepit.',
    color: 'bg-leaf-olive/10 text-leaf-olive',
  },
  {
    icon: Shield,
    title: 'Anti-Dirty Black Sole',
    subtitle: 'Sol Gelap Tahan Noda',
    description: 'Bagian bawah telapak berwarna gelap tahan noda debu & tanah, menjaga tampilan kaus kaki tetap bersih dan rapi sepanjang harian.',
    color: 'bg-deep-forest/10 text-deep-forest',
  },
  {
    icon: Shield,
    title: 'Silicon Anti-Slip Grid',
    subtitle: 'Cengkeraman Maksimal',
    description: 'Lapisan bintik silicon mikroskopis di area telapak mencegah risiko tergelincir saat berjalan di atas keramik mulus maupun sajadah.',
    color: 'bg-dusty-rose/20 text-dusty-rose-hover',
  },
  {
    icon: Wind,
    title: 'Breathable Combed Cotton',
    subtitle: 'Serat Ultra Adem',
    description: 'Serat katun combed grade A berpori halus yang menyerap keringat dengan sempurna, menjaga kaki tetap segar dan bebas odor seharian.',
    color: 'bg-amber-500/10 text-amber-700',
  },
];

export const FeatureHighlight: React.FC = () => {
  return (
    <section id="features" className="py-12 px-4 sm:px-6 lg:px-12 max-w-7xl mx-auto">
      <div className="text-center max-w-2xl mx-auto space-y-2 mb-8">
        <span className="text-xs font-extrabold tracking-widest text-deep-forest uppercase bg-deep-forest/10 px-3 py-1 rounded-full inline-block">
          Teknologi Kaus Kaki Luvira
        </span>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-deep-forest tracking-tight">
          Inovasi Ergonomis & Material Premium
        </h2>
        <p className="text-xs sm:text-sm text-muted-charcoal/70">
          Setiap pasang Luvira diproduksi dengan ketelitian tinggi untuk menghadirkan kenyamanan kelas wahid.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {FEATURES.map((feature, idx) => {
          const Icon = feature.icon;
          return (
            <div
              key={idx}
              className="p-5 bg-white border border-deep-forest/10 rounded-3xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className={`w-11 h-11 rounded-2xl ${feature.color} flex items-center justify-center`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-deep-forest">
                    {feature.title}
                  </h3>
                  <span className="text-xs font-semibold text-leaf-olive block mt-0.5">
                    {feature.subtitle}
                  </span>
                </div>
                <p className="text-xs text-muted-charcoal/75 leading-relaxed">
                  {feature.description}
                </p>
              </div>

              <div className="pt-3 border-t border-deep-forest/5 flex items-center justify-between text-[11px] text-muted-charcoal/50 font-medium">
                <span>Fitur Keunggulan</span>
                <Sparkles className="w-3.5 h-3.5 text-dusty-rose" />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
