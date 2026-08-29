"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Plus, Trophy, Flame, Zap, Crown, Code2, Target, Star, Medal } from "lucide-react";

const ACHIEVEMENT_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  "first-submission": Code2,
  "10-problems": Target,
  "100-executions": Zap,
  "top-10": Crown,
  "streak-7": Flame,
  "streak-30": Medal,
  "perfect-score": Trophy,
  "all-easy": Star,
  "all-medium": Star,
  "all-hard": Star,
};

export default function AdminAchievementsPage() {
  const achievements = useQuery(api.achievements.listAchievements);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Achievements</h1>
          <p className="mt-1 text-sm text-slate-400">Manage platform achievements and badges</p>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#2563EB]">
          <Plus size={16} /> New Achievement
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {achievements?.map((ach) => {
          const Icon = ACHIEVEMENT_ICONS[ach.code] ?? Trophy;
          return (
            <div key={ach._id} className="rounded-xl border border-slate-700/50 bg-[#1E293B] p-5 transition-all hover:border-slate-600">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20">
                  <Icon size={24} className="text-amber-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-white">{ach.name}</h3>
                  <p className="mt-1 text-sm text-slate-400">{ach.description}</p>
                  <div className="mt-3 flex items-center gap-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${ach.isActive ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-500/20 text-slate-400"}`}>
                      {ach.isActive ? "Active" : "Inactive"}
                    </span>
                    <span className="text-xs text-slate-500">{ach.xpReward ?? 0} XP</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Default achievements reference */}
      <div className="rounded-xl border border-slate-700/50 bg-[#1E293B] p-5">
        <h3 className="text-lg font-semibold text-white">Achievement Ideas</h3>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Code2, name: "First Submission", desc: "Submit your first solution" },
            { icon: Target, name: "10 Problems Solved", desc: "Solve 10 problems" },
            { icon: Zap, name: "100 Executions", desc: "Run 100 code executions" },
            { icon: Crown, name: "Top 10", desc: "Reach top 10 leaderboard" },
          ].map((item) => (
            <div key={item.name} className="rounded-lg border border-slate-700/50 bg-slate-800/50 p-4">
              <item.icon size={20} className="text-amber-400" />
              <p className="mt-2 text-sm font-medium text-white">{item.name}</p>
              <p className="mt-1 text-xs text-slate-400">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

