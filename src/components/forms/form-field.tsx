import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";

export function FormField({ label, children, error }: { label: string; children: ReactNode; error?: string }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
      {error ? <p className="mt-1 text-xs font-medium text-red-700">{error}</p> : null}
    </div>
  );
}
