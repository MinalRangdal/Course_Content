import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function Input({ label, icon: Icon, error, className = "", type = "text", ...props }) {
  const [showPassword, setShowPassword] = useState(false);
  const resolvedType = type === "password" && showPassword ? "text" : type;

  return (
    <label className="block w-full">
      {label && (
        <span className="mb-1.5 block text-sm font-semibold text-ink/80">{label}</span>
      )}
      <div className="relative">
        {Icon && (
          <Icon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/40" />
        )}
        <input
          type={resolvedType}
          className={`w-full rounded-2xl border-2 border-black/5 bg-surface py-3 ${Icon ? "pl-11" : "pl-4"} ${type === "password" ? "pr-11" : "pr-4"} text-[15px] outline-none transition-colors placeholder:text-ink/30 focus:border-primary ${error ? "border-red-300" : ""} ${className}`}
          {...props}
        />

        {type === "password" && (
          <button
            type="button"
            aria-label={showPassword ? "Hide password" : "Show password"}
            onClick={() => setShowPassword((current) => !current)}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-ink/50 transition hover:bg-black/5 hover:text-ink/80"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
      {error && <span className="mt-1 block text-xs font-medium text-red-500">{error}</span>}
    </label>
  );
}
