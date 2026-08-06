import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-2xl border border-[#dfe3e8] bg-[#fafaf7] shadow-[0_1px_2px_rgba(15,23,42,0.04)]", className)} {...props} />;
}
