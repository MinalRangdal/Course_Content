import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Users, BookOpen, Clock, Activity, Download } from "lucide-react";
import { getAdminStats } from "../../services/api";
import Button from "../../components/Button";

export default function AnalyticsPage() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    getAdminStats().then(setStats);
  }, []);

  if (!stats) return <div className="h-64 rounded-xl3 skeleton" />;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Analytics Overview</h1>
          <p className="mt-1 text-ink/50">Track engagement, completion rates, and platform growth.</p>
        </div>
        <Button variant="outline" icon={Download}>Export Report</Button>
      </div>

      {/* Main KPI Grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Active Learners", value: stats.activeLearners, icon: Users, trend: "+12%" },
          { label: "Total Enrollments", value: stats.totalEnrolledStudents, icon: BookOpen, trend: "+24%" },
          { label: "Avg. Completion", value: `${stats.courseCompletionPercentage}%`, icon: TrendingUp, trend: "+5%" },
          { label: "Time per Session", value: "24m", icon: Clock, trend: "-2%" },
        ].map(({ label, value, icon: Icon, trend }, i) => (
          <motion.div key={label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="rounded-xl3 bg-surface p-6 shadow-card hover:shadow-elevated transition-shadow">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-canvas text-ink/60">
                <Icon size={20} />
              </div>
              <span className={`text-xs font-bold ${trend.startsWith("+") ? "text-success" : "text-red-500"}`}>{trend}</span>
            </div>
            <p className="font-display text-3xl font-bold">{value}</p>
            <p className="mt-1 text-sm font-semibold text-ink/50">{label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Engagement Chart Mock */}
        <section className="rounded-xl3 bg-surface p-6 shadow-card">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-bold flex items-center gap-2"><Activity size={18} className="text-primary"/> Weekly Engagement</h2>
            <select className="rounded-lg bg-canvas px-3 py-1.5 text-xs font-bold outline-none border-none">
              <option>This Week</option>
              <option>Last Week</option>
            </select>
          </div>
          <div className="flex h-64 items-end justify-between gap-2 border-b border-l border-border px-2 pb-2 pt-6">
            {[40, 70, 45, 90, 60, 30, 80].map((h, i) => (
              <div key={i} className="group relative flex w-full flex-col justify-end">
                <motion.div 
                  initial={{ height: 0 }} animate={{ height: `${h}%` }} 
                  transition={{ duration: 1, delay: i * 0.1, type: "spring" }}
                  className="w-full rounded-t-md bg-primary/20 hover:bg-primary transition-colors" 
                />
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between px-2 text-xs font-bold text-ink/40 uppercase">
            <span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span>
          </div>
        </section>

        {/* Top Courses */}
        <section className="rounded-xl3 bg-surface shadow-card overflow-hidden">
          <div className="border-b border-border bg-canvas/30 px-6 py-4">
            <h2 className="font-bold">Top Performing Courses</h2>
          </div>
          <div className="divide-y divide-border">
            {["Introduction to React", "Advanced Machine Learning", "Python Data Science"].map((title, i) => (
              <div key={i} className="flex items-center justify-between p-5 hover:bg-canvas/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="font-display font-bold text-ink/40 w-4 text-right">{i + 1}</div>
                  <div>
                    <p className="font-bold text-ink text-sm">{title}</p>
                    <p className="text-xs text-ink/50 mt-0.5">{120 - i * 30} active students</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-success">{92 - i * 4}%</p>
                  <p className="text-[10px] font-bold text-ink/40 uppercase tracking-wide">Completion</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
