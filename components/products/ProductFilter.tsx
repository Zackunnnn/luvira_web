import React from 'react';
import { FilterCategory } from '@/types/product';
import { Sparkles, Layers, ShieldCheck, Footprints, Flame } from 'lucide-react';

interface ProductFilterProps {
  activeFilter: FilterCategory;
  onFilterChange: (filter: FilterCategory) => void;
}

const CATEGORIES: { id: FilterCategory; label: string; icon: React.ElementType }[] = [
  { id: 'all', label: 'Semua Koleksi', icon: Flame },
  { id: 'emboss', label: 'Emboss Split Toe', icon: Sparkles },
  { id: 'black-sole', label: 'Black Sole Split Toe', icon: Layers },
  { id: 'anti-slip', label: 'Anti Slip Split Toe', icon: ShieldCheck },
  { id: 'classic', label: 'Classic Full Coverage', icon: Footprints },
];

export const ProductFilter: React.FC<ProductFilterProps> = ({
  activeFilter,
  onFilterChange,
}) => {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-3">
      <div className="flex items-center justify-start md:justify-center gap-2 overflow-x-auto no-scrollbar pb-2 pt-1">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeFilter === cat.id;

          return (
            <button
              key={cat.id}
              onClick={() => onFilterChange(cat.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'bg-deep-forest text-warm-cream shadow-md shadow-deep-forest/20 scale-102 ring-2 ring-deep-forest/30'
                  : 'bg-white text-muted-charcoal/80 border border-deep-forest/10 hover:bg-warm-cream hover:text-deep-forest'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-dusty-rose' : 'text-leaf-olive'}`} />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
