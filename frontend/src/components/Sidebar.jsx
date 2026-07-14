import { NavLink, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  LayoutDashboard,
  Wand2,
  ClipboardCheck,
  BookCheck,
  Users,
  ChartColumn,
  Bot,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Settings,
  MessageCircleMore,
  BookOpen,
  PlayCircle,
  X,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";

const sections = [
  {
    label: "Overview",
    items: [
      { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/admin/my-courses", label: "My Courses", icon: BookOpen },
    ],
  },
  {
    label: "Content",
    items: [
      { to: "/admin/generate", label: "Generate Course", icon: Wand2 },
      { to: "/admin/review", label: "Course Review", icon: ClipboardCheck },
      { to: "/admin/visualizer", label: "Code Visualizer", icon: PlayCircle },
    ],
  },
  {
    label: "Management",
    items: [
      { to: "/admin/students", label: "Students", icon: Users },
      { to: "/admin/analytics", label: "Analytics", icon: ChartColumn },
    ],
  },
  {
    label: "Account",
    items: [
      { to: "/admin/messages", label: "Messages", icon: MessageCircleMore },
      { to: "/admin/settings", label: "Settings", icon: Settings },
    ],
  },
];

export default function Sidebar({ open = true, onClose, collapsed, onToggleCollapse }) {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-30 bg-black/40 md:hidden"
          />
        )}
      </AnimatePresence>

      <aside
        className={`fixed z-40 flex h-full flex-col bg-sidebar shadow-sidebar md:sticky md:top-0 md:h-screen md:translate-x-0 transition-all duration-300 ${
          open ? "translate-x-0" : "-translate-x-full"
        } ${collapsed ? "w-[72px]" : "w-[260px]"}`}
      >
        {/* Logo */}
        <div className={`flex h-16 items-center border-b border-white/5 ${collapsed ? "justify-center px-2" : "justify-between px-5"}`}>
          {!collapsed && (
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary text-white">
                <Sparkles size={15} />
              </div>
              <div>
                <span className="font-display text-[15px] font-bold text-white">Subhanu AI</span>
                <span className="ml-1.5 rounded bg-surface/10 px-1.5 py-0.5 text-[10px] font-bold text-primary-light">Admin</span>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-white">
              <Sparkles size={15} />
            </div>
          )}
          <button onClick={onClose} className="rounded-lg p-1 text-white/50 hover:bg-surface/10 md:hidden">
            <X size={18} />
          </button>
        </div>

        {/* Navigation sections */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2 scrollbar-hide">
          {sections.map((section) => (
            <div key={section.label}>
              {!collapsed && (
                <div className="sidebar-section-label">{section.label}</div>
              )}
              {collapsed && <div className="h-3" />}
              <div className="space-y-0.5 px-2">
                {section.items.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `group flex items-center rounded-xl transition-all duration-150 ${
                        collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2.5"
                      } ${
                        isActive
                          ? "bg-primary text-white shadow-glow"
                          : "text-sidebar-text hover:bg-sidebar-hover hover:text-white"
                      }`
                    }
                    title={collapsed ? label : undefined}
                  >
                    <Icon size={18} strokeWidth={2} className="shrink-0" />
                    {!collapsed && <span className="text-[13px] font-semibold">{label}</span>}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Collapse toggle (desktop only) */}
        <div className="hidden border-t border-white/5 md:block">
          <button
            onClick={onToggleCollapse}
            className="flex w-full items-center justify-center py-3 text-sidebar-text transition hover:text-white"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Logout */}
        <div className="border-t border-white/5 px-2 py-2">
          <button
            onClick={() => { signOut(); navigate("/login"); }}
            className={`flex w-full items-center rounded-xl text-sidebar-text transition-colors hover:bg-red-500/10 hover:text-red-400 ${
              collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2.5"
            }`}
          >
            <LogOut size={18} className="shrink-0" />
            {!collapsed && <span className="text-[13px] font-semibold">Log out</span>}
          </button>
        </div>
      </aside>
    </>
  );
}