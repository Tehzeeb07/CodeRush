import Premium3DBackground from "@/components/background/Premium3DBackground";

export const metadata = {
  title: "CodeRush — Premium 3D Background Demo",
};

/**
 * Demo page: shows the Premium3DBackground behind typical glassmorphism
 * dashboard cards so readability can be evaluated. The background itself
 * is a fixed, pointer-events-none layer (z-index -10) and can be dropped
 * into any page or layout.
 */
export default function BackgroundDemoPage() {
  return (
    <div className="relative min-h-screen">
      <Premium3DBackground />

      <div className="relative z-10 mx-auto max-w-6xl px-6 py-14">
        <header className="mb-12">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300/70">
            CodeRush
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-100">
            Developer Dashboard
          </h1>
          <p className="mt-2 max-w-xl text-sm text-slate-400">
            Premium animated 3D background — deep-space navy, floating code
            geometry, and a living node network, composed so every card stays
            readable.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { label: "Problems Solved", value: "1,284", accent: "text-cyan-300" },
            { label: "Acceptance Rate", value: "78.4%", accent: "text-violet-300" },
            { label: "Global Rank", value: "#312", accent: "text-amber-300" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/40 backdrop-blur-xl"
            >
              <p className="text-xs font-medium uppercase tracking-widest text-slate-400">
                {stat.label}
              </p>
              <p className={`mt-3 text-3xl font-semibold ${stat.accent}`}>{stat.value}</p>
              <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-cyan-400 to-violet-500" />
              </div>
            </div>
          ))}

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl shadow-black/40 backdrop-blur-xl sm:col-span-2 lg:col-span-2">
            <p className="text-xs font-medium uppercase tracking-widest text-slate-400">
              Recent Submissions
            </p>
            <div className="mt-4 space-y-3">
              {[
                ["Two Sum", "Accepted", "text-emerald-300"],
                ["Binary Tree LCA", "Accepted", "text-emerald-300"],
                ["Graph Coloring", "Wrong Answer", "text-rose-300"],
              ].map(([name, status, tone]) => (
                <div
                  key={name}
                  className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3"
                >
                  <span className="text-sm text-slate-200">{name}</span>
                  <span className={`text-xs font-medium ${tone}`}>{status}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl shadow-black/40 backdrop-blur-xl">
            <p className="text-xs font-medium uppercase tracking-widest text-slate-400">
              Streak
            </p>
            <p className="mt-3 text-3xl font-semibold text-slate-100">
              42 <span className="text-base font-normal text-slate-400">days</span>
            </p>
            <p className="mt-4 text-xs leading-relaxed text-slate-500">
              Keep solving to extend your streak and climb the global
              leaderboard.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
