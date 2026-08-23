import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-950 text-white px-4 text-center">
      <h1 className="text-4xl font-bold mb-3">🚀 CodeRush</h1>
      <p className="text-neutral-400 max-w-md mb-8">
        Build things. Not just solve problems. Take on game, web, AI, and
        creative coding challenges — then submit, get judged, and climb the
        leaderboard.
      </p>
      <div className="flex gap-3">
        <Link
          href="/signup"
          className="rounded-md bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-5 py-2 transition-colors"
        >
          Get started
        </Link>
        <Link
          href="/login"
          className="rounded-md border border-neutral-700 hover:bg-neutral-800 px-5 py-2 transition-colors"
        >
          Log in
        </Link>
      </div>
    </div>
  );
}