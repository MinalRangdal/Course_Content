import { motion } from "framer-motion";

export function SkeletonCard() {
  return (
    <div className="rounded-xl3 bg-surface p-5 shadow-card">
      <div className="flex items-start justify-between">
        <div className="h-12 w-12 rounded-2xl skeleton" />
        <div className="h-6 w-20 rounded-full skeleton" />
      </div>
      <div className="mt-5 h-6 w-3/4 rounded-lg skeleton" />
      <div className="mt-2 h-4 w-full rounded-lg skeleton" />
      <div className="mt-1 h-4 w-2/3 rounded-lg skeleton" />
      <div className="mt-5 flex gap-4">
        <div className="h-4 w-24 rounded-lg skeleton" />
        <div className="h-4 w-24 rounded-lg skeleton" />
      </div>
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-surface p-4 shadow-card">
      <div className="h-10 w-10 shrink-0 rounded-full skeleton" />
      <div className="flex-1">
        <div className="h-5 w-1/3 rounded-lg skeleton" />
        <div className="mt-2 h-3 w-1/4 rounded-lg skeleton" />
      </div>
      <div className="h-8 w-20 rounded-xl skeleton" />
    </div>
  );
}

export function SkeletonText({ lines = 3 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`h-4 rounded-lg skeleton ${
            i === lines - 1 ? "w-2/3" : "w-full"
          }`}
        />
      ))}
    </div>
  );
}
