import { NavLink, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  LayoutDashboard,
  Compass,
  BookOpen,
  GraduationCap,
  Trophy,
  Users,
  MessageCircleMore,
  UserRound,
  Settings,
  CircleHelp,
  Award,
  LogOut,
  ChevronLeft,
  ChevronRight,
  PlayCircle,
  X,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";

const sections = [
  {
    label: "Main",
    items: [
      { to: "/student/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Courses",
    items: [
      { to: "/student/explore", label: "Explore Courses", icon: Compass },
      { to: "/student/my-courses", label: "My Courses", icon: BookOpen },
      { to: "/student/course", label: "Learning Path", icon: GraduationCap },
      { to: "/student/visualizer", label: "Code Visualizer", icon: PlayCircle },
    ],
  },
  {
    label: "Community",
    items: [
      { to: "/student/friends", label: "Friends", icon: Users },
      { to: "/student/messages", label: "Messages", icon: MessageCircleMore },
      { to: "/student/leaderboard", label: "Leaderboard", icon: Trophy },
    ],
  },
  {
    label: "Account",
    items: [
      { to: "/student/certificates", label: "Certificates", icon: Award },
      { to: "/student/profile", label: "Profile", icon: UserRound },
      { to: "/student/settings", label: "Settings", icon: Settings },
      { to: "/student/help", label: "Help & Support", icon: CircleHelp },
    ],
  },
];

export default function StudentSidebar({ open = true, onClose, collapsed, onToggleCollapse }) {
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
              <span className="font-display text-[15px] font-bold text-white">Subhanu AI</span>
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