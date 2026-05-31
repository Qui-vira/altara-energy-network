import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#071426] px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white p-8 shadow-2xl">
        <div className="mb-8">
          <div className="text-sm font-bold uppercase tracking-[0.3em] text-[#f2b544]">Altara Energy</div>
          <h1 className="mt-3 text-3xl font-black text-[#071426]">Secure login</h1>
          <p className="mt-2 text-sm text-[#697386]">Admin and installer access for private audit operations.</p>
        </div>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
