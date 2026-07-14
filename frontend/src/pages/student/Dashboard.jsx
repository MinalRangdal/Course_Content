import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Zap, Target, BookOpen, Clock, Activity, Medal, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getStudentDashboard, getFriends } from "../../services/api";
import CourseCard from "../../components/CourseCard";
import EmptyState from "../../components/EmptyState";
import { SkeletonCard } from "../../components/LoadingSkeleton";

export default function StudentDashboard() {
  const [data, setData] = useState(null);
  const [friendsData, setFriendsData] = useState({ friends: [] });
  const navigate = useNavigate();

  useEffect(() => {
    getStudentDashboard().then(setData);
    getFriends().then(setFriendsData);
  }, []);

  if (!data) {
    return <div className="space-y-8"><div className="h-40 rounded-xl4 skeleton" /><div className="flex gap-4"><SkeletonCard /><SkeletonCard /></div></div>;
  }

  const { student, activeCourses, recommendedCourses } = data;

  return (
    <div className="space-y-10">
      
      {/* Top Profile Summary */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="col-span-1 sm:col-span-2 rounded-xl3 bg-primary text-white p-6 shadow-card flex items-center justify-between overflow-hidden relative">
          <div className="absolute right-0 top-0 w-32 h-32 bg-surface/10 rounded-full blur-2xl -mr-10 -mt-10" />
          <div className="relative z-10">
            <h2 className="text-2xl font-bold">Welcome, {student?.name}!</h2>
            <p className="mt-1 text-white/70">Ready to learn something new today?</p>
          </div>
          <div className="relative z-10 text-5xl">👋</div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rounded-xl3 bg-surface p-6 shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="font-bold text-ink">Level {student?.level}</span>
            <div className="bg-canvas p-2 rounded-xl text-ink/50"><Medal size={20} /></div>
          </div>
          <div>
            <div className="flex justify-between text-xs font-bold mb-2">
              <span className="text-primary">{student?.xp} XP</span>
              <span className="text-ink/40">{student?.xpToNextLevel} XP</span>
            </div>
            <div className="h-2 w-full bg-canvas rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(student?.xp / student?.xpToNextLevel) * 100}%` }} />
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="rounded-xl3 bg-surface p-6 shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="font-bold text-ink">Streak</span>
            <div className="bg-orange-50 p-2 rounded-xl text-orange-500"><Zap size={20} /></div>
          </div>
          <div>
            <p className="text-3xl font-display font-bold text-orange-500">{student?.streak} <span className="text-lg text-ink/40">days</span></p>
            <p className="text-xs text-ink/50 font-bold mt-1">Keep it up!</p>
          </div>
        </motion.div>
      </section>

      {/* Main Content Grid */}
      <div className="grid gap-8 lg:grid-cols-3">
        
        <div className="lg:col-span-2 space-y-10">
          <section>
            <div className="mb-4 flex items-center gap-2">
              <BookOpen size={20} className="text-primary" />
              <h2 className="text-xl font-bold">Continue Learning</h2>
            </div>
            {activeCourses.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {activeCourses.slice(0, 2).map((course) => (
                  <CourseCard key={course.id} course={course} onClick={() => navigate(`/student/course?id=${course.id}`)} actionLabel="Resume" showProgress />
                ))}
              </div>
            ) : (
              <EmptyState icon={Target} title="No active courses" description="You haven't started any courses yet." />
            )}
          </section>

          <section>
            <div className="mb-4 flex items-center gap-2">
              <Sparkles size={20} className="text-gold-dark" />
              <h2 className="text-xl font-bold">Recommended for you</h2>
            </div>
            {recommendedCourses.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {recommendedCourses.map((course) => (
                  <CourseCard key={course.id} course={course} onClick={() => navigate("/student/explore")} actionLabel="View Course" />
                ))}
              </div>
            ) : (
              <EmptyState icon={Activity} title="All caught up" description="No new recommendations right now." />
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-xl4 bg-surface p-6 shadow-card">
            <h2 className="font-bold mb-4">Friends Activity</h2>
            <div className="space-y-4">
              {friendsData.friends.length > 0 ? (
                friendsData.friends.slice(0, 4).map(f => (
                  <div key={f.id} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-canvas flex items-center justify-center text-lg">{f.avatar?.startsWith("data:image") ? <img src={f.avatar} alt="Avatar" className="w-full h-full object-cover rounded-full" /> : f.avatar}</div>
                    <div>
                      <p className="font-bold text-sm">{f.name}</p>
                      <p className="text-xs text-ink/50">Earned {f.xp} XP today</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-ink/50">Add friends to see their activity.</p>
              )}
            </div>
          </section>
        </div>

      </div>
    </div>
  );
}