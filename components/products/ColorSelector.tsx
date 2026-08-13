import React from 'react';
import { ColorVariant } from '@/types/product';
import { Check } from 'lucide-react';

interface ColorSelectorProps {
  variants: ColorVariant[];
  selectedVariant: ColorVariant;
  onSelect: (variant: ColorVariant) => void;
}

export const ColorSelector: React.FC<ColorSelectorProps> = ({
  variants,
  selectedVariant,
  onSelect,
}) => {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-charcoal/70 font-medium">Warna:</span>
        <span className="font-bold text-deep-forest">{selectedVariant.name}</span>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {variants.map((variant) => {
          const isSelected = variant.id === selectedVariant.id;
          return (
            <button
              key={variant.id}
              onClick={() => onSelect(variant)}
              className={`relative w-7 h-7 rounded-full transition-all duration-200 flex items-center justify-center border-2 cursor-pointer ${
                isSelected
                  ? 'border-deep-forest scale-110 shadow-sm ring-2 ring-deep-forest/20'
                  : 'border-white shadow-xs hover:scale-105'
              }`}
              style={{ backgroundColor: variant.hex }}
              title={variant.name}
              aria-label={`Pilih warna ${variant.name}`}
            >
              {isSelected && (
                <Check
                  className={`w-3.5 h-3.5 ${
                    // Check if hex is very light for contrast
                    variant.hex.toUpperCase() === '#FFFDF9' || variant.hex.toUpperCase() === '#F7FAFC' || variant.hex.toUpperCase() === '#FDFBF7'
                      ? 'text-deep-forest'
                      : 'text-white'
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
