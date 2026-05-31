import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({ className, tone = "neutral", ...props }: React.HTMLAttributes<HTMLSpanElement> & { tone?: "neutral" | "gold" | "green" | "red" | "blue" }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
        tone === "neutral" && "bg-[#efe7d8] text-[#17212f]",
        tone === "gold" && "bg-[#f2b544]/20 text-[#8a570b]",
        tone === "green" && "bg-emerald-100 text-emerald-800",
        tone === "red" && "bg-red-100 text-red-800",
        tone === "blue" && "bg-blue-100 text-blue-800",
        className,
      )}
      {...props}
    />
  );
}
