import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import StudentSidebar from "../components/StudentSidebar";
import Topbar from "../components/Topbar";
import MobileNav from "../components/MobileNav";

export default function StudentLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  // Close mobile sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-canvas">
      <div className="flex min-h-screen">
        <StudentSidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed(!collapsed)}
        />

        <div className={`flex-1 flex flex-col min-w-0 transition-all duration-200`}>
          <Topbar onMenuClick={() => setSidebarOpen(true)} showSearch={true} title="Dashboard" />
          
          <main className="flex-1 mx-auto w-full max-w-content p-4 md:p-6 lg:p-8 pb-24 md:pb-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="h-full"
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
      <MobileNav />
    </div>
  );
}
