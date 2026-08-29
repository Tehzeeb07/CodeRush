"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Menu, X } from "lucide-react";

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="relative min-h-screen bg-[#070b0a] text-white overflow-hidden">
      {/* Grid lines */}
      <div className="pointer-events-none absolute inset-0 hidden sm:block">
        <div className="absolute top-0 bottom-0 left-1/4 w-px bg-white/10" />
        <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white/10" />
        <div className="absolute top-0 bottom-0 left-3/4 w-px bg-white/10" />
      </div>

      {/* Center glow */}
      <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2">
        <svg width="900" height="500" viewBox="0 0 900 500">
          <defs>
            <filter id="glow-blur" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="25" />
            </filter>
            <radialGradient id="glow-grad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#5ed29c" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#5ed29c" stopOpacity="0" />
            </radialGradient>
          </defs>
          <ellipse cx="450" cy="150" rx="380" ry="180" fill="url(#glow-grad)" filter="url(#glow-blur)" />
        </svg>
      </div>

      {/* Bottom gradient for readability */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-[#070b0a] to-transparent" />

      {/* Header */}
      <header className="relative z-20 flex items-center justify-between px-6 py-6 sm:px-10">
        <span className="text-lg font-bold tracking-tight">
          Code<span className="text-[#5ed29c]">Rush</span>
        </span>

        <nav className="hidden items-center gap-8 text-sm sm:flex">
          <Link href="/challenges" className="transition-colors hover:text-[#5ed29c]">
            CHALLENGES
          </Link>
          <Link href="/showcase" className="transition-colors hover:text-[#5ed29c]">
            SHOWCASE
          </Link>
          <Link href="/leaderboard" className="transition-colors hover:text-[#5ed29c]">
            LEADERBOARD
          </Link>
          <Link href="/login" className="transition-colors hover:text-[#5ed29c]">
            LOG IN
          </Link>
        </nav>

        <button
          onClick={() => setMenuOpen(true)}
          className="sm:hidden"
          aria-label="Open menu"
        >
          <Menu size={24} />
        </button>
      </header>

      {/* Mobile menu overlay */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-[#070b0a] text-lg">
          <button
            onClick={() => setMenuOpen(false)}
            className="absolute right-6 top-6"
            aria-label="Close menu"
          >
            <X size={28} />
          </button>
          <Link href="/challenges" onClick={() => setMenuOpen(false)}>Challenges</Link>
          <Link href="/showcase" onClick={() => setMenuOpen(false)}>Showcase</Link>
          <Link href="/leaderboard" onClick={() => setMenuOpen(false)}>Leaderboard</Link>
          <Link href="/login" onClick={() => setMenuOpen(false)}>Log in</Link>
          <Link
            href="/signup"
            onClick={() => setMenuOpen(false)}
            className="rounded-full bg-[#5ed29c] px-6 py-2 font-bold uppercase text-[#070b0a]"
          >
            Sign up
          </Link>
        </div>
      )}

      {/* Hero content */}
      <main className="relative z-10 mx-auto flex max-w-4xl flex-col items-center px-6 pb-24 pt-16 text-center sm:pt-24">
        {/* Liquid glass card */}
        <div className="glass-card relative mb-[-50px] flex h-[200px] w-[200px] translate-y-[-50px] flex-col items-center justify-center rounded-2xl p-5 text-center">
          <span className="mb-2 text-sm tracking-wide text-[#5ed29c]">[ 2026 ]</span>
          <p className="text-lg leading-snug">
            Build for the <span className="italic text-[#5ed29c]">Rush</span> of it
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-white/60">
            Real projects. Real judging. Real XP.
          </p>
        </div>

        <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.2em] text-[#5ed29c]">
          Build-First Coding Challenges
        </p>

        <h1 className="mt-4 text-[40px] font-extrabold uppercase leading-[1.05] tracking-tight sm:text-[72px]">
          Ship real projects.
          <br />
          Not just answers<span className="text-[#5ed29c]">.</span>
        </h1>

        <p className="mt-6 max-w-lg text-sm leading-relaxed text-white/70">
          Master real skills by building games, web apps, AI tools, and full
          hackathon projects — submit your work, earn XP, and climb the
          leaderboard against other builders.
        </p>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <Link
            href="/signup"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#5ed29c] px-8 py-3 text-sm font-bold uppercase text-[#070b0a] transition-transform hover:scale-105"
          >
            Get Started
            <ArrowRight size={16} />
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-full border border-white/20 px-8 py-3 text-sm font-bold uppercase text-white transition-colors hover:border-[#5ed29c] hover:text-[#5ed29c]"
          >
            Log in
          </Link>
        </div>
      </main>

      <style jsx>{`
        .glass-card {
          background: rgba(255, 255, 255, 0.01);
          background-blend-mode: luminosity;
          backdrop-filter: blur(4px);
          box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.1);
        }
        .glass-card::before {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          padding: 1.4px;
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.5),
            rgba(255, 255, 255, 0)
          );
          -webkit-mask:
            linear-gradient(#fff 0 0) content-box,
            linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
        }
      `}</style>
    </div>
  );
}