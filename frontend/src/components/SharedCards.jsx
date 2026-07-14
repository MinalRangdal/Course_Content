import { motion } from "framer-motion";

export function RoleCard({ icon: Icon, title, description, selected, onClick }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      className={`flex flex-1 flex-col items-center gap-3 rounded-xl3 border-2 p-6 text-center transition-all duration-200 ${
        selected ? "border-primary bg-primary-50 shadow-glow" : "border-border bg-surface shadow-card hover:border-primary/30 hover:shadow-elevated"
      }`}
    >
      <div className={`flex h-14 w-14 items-center justify-center rounded-2xl transition-colors ${selected ? "bg-primary text-white shadow-soft" : "bg-canvas text-ink/60"}`}>
        <Icon size={26} strokeWidth={selected ? 2.5 : 2} />
      </div>
      <div>
        <p className={`font-display text-lg font-bold ${selected ? "text-primary-dark" : "text-ink"}`}>{title}</p>
        <p className="mt-1 text-[13px] text-ink/60">{description}</p>
      </div>
    </motion.button>
  );
}

export function StatCard({ icon: Icon, label, value, accent = "primary", delay = 0 }) {
  const accents = {
    primary: "stat-accent-primary bg-primary/5 text-primary",
    gold: "stat-accent-gold bg-gold/10 text-gold-dark",
    success: "stat-accent-success bg-success/10 text-success-dark",
    ink: "stat-accent-ink bg-black/5 text-ink/70",
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      whileHover={{ y: -4 }}
      className={`rounded-xl3 bg-surface p-5 shadow-card transition-shadow hover:shadow-elevated ${accents[accent].split(" ")[0]}`}
    >
      <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${accents[accent].substring(accents[accent].indexOf(" ") + 1)}`}>
        <Icon size={20} />
      </div>
      <p className="font-display text-3xl font-bold tracking-tight text-ink">{value}</p>
      <p className="mt-1 text-sm font-semibold text-ink/50">{label}</p>
    </motion.div>
  );
}
