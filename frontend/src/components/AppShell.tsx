import { useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { DISCLAIMER } from "../lib/labels";

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div className="lg:pl-64">
        <Topbar onMenu={() => setOpen(true)} />
        <main key={pathname} className="mx-auto max-w-6xl animate-fadeUp px-4 py-6 sm:px-8">{children}</main>
        <footer className="mx-auto max-w-6xl px-4 pb-8 pt-2 text-xs text-navy-700 sm:px-8">{DISCLAIMER}</footer>
      </div>
    </div>
  );
}
