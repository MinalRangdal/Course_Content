import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, Users, TrendingUp, Sparkles, Wand2, Activity } from "lucide-react";
import { getAdminStats, getAllCourses } from "../../services/api";
import Button from "../../components/Button";
import { SkeletonCard, SkeletonRow } from "../../components/LoadingSkeleton";

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    getAdminStats().then(setStats);
    getAllCourses().then(setCourses);
  }, []);

  if (!stats) return (
    <div className="space-y-8">
      <div className="h-24 rounded-xl3 skeleton" />
      <div className="flex gap-4"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
    </div>
  );

  const pendingCount = courses.filter(c => c.status === "pending_review").length;
  const recentCourses = [...courses].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 4);

  return (
    <div className="space-y-8">
      
      {/* Welcome Banner */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl3 bg-sidebar p-6 shadow-card text-white flex justify-between items-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl -mr-20 -mt-20" />
        <div className="relative z-10">
          <h2 className="text-2xl font-bold">Welcome back, {stats.adminName}</h2>
          <p className="mt-1 text-white/60">Here is what's happening in your academy today.</p>
        </div>
        <Link to="/admin/generate" className="relative z-10 hidden sm:block">
          <Button icon={Wand2} className="shadow-pop bg-primary hover:bg-primary-dark">Create New Course</Button>
        </Link>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Published Courses", value: stats.totalPublishedCourses, icon: BookOpen, color: "text-primary", bg: "bg-primary/10" },
          { label: "Total Students", value: stats.totalEnrolledStudents, icon: Users, color: "text-orange-500", bg: "bg-orange-500/10" },
          { label: "Pending Reviews", value: pendingCount, icon: Sparkles, color: "text-gold-dark", bg: "bg-gold/20" },
          { label: "Active Learners", value: stats.activeLearners, icon: Activity, color: "text-success", bg: "bg-success/10" },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="rounded-xl3 bg-surface p-6 shadow-card flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg} ${stat.color}`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-3xl font-bold font-display">{stat.value}</p>
              <p className="text-xs font-bold text-ink/40">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Courses List */}
        <section className="lg:col-span-2 rounded-xl3 bg-surface shadow-card overflow-hidden">
          <div className="border-b border-border bg-canvas/30 px-6 py-4 flex justify-between items-center">
            <h3 className="font-bold">Recent Courses</h3>
            <Link to="/admin/published" className="text-xs font-bold text-primary hover:text-primary-dark transition-colors">View All</Link>
          </div>
          <div className="divide-y divide-border">
            {recentCourses.length > 0 ? (
              recentCourses.map(course => (
                <div key={course.id} className="flex items-center justify-between p-4 hover:bg-canvas/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-canvas rounded-xl flex items-center justify-center text-lg">{course.icon}</div>
                    <div>
                      <p className="font-bold text-sm">{course.title}</p>
                      <p className="text-xs text-ink/50">{course.modulesCount} modules</p>
                    </div>
                  </div>
                  {course.status === "published" ? (
                    <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide bg-success/10 text-success rounded-lg">Published</span>
                  ) : (
                    <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide bg-gold/20 text-gold-dark rounded-lg">Pending</span>
                  )}
                </div>
              ))
            ) : (
              <p className="p-8 text-center text-sm text-ink/50">No courses created yet.</p>
            )}
          </div>
        </section>

        {/* Quick Actions */}
        <section className="space-y-4">
          <div className="rounded-xl3 bg-surface shadow-card p-6 border border-border">
            <h3 className="font-bold mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Link to="/admin/generate" className="flex items-center justify-between p-3 bg-canvas/50 rounded-xl hover:bg-canvas transition-colors">
                <span className="font-semibold text-sm">Generate Course</span>
                <Wand2 size={16} className="text-ink/40" />
              </Link>
              <Link to="/admin/review" className="flex items-center justify-between p-3 bg-canvas/50 rounded-xl hover:bg-canvas transition-colors">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">Review Courses</span>
                  {pendingCount > 0 && <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">{pendingCount}</span>}
                </div>
                <BookOpen size={16} className="text-ink/40" />
              </Link>
              <Link to="/admin/students" className="flex items-center justify-between p-3 bg-canvas/50 rounded-xl hover:bg-canvas transition-colors">
                <span className="font-semibold text-sm">Manage Students</span>
                <Users size={16} className="text-ink/40" />
              </Link>
            </div>
          </div>
        </section>
      </div>

    </div>
  );
}
