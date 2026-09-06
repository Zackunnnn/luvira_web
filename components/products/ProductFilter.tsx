import React from 'react';
import { FilterCategory } from '@/types/product';
import { Sparkles, Layers, ShieldCheck, Flame, Tag, Folder } from 'lucide-react';
import { useProductStore } from '@/store/useProductStore';

interface ProductFilterProps {
  activeFilter: FilterCategory;
  onFilterChange: (filter: FilterCategory) => void;
}

// Icon Mapping
const ICON_MAP: Record<string, React.ElementType> = {
  Sparkles,
  Layers,
  ShieldCheck,
  Flame,
  Tag,
  Folder,
};

export const ProductFilter: React.FC<ProductFilterProps> = ({
  activeFilter,
  onFilterChange,
}) => {
  const { categories } = useProductStore();

  // Combine static 'all' category with dynamic store categories
  const allCategories = [
    { id: 'all' as FilterCategory, label: 'Semua Koleksi', iconName: 'Flame' },
    ...categories,
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-3">
      <div className="flex items-center justify-start md:justify-center gap-2 overflow-x-auto no-scrollbar pb-2 pt-1">
        {allCategories.map((cat) => {
          const Icon = ICON_MAP[cat.iconName] || Tag; // Fallback to Tag if not found
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
