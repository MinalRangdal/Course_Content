import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Wand2, Target, CheckCircle2, ShieldCheck } from "lucide-react";
import Input from "../../components/Input";
import Button from "../../components/Button";
import { useToast } from "../../components/Toast";
import { generateCourse } from "../../services/api";

const generationStages = [
  { label: "Checking the official CBSE curriculum", detail: "Verifying the Class IX Artificial Intelligence syllabus before planning lessons", progress: 8 },
  { label: "Creating Module 1", detail: "Building the foundation and its lessons", progress: 28, module: 1 },
  { label: "Creating Module 2", detail: "Adding the next concepts, examples, and practice", progress: 52, module: 2 },
  { label: "Creating Module 3", detail: "Completing advanced learning and application", progress: 76, module: 3 },
  { label: "Checking quizzes and resources", detail: "Finalizing the curriculum for review", progress: 94 },
];

export default function GenerateCourse() {
  const [step, setStep] = useState(1);
  const [topic, setTopic] = useState("");
  const [cbseClassNineAi, setCbseClassNineAi] = useState(false);
  const [difficulty, setDifficulty] = useState("Beginner");
  const [generating, setGenerating] = useState(false);
  const [generationStage, setGenerationStage] = useState(0);
  const [completedModules, setCompletedModules] = useState(0);
  const navigate = useNavigate();
  const { addToast } = useToast();

  useEffect(() => {
    if (!generating) { setGenerationStage(0); setCompletedModules(0); return undefined; }
    const timers = generationStages.slice(1).map((_, index) => window.setTimeout(
      () => {
        setGenerationStage(index + 1);
        // The model returns the full validated course at the end of its
        // request, so these are clear estimated progress updates while it is
        // working rather than claiming a partial course is already saved.
        setCompletedModules(Math.min(index, 3));
      }, (index + 1) * 7000,
    ));
    return () => timers.forEach(window.clearTimeout);
  }, [generating]);

  async function handleGenerate() {
    // The CBSE option deliberately locks and clears the free-text topic, so
    // it is a valid generation path even when `topic` is empty.
    if ((!topic.trim() && !cbseClassNineAi) || generating) return;
    setGenerating(true);
    try {
      const courseTopic = cbseClassNineAi ? "CBSE Class IX Artificial Intelligence (417)" : topic.trim();
      const newCourse = await generateCourse(
        courseTopic,
        difficulty,
        cbseClassNineAi ? "cbse_class_9_artificial_intelligence_417" : null,
      );
      setCompletedModules(3);
      setGenerationStage(generationStages.length - 1);
      if (newCourse.generationNotice) addToast(newCourse.generationNotice, "info");
      navigate(`/admin/review/${newCourse.id}`);
    } catch (error) {
      addToast(error.message || "Unable to generate the curriculum. Please try again.", "info");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Create a Course with AI</h1>
        <p className="mt-2 text-ink/60 text-balance">
          Enter a topic and target audience. Our AI will generate a complete curriculum, lessons, and quizzes in seconds.
        </p>
      </div>

      <div className="rounded-xl4 bg-surface p-8 shadow-card border border-border">
        {/* Stepper */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-full font-bold transition-colors ${step >= 1 ? "bg-primary text-white" : "bg-canvas text-ink/40"}`}>1</div>
            <span className={`font-semibold ${step >= 1 ? "text-ink" : "text-ink/40"}`}>Topic</span>
          </div>
          <div className={`h-1 flex-1 mx-4 rounded-full transition-colors ${step >= 2 ? "bg-primary" : "bg-border"}`} />
          <div className="flex items-center gap-3">
            <span className={`font-semibold ${step >= 2 ? "text-ink" : "text-ink/40"}`}>Difficulty</span>
            <div className={`flex h-10 w-10 items-center justify-center rounded-full font-bold transition-colors ${step >= 2 ? "bg-primary text-white" : "bg-canvas text-ink/40"}`}>2</div>
          </div>
        </div>

        <div className="min-h-[200px]">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                <Input
                  label="What should the course be about?"
                  placeholder="e.g. Introduction to Python"
                  icon={Target}
                  value={cbseClassNineAi ? "CBSE Class IX Artificial Intelligence (417)" : topic}
                  onChange={(e) => setTopic(e.target.value)}
                  disabled={cbseClassNineAi}
                  className="py-4 text-lg"
                />
                <label className={`mt-5 flex cursor-pointer gap-3 rounded-xl2 border-2 p-4 transition-colors ${cbseClassNineAi ? "border-primary bg-primary-50" : "border-border hover:bg-canvas"}`}>
                  <input type="checkbox" checked={cbseClassNineAi} onChange={(e) => setCbseClassNineAi(e.target.checked)} className="mt-1 h-4 w-4 accent-primary" />
                  <span><span className="flex items-center gap-2 font-semibold"><ShieldCheck size={18} className="text-primary" /> CBSE Class IX Artificial Intelligence (417)</span><span className="mt-1 block text-sm text-ink/60">Locks generation to the latest official Class 9 AI syllabus, with ordered modules, visual flowcharts, quizzes, and lesson videos.</span></span>
                </label>
                <Button fullWidth size="lg" className="mt-8" disabled={!topic.trim() && !cbseClassNineAi} onClick={() => setStep(2)}>
                  Next Step
                </Button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                {generating ? <div className="flex min-h-[250px] flex-col justify-center rounded-xl3 bg-canvas p-6" aria-live="polite"><div className="flex items-center justify-between"><p className="font-bold">{generationStages[generationStage].label}</p><span className="text-sm font-bold text-primary">{generationStages[generationStage].progress}%</span></div><div className="mt-4 h-3 overflow-hidden rounded-full bg-border"><motion.div className="h-full rounded-full bg-primary" initial={false} animate={{ width: `${generationStages[generationStage].progress}%` }} transition={{ duration: 0.6 }} /></div><p className="mt-4 text-sm text-ink/60">{generationStages[generationStage].detail}</p><div className="mt-8 space-y-3">{[1, 2, 3].map((moduleNumber) => { const stageIndex = moduleNumber; const isComplete = completedModules >= moduleNumber; const isActive = !isComplete && generationStage === stageIndex; return <div key={moduleNumber} className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm ${isComplete || isActive ? "bg-surface text-ink" : "text-ink/35"}`}><span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${isComplete ? "bg-success text-white" : isActive ? "bg-primary text-white" : "bg-border"}`}>{isComplete ? "✓" : moduleNumber}</span><span className="font-semibold">Module {moduleNumber}</span><span className="ml-auto text-xs">{isComplete ? "Created" : isActive ? "Being created…" : "Waiting"}</span></div>; })}</div><p className="mt-6 text-xs text-ink/45">Progress is estimated while AI writes and validates the complete course. Please keep this page open.</p></div> : <><div className="space-y-4">
                  <p className="mb-2 text-sm font-semibold text-ink/80">Select target difficulty</p>
                  {["Beginner", "Intermediate", "Advanced"].map((level) => (
                    <label key={level} className={`flex cursor-pointer items-center gap-4 rounded-xl2 border-2 p-4 transition-colors ${difficulty === level ? "border-primary bg-primary-50" : "border-border hover:bg-canvas"}`}>
                      <input type="radio" name="difficulty" value={level} checked={difficulty === level} onChange={() => setDifficulty(level)} className="h-5 w-5 accent-primary" />
                      <span className="font-semibold">{level}</span>
                      {difficulty === level && <CheckCircle2 className="ml-auto text-primary" size={20} />}
                    </label>
                  ))}
                </div>
                <div className="mt-8 flex gap-4">
                  <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
                  <Button fullWidth size="lg" icon={Wand2} onClick={handleGenerate} disabled={generating}>
                    {generating ? "Generating curriculum…" : "Generate Course"}
                  </Button>
                </div></>}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
