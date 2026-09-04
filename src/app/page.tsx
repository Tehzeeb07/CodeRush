"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

/* =========================================
   COUNT UP HOOK
========================================= */

function useCountUp(
  target: number,
  decimals = 0,
  duration = 1500
) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const element = ref.current;

    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || started.current) return;

        started.current = true;

        const start = performance.now();

        function tick(now: number) {
          const progress = Math.min(
            (now - start) / duration,
            1
          );

          const eased = 1 - Math.pow(1 - progress, 3);

          setValue(target * eased);

          if (progress < 1) {
            requestAnimationFrame(tick);
          }
        }

        requestAnimationFrame(tick);
        observer.disconnect();
      },
      {
        threshold: 0.25,
      }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [target, duration]);

  return {
    ref,
    display: value.toFixed(decimals),
  };
}

/* =========================================
   STAT ITEM
========================================= */

interface StatItemProps {
  glyph: string;
  target: number;
  suffix: string;
  decimals: number;
  label: string;
}

function StatItem({
  glyph,
  target,
  suffix,
  decimals,
  label,
}: StatItemProps) {
  const { ref, display } = useCountUp(target, decimals);

  return (
    <div
      ref={ref}
      className="flex w-[180px] shrink-0 flex-col items-center justify-center text-center sm:w-[220px]"
    >
      <div className="mb-2 text-3xl sm:text-4xl">
        {glyph}
      </div>

      <div className="text-xl font-bold tabular-nums text-white sm:text-2xl">
        {display}
        {suffix}
      </div>

      <div className="mt-1 whitespace-nowrap text-[11px] uppercase tracking-wider text-neutral-500 sm:text-xs">
        {label}
      </div>
    </div>
  );
}

/* =========================================
   MOBILE MENU
========================================= */

interface MobileMenuProps {
  onClose: () => void;
}

function MobileMenu({ onClose }: MobileMenuProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 pt-24 backdrop-blur-md">
      <div className="relative w-[85%] max-w-xs rounded-3xl bg-white p-6 text-center shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-6 top-6 text-xl text-black"
          aria-label="Close menu"
        >
          ✕
        </button>

        <nav className="mt-4 flex flex-col gap-4 font-medium text-[#2e2e2e]">
          <Link href="/" onClick={onClose}>
            Home
          </Link>

          <Link href="/challenges" onClick={onClose}>
            Challenges
          </Link>

          <Link href="/showcase" onClick={onClose}>
            Showcase
          </Link>

          <Link href="/leaderboard" onClick={onClose}>
            Ranks
          </Link>

          <Link
            href="/login"
            onClick={onClose}
            className="mt-2 rounded-full bg-[#28282a] py-3 text-white"
          >
            Log in
          </Link>
        </nav>
      </div>
    </div>
  );
}

/* =========================================
   ANIMATED BACKGROUND
========================================= */

function AnimatedBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Base */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0f0d] via-black to-black" />

      {/* Main emerald glow */}
      <div className="absolute left-1/2 top-[-15%] h-[1100px] w-[1100px] -translate-x-1/2 animate-[drift1_16s_ease-in-out_infinite] rounded-full bg-emerald-500/25 blur-[160px]" />

      {/* Cyan glow */}
      <div className="absolute bottom-[-20%] left-[-10%] h-[700px] w-[700px] animate-[drift2_20s_ease-in-out_infinite] rounded-full bg-cyan-500/10 blur-[140px]" />

      {/* Green glow */}
      <div className="absolute bottom-[-10%] right-[-10%] h-[600px] w-[600px] animate-[drift3_22s_ease-in-out_infinite] rounded-full bg-emerald-400/15 blur-[130px]" />

      {/* Noise */}
      <div
        className="absolute inset-0 opacity-[0.03] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
    </div>
  );
}

/* =========================================
   HERO SECTION
========================================= */

function HeroSection() {
  return (
    <main className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center px-4 text-center">
      {/* Eyebrow */}
      <motion.p
        initial={{
          opacity: 0,
          y: 22,
          filter: "blur(6px)",
        }}
        animate={{
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
        }}
        transition={{
          duration: 0.8,
          delay: 0.1,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="mb-4 text-[11px] uppercase tracking-[0.25em] text-emerald-400 sm:text-xs"
      >
        Build-First Coding Challenges
      </motion.p>

      {/* Logo */}
      <motion.div
        initial={{
          opacity: 0,
          y: 25,
          scale: 0.96,
        }}
        animate={{
          opacity: 1,
          y: 0,
          scale: 1,
        }}
        transition={{
          duration: 0.9,
          delay: 0.2,
          ease: [0.22, 1, 0.36, 1],
        }}
        style={{
          perspective: "1000px",
        }}
      >
        <motion.h1
          animate={{
            y: [0, -10, 0],
            rotateY: [-4, 4, -4],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="font-display text-white"
          style={{
            fontSize: "clamp(30px, 6.5vw, 80px)",
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
            textShadow:
              "0 20px 60px rgba(16, 185, 129, 0.35)",
          }}
        >
          <span className="block">CODE</span>

          <span className="block text-emerald-400">
            RUSH
          </span>
        </motion.h1>
      </motion.div>

      {/* Description */}
      <motion.p
        initial={{
          opacity: 0,
          y: 22,
          filter: "blur(6px)",
        }}
        animate={{
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
        }}
        transition={{
          duration: 0.85,
          delay: 0.35,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="mt-6 max-w-md text-sm leading-relaxed text-neutral-300 sm:text-base"
      >
        Build games, websites, AI tools, and full hackathon
        projects — not just solve problems. Submit your work,
        earn XP, and climb the leaderboard.
      </motion.p>

      {/* Buttons */}
      <motion.div
        initial={{
          opacity: 0,
          y: 22,
          filter: "blur(6px)",
        }}
        animate={{
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
        }}
        transition={{
          duration: 0.85,
          delay: 0.5,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="mt-8 flex items-center justify-center gap-3"
      >
        {/* Get Started */}
        <Link
          href="/signup"
          className="rounded-full bg-white px-7 py-3 text-sm font-semibold text-black shadow-[0_0_22px_rgba(16,185,129,0.4),0_0_50px_rgba(16,185,129,0.18)] transition-all duration-200 hover:scale-105 hover:bg-neutral-100"
        >
          Get Started
        </Link>

        {/* Login */}
        <Link
          href="/login"
          className="rounded-full border border-white/10 bg-[#28282a]/90 px-7 py-3 text-sm font-semibold text-[#d4d4d8] shadow-[0_4px_14px_rgba(0,0,0,0.4)] backdrop-blur-sm transition-all duration-200 hover:scale-105 hover:border-white/20 hover:bg-[#323234] hover:text-white"
        >
          Log in
        </Link>
      </motion.div>
    </main>
  );
}

/* =========================================
   STATS FOOTER
   FRAMER MOTION LEFT → RIGHT
========================================= */

function StatsFooter() {
  const stats = [
    {
      glyph: "🧩",
      target: 8,
      suffix: "",
      label: "Challenge Types",
    },
    {
      glyph: "⚡",
      target: 100,
      suffix: "+",
      label: "XP Per Challenge",
    },
    {
      glyph: "👥",
      target: 1,
      suffix: "",
      label: "Solo or Team",
    },
    {
      glyph: "🏆",
      target: 24,
      suffix: "/7",
      label: "Always Open",
    },
  ];

  return (
    <footer className="relative z-10 w-full overflow-hidden border-t border-white/5 py-7 sm:py-8">
      {/* Left fade */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-20 w-20 bg-gradient-to-r from-black via-black/80 to-transparent sm:w-32" />

      {/* Right fade */}
      <div className="pointer-events-none absolute inset-y-0 right-0 z-20 w-20 bg-gradient-to-l from-black via-black/80 to-transparent sm:w-32" />

      {/* Framer Motion viewport */}
      <div className="relative w-full overflow-hidden">
        <motion.div
          className="flex w-max"
          animate={{
            x: ["-33.3333%", "0%"],
          }}
          transition={{
            x: {
              duration: 20,
              ease: "linear",
              repeat: Infinity,
              repeatType: "loop",
            },
          }}
          whileHover={{
            animationPlayState: "paused",
          }}
        >
          {/* SET 1 */}
          <div className="flex shrink-0 items-center gap-8 px-4 sm:gap-16 sm:px-8">
            {stats.map((stat, index) => (
              <StatItem
                key={`set1-${index}`}
                glyph={stat.glyph}
                target={stat.target}
                suffix={stat.suffix}
                decimals={0}
                label={stat.label}
              />
            ))}
          </div>

          {/* SET 2 */}
          <div
            className="flex shrink-0 items-center gap-8 px-4 sm:gap-16 sm:px-8"
            aria-hidden="true"
          >
            {stats.map((stat, index) => (
              <StatItem
                key={`set2-${index}`}
                glyph={stat.glyph}
                target={stat.target}
                suffix={stat.suffix}
                decimals={0}
                label={stat.label}
              />
            ))}
          </div>

          {/* SET 3 */}
          <div
            className="flex shrink-0 items-center gap-8 px-4 sm:gap-16 sm:px-8"
            aria-hidden="true"
          >
            {stats.map((stat, index) => (
              <StatItem
                key={`set3-${index}`}
                glyph={stat.glyph}
                target={stat.target}
                suffix={stat.suffix}
                decimals={0}
                label={stat.label}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </footer>
  );
}

/* =========================================
   HOME PAGE
========================================= */

export default function Home() {
  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-black text-white">
      {/* Background */}
      <AnimatedBackground />

      {/* Hero */}
      <HeroSection />

      {/* Moving Stats */}
      <StatsFooter />

      {/* Font */}
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=DotGothic16&display=swap");

        .font-display {
          font-family: "DotGothic16", monospace;
        }
      `}</style>

      {/* Background Animations */}
      <style jsx>{`
        @keyframes drift1 {
          0%,
          100% {
            transform: translate(-50%, 0) scale(1);
          }

          50% {
            transform: translate(-42%, 50px) scale(1.12);
          }
        }

        @keyframes drift2 {
          0%,
          100% {
            transform: translate(0, 0) scale(1);
          }

          50% {
            transform: translate(30px, -30px) scale(1.1);
          }
        }

        @keyframes drift3 {
          0%,
          100% {
            transform: translate(0, 0) scale(1);
          }

          50% {
            transform: translate(-30px, 30px) scale(1.08);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </div>
  );
}