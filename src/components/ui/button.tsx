import * as React from "react";
import { cn } from "@/lib/utils";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-[#f2b544] text-[#071426] hover:bg-[#d9901f]",
        variant === "secondary" && "bg-[#10243f] text-white hover:bg-[#071426]",
        variant === "outline" && "border border-[#d8cdb8] bg-white text-[#17212f] hover:bg-[#f8f5ee]",
        variant === "ghost" && "text-[#17212f] hover:bg-[#efe7d8]",
        variant === "danger" && "bg-red-600 text-white hover:bg-red-700",
        className,
      )}
      {...props}
    />
  );
}
