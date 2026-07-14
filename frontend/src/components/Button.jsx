import { motion } from "framer-motion";

const variants = {
  primary: "bg-primary text-white shadow-soft hover:bg-primary-dark",
  gold: "bg-gold text-ink shadow-gold hover:bg-gold-dark",
  success: "bg-success text-white hover:bg-success-dark",
  outline: "bg-surface text-primary border-2 border-primary hover:bg-primary-50",
  ghost: "bg-transparent text-ink hover:bg-black/5",
  danger: "bg-surface text-red-500 border-2 border-red-200 hover:bg-red-50",
};

const sizes = {
  sm: "px-4 py-2 text-sm",
  md: "px-6 py-3 text-[15px]",
  lg: "px-8 py-4 text-base",
};

export default function Button({
  children,
  variant = "primary",
  size = "md",
  icon: Icon,
  iconRight,
  fullWidth = false,
  disabled = false,
  className = "",
  ...props
}) {
  return (
    <motion.button
      whileHover={disabled ? {} : { scale: 1.03 }}
      whileTap={disabled ? {} : { scale: 0.97 }}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl font-semibold font-body transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${fullWidth ? "w-full" : ""} ${className}`}
      {...props}
    >
      {Icon && !iconRight && <Icon size={18} strokeWidth={2.4} />}
      {children}
      {Icon && iconRight && <Icon size={18} strokeWidth={2.4} />}
    </motion.button>
  );
}
