import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Semantic colors are defined in App.tsx or global CSS, but we can use Tailwind classes here
// based on the spec: Primary Blue: #2D5BFF, Secondary Purple: #7C3AED, Accent Green: #10B981

export const Card = ({ children, className, elevated = false, interactive = false, padding = true }: { children: React.ReactNode, className?: string, elevated?: boolean, interactive?: boolean, padding?: boolean }) => (
  <div className={cn(
    "bg-white border border-slate-200 rounded-lg transition-all duration-250 ease",
    padding && "p-6",
    elevated ? "shadow-lg" : "shadow-subtle",
    interactive && "hover:shadow-medium hover:border-slate-300 hover:-translate-y-0.5 cursor-pointer",
    className
  )}>
    {children}
  </div>
);

export const Button = ({ children, variant = 'primary', size = 'md', className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'tertiary' | 'ghost', size?: 'sm' | 'md' | 'lg' }) => {
  const variants = {
    primary: "bg-[#2D5BFF] text-white hover:brightness-90 active:brightness-75",
    secondary: "bg-transparent border border-[#E2E8F0] text-[#475569] hover:bg-[#F8FAFC]",
    tertiary: "bg-transparent text-[#2D5BFF] hover:underline px-0",
    ghost: "bg-transparent text-[#475569] hover:bg-slate-100",
  };
  
  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-6 py-3 text-sm",
    lg: "px-8 py-4 text-base",
  };

  return (
    <button 
      className={cn(
        "rounded-sm font-semibold transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

export const Badge = ({ children, status = 'info' }: { children: React.ReactNode, status?: 'success' | 'warning' | 'error' | 'info' | 'purple' }) => {
  const styles = {
    success: "bg-[#D1FAE5] text-[#10B981]",
    warning: "bg-[#FEF3C7] text-[#F59E0B]",
    error: "bg-[#FEE2E2] text-[#EF4444]",
    info: "bg-[#DBEAFE] text-[#2D5BFF]",
    purple: "bg-[#EDE9FE] text-[#7C3AED]",
  };
  return (
    <span className={cn("px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider", styles[status])}>
      {children}
    </span>
  );
};

export const Input = ({ label, icon: Icon, error, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label?: string, icon?: any, error?: string }) => (
  <div className="flex flex-col gap-1.5 w-full">
    {label && <label className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">{label}</label>}
    <div className="relative group">
      {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94A3B8] group-focus-within:text-[#2D5BFF] transition-colors" />}
      <input 
        className={cn(
          "w-full bg-white border border-[#E2E8F0] rounded-sm py-3 px-4 text-sm transition-all duration-250 outline-none",
          Icon && "pl-12",
          error ? "border-[#EF4444] bg-[#FEF2F2]" : "focus:border-[#2D5BFF] focus:ring-4 focus:ring-[#2D5BFF]/5",
        )}
        {...props}
      />
    </div>
    {error && <p className="text-xs text-[#EF4444] mt-1">{error}</p>}
  </div>
);

export const Progress = ({ value, className }: { value: number, className?: string }) => (
  <div className={cn("w-full h-1 bg-[#E2E8F0] rounded-full overflow-hidden", className)}>
    <div 
      className="h-full bg-[#2D5BFF] transition-all duration-500 ease-out" 
      style={{ width: `${value}%` }} 
    />
  </div>
);

export const Avatar = ({ src, name, size = 'md', className }: { src?: string, name: string, size?: 'sm' | 'md' | 'lg' | 'xl', className?: string }) => {
  const sizes = {
    sm: "w-8 h-8 text-[10px]",
    md: "w-10 h-10 text-xs",
    lg: "w-12 h-12 text-sm",
    xl: "w-24 h-24 text-xl",
  };
  return (
    <div className={cn(
      "rounded-full bg-slate-100 flex items-center justify-center border border-white shadow-subtle overflow-hidden shrink-0 font-bold text-slate-500",
      sizes[size],
      className
    )}>
      {src ? <img src={src} alt={name} className="w-full h-full object-cover" /> : name.charAt(0)}
    </div>
  );
};
