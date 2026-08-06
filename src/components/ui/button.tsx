import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "dark";

export function Button({
  className,
  variant = "primary",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        variant === "primary" && "bg-violet-600 text-white shadow-sm shadow-violet-200 hover:bg-violet-700",
        variant === "secondary" && "border border-slate-200 bg-white text-slate-700 hover:border-violet-200 hover:bg-violet-50",
        variant === "ghost" && "text-slate-600 hover:bg-slate-100",
        variant === "danger" && "bg-rose-50 text-rose-700 hover:bg-rose-100",
        variant === "dark" && "bg-slate-900 text-white hover:bg-slate-800",
        className,
      )}
      {...props}
    />
  );
}
