import { motion } from "framer-motion";
import { Flame, Star, Trophy, Lock } from "lucide-react";

export function XPCard({ streak, xp, level }) {
  const items = [
    { icon: Flame, label: "Streak", value: `${streak} Days`, color: "text-orange-500 bg-orange-50" },
    { icon: Star, label: "Total XP", value: xp.toLocaleString(), color: "text-gold-dark bg-gold/15" },
    { icon: Trophy, label: "Current Level", value: level, color: "text-primary bg-primary-50" },
  ];
  return (
    <div className="flex flex-wrap gap-3">
      {items.map(({ icon: Icon, label, value, color }) => (
        <motion.div
          key={label}
          whileHover={{ y: -2 }}
          className="flex flex-1 items-center gap-3 rounded-2xl bg-canvas p-3 border border-border"
        >
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
            <Icon size={20} />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-ink/40">{label}</p>
            <p className="text-[15px] font-bold text-ink">{value}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export function BadgeCard({ badge }) {
  const isEarned = Boolean(badge.earned);

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className={`relative flex flex-col items-center gap-3 rounded-xl3 border p-5 text-center transition-all ${
        isEarned 
          ? "border-transparent bg-surface shadow-card hover:shadow-elevated" 
          : "border-border bg-canvas/50"
      }`}
    >
      {isEarned && (
        <div className="absolute inset-0 rounded-xl3 rounded-xl3 p-[1px] bg-gradient-to-br from-gold/40 via-gold/10 to-transparent" style={{ WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)", WebkitMaskComposite: "xor", maskComposite: "exclude" }} />
      )}
      
      <div className="flex items-center gap-2">
        <motion.div 
          animate={isEarned ? { y: [0, -4, 0] } : {}}
          transition={isEarned ? { duration: 2.5, repeat: Infinity, ease: "easeInOut" } : {}}
          className={`text-5xl ${!isEarned && "opacity-40 grayscale"}`}
        >
          {badge.icon}
        </motion.div>
      </div>

      <div>
        <p className={`text-[15px] font-bold ${!isEarned && "text-ink/60"}`}>{badge.name}</p>
        <p className="mt-1 text-xs text-ink/50">{badge.description}</p>
        <p className={`mt-2 text-[11px] font-bold ${isEarned ? "text-success" : "text-ink/40"}`}>
          {isEarned ? "Unlocked" : badge.goal}
        </p>
      </div>

      {!isEarned && (
        <div className="absolute right-3 top-3 text-ink/20">
          <Lock size={14} />
        </div>
      )}
    </motion.div>
  );
}

export function LeaderboardCard({ entry }) {
  const medal = { 1: "🥇", 2: "🥈", 3: "🥉" }[entry.rank];
  const badges = Array.isArray(entry.badges) ? entry.badges.slice(0, 2) : [];

  return (
    <motion.div
      whileHover={{ x: 4 }}
      className={`flex items-center gap-4 rounded-2xl px-5 py-3.5 transition-shadow ${
        entry.isCurrentUser ? "bg-primary text-white shadow-glow" : "bg-surface shadow-card hover:shadow-elevated"
      }`}
    >
      <div className={`w-8 text-center font-display text-lg font-bold ${entry.isCurrentUser ? "text-white" : "text-ink/40"}`}>
        {medal || entry.rank}
      </div>
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-canvas text-xl">
        {entry.avatar}
      </div>
      <div className="flex-1">
        <div className="font-bold">{entry.name}</div>
        <div className="mt-1 flex flex-wrap gap-1.5">
          <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${entry.isCurrentUser ? "bg-surface/20 text-white" : "bg-gold/15 text-gold-dark"}`}>Lv {entry.level}</span>
          {badges.map((badge) => (
            <span key={badge} className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${entry.isCurrentUser ? "bg-surface/20 text-white" : "bg-canvas text-ink/60"}`}>{badge}</span>
          ))}
        </div>
      </div>
      <div className={`flex items-center gap-1.5 font-bold ${entry.isCurrentUser ? "text-white" : "text-gold-dark"}`}>
        <Star size={16} fill="currentColor" className={entry.isCurrentUser ? "text-white/80" : "text-gold"} /> 
        {entry.xp.toLocaleString()}
      </div>
    </motion.div>
  );
}
