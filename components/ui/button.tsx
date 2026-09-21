import React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "danger" | "ghost" | "link" | "accent";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading, children, disabled, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none rounded-xl active:scale-[0.98] select-none";

    const variantStyles = {
      primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm hover:shadow-md hover:shadow-indigo-500/10",
      secondary: "bg-slate-100 text-slate-800 hover:bg-slate-200/80 border border-slate-200/60",
      outline: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400 shadow-xs",
      accent: "bg-amber-500 text-amber-950 hover:bg-amber-600 font-bold shadow-sm",
      danger: "bg-rose-600 text-white hover:bg-rose-700 shadow-sm",
      ghost: "text-slate-700 hover:bg-slate-100/80",
      link: "text-indigo-600 underline-offset-4 hover:underline p-0 h-auto rounded-none",
    };

    const sizeStyles = {
      sm: "h-9 px-3 text-xs min-h-[36px]",
      md: "h-11 px-4 text-sm min-h-[44px]",
      lg: "h-13 px-6 text-base min-h-[52px]",
      icon: "h-11 w-11 p-0 min-h-[44px] min-w-[44px]",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin shrink-0" />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
