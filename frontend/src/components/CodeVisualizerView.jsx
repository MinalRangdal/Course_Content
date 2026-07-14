import { useState } from "react";
import { Wand2, Loader2 } from "lucide-react";
import { visualizeCode } from "../services/api";
import StepAnimator from "./StepAnimator";

const DEFAULT_CODE = `for i in range(3):\n    move_forward()`;

/**
 * Shared "code step visualizer": paste a small code snippet, the backend
 * extracts how many discrete steps it takes, and we animate a bus moving
 * that many steps. Rendered from both pages/admin/CodeVisualizer.jsx and
 * pages/student/CodeVisualizer.jsx.
 */
export default function CodeVisualizerView() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [result, setResult] = useState({ steps: 3, unit: "iteration", summary: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleVisualize = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError("");
    try {
      const data = await visualizeCode(code);
      setResult(data);
    } catch (err) {
      setError(err.message || "Could not analyze that code snippet.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold text-ink">Code step visualizer</h1>
      <p className="mt-1 text-sm text-ink/50">
        Paste a short snippet with a loop or a step count, and watch it animate step by step.
      </p>

      <div className="mt-6 rounded-xl3 border border-border bg-surface p-4 shadow-card">
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          rows={6}
          spellCheck={false}
          className="w-full resize-none rounded-xl border border-border bg-canvas p-3 font-mono text-[13px] text-ink outline-none focus:border-primary"
        />
        <button
          onClick={handleVisualize}
          disabled={loading}
          className="mt-3 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-primary-dark disabled:opacity-50"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
          {loading ? "Analyzing..." : "Visualize"}
        </button>
        {error && <p className="mt-2 text-[13px] text-red-500">{error}</p>}
      </div>

      <div className="mt-6">
        <StepAnimator steps={result.steps} unit={result.unit} summary={result.summary} />
      </div>
    </div>
  );
}