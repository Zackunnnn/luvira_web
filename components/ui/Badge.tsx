// Badge.tsx — Reusable Badge (pill/tag) component for labels, promo tags, and status indicators.
// Supports 5 visual variants for different contexts across the Luvira storefront.

import React from 'react'; // React core
import { clsx } from 'clsx'; // Conditional class name utility
import { twMerge } from 'tailwind-merge'; // Tailwind class conflict resolver

// BadgeProps — Configuration for the Badge component.
interface BadgeProps {
  variant?: 'primary' | 'secondary' | 'rose' | 'cream' | 'outline'; // Visual style variant
  children: React.ReactNode; // Badge text content
  className?: string; // Optional additional custom classes
}

// Badge — Renders a small inline pill/tag element for labels and status indicators.
// Usage: <Badge variant="rose">Best Seller</Badge>
export const Badge: React.FC<BadgeProps> = ({
  variant = 'primary', // Default to primary (deep-forest) style
  children, // Badge text content
  className, // Additional custom classes from parent
}) => {
  // Base styles shared across all variants — layout, padding, typography, shape
  const baseStyles = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide';

  // Variant-specific background, text color, and border styles
  const variants = {
    primary: 'bg-deep-forest/10 text-deep-forest border border-deep-forest/20', // Subtle green
    secondary: 'bg-leaf-olive/15 text-leaf-olive border border-leaf-olive/30', // Olive accent
    rose: 'bg-dusty-rose/20 text-dusty-rose-hover border border-dusty-rose/30', // Rose for promos
    cream: 'bg-warm-cream text-muted-charcoal border border-muted-charcoal/10 shadow-xs', // Neutral light
    outline: 'border border-muted-charcoal/30 text-muted-charcoal', // Outlined neutral
  };

  return (
    // Render as a <span> element with merged variant + custom classes
    <span className={twMerge(clsx(baseStyles, variants[variant], className))}>
      {children} {/* Badge label text */}
    </span>
  );
};
