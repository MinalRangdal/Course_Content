import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, Wand2, Trophy, Zap, ShieldCheck } from "lucide-react";
import Button from "../components/Button";

export default function Landing() {
  return (
    <div className="min-h-screen bg-canvas overflow-hidden">
      {/* Navbar */}
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl2 bg-primary text-white shadow-soft">
            <Sparkles size={20} />
          </div>
          <span className="font-display text-xl font-bold tracking-tight">Subhanu AI</span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/login" className="text-sm font-bold text-ink/70 hover:text-ink transition-colors">Log in</Link>
          <Link to="/register"><Button size="sm">Get started</Button></Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative mx-auto max-w-7xl px-6 pt-20 pb-32">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="relative z-10">
            <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-bold text-primary-dark">
              <Wand2 size={14} /> AI-Powered Education Platform
            </span>
            <h1 className="text-5xl font-extrabold leading-[1.1] tracking-tight md:text-6xl lg:text-7xl text-balance">
              Create smarter courses with <span className="text-primary relative inline-block">
                AI.
                <motion.span 
                  animate={{ rotate: [0, 10, -10, 0] }} 
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }} 
                  className="absolute -right-12 -top-6 text-4xl"
                >✨</motion.span>
              </span>
            </h1>
            <p className="mt-6 text-lg text-ink/60 max-w-xl leading-relaxed">
              Transform any topic into a structured, interactive learning experience. 
              Built by artificial intelligence, verified by human experts.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link to="/register"><Button size="lg" icon={Sparkles} className="shadow-pop">Start learning free</Button></Link>
              <Link to="/login"><Button size="lg" variant="ghost">View demo</Button></Link>
            </div>
            
            <div className="mt-12 flex items-center gap-8 text-sm font-bold text-ink/40">
              <span className="flex items-center gap-2"><Zap size={16}/> Instant Generation</span>
              <span className="flex items-center gap-2"><ShieldCheck size={16}/> Expert Reviewed</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative hidden lg:block"
          >
            {/* Abstract UI representation */}
            <div className="relative aspect-square w-full max-w-[500px] ml-auto">
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary/20 to-gold/20 blur-3xl animate-pulse" />
              
              <motion.div animate={{ y: [-10, 10, -10] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} className="absolute left-0 top-20 rounded-2xl bg-surface p-5 shadow-pop w-64 border border-border">
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary"><Trophy size={24}/></div>
                  <div>
                    <div className="h-2.5 w-20 bg-ink/20 rounded-full mb-2"/>
                    <div className="h-2 w-12 bg-ink/10 rounded-full"/>
                  </div>
                </div>
                <div className="h-1.5 w-full bg-canvas rounded-full overflow-hidden">
                  <div className="h-full bg-primary w-3/4 rounded-full"/>
                </div>
              </motion.div>

              <motion.div animate={{ y: [10, -10, 10] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }} className="absolute right-0 bottom-32 rounded-2xl bg-surface p-5 shadow-pop w-72 border border-border">
                <div className="flex justify-between items-end mb-4">
                  <div className="h-3 w-24 bg-ink/20 rounded-full"/>
                  <span className="text-2xl">🎓</span>
                </div>
                <div className="space-y-2">
                  <div className="h-2 w-full bg-ink/10 rounded-full"/>
                  <div className="h-2 w-5/6 bg-ink/10 rounded-full"/>
                  <div className="h-2 w-4/6 bg-ink/10 rounded-full"/>
                </div>
              </motion.div>
              
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-[120px] filter drop-shadow-2xl">🧠</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
