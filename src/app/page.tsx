"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

function useCountUp(target: number, decimals = 0, duration = 1500) {
  const [value, setValue] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          function tick(now: number) {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setValue(target * eased);
            if (progress < 1) requestAnimationFrame(tick);
          }
          requestAnimationFrame(tick);
          observer.disconnect();
        }
      },
      { threshold: 0.25 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration]);

  return { ref, display: value.toFixed(decimals) };
}

function StatItem({
  glyph,
  target,
  suffix,
  decimals,
  label,
  delay,
}: {
  glyph: string;
  target: number;
  suffix: string;
  decimals: number;
  label: string;
  delay: string;
}) {
  const { ref, display } = useCountUp(target, decimals);
  return (
    <div ref={ref} className="anim text-center" style={{ ["--d" as string]: delay }}>
      <div className="font-display text-2xl sm:text-3xl text-white mb-2">{glyph}</div>
      <div className="text-lg sm:text-2xl text-white tabular-nums font-semibold">
        {display}
        {suffix}
      </div>
      <div className="text-[11px] sm:text-xs text-neutral-500 mt-1 uppercase tracking-wide">{label}</div>
    </div>
  );
}

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="relative h-screen bg-black text-white overflow-hidden flex flex-col">
      <Link
        href="/login"
        className="absolute top-6 right-6 z-10 rounded-full bg-[#28282a] text-[#c8c8c8] text-sm px-5 py-2.5 shadow-[0_4px_14px_rgba(0,0,0,0.4)] hover:bg-[#323234] hover:text-white transition-colors"
      >
        Log in
      </Link>
      {/* Animated background — deep space/nebula feel, built from CSS only */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0f0d] via-black to-black" />
        <div className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[1100px] h-[1100px] bg-emerald-500/25 rounded-full blur-[160px] animate-[drift1_16s_ease-in-out_infinite]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[700px] h-[700px] bg-cyan-500/10 rounded-full blur-[140px] animate-[drift2_20s_ease-in-out_infinite]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-emerald-400/15 rounded-full blur-[130px] animate-[drift3_22s_ease-in-out_infinite]" />
        {/* subtle noise/grain overlay for texture */}
        <div
          className="absolute inset-0 opacity-[0.03] mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur flex items-start justify-center pt-24">
          <div className="bg-white rounded-3xl p-6 w-[85%] max-w-xs text-center relative">
            <button
              onClick={() => setMenuOpen(false)}
              className="absolute top-6 right-6 text-black text-xl"
              aria-label="Close menu"
            >
              ✕
            </button>
            <div className="flex flex-col gap-4 text-[#2e2e2e] font-medium mt-4">
              <Link href="/" onClick={() => setMenuOpen(false)}>Home</Link>
              <Link href="/challenges" onClick={() => setMenuOpen(false)}>Challenges</Link>
              <Link href="/showcase" onClick={() => setMenuOpen(false)}>Showcase</Link>
              <Link href="/leaderboard" onClick={() => setMenuOpen(false)}>Ranks</Link>
              <Link
                href="/login"
                onClick={() => setMenuOpen(false)}
                className="mt-2 rounded-full bg-[#28282a] text-white py-3"
              >
                Log in
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Mobile menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur flex items-start justify-center pt-24">
          <div className="bg-white rounded-3xl p-6 w-[85%] max-w-xs text-center relative">
            <button
              onClick={() => setMenuOpen(false)}
              className="absolute top-6 right-6 text-black text-xl"
              aria-label="Close menu"
            >
              ✕
            </button>
            <div className="flex flex-col gap-4 text-[#2e2e2e] font-medium mt-4">
              <Link href="/" onClick={() => setMenuOpen(false)}>Home</Link>
              <Link href="/challenges" onClick={() => setMenuOpen(false)}>Challenges</Link>
              <Link href="/showcase" onClick={() => setMenuOpen(false)}>Showcase</Link>
              <Link href="/leaderboard" onClick={() => setMenuOpen(false)}>Ranks</Link>
              <Link
                href="/login"
                onClick={() => setMenuOpen(false)}
                className="mt-2 rounded-full bg-[#28282a] text-white py-3"
              >
                Log in
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Hero */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-4 min-h-0">
        <p
          className="anim text-[11px] sm:text-xs uppercase tracking-[0.25em] text-emerald-400 mb-4"
          style={{ ["--d" as string]: "0.1s" }}
        >
          Build-First Coding Challenges
        </p>

        <div className="anim" style={{ ["--d" as string]: "0.2s", perspective: "1000px" }}>
          <h1
            className="font-display text-white animate-[float_4s_ease-in-out_infinite]"
            style={{
              fontSize: "clamp(30px, 6.5vw, 80px)",
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
              transform: "rotateX(8deg) rotateY(-4deg)",
              textShadow: "0 20px 60px rgba(16, 185, 129, 0.35)",
            }}
          >
            <span className="block">CODE</span>
            <span className="block text-emerald-400">RUSH</span>
          </h1>
        </div>

        <p
          className="anim mt-6 max-w-md text-sm sm:text-base leading-relaxed text-neutral-300"
          style={{ ["--d" as string]: "0.35s" }}
        >
          Build games, websites, AI tools, and full hackathon projects — not
          just solve problems. Submit your work, earn XP, and climb the
          leaderboard.
        </p>

        <Link
          href="/signup"
          className="anim mt-8 inline-block rounded-full bg-white text-black font-semibold text-sm px-8 py-3 transition-transform hover:scale-105"
          style={{
            ["--d" as string]: "0.5s",
            boxShadow:
              "0 0 0 1px rgba(255,255,255,0.15), 0 0 22px rgba(16,185,129,0.4), 0 0 50px rgba(16,185,129,0.18)",
          }}
        >
          Get Started
        </Link>
      </main>

      {/* Stats footer */}
      <footer className="relative z-10 pb-8 px-4 shrink-0">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-4xl mx-auto">
          <StatItem glyph="🧩" target={8} suffix="" decimals={0} label="Challenge Types" delay="0.55s" />
          <StatItem glyph="⚡" target={100} suffix="+" decimals={0} label="XP Per Challenge" delay="0.63s" />
          <StatItem glyph="👥" target={1} suffix="" decimals={0} label="Solo or Team" delay="0.71s" />
          <StatItem glyph="🏆" target={24} suffix="/7" decimals={0} label="Always Open" delay="0.79s" />
        </div>
      </footer>

      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=DotGothic16&display=swap");
        .font-display {
          font-family: "DotGothic16", monospace;
        }
      `}</style>

      <style jsx>{`
              @keyframes float {
          0%,
          100% {
            transform: rotateX(8deg) rotateY(-4deg) translateY(0px);
          }
          50% {
            transform: rotateX(8deg) rotateY(4deg) translateY(-12px);
          }
        }
        .anim {
          opacity: 0;
          transform: translateY(22px) scale(0.98);
          filter: blur(6px);
          animation: reveal 0.85s cubic-bezier(0.22, 1, 0.36, 1) forwards;
          animation-delay: var(--d, 0s);
        }
        @keyframes reveal {
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
            filter: blur(0);
          }
        }
        @keyframes drift1 {
          0%, 100% { transform: translate(-50%, 0) scale(1); }
          50% { transform: translate(-42%, 50px) scale(1.12); }
        }
        @keyframes drift2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(30px, -30px) scale(1.1); }
        }
        @keyframes drift3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-30px, 30px) scale(1.08); }
        }
      `}</style>
    </div>
  );
}