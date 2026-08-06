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
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7b6bc9] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        variant === "primary" && "bg-[#6b59cc] text-white shadow-sm hover:bg-[#5d4cba]",
        variant === "secondary" && "border border-[#d9dee5] bg-[#fafaf7] text-slate-700 hover:border-[#c9c2e8] hover:bg-[#f1eff8]",
        variant === "ghost" && "text-slate-600 hover:bg-slate-100",
        variant === "danger" && "bg-rose-50 text-rose-700 hover:bg-rose-100",
        variant === "dark" && "bg-slate-900 text-white hover:bg-slate-800",
        className,
      )}
      {...props}
    />
  );
}
