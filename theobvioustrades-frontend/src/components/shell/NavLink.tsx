// src/components/shell/NavLink.tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");
  return (
    <Link
      href={href}
      className={`block rounded-lg px-3 py-2 text-sm ${
        active ? "bg-neutral-900 text-white" : "text-neutral-700 hover:bg-neutral-100"
      }`}
    >
      {label}
    </Link>
  );
}
