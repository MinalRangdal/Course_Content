import { useState, useRef, useEffect } from "react";
import { Bus, Play, RotateCcw } from "lucide-react";

/**
 * Animates an icon (default: a bus) moving `steps` discrete steps across a
 * track, one step at a time. Used by the "code step visualizer" feature on
 * both the admin and student dashboards - see CodeVisualizerView.jsx.
 *
 * Props:
 *   steps   - number of steps to animate (1-12)
 *   unit    - label for one step, e.g. "iteration" (defaults to "step")
 *   summary - short description shown under the track
 */
export default function StepAnimator({ steps = 2, unit = "step", summary = "" }) {
  const clampedSteps = Math.max(1, Math.min(12, steps || 1));
  const [current, setCurrent] = useState(0);
  const [running, setRunning] = useState(false);
  const timers = useRef([]);

  useEffect(() => {
    return () => timers.current.forEach(clearTimeout);
  }, []);

  const reset = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setCurrent(0);
    setRunning(false);
  };

  const run = () => {
    reset();
    setRunning(true);
    for (let i = 1; i <= clampedSteps; i++) {
      const t = setTimeout(() => {
        setCurrent(i);
        if (i === clampedSteps) setRunning(false);
      }, i * 650);
      timers.current.push(t);
    }
  };

  // Reset the animation whenever a new step count comes in.
  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps]);

  const leftPercent = clampedSteps === 0 ? 0 : (current / clampedSteps) * 100;

  return (
    <div className="rounded-xl3 border border-border bg-surface p-5 shadow-card">
      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={run}
          disabled={running}
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-[13px] font-semibold text-white transition disabled:opacity-50"
        >
          <Play size={14} /> Run
        </button>
        <button
          onClick={reset}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-[13px] font-semibold text-ink/70 transition hover:bg-primary-50"
        >
          <RotateCcw size={14} /> Reset
        </button>
      </div>

      <div className="relative h-[72px]">
        {/* track */}
        <div className="absolute left-3 right-3 top-[50px] h-[2px] bg-border" />
        {/* step markers */}
        <div className="absolute left-3 right-3 top-[44px] flex justify-between">
          {Array.from({ length: clampedSteps + 1 }).map((_, i) => (
            <div
              key={i}
              className={`h-2 w-2 rounded-full transition-colors ${
                i <= current ? "bg-primary" : "bg-border"
              }`}
            />
          ))}
        </div>
        {/* moving icon */}
        <div
          className="absolute top-1 text-primary transition-all duration-500 ease-out"
          style={{ left: `calc(12px + (100% - 24px) * ${leftPercent / 100})` }}
        >
          <Bus size={26} />
        </div>
      </div>

      <p className="mt-2 text-[13px] text-ink/50">
        {current} of {clampedSteps} {unit}
        {clampedSteps === 1 ? "" : "s"}
      </p>
      {summary && <p className="mt-1 text-[13px] text-ink/50">{summary}</p>}
    </div>
  );
}