// src/components/shell/Sidebar.tsx
import { NavLink } from "./NavLink";

export function Sidebar() {
  return (
    <aside className="w-56 border-r px-3 py-4 hidden md:block">
      <nav className="space-y-1">
        <NavLink href="/" label="Dashboard" />
        <NavLink href="/portfolio" label="Portfolio Performance" />
        <NavLink href="/charts" label="Stock Charts" />
        <NavLink href="/history" label="Transparency / History" />
        <NavLink href="/newsletter" label="Newsletter" />
      </nav>
    </aside>
  );
}
