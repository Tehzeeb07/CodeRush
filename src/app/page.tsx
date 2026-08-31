"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/* Stats strip content. Repeated 3x per half so a single half is wider than
   any viewport — the track renders two identical halves and loops at -50%. */
const marqueeStats = [
  { value: "8", label: "Challenge Types" },
  { value: "XP", label: "Earn & Level Up" },
  { value: "Solo/Team", label: "Build Your Way" },
];

const marqueeItems = [...marqueeStats, ...marqueeStats, ...marqueeStats];

function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, visible };
}

function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const { ref, visible } = useScrollReveal();
  return (
    <div
      ref={ref}
      style={{
        transitionDelay: `${delay}ms`,
        transform: visible ? "translateY(0) scale(1)" : "translateY(40px) scale(0.97)",
        opacity: visible ? 1 : 0,
        transition: "transform 0.7s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.7s ease",
      }}
    >
      {children}
    </div>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-neutral-950 text-white overflow-hidden relative">
      {/* Ambient glow background — now animated */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[900px] bg-emerald-500/40 rounded-full blur-[100px] animate-[drift1_12s_ease-in-out_infinite]" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-purple-500/30 rounded-full blur-[90px] animate-[drift2_15s_ease-in-out_infinite]" />
        <div className="absolute top-1/3 left-0 w-[500px] h-[500px] bg-emerald-400/25 rounded-full blur-[90px] animate-[drift3_18s_ease-in-out_infinite]" />
      </div>

      <nav className="relative z-10 max-w-6xl mx-auto flex items-center justify-between px-6 py-6">
        <span className="text-lg font-bold">
          Code<span className="text-emerald-400">Rush</span>
        </span>
        <div className="flex gap-3">
          <Link
            href="/login"
            className="text-sm px-4 py-2 rounded-md border border-neutral-700 hover:bg-neutral-800 transition-colors"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="text-sm px-4 py-2 rounded-md bg-emerald-500 hover:bg-emerald-400 text-black font-semibold transition-colors"
          >
            Sign up
          </Link>
        </div>
      </nav>

      <main className="relative z-10 max-w-4xl mx-auto px-6 pt-16 sm:pt-24 pb-20 text-center">
        <div className="inline-block mb-8" style={{ perspective: "1000px" }}>
          <div
            className="text-6xl sm:text-8xl font-black tracking-tight animate-[float_4s_ease-in-out_infinite]"
            style={{
              transform: "rotateX(8deg) rotateY(-4deg)",
              textShadow: "0 20px 60px rgba(16, 185, 129, 0.4)",
            }}
          >
            <span
              className="bg-clip-text text-transparent bg-[length:200%_auto] animate-[shimmer_3s_linear_infinite]"
              style={{
                backgroundImage:
                  "linear-gradient(90deg, #ffffff, #d4d4d8, #ffffff, #d4d4d8)",
              }}
            >
              CODE
            </span>
            <span
              className="bg-clip-text text-transparent bg-[length:200%_auto] animate-[shimmer_3s_linear_infinite]"
              style={{
                backgroundImage:
                  "linear-gradient(90deg, #6ee7b7, #10b981, #6ee7b7, #10b981)",
              }}
            >
              RUSH
            </span>
          </div>
        </div>

        <p className="text-neutral-400 uppercase tracking-[0.3em] text-xs sm:text-sm mb-6">
          The Coding Challenge Platform
        </p>

        <p className="text-neutral-300 max-w-xl mx-auto mb-10 text-base sm:text-lg leading-relaxed">
          Build games, websites, AI tools, and full hackathon projects —
          not just solve problems. Submit your work, earn XP, climb the
          leaderboard, and team up with other builders.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <Link
            href="/signup"
            className="rounded-md bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-8 py-3 transition-transform hover:scale-105"
          >
            Get Started Free
          </Link>
          <Link
            href="/login"
            className="rounded-md border border-neutral-700 hover:bg-neutral-800 px-8 py-3 transition-colors"
          >
            I already have an account
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
          {[
            { emoji: "🎮", label: "Game Challenges" },
            { emoji: "🌐", label: "Web Challenges" },
            { emoji: "🤖", label: "AI Challenges" },
            { emoji: "🏆", label: "Hackathons" },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-lg border border-neutral-800 bg-neutral-900/60 backdrop-blur p-4 hover:border-emerald-500/50 transition-colors"
            >
              <div className="text-2xl mb-2">{item.emoji}</div>
              <p className="text-sm text-neutral-300">{item.label}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Stats strip — infinite marquee (pauses on hover) */}
      <section className="relative z-10 border-y border-neutral-800 bg-neutral-900/40 backdrop-blur">
       <Reveal>
        <div className="cr-marquee py-8" aria-label="CodeRush highlights">
          <div className="cr-marquee-track">
            {[0, 1].map((copy) => (
              <div
                key={copy}
                aria-hidden={copy === 1}
                className="flex shrink-0 items-center"
              >
                {marqueeItems.map((item, i) => (
                  <div key={`${copy}-${i}`} className="flex shrink-0 items-center">
                    <div className="px-10 text-center sm:px-14">
                      <p className="whitespace-nowrap text-3xl font-bold text-emerald-400 drop-shadow-[0_0_14px_rgba(52,211,153,0.45)]">
                        {item.value}
                      </p>
                      <p className="mt-1 whitespace-nowrap text-xs uppercase tracking-wide text-neutral-500">
                        {item.label}
                      </p>
                    </div>
                    <span
                      aria-hidden="true"
                      className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500/60 shadow-[0_0_10px_rgba(52,211,153,0.8)]"
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
       </Reveal>
      </section>

      {/* How it works */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 py-20">
       <Reveal>
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3">
          How CodeRush works
        </h2>
        <p className="text-neutral-400 text-center mb-12 max-w-xl mx-auto">
          It's not just solving problems — it's shipping real, working things.
        </p>

        <div className="grid sm:grid-cols-3 gap-6">
          {[
            {
              step: "01",
              title: "Choose a challenge",
              desc: "Pick from game, web, AI, creative, and hackathon-style challenges with real themes.",
            },
            {
              step: "02",
              title: "Build & submit",
              desc: "Write the code, ship your project, and submit your GitHub repo and live demo.",
            },
            {
              step: "03",
              title: "Earn XP & climb",
              desc: "Get judged on creativity and execution, earn XP, and rise up the leaderboard.",
            },
          ].map((item) => (
            <div
              key={item.step}
              className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-6"
            >
              <span className="text-emerald-400 text-sm font-mono">
                {item.step}
              </span>
              <h3 className="font-semibold text-lg mt-2 mb-2">{item.title}</h3>
              <p className="text-neutral-400 text-sm leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
       </Reveal>
      </section>

      {/* What you get */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 pb-20">
        <Reveal>
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10">
            What's on CodeRush
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              {
                title: "Profiles & XP",
                desc: "Build a public profile, upload an avatar, and earn XP every time you ship a project.",
              },
              {
                title: "Real submissions",
                desc: "Submit your GitHub repo and live demo — not just code snippets. Edit and resubmit anytime.",
              },
              {
                title: "Project Showcase",
                desc: "Browse what the community has built and like the projects you find impressive.",
              },
              {
                title: "Leaderboard",
                desc: "See exactly where you rank against every other builder on the platform.",
              },
              {
                title: "Teams",
                desc: "Start a team, approve join requests, and submit hackathon-style projects together.",
              },
              {
                title: "Bookmarks",
                desc: "Save challenges you want to come back to later, all in one place.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-5 hover:border-emerald-500/40 transition-colors"
              >
                <h3 className="font-semibold mb-1">{item.title}</h3>
                <p className="text-neutral-400 text-sm leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* All challenge categories */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 pb-20">
       <Reveal>
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10">
          Every kind of challenge
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { emoji: "🧩", label: "Problem-Solving" },
            { emoji: "🎮", label: "Game Challenge" },
            { emoji: "🌐", label: "Web Challenge" },
            { emoji: "🛠️", label: "Tool Challenge" },
            { emoji: "🤖", label: "AI Challenge" },
            { emoji: "🎨", label: "Creative Coding" },
            { emoji: "💡", label: "Innovation" },
            { emoji: "🏆", label: "Hackathon" },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-4 text-center hover:border-emerald-500/40 hover:bg-neutral-900 transition-colors"
            >
              <div className="text-xl mb-1">{item.emoji}</div>
              <p className="text-xs text-neutral-400">{item.label}</p>
            </div>
          ))}
        </div>
       </Reveal>
      </section>

      {/* Final CTA */}
      <section className="relative z-10 max-w-2xl mx-auto px-6 pb-24 text-center">
       <Reveal>
        <h2 className="text-2xl sm:text-3xl font-bold mb-4">
          Ready to build something?
        </h2>
        <p className="text-neutral-400 mb-8">
          Join CodeRush and turn your next challenge into a real project.
        </p>
        <Link
          href="/signup"
          className="inline-block rounded-md bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-8 py-3 transition-transform hover:scale-105"
        >
          Create your account
        </Link>
       </Reveal>
      </section>

      <footer className="relative z-10 border-t border-neutral-800 py-8 text-center text-neutral-500 text-xs">
        © {new Date().getFullYear()} CodeRush. Build things, not just solve problems.
      </footer>

      <style jsx>{`
        @keyframes float {
          0%,
          100% {
            transform: rotateX(8deg) rotateY(-4deg) translateY(0px);
          }
          50% {
            transform: rotateX(8deg) rotateY(4deg) translateY(-12px);
          }
                @keyframes shimmer {
          to {
            background-position: 200% center;
          }
        }
        }
        @keyframes drift1 {
          0%, 100% { transform: translate(-50%, 0) scale(1); }
          50% { transform: translate(-40%, 40px) scale(1.15); }
        }
        @keyframes drift2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-30px, -50px) scale(1.2); }
        }
        @keyframes drift3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(50px, 30px) scale(0.9); }
        }
      `}</style>
    </div>
  );
}