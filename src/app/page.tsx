import Link from "next/link";
import { SolarReadinessForm } from "@/components/customer/solar-readiness-form";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  return (
    <main className="bg-[#f8f5ee] text-[#17212f]">
      <section className="hero-grid overflow-hidden bg-[#071426] text-white">
        <div className="mx-auto grid min-h-[720px] max-w-7xl gap-12 px-6 py-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div>
            <Badge tone="gold">Altara Energy Network</Badge>
            <h1 className="mt-6 max-w-3xl text-4xl font-black tracking-tight sm:text-6xl">
              Private solar audits, verified recommendations, and professional quotes.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/75">
              Start with a free Solar Readiness Check. Altara reviews your load, site photos, backup goals, and budget before sending a recommendation. Safety-critical items are verified by installers before final approval.
            </p>
            <div className="mt-8 grid gap-3 text-sm text-white/70 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">Altara owns calculator, pricing, quote and invoice.</div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">Installers verify site/load details and install only.</div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">Vendors supply equipment after client payment.</div>
            </div>
            <Link href="/admin/login" className="mt-8 inline-flex text-sm font-semibold text-[#f2b544] hover:text-white">
              Admin login →
            </Link>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white p-4 shadow-2xl">
            <SolarReadinessForm />
          </div>
        </div>
      </section>
    </main>
  );
}
