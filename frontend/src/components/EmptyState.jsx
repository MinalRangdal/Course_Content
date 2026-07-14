import { motion } from "framer-motion";
import Button from "./Button";

export default function EmptyState({ icon: Icon, title, description, actionLabel, onAction }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center rounded-xl3 bg-surface p-10 text-center shadow-card"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-canvas text-primary">
        {Icon && <Icon size={28} />}
      </div>
      <h3 className="mt-5 text-lg font-bold text-ink">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-ink/60">{description}</p>
      
      {actionLabel && onAction && (
        <div className="mt-6">
          <Button onClick={onAction}>{actionLabel}</Button>
        </div>
      )}
    </motion.div>
  );
}
