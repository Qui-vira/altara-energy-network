"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/forms/form-field";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(formData: FormData) {
    setLoading(true);
    setError(null);
    const response = await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirect: false,
    });
    setLoading(false);
    if (response?.error) {
      setError("Invalid login or inactive account.");
      return;
    }
    router.push(params.get("callbackUrl") ?? "/admin/dashboard");
  }

  return (
    <form action={submit} className="space-y-4">
      {error ? <div className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div> : null}
      <FormField label="Email"><Input name="email" type="email" required /></FormField>
      <FormField label="Password"><Input name="password" type="password" required /></FormField>
      <Button type="submit" className="w-full py-3" disabled={loading}>{loading ? "Signing in..." : "Sign in"}</Button>
    </form>
  );
}
