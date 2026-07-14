import { motion } from "framer-motion";
import { Lock, Check } from "lucide-react";

export default function PathNode({ node, index, onClick }) {
  const isCompleted = node.status === "completed";
  const isActive = node.status === "active";
  const isLocked = node.status === "locked";
  const align = index % 2 === 0 ? "self-start" : "self-end";
  const statusLabel = isCompleted ? "Completed" : isActive ? "In progress" : isLocked ? "Locked" : "Ready";

  return (
    <div className={`flex flex-col items-center ${align} w-40`}>
      <motion.button
        onClick={!isLocked ? onClick : undefined}
        whileHover={!isLocked ? { scale: 1.08 } : {}}
        whileTap={!isLocked ? { scale: 0.95 } : {}}
        disabled={isLocked}
        className={`relative flex h-20 w-20 items-center justify-center rounded-full text-3xl shadow-card transition-shadow ${
          isCompleted
            ? "bg-success text-white"
            : isActive
            ? "bg-gold text-ink shadow-gold animate-floaty"
            : "bg-surface text-ink/30 grayscale"
        } ${isLocked ? "cursor-not-allowed" : "cursor-pointer"}`}
      >
        {isLocked ? <Lock size={24} /> : node.icon}
        {isCompleted && (
          <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-surface text-success shadow">
            <Check size={14} strokeWidth={3} />
          </span>
        )}
      </motion.button>
      <p className="mt-2 text-center text-sm font-bold">{node.title}</p>
      <p className="mt-1 rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-bold text-ink/60">{statusLabel}</p>
      <p className="mt-1 text-xs font-semibold text-gold-dark">+{node.xp} XP</p>
    </div>
  );
}
