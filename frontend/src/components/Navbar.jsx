import { Link, useLocation, useNavigate } from "react-router-dom";
import { Sparkles, LogOut, Menu } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

const links = [
  { to: "/student/dashboard", label: "Learn" },
  { to: "/student/leaderboard", label: "Leaderboard" },
  { to: "/student/profile", label: "Profile" },
];

export default function Navbar({ onMenuClick }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-black/5 bg-canvas/90 px-4 py-3 backdrop-blur-md md:px-8">
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="rounded-xl p-2 hover:bg-black/5 md:hidden" aria-label="Menu">
          <Menu size={22} />
        </button>
        <Link to="/student/dashboard" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary text-white">
            <Sparkles size={18} />
          </div>
          <span className="font-display text-lg font-bold hidden sm:block">Subhanu AI Academy</span>
        </Link>
      </div>

      <nav className="hidden gap-1 md:flex">
        {links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
              location.pathname === link.to ? "bg-primary-50 text-primary" : "text-ink/60 hover:bg-black/5"
            }`}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="flex items-center gap-3">
        <span className="hidden text-sm font-semibold text-ink/70 sm:block">{user?.name || "Learner"}</span>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-50 text-lg">
          {user?.avatar?.startsWith("data:image") ? <img src={user.avatar?.startsWith("data:image") ? <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover rounded-full" /> : user.avatar} alt="Avatar" className="w-full h-full object-cover rounded-full" /> : (user?.avatar || "🧑‍🎓")}
        </div>
        <button
          onClick={() => { signOut(); navigate("/login"); }}
          className="rounded-xl p-2 text-ink/50 hover:bg-black/5 hover:text-red-500"
          aria-label="Log out"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
