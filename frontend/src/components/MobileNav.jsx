import { NavLink } from "react-router-dom";
import { LayoutDashboard, Compass, GraduationCap, MessageCircleMore, UserRound } from "lucide-react";

const items = [
  { to: "/student/dashboard", label: "Home", icon: LayoutDashboard },
  { to: "/student/explore", label: "Explore", icon: Compass },
  { to: "/student/course", label: "Learn", icon: GraduationCap },
  { to: "/student/messages", label: "Chat", icon: MessageCircleMore },
  { to: "/student/profile", label: "Profile", icon: UserRound },
];

export default function MobileNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-surface/80 backdrop-blur-xl md:hidden">
      <div className="flex items-center justify-around py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 transition-colors ${
                isActive ? "text-primary" : "text-muted"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={20} strokeWidth={isActive ? 2.4 : 1.8} />
                <span className={`text-[10px] font-semibold ${isActive ? "text-primary" : "text-muted"}`}>
                  {label}
                </span>
                {isActive && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-6 rounded-full bg-primary" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
