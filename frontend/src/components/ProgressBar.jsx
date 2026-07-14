import { motion } from "framer-motion";

export default function ProgressBar({ value = 0, color = "primary", height = "h-2", showLabel = false }) {
  const colors = {
    primary: "bg-primary",
    success: "bg-success",
    gold: "bg-gold",
    gradient: "bg-gradient-to-r from-primary to-success",
  };
  
  return (
    <div className="w-full">
      {showLabel && (
        <div className="mb-1.5 flex justify-end">
          <span className="text-[11px] font-bold text-ink/50">{Math.round(value)}% completed</span>
        </div>
      )}
      <div className={`w-full ${height} rounded-full bg-border overflow-hidden`}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className={`h-full rounded-full ${colors[color]}`}
        />
      </div>
    </div>
  );
}
