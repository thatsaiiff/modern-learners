import React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "success" | "warning" | "danger" | "info" | "outline" | "accent";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variantStyles = {
    default: "bg-slate-100 text-slate-800 border-slate-200/80",
    success: "bg-emerald-50 text-emerald-800 border-emerald-200 font-bold",
    warning: "bg-amber-50 text-amber-800 border-amber-200 font-bold",
    danger: "bg-rose-50 text-rose-800 border-rose-200 font-bold",
    info: "bg-indigo-50 text-indigo-800 border-indigo-200 font-bold",
    accent: "bg-amber-100 text-amber-900 border-amber-300 font-black",
    outline: "text-slate-700 border-slate-300 bg-white",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-lg border px-2 py-0.5 text-[11px] font-semibold tracking-wide transition-colors",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
}
