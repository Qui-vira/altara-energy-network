import Link from "next/link";
import { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const links = [
  ["Dashboard", "/admin/dashboard"],
  ["Leads", "/admin/leads"],
  ["Equipment", "/admin/equipment"],
  ["Vendors", "/admin/vendors"],
  ["Research", "/admin/research"],
  ["Quotes", "/admin/quotes"],
  ["Invoices", "/admin/invoices"],
  ["Maintenance", "/admin/maintenance"],
  ["Installer view", "/installer/work-orders"],
];

export async function AdminShell({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  return (
    <div className="min-h-screen bg-[#f8f5ee]">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-[#1f3657] bg-[#071426] p-6 text-white lg:block">
        <div className="text-xl font-black text-[#f2b544]">Altara Energy</div>
        <p className="mt-2 text-xs text-white/60">Private solar audit and revenue operations</p>
        <nav className="mt-8 space-y-1">
          {links.map(([label, href]) => (
            <Link key={href} href={href} className="block rounded-xl px-3 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white">
              {label}
            </Link>
          ))}
        </nav>
        <div className="absolute bottom-6 left-6 right-6 rounded-xl bg-white/10 p-3 text-xs text-white/70">
          Signed in as<br />
          <span className="font-semibold text-white">{session?.user?.email}</span>
        </div>
      </aside>
      <main className="lg:pl-72">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
