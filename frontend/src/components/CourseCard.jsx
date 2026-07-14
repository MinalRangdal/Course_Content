import { motion } from "framer-motion";
import { Layers, Users, Star } from "lucide-react";
import ProgressBar from "./ProgressBar";

const difficultyColor = {
  Beginner: "bg-success/15 text-success-dark",
  Intermediate: "bg-gold/20 text-gold-dark",
  Advanced: "bg-primary/15 text-primary-dark",
};

const difficultyGradient = {
  Beginner: "from-success-light/20 to-success/5",
  Intermediate: "from-gold-light/20 to-gold/5",
  Advanced: "from-primary-light/20 to-primary/5",
};

export default function CourseCard({ course, onClick, showProgress = false }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      className="group flex w-full flex-col overflow-hidden rounded-xl3 bg-surface text-left shadow-card transition-all duration-200 hover:shadow-elevated"
    >
      {/* Thumbnail Area */}
      <div className={`relative flex h-32 w-full items-center justify-center bg-gradient-to-br ${difficultyGradient[course.difficulty]}`}>
        <div className="absolute left-4 top-4">
          <span className={`rounded-lg px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase ${difficultyColor[course.difficulty]}`}>
            {course.difficulty}
          </span>
        </div>
        <div className="text-5xl transition-transform duration-300 group-hover:scale-110">
          {course.icon}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg font-bold leading-snug text-ink line-clamp-2">{course.title}</h3>
        
        <div className="mt-1 flex items-center gap-1.5 text-xs text-ink/50">
          <span className="font-medium">Subhanu AI</span>
          <span>•</span>
          <div className="flex items-center text-gold-dark font-bold">
            <Star size={12} fill="currentColor" className="mr-0.5" /> 4.8
          </div>
        </div>

        <div className="mt-4 flex items-center gap-4 text-xs font-semibold text-ink/50">
          <span className="flex items-center gap-1.5"><Layers size={14} className="text-ink/40" /> {course.modulesCount} modules</span>
          <span className="flex items-center gap-1.5"><Users size={14} className="text-ink/40" /> {(course.studentsEnrolled || 0).toLocaleString()} enrolled</span>
        </div>

        {showProgress && (
          <div className="mt-5">
            <ProgressBar value={course.progress} color="primary" showLabel />
          </div>
        )}
      </div>
    </motion.button>
  );
}