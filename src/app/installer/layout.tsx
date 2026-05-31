import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function InstallerLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  return <main className="min-h-screen bg-[#f8f5ee]"><header className="border-b border-[#e4dccb] bg-[#071426] px-6 py-4 text-white"><div className="mx-auto flex max-w-6xl items-center justify-between"><Link href="/installer/work-orders" className="font-black text-[#f2b544]">Altara Installer Portal</Link><div className="text-sm text-white/70">{session?.user?.email}</div></div></header><div className="mx-auto max-w-6xl px-6 py-8">{children}</div></main>;
}
