import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  className,
  id,
  ...props
}) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold text-muted-charcoal">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={twMerge(
          clsx(
            'w-full px-4 py-3 bg-white border border-muted-charcoal/20 rounded-2xl text-sm text-muted-charcoal placeholder-muted-charcoal/40 focus:outline-none focus:ring-2 focus:ring-deep-forest/40 focus:border-deep-forest transition-all duration-200',
            error && 'border-rose-500 focus:ring-rose-200',
            className
          )
        )}
        {...props}
      />
      {error && <p className="text-xs text-rose-500 font-medium">{error}</p>}
    </div>
  );
};

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea: React.FC<TextareaProps> = ({
  label,
  error,
  className,
  id,
  ...props
}) => {
  const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={textareaId} className="block text-xs font-semibold text-muted-charcoal">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        rows={3}
        className={twMerge(
          clsx(
            'w-full px-4 py-3 bg-white border border-muted-charcoal/20 rounded-2xl text-sm text-muted-charcoal placeholder-muted-charcoal/40 focus:outline-none focus:ring-2 focus:ring-deep-forest/40 focus:border-deep-forest transition-all duration-200 resize-none',
            error && 'border-rose-500 focus:ring-rose-200',
            className
          )
        )}
        {...props}
      />
      {error && <p className="text-xs text-rose-500 font-medium">{error}</p>}
    </div>
  );
};
