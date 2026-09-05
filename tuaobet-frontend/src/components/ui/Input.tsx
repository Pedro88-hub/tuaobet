import React from 'react';
import { cn } from '../../lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, icon, ...props }, ref) => {
  return (
    <div className="relative">
      {icon ? (
        <div className="pointer-events-none absolute left-3.5 top-1/2 z-[1] -translate-y-1/2 text-tuao-text-secondary">
          {icon}
        </div>
      ) : null}
      <input
        ref={ref}
        className={cn(
          'flex h-11 w-full rounded-xl border border-tuao-dark-700 bg-tuao-dark-950/80 px-3.5 py-2 text-sm text-white',
          'placeholder:text-tuao-text-secondary/80',
          'transition-[border-color,box-shadow] duration-200',
          'hover:border-tuao-dark-600',
          'focus:border-tuao-primary focus:outline-none focus:ring-2 focus:ring-tuao-primary/25',
          'disabled:cursor-not-allowed disabled:opacity-50',
          icon && 'pl-11',
          className
        )}
        {...props}
      />
    </div>
  );
});

Input.displayName = 'Input';

export { Input };
