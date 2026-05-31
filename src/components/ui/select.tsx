import * as React from "react";
import { cn } from "@/lib/utils";

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn("w-full rounded-xl border border-[#d8cdb8] bg-white px-3 py-2 text-sm outline-none focus:border-[#f2b544] focus:ring-2 focus:ring-[#f2b544]/30", className)} {...props} />;
}
