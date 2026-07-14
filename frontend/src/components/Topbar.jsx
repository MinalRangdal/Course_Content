import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Search, Bell, MessageSquare, ChevronDown, Sparkles, LogOut, UserRound, Settings } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { getNotifications, markNotificationsRead } from "../services/api";

export default function Topbar({ onMenuClick, showSearch = true, title = "Dashboard" }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  
  const dropdownRef = useRef(null);
  const notifRef = useRef(null);
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  useEffect(() => {
    if (user) {
      getNotifications().then(setNotifications);
    }
  }, [user]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleOpenNotifs() {
    setNotifOpen(!notifOpen);
    if (!notifOpen && notifications.some(n => !n.read)) {
      await markNotificationsRead();
      const updated = await getNotifications();
      setNotifications(updated);
    }
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface/80 backdrop-blur-xl h-topbar flex items-center">
      <div className="flex w-full items-center justify-between gap-4 px-4 md:px-6">
        
        <div className="flex items-center gap-3">
          <button onClick={onMenuClick} className="rounded-xl p-2 text-ink/60 hover:bg-black/5 hover:text-ink md:hidden" aria-label="Menu">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
          </button>

          <div className="hidden md:flex items-center gap-2">
            <p className="text-[13px] font-bold text-ink/40">Academy</p>
            <span className="text-ink/40">/</span>
            <p className="text-[14px] font-bold text-ink">{title}</p>
          </div>
          
          <div className="md:hidden flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-white">
              <Sparkles size={15} />
            </div>
            <span className="font-display font-bold text-[15px]">Subhanu AI</span>
          </div>
        </div>

        {showSearch && (
          <div className="hidden flex-1 max-w-xl md:flex items-center justify-center mx-4">
            <div className="relative w-full">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/40" />
              <input
                placeholder="Search courses, topics, instructors..."
                className="w-full rounded-full border border-border bg-canvas/50 py-2.5 pl-11 pr-4 text-sm outline-none transition-colors placeholder:text-ink/40 focus:border-primary/50 focus:bg-surface"
              />
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 md:gap-3">
          <div className="relative" ref={notifRef}>
            <button 
              onClick={handleOpenNotifs}
              className="relative flex h-10 w-10 items-center justify-center rounded-full text-ink/60 transition hover:bg-black/5 hover:text-ink" 
              aria-label="Notifications"
            >
              <Bell size={20} />
              {unreadCount > 0 && <span className="badge-dot" />}
            </button>
            <AnimatePresence>
              {notifOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-72 origin-top-right rounded-xl3 border border-border bg-surface p-2 shadow-elevated"
                >
                  <div className="border-b border-border px-3 py-2 mb-2 flex justify-between items-center">
                    <p className="font-bold">Notifications</p>
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-1">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-sm text-ink/50">No notifications</div>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className={`p-3 rounded-xl ${n.read ? "" : "bg-primary/5"}`}>
                          <p className="text-sm font-bold">{n.title}</p>
                          <p className="text-xs text-ink/60 mt-0.5">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <button 
            onClick={() => navigate(user?.role === "admin" ? "/admin/messages" : "/student/messages")}
            className="relative hidden md:flex h-10 w-10 items-center justify-center rounded-full text-ink/60 transition hover:bg-black/5 hover:text-ink" 
            aria-label="Messages"
          >
            <MessageSquare size={20} />
          </button>

          <div className="relative ml-1" ref={dropdownRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 rounded-full p-1 pr-3 transition hover:bg-black/5"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-50 text-[17px]">
                {user?.avatar?.startsWith("data:image") ? <img src={user.avatar?.startsWith("data:image") ? <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover rounded-full" /> : user.avatar} alt="Avatar" className="w-full h-full object-cover rounded-full" /> : (user?.avatar || "🧑‍🎓")}
              </div>
              <ChevronDown size={16} className="hidden text-ink/50 md:block" />
            </button>

            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl3 border border-border bg-surface p-2 shadow-elevated"
                >
                  <div className="border-b border-border px-3 py-2.5 mb-1">
                    <p className="text-sm font-bold truncate">Welcome {user?.name || "Learner"}</p>
                    <p className="text-xs text-ink/50 truncate">{user?.email}</p>
                  </div>
                  
                  <Link
                    to={user?.role === "admin" ? "/admin/dashboard" : "/student/profile"}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-ink/70 hover:bg-black/5 hover:text-ink"
                  >
                    <UserRound size={16} className="text-ink/50" />
                    Profile
                  </Link>
                  <Link
                    to={user?.role === "admin" ? "/admin/settings" : "/student/settings"}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-ink/70 hover:bg-black/5 hover:text-ink"
                  >
                    <Settings size={16} className="text-ink/50" />
                    Settings
                  </Link>
                  
                  <div className="my-1 h-px bg-border" />
                  
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      signOut();
                      navigate("/login");
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-ink/70 hover:bg-red-500/10 hover:text-red-500"
                  >
                    <LogOut size={16} className="text-red-500/50" />
                    Log out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}
