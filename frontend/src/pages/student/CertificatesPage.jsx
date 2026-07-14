import { Award } from "lucide-react";
import EmptyState from "../../components/EmptyState";

export default function CertificatesPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 h-[calc(100vh-12rem)] flex flex-col">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">Achievements</p>
        <h1 className="mt-1 text-3xl font-bold">Certificates</h1>
      </div>

      <div className="flex-1 rounded-xl4 bg-surface shadow-card overflow-hidden flex flex-col items-center justify-center p-8">
        <EmptyState
          icon={Award}
          title="No certificates yet"
          description="Complete a course 100% to earn a certificate of completion."
        />
      </div>
    </div>
  );
}
