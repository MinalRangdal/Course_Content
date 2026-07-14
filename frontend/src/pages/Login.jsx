import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Lock, Sparkles, LogIn, ArrowLeft } from "lucide-react";
import Input from "../components/Input";
import Button from "../components/Button";
import { useAuth } from "../hooks/useAuth";
import { login } from "../services/api";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { signIn } = useAuth();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { user } = await login(email, password);
      signIn(user);
      navigate(user.role === "admin" ? "/admin/dashboard" : "/student/dashboard");
    } catch (err) {
      setError(err.message || "Unable to log in with those credentials.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen md:grid-cols-2 bg-canvas">
      {/* Visual Side */}
      <div className="relative hidden flex-col justify-between bg-sidebar p-12 text-white md:flex overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-primary via-transparent to-transparent" />
        
        <Link to="/" className="relative z-10 flex items-center gap-2 text-white/70 hover:text-white transition-colors w-fit">
          <ArrowLeft size={16} /> Back to website
        </Link>

        <div className="relative z-10 max-w-md">
          <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} className="text-7xl mb-8">
            🚀
          </motion.div>
          <h2 className="text-4xl font-extrabold leading-tight tracking-tight">Pick up where you left off.</h2>
          <p className="mt-4 text-lg text-white/50">Your AI-generated learning path is waiting for you.</p>
        </div>

        <div className="relative z-10 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
            <Sparkles size={14} />
          </div>
          <span className="font-display font-bold">Subhanu AI Academy</span>
        </div>
      </div>

      {/* Form Side */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <Link to="/" className="md:hidden flex items-center gap-2 text-ink/50 hover:text-ink mb-8 text-sm font-bold w-fit">
            <ArrowLeft size={16} /> Back
          </Link>

          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="rounded-xl4 bg-surface p-8 sm:p-10 shadow-elevated border border-border"
          >
            <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
            <p className="mt-2 text-ink/60">Log in to your account to continue learning.</p>

            <div className="mt-8 space-y-5">
              <Input label="Email address" type="email" icon={Mail} placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <Input label="Password" type="password" icon={Lock} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>

            {error ? (
              <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-600">
                {error}
              </motion.p>
            ) : null}

            <Button type="submit" fullWidth className="mt-8 shadow-pop" icon={LogIn} disabled={loading}>
              {loading ? "Signing in…" : "Sign in to account"}
            </Button>

            <div className="mt-8 text-center text-sm font-semibold text-ink/60">
              Don't have an account? <Link to="/register" className="text-primary hover:text-primary-dark transition-colors">Sign up</Link>
            </div>
          </motion.form>
        </div>
      </div>
    </div>
  );
}
