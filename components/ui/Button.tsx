// Button.tsx — Reusable Button component with multiple visual variants.
// Supports 5 variants (primary, secondary, rose, outline, ghost) and 3 sizes (sm, md, lg).
// Uses clsx for conditional class composition and tailwind-merge for conflict resolution.

import React from 'react'; // React core
import { clsx } from 'clsx'; // Utility for conditionally joining class names
import { twMerge } from 'tailwind-merge'; // Merges Tailwind classes and resolves conflicts

// ButtonProps — Extends native HTML button attributes with custom styling props.
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'rose'; // Visual style variant
  size?: 'sm' | 'md' | 'lg'; // Size preset for padding and font size
  fullWidth?: boolean; // If true, button stretches to fill container width
  children: React.ReactNode; // Button content (text, icons, etc.)
}

// Button — Functional component rendering a styled <button> element.
// Usage: <Button variant="primary" size="lg" onClick={handleClick}>Label</Button>
export const Button: React.FC<ButtonProps> = ({
  variant = 'primary', // Default to primary (deep-forest) style
  size = 'md', // Default to medium size
  fullWidth = false, // Default to auto width
  className, // Additional custom classes from parent
  children, // Button inner content
  ...props // Spread remaining HTML button attributes (onClick, disabled, type, etc.)
}) => {
  // Base styles applied to ALL button variants — layout, shape, transitions, disabled state
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-2xl transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none shadow-sm cursor-pointer';

  // Variant-specific color and shadow styles
  const variants = {
    primary: 'bg-deep-forest text-warm-cream hover:bg-deep-forest-hover shadow-deep-forest/20', // Dark green
    secondary: 'bg-leaf-olive text-warm-cream hover:bg-leaf-olive-hover shadow-leaf-olive/20', // Olive green
    rose: 'bg-dusty-rose text-warm-cream hover:bg-dusty-rose-hover shadow-dusty-rose/20', // Muted rose
    outline: 'border-2 border-deep-forest text-deep-forest bg-transparent hover:bg-deep-forest/5', // Bordered
    ghost: 'text-muted-charcoal bg-transparent hover:bg-muted-charcoal/5 shadow-none', // Transparent
  };

  // Size-specific padding, font size, and gap values
  const sizes = {
    sm: 'px-3 py-1.5 text-xs gap-1.5', // Small — compact
    md: 'px-4 py-2.5 text-sm gap-2', // Medium — standard
    lg: 'px-6 py-3.5 text-base gap-2.5 font-semibold', // Large — prominent CTA
  };

  return (
    <button
      // Merge all class strings, resolving Tailwind conflicts (e.g., overriding bg-color)
      className={twMerge(
        clsx(
          baseStyles, // Always applied base styles
          variants[variant], // Variant-specific colors
          sizes[size], // Size-specific dimensions
          fullWidth && 'w-full', // Full width if prop is true
          className // Any additional custom classes
        )
      )}
      {...props} // Pass through native button attributes (onClick, disabled, type, form, etc.)
    >
      {children} {/* Render button content */}
    </button>
  );
};
