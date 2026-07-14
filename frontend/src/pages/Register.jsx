import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { User, Mail, Lock, GraduationCap, Shield, UserPlus, KeyRound, ArrowLeft, Sparkles } from "lucide-react";
import Input from "../components/Input";
import Button from "../components/Button";
import { RoleCard } from "../components/SharedCards";
import { useAuth } from "../hooks/useAuth";
import { register } from "../services/api";

export default function Register() {
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "student", adminCode: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { signIn } = useAuth();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { user } = await register(form);
      signIn(user);
      navigate(user.role === "admin" ? "/admin/dashboard" : "/student/dashboard");
    } catch (err) {
      setError(err.message || "Unable to create your account right now.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-canvas p-6 md:p-12 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 -mr-40 -mt-40 h-[600px] w-[600px] rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 h-[400px] w-[400px] rounded-full bg-gold/5 blur-3xl" />

      <div className="relative z-10 w-full max-w-7xl mx-auto flex items-center justify-between mb-8">
        <Link to="/" className="flex items-center gap-2 text-ink/50 hover:text-ink transition-colors font-bold text-sm">
          <ArrowLeft size={16} /> Back to website
        </Link>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
            <Sparkles size={14} />
          </div>
          <span className="font-display font-bold text-ink">Subhanu AI Academy</span>
        </div>
      </div>

      <div className="relative z-10 flex flex-1 items-center justify-center">
        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-lg rounded-xl4 bg-surface p-8 sm:p-10 shadow-elevated border border-border"
        >
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold tracking-tight">Create your account</h1>
            <p className="mt-2 text-ink/60">Join Subhanu AI Academy and start your learning journey today.</p>
          </div>

          <div className="flex gap-4">
            <RoleCard
              icon={GraduationCap}
              title="Learner"
              description="Learn from AI courses"
              selected={form.role === "student"}
              onClick={() => setForm({ ...form, role: "student" })}
            />
            <RoleCard
              icon={Shield}
              title="Educator"
              description="Create & manage courses"
              selected={form.role === "admin"}
              onClick={() => setForm({ ...form, role: "admin" })}
            />
          </div>

          <div className="mt-8 space-y-5">
            <Input label="Full name" icon={User} placeholder="Jane Doe" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <Input label="Email address" type="email" icon={Mail} placeholder="jane@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            <Input label="Password" type="password" icon={Lock} placeholder="Create a strong password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            
            <AnimatePresence>
              {form.role === "admin" && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className="pt-2">
                    <Input
                      label="Admin access code"
                      icon={KeyRound}
                      placeholder="Enter the shared admin access code"
                      value={form.adminCode}
                      onChange={(e) => setForm({ ...form, adminCode: e.target.value })}
                      required
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {error ? (
            <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-600">
              {error}
            </motion.p>
          ) : null}

          <Button type="submit" fullWidth className="mt-8 shadow-pop" icon={UserPlus} disabled={loading}>
            {loading ? "Creating account…" : "Create account"}
          </Button>

          <div className="mt-8 text-center text-sm font-semibold text-ink/60">
            Already have an account? <Link to="/login" className="text-primary hover:text-primary-dark transition-colors">Sign in</Link>
          </div>
        </motion.form>
      </div>
    </div>
  );
}
