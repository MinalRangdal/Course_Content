import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import { LeaderboardCard } from "../../components/GamificationCards";
import { SkeletonRow } from "../../components/LoadingSkeleton";
import { getLeaderboard } from "../../services/api";

export default function Leaderboard() {
  const [board, setBoard] = useState(null);

  useEffect(() => {
    getLeaderboard().then(setBoard);
  }, []);

  if (!board) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="h-10 w-48 rounded-xl skeleton" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      </div>
    );
  }

  const topThree = board.slice(0, 3);
  const rest = board.slice(3);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gold/15 text-gold-dark">
          <Trophy size={32} />
        </div>
        <h1 className="text-3xl font-bold">Global Leaderboard</h1>
        <p className="mt-2 text-[15px] text-ink/60">Compete with learners worldwide. Top 3 win special badges this week.</p>
      </div>

      {/* Podium for top 3 */}
      {topThree.length > 0 && (
        <div className="mb-12 mt-8 flex items-end justify-center gap-2 sm:gap-4 h-64">
          {/* Rank 2 */}
          {topThree[1] && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex flex-col items-center w-24 sm:w-32">
              <div className="mb-3 flex flex-col items-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface shadow-card text-2xl">{topThree[1].avatar}</div>
                <p className="mt-2 text-xs font-bold text-ink truncate w-full text-center">{topThree[1].name.split(" ")[0]}</p>
                <p className="text-[10px] font-bold text-ink/40">{topThree[1].xp.toLocaleString()} XP</p>
              </div>
              <div className="h-32 w-full rounded-t-xl bg-gradient-to-t from-gray-200 to-gray-100 flex justify-center pt-2 border border-gray-300">
                <span className="text-xl font-bold text-gray-400">2</span>
              </div>
            </motion.div>
          )}

          {/* Rank 1 */}
          {topThree[0] && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center w-28 sm:w-36 z-10">
              <div className="mb-3 flex flex-col items-center relative">
                <div className="absolute -top-6 text-2xl animate-floaty">👑</div>
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface ring-4 ring-gold shadow-glow text-3xl">{topThree[0].avatar}</div>
                <p className="mt-2 text-sm font-bold text-ink truncate w-full text-center">{topThree[0].name.split(" ")[0]}</p>
                <p className="text-[11px] font-bold text-gold-dark">{topThree[0].xp.toLocaleString()} XP</p>
              </div>
              <div className="h-40 w-full rounded-t-xl bg-gradient-to-t from-gold/30 to-gold/10 flex justify-center pt-2 border border-gold/40 shadow-[0_-4px_16px_rgba(245,166,35,0.15)]">
                <span className="text-2xl font-bold text-gold-dark">1</span>
              </div>
            </motion.div>
          )}

          {/* Rank 3 */}
          {topThree[2] && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex flex-col items-center w-24 sm:w-32">
              <div className="mb-3 flex flex-col items-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface shadow-card text-2xl">{topThree[2].avatar}</div>
                <p className="mt-2 text-xs font-bold text-ink truncate w-full text-center">{topThree[2].name.split(" ")[0]}</p>
                <p className="text-[10px] font-bold text-ink/40">{topThree[2].xp.toLocaleString()} XP</p>
              </div>
              <div className="h-24 w-full rounded-t-xl bg-gradient-to-t from-orange-200/60 to-orange-100/50 flex justify-center pt-2 border border-orange-200">
                <span className="text-xl font-bold text-orange-400">3</span>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Rest of the leaderboard */}
      <div className="rounded-xl4 bg-surface p-2 shadow-card">
        <div className="space-y-1">
          {rest.map((entry, index) => (
            <LeaderboardCard key={entry.id} entry={entry} />
          ))}
        </div>
      </div>
    </div>
  );
}
