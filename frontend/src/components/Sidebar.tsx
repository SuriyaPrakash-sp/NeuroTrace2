import { NavLink } from "react-router-dom";
import { LayoutDashboard, Users, X, PenLine } from "lucide-react";

const links = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/students", label: "Students", icon: Users },
];

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-navy-950/50 lg:hidden" onClick={onClose} aria-hidden />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-navy-950 p-5 text-white transition-transform duration-300 lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-mint-500 text-navy-950"><PenLine size={20} /></div>
            <span className="font-display text-xl font-extrabold tracking-tight">NeuroTrace</span>
          </div>
          <button className="lg:hidden" onClick={onClose} aria-label="Close menu"><X size={20} /></button>
        </div>
        <nav aria-label="Main" className="space-y-1">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} onClick={onClose}
              className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${isActive ? "bg-indigo-600 text-white" : "text-indigo-100 hover:bg-navy-800"}`}>
              <Icon size={18} />{label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto rounded-2xl bg-navy-800 p-4 text-xs text-indigo-100">
          <p className="font-semibold text-white">Therapist workspace</p>
          <p className="mt-1 opacity-80">Assess, plan, and track handwriting progress in one place.</p>
        </div>
      </aside>
    </>
  );
}
